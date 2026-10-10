import test from "node:test";
import assert from "node:assert/strict";

import { calculateShoppingReview, costOfRecipe, displayName, expiringProductIds, formatAmount, formatMoney, movePlannedMeal, parseQty, PRODUCTS, resolveProductMeasure, suggestedExpiryDate, suggestedExpiryDays, toBase } from "./data.ts";

test("parseQty converts decimal and fraction strings into base units", () => {
  assert.deepEqual(parseQty("500 g"), { amount: 500, unit: "g" });
  assert.deepEqual(parseQty("1.5 l"), { amount: 1500, unit: "ml" });
  assert.deepEqual(parseQty("1/2 taza"), { amount: 0.5, unit: "taza" });
  assert.deepEqual(parseQty("2 unidades"), { amount: 2, unit: "u" });
});

test("toBase converts recipe units to product base using measure overrides", () => {
  const product = resolveProductMeasure(PRODUCTS.find((p) => p.id === "carne-cerdo")!, { "carne-cerdo": { base: "g", pack: 1000, density: undefined, measureConfirmed: true } });
  assert.deepEqual(toBase({ name: "Carne de cerdo", qty: "500 g" }, product), { amount: 500, base: "g" });
  assert.deepEqual(toBase({ name: "Carne de cerdo", qty: "1/2 taza" }, { ...product, density: 200, base: "g" }), { amount: 100, base: "g" });

  const milk = resolveProductMeasure(PRODUCTS.find((p) => p.id === "yogurt")!, { yogurt: { base: "ml", pack: 1000, measureConfirmed: true } });
  assert.deepEqual(toBase({ name: "Yogurt", qty: "1 taza" }, milk), { amount: 240, base: "ml" });
});

test("formatAmount prints real units cleanly for larger amounts", () => {
  assert.equal(formatAmount(1500, "g"), "1,5 kg");
  assert.equal(formatAmount(2500, "ml"), "2,5 l");
  assert.equal(formatAmount(12, "u"), "12 u");
});

test("displayName uses a short name or trims the full name to eight words", () => {
  assert.equal(displayName({ name: "Espaguetis a la carbonara con queso extra" }), "Espaguetis a la carbonara con queso extra");
  assert.equal(displayName({ name: "Congrí con con cerdo asado para toda la familia esta noche" }), "Congrí con cerdo asado para toda la familia");
  assert.equal(displayName({ name: "Nombre original muy largo para una receta familiar", shortName: "Congrí con cerdo asado y aguacate fresco" }), "Congrí con cerdo asado y aguacate fresco");
});

test("movePlannedMeal moves to empty cells and swaps occupied cells in one materialized week", () => {
  const weeks = { "2026-10-05": { "0:almuerzo": { recipeId: "a" }, "1:comida": { recipeId: "b" } } };
  const moved = movePlannedMeal(weeks, "2026-10-12", "0:almuerzo", "2:almuerzo");
  assert.deepEqual(moved["2026-10-12"], { "1:comida": { recipeId: "b" }, "2:almuerzo": { recipeId: "a" } });
  const swapped = movePlannedMeal(moved, "2026-10-12", "2:almuerzo", "1:comida");
  assert.deepEqual(swapped["2026-10-12"], { "1:comida": { recipeId: "a" }, "2:almuerzo": { recipeId: "b" } });
  assert.deepEqual(weeks["2026-10-05"], { "0:almuerzo": { recipeId: "a" }, "1:comida": { recipeId: "b" } });
});

test("costOfRecipe charges 500 g of pork at 700 CUP per 1 kg pack", () => {
  const cost = costOfRecipe(
    { ingredients: [{ productId: "carne-cerdo", name: "Carne de Cerdo", qty: "500 g" }] },
    1,
    { "carne-cerdo": 700 },
    { "carne-cerdo": { base: "g", pack: 1000, measureConfirmed: true } },
  );
  assert.deepEqual(cost, { total: 350, perServing: 350, unknownCount: 0 });
});

test("costOfRecipe marks missing products, conversion, and price as unknown", () => {
  const cost = costOfRecipe({ ingredients: [
    { name: "Producto sin catálogo", qty: "1 paquete" },
    { productId: "arroz", name: "Arroz", qty: "1 unidad" },
    { productId: "carne-cerdo", name: "Carne de Cerdo", qty: "500 g" },
  ] }, 2, { "carne-cerdo": 0 });
  assert.equal(cost.unknownCount, 3);
  assert.equal(cost.total, 0);
  assert.equal(cost.perServing, 0);
});

test("costOfRecipe treats explicit pack quantities as pack prices and does not fuzzy-match ingredients", () => {
  const cost = costOfRecipe({ ingredients: [
    { productId: "san-jacobo", name: "San Jacobo", qty: "1 paquete" },
    { name: "Puré de tomate", qty: "1/2 lata" },
  ] }, 1, { "san-jacobo": 2500 });
  assert.equal(cost.total, 2500);
  assert.equal(cost.unknownCount, 1);
});

test("recipe costs recalculate from overrides and display in USD at the current rate", () => {
  const recipe = { ingredients: [{ productId: "carne-cerdo", name: "Carne de Cerdo", qty: "500 g" }] };
  const measures = { "carne-cerdo": { base: "g" as const, pack: 1000, measureConfirmed: true } };
  assert.equal(costOfRecipe(recipe, 2, { "carne-cerdo": 700 }, measures).perServing, 175);
  assert.equal(costOfRecipe(recipe, 2, { "carne-cerdo": 1000 }, measures).perServing, 250);
  assert.equal(formatMoney(350, "USD", 350), "$1,00");
});

test("weekly shopping aggregates shared rice and pork, subtracts stock, and rounds packs once", () => {
  const recipes = [
    { id: "rice-one", name: "Plato uno", shortName: "Plato uno", emoji: "🍚", servings: 2, ingredients: [{ productId: "arroz", name: "Arroz", qty: "500 g" }, { productId: "carne-cerdo", name: "Carne de Cerdo", qty: "400 g" }], steps: [], createdAt: 1 },
    { id: "rice-two", name: "Plato dos", shortName: "Plato dos", emoji: "🍲", servings: 2, ingredients: [{ productId: "arroz", name: "Arroz", qty: "500 g" }, { productId: "carne-cerdo", name: "Carne de Cerdo", qty: "400 g" }], steps: [], createdAt: 2 },
    { id: "rice-three", name: "Plato tres", shortName: "Plato tres", emoji: "🥘", servings: 2, ingredients: [{ productId: "arroz", name: "Arroz", qty: "500 g" }, { productId: "carne-cerdo", name: "Carne de Cerdo", qty: "400 g" }], steps: [], createdAt: 3 },
  ];
  const weeks = { "2026-10-05": { "0:almuerzo": { recipeId: "rice-one" }, "1:comida": { recipeId: "rice-two" }, "2:comida": { recipeId: "rice-three" } } };
  const stock = {
    arroz: { productId: "arroz", current: 0.5, max: 1 },
    "carne-cerdo": { productId: "carne-cerdo", current: 0.5, max: 1 },
  };
  const measures = {
    arroz: { base: "g" as const, pack: 1000, measureConfirmed: true },
    "carne-cerdo": { base: "g" as const, pack: 1000, measureConfirmed: true },
  };
  const result = calculateShoppingReview(weeks, ["2026-10-12"], recipes, [], stock, measures, { arroz: 700, "carne-cerdo": 700 });
  assert.equal(result.length, 2);
  assert.equal(result.find((need) => need.productId === "arroz")?.packsSuggested, 1);
  assert.equal(result.find((need) => need.productId === "carne-cerdo")?.packsSuggested, 1);
  assert.equal(result.find((need) => need.productId === "arroz")?.dishes.length, 3);
});

test("weekly shopping skips cooked recipes and products whose remaining stock is sufficient", () => {
  const recipes = [{ id: "rice-one", name: "Plato uno", emoji: "🍚", ingredients: [{ productId: "arroz", name: "Arroz", qty: "500 g" }], steps: [], createdAt: 1 }];
  const weeks = { "2026-10-05": { "0:almuerzo": { recipeId: "rice-one" }, "1:comida": { recipeId: "rice-one", cookedId: "cooked-1" } } };
  const result = calculateShoppingReview(weeks, ["2026-10-05"], recipes, [{ id: "cooked-1", recipeId: "rice-one", recipeName: "Plato uno", at: 1, servings: 1, used: [] }], { arroz: { productId: "arroz", current: 1, max: 1 } }, { arroz: { base: "g", pack: 1000, measureConfirmed: true } }, {}, []);
  assert.equal(result.length, 0);
});

test("weekly shopping adds portions from side recipes and groups custom ingredients without product ids", () => {
  const recipes = [
    { id: "main", name: "Plato principal", emoji: "🍛", ingredients: [{ productId: "arroz", name: "Arroz", qty: "100 g" }], steps: [], createdAt: 1 },
    { id: "side", name: "Ensalada", emoji: "🥗", ingredients: [{ name: "Limón fresco", qty: "2 unidades" }], steps: [], createdAt: 2 },
  ];
  const weeks = { "2026-10-05": { "0:almuerzo": { recipeId: "main", sideIds: ["side"] }, "1:comida": { recipeId: "side" } } };
  const result = calculateShoppingReview(weeks, ["2026-10-12"], recipes, [], { arroz: { productId: "arroz", current: 1, max: 1 } }, { arroz: { base: "g", pack: 1000, measureConfirmed: true } }, {}, []);
  const lemon = result.find((need) => need.customName === "Limón fresco");
  assert.equal(result.some((need) => need.productId === "arroz"), false);
  assert.equal(lemon?.amountNeeded, 4);
  assert.equal(lemon?.dishes.length, 1);
});

test("suggested expiry durations and expiring filter follow stock dates", () => {
  const now = new Date(2026, 9, 7, 12).getTime();
  assert.equal(suggestedExpiryDays("carne-cerdo"), 3);
  assert.equal(suggestedExpiryDays("arroz"), null);
  const tomorrow = new Date(2026, 9, 8).setHours(0, 0, 0, 0);
  assert.equal(suggestedExpiryDate("carne-cerdo", now), new Date(2026, 9, 10).setHours(0, 0, 0, 0));
  assert.deepEqual(expiringProductIds({ "carne-cerdo": { productId: "carne-cerdo", current: 1, max: 6, expiresAt: tomorrow } }, 7, now), ["carne-cerdo"]);
});
