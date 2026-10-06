import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { ChefInput, suggestChefRecipes } from "../_shared/llm.ts";

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
    const input: ChefInput = {
      couple: typeof body.couple === "string" ? body.couple.slice(0, 300) : "pareja cubana que cocina para 2 personas",
      inventory: typeof body.inventory === "string" ? body.inventory.slice(0, 5000) : "",
      missing: typeof body.missing === "string" ? body.missing.slice(0, 5000) : "",
      planned: typeof body.planned === "string" ? body.planned.slice(0, 2000) : "",
      slot: typeof body.slot === "string" ? body.slot.slice(0, 120) : undefined,
      craving,
      mustUse,
      onlyInventory: body.onlyInventory === true,
    };
    const suggestions = await suggestChefRecipes(input);
    return c.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`POST /chef/recipes failed: ${message}`);
    return c.json({ error: `No pudimos preparar las ideas. ${message.slice(0, 900)}` }, 502);
  }
});

Deno.serve(app.fetch);
