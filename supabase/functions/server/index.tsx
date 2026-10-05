import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js";
import { registerAI } from "./ai.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-b709b97b/health", (c) => {
  return c.json({ status: "ok" });
});

const P = "/make-server-b709b97b";
const STATE_KEY = "casita:shared-state";
const looksLikeState = (v: any) => v && typeof v === "object" && Array.isArray(v.people) && v.stock;

// Shared household state (versioned). Migrates any older stored state on first read.
async function readState(): Promise<{ state: any; version: number; updatedAt: number }> {
  const cur = await kv.get(STATE_KEY);
  if (cur?.state) return cur;
  const all = await kv.getByPrefix("");
  for (const v of all) {
    if (looksLikeState(v?.state)) return { state: v.state, version: v.version ?? 1, updatedAt: v.updatedAt ?? Date.now() };
    if (looksLikeState(v)) return { state: v, version: 1, updatedAt: Date.now() };
  }
  return { state: null, version: 0, updatedAt: 0 };
}

app.get(`${P}/state`, async (c) => {
  try { return c.json(await readState()); }
  catch (e) { console.log(`GET /state failed: ${e}`); return c.json({ error: `${e}` }, 500); }
});

app.get(`${P}/state/version`, async (c) => {
  try { const s = await readState(); return c.json({ version: s.version, updatedAt: s.updatedAt }); }
  catch (e) { console.log(`GET /state/version failed: ${e}`); return c.json({ error: `${e}` }, 500); }
});

app.put(`${P}/state`, async (c) => {
  try {
    const state = await c.req.json();
    const prev = await readState();
    const next = { state, version: (prev.version ?? 0) + 1, updatedAt: Date.now() };
    await kv.set(STATE_KEY, next);
    return c.json({ ok: true, version: next.version, updatedAt: next.updatedAt });
  } catch (e) { console.log(`PUT /state failed: ${e}`); return c.json({ error: `${e}` }, 500); }
});

// Avatars → private bucket, served through long-lived signed URLs.
const BUCKET = "make-b709b97b-avatars";
const sb = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const client = sb();
  const { data } = await client.storage.listBuckets();
  if (!data?.some((b) => b.name === BUCKET)) await client.storage.createBucket(BUCKET, { public: false });
  bucketReady = true;
}

app.post(`${P}/avatar`, async (c) => {
  try {
    await ensureBucket();
    const form = await c.req.formData();
    const file = form.get("file") as File | null;
    const personId = String(form.get("personId") ?? "anon");
    if (!file) return c.json({ error: "missing file" }, 400);
    const path = `${personId}-${Date.now()}.jpg`;
    const client = sb();
    const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
    if (error) throw error;
    const { data, error: e2 } = await client.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (e2) throw e2;
    return c.json({ url: data.signedUrl });
  } catch (e) { console.log(`POST /avatar failed: ${e}`); return c.json({ error: `${e}` }, 500); }
});

// AI routes (recipes + photos) live in ./ai.tsx
registerAI(app, P);

Deno.serve(app.fetch);
