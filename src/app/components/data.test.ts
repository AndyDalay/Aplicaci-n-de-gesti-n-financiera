import test from "node:test";
import assert from "node:assert/strict";

import { formatAmount, parseQty, PRODUCTS, resolveProductMeasure, toBase } from "./data.ts";

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
