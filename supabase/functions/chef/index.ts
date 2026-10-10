import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { ChefInput, ChefReplacementInput, shortenRecipeNames, suggestChefRecipes, suggestChefReplacements } from "../_shared/llm.ts";

const app = new Hono();
const P = "/chef";
app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "OPTIONS"],
  maxAge: 600,
}));

app.get(`${P}${P}/health`, (c) => c.json({ status: "ok" }));

app.post(`${P}/chef/recipes`, async (c) => {
  try {
    const body = await c.req.json();
    if (!body || typeof body !== "object") return c.json({ error: "El cuerpo debe ser un objeto JSON." }, 400);
    const craving = typeof body.craving === "string" ? body.craving.trim().slice(0, 200) : "";
    const mustUse = Array.isArray(body.mustUse)
      ? [...new Set(body.mustUse.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim()).filter(Boolean))].slice(0, 20)
      : [];
    const productCatalog = Array.isArray(body.productCatalog)
      ? body.productCatalog.filter((product: unknown) => product && typeof product === "object" && typeof (product as { id?: unknown }).id === "string" && typeof (product as { name?: unknown }).name === "string").map((product: { id: string; name: string }) => ({ id: product.id.slice(0, 80), name: product.name.slice(0, 100) })).slice(0, 80)
      : [];
    const input: ChefInput = {
      couple: typeof body.couple === "string" ? body.couple.slice(0, 300) : "pareja cubana que cocina para 2 personas",
      inventory: typeof body.inventory === "string" ? body.inventory.slice(0, 5000) : "",
      missing: typeof body.missing === "string" ? body.missing.slice(0, 5000) : "",
      planned: typeof body.planned === "string" ? body.planned.slice(0, 2000) : "",
      slot: typeof body.slot === "string" ? body.slot.slice(0, 120) : undefined,
      craving,
      mustUse,
      onlyInventory: body.onlyInventory === true,
      productCatalog,
    };
    const suggestions = await suggestChefRecipes(input);
    return c.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`POST /chef/recipes failed: ${message}`);
    return c.json({ error: `No pudimos preparar las ideas. ${message.slice(0, 900)}` }, 502);
  }
});

app.post(`${P}/chef/replace`, async (c) => {
  try {
    const body = await c.req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return c.json({ error: "El cuerpo debe ser un objeto JSON." }, 400);
    const current = body.current && typeof body.current === "object" ? body.current as Record<string, unknown> : {};
    const name = typeof current.name === "string" ? current.name.trim().slice(0, 180) : "";
    const ingredients = Array.isArray(current.ingredients)
      ? current.ingredients.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim().slice(0, 100)).filter(Boolean).slice(0, 30)
      : [];
    const scale = body.scale;
    if (!name || !["rapido", "saludable", "elegante"].includes(scale)) return c.json({ error: "current.name y un nivel válido son obligatorios." }, 400);
    const mustUse = Array.isArray(body.mustUse)
      ? [...new Set(body.mustUse.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim()).filter(Boolean))].slice(0, 20)
      : [];
    const productCatalog = Array.isArray(body.productCatalog)
      ? body.productCatalog.filter((product: unknown) => product && typeof product === "object" && typeof (product as { id?: unknown }).id === "string" && typeof (product as { name?: unknown }).name === "string").map((product: { id: string; name: string }) => ({ id: product.id.slice(0, 80), name: product.name.slice(0, 100) })).slice(0, 80)
      : [];
    const input: ChefReplacementInput = {
      couple: typeof body.couple === "string" ? body.couple.slice(0, 300) : "pareja cubana que cocina para 2 personas",
      inventory: typeof body.inventory === "string" ? body.inventory.slice(0, 5000) : "",
      missing: typeof body.missing === "string" ? body.missing.slice(0, 5000) : "",
      planned: typeof body.planned === "string" ? body.planned.slice(0, 2000) : "",
      slot: typeof body.slot === "string" ? body.slot.slice(0, 120) : undefined,
      day: typeof body.day === "string" ? body.day.slice(0, 40) : "",
      current: { name, ingredients },
      instruction: typeof body.instruction === "string" ? body.instruction.trim().slice(0, 300) : "",
      scale,
      mustUse,
      onlyInventory: body.onlyInventory === true,
      productCatalog,
    };
    if (!input.instruction && !mustUse.length) return c.json({ error: "Escribe una instrucción o selecciona un ingrediente obligatorio." }, 400);
    const suggestions = await suggestChefReplacements(input);
    return c.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`POST /chef/replace failed: ${message}`);
    return c.json({ error: `No pudimos preparar las alternativas. ${message.slice(0, 700)}` }, 502);
  }
});

app.post(`${P}/shorten`, async (c) => {
  try {
    const body = await c.req.json();
    if (!Array.isArray(body)) return c.json({ error: "Se esperaba una lista de recetas." }, 400);
    const recipes = body
      .filter((item: unknown) => item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string" && typeof (item as { name?: unknown }).name === "string")
      .map((item: { id: string; name: string }) => ({ id: item.id.trim().slice(0, 100), name: item.name.trim().slice(0, 180) }))
      .filter((item: { id: string; name: string }) => item.id && item.name)
      .slice(0, 100);
    if (!recipes.length) return c.json({ error: "Añade al menos una receta válida." }, 400);
    const shortened = await shortenRecipeNames(recipes);
    return c.json(shortened);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`POST /chef/shorten failed: ${message}`);
    return c.json({ error: `No pudimos acortar los nombres. ${message.slice(0, 500)}` }, 502);
  }
});

Deno.serve(app.fetch);
