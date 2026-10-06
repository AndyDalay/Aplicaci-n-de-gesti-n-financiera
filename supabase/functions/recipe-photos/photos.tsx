// Recipe photos: stock search (Magnific) + vision check + upload, streamed as NDJSON progress events.
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const BUCKET = "recipe-photos";
const API = "https://api.magnific.com";
const TOTAL_MS = 70_000; // global budget for one /recipe-image request
const MAX_BYTES = 5 * 1024 * 1024;

const env = (k: string) => Deno.env.get(k) ?? "";
const list = (v: string, d: string[]) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : d);
const sb = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const minScore = () => Number(env("PHOTO_MIN_SCORE") || "6.5");

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
class StageError extends Error {
  constructor(public stage: string, message: string, public detail?: string) { super(message); }
}

type Send = (e: Record<string, unknown>) => void;

function describe(e: unknown, who = "Magnific"): string {
  if (e instanceof HttpError) {
    if (e.status === 401) return `${who} rechazó la clave (401). Revisa que MAGNIFIC_API_KEY sea correcta.`;
    if (e.status === 403) return `${who} negó el acceso (403): ${e.message}`;
    if (e.status === 429) return `${who} alcanzó el límite de uso (429): ${e.message}`;
    if (e.status >= 500) return `${who} no está disponible ahora (${e.status}).`;
    return `${who} respondió ${e.status}: ${e.message}`;
  }
  const n = (e as any)?.name;
  if (n === "TimeoutError" || n === "AbortError") return `${who} tardó demasiado en responder (timeout).`;
  return e instanceof Error ? e.message : String(e);
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

async function hashKey(text: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

const extFor = (type: string) => (type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg");

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { data } = await sb().storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await sb().storage.createBucket(BUCKET, {
      public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
    });
    if (error && !/exist/i.test(error.message)) throw error;
  }
  bucketReady = true;
}

// ---------- Magnific ----------
async function magnific(path: string, params: Record<string, string>, opts: { lang?: string; timeout?: number } = {}) {
  const key = env("MAGNIFIC_API_KEY");
  if (!key) throw new StageError("config", "Falta el secret MAGNIFIC_API_KEY en Supabase (Edge Functions > Secrets).");
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, {
    headers: { "x-magnific-api-key": key, Accept: "application/json", "Accept-Language": opts.lang ?? "en-US" },
    signal: AbortSignal.timeout(opts.timeout ?? 15000),
  });
  const text = await r.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  if (!r.ok) throw new HttpError(r.status, body?.message ?? body?.problem?.message ?? text.slice(0, 160));
  return body;
}

type Cand = { id: number; title: string; preview: string; author: string; link: string };

async function searchStock(term: string, lang: string, exclude: Set<number>): Promise<Cand[]> {
  const params: Record<string, string> = {
    term, limit: "12", order: "relevance",
    "filters[content_type][photo]": "1",
    "filters[ai-generated][excluded]": "1",
    "filters[orientation][landscape]": "1",
    "filters[orientation][square]": "1",
  };
  if (env("ALLOW_PREMIUM_STOCK") !== "true") params["filters[license][freemium]"] = "1";
  const body = await magnific("/v1/resources", params, { lang });
  const out: Cand[] = [];
  for (const d of body?.data ?? []) {
    const preview = d?.image?.source?.url;
    if (!d?.id || !preview || (d.image?.type ?? "photo") !== "photo" || exclude.has(d.id)) continue;
    out.push({ id: d.id, title: String(d.title ?? ""), preview, author: String(d.author?.name ?? "Autor"), link: String(d.url ?? "") });
  }
  return out;
}

async function downloadStock(id: number): Promise<{ bytes: Uint8Array; type: string }> {
  const dl = await magnific(`/v1/resources/${id}/download`, { image_size: "1000px" }, { timeout: 20000 });
  const fileUrl: string | undefined = dl?.data?.url ?? dl?.data?.signed_url;
  if (!fileUrl) throw new Error("Magnific no devolvió un enlace de descarga.");
  const r = await fetch(fileUrl, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new HttpError(r.status, "falló la descarga del archivo");
  const type = (r.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!/^image\/(jpeg|png|webp)$/.test(type)) throw new Error(`El archivo descargado no es una imagen compatible (${type || "tipo desconocido"}).`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error("La foto descargada pesa más de 5 MB.");
  return { bytes, type };
}

// ---------- LLMs (Groq + HuggingFace) ----------
async function chatCompletion(url: string, key: string, model: string, messages: unknown[], timeout: number, maxTokens: number) {
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeout),
    body: JSON.stringify({ model, temperature: 0.2, max_tokens: maxTokens, messages }),
  });
  if (!r.ok) throw new HttpError(r.status, (await r.text()).slice(0, 160));
  const data = await r.json();
  const text = String(data.choices?.[0]?.message?.content ?? "");
  if (!text.trim()) throw new Error("respuesta vacía");
  return text;
}

function providers(kind: "text" | "vision") {
  const t = kind === "text";
  return [
    {
      name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", key: env("GROQ_API_KEY"),
      models: list(env(t ? "GROQ_TEXT_MODEL" : "GROQ_VISION_MODEL"),
        t ? ["llama-3.3-70b-versatile", "openai/gpt-oss-20b"] : ["meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"]),
    },
    {
      name: "HuggingFace", url: "https://router.huggingface.co/v1/chat/completions", key: env("HF_API_KEY"),
      models: list(env(t ? "HF_TEXT_MODEL" : "HF_VISION_MODEL"),
        t ? ["Qwen/Qwen2.5-72B-Instruct"] : ["Qwen/Qwen2.5-VL-72B-Instruct", "Qwen/Qwen2.5-VL-7B-Instruct"]),
    },
  ];
}

function parseJson(text: string): any {
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("respuesta sin JSON");
  return JSON.parse(clean.slice(s, e + 1));
}

/** Tries every provider/model until one returns parseable JSON. Returns null if all fail. */
async function askJson(kind: "text" | "vision", messages: unknown[], timeout: number, maxTokens: number): Promise<{ json: any; via: string } | null> {
  for (const p of providers(kind)) {
    if (!p.key) continue;
    for (const model of p.models) {
      try {
        const json = parseJson(await chatCompletion(p.url, p.key, model, messages, timeout, maxTokens));
        return { json, via: `${p.name} (${model.split("/").pop()})` };
      } catch (e) { console.log(`${kind} model failed: ${p.name} ${model}: ${describe(e, p.name)}`); }
    }
  }
  return null;
}

const QUERY_SYSTEM = `Preparas búsquedas de fotos de stock para platos de comida. Responde SOLO JSON:
{"cuisine":"origen de la cocina en inglés (cuban, italian, spanish...)","queries":["3 búsquedas en INGLÉS, de la más específica a la más genérica, 2 a 5 palabras cada una, que describan el plato ya servido"]}
Conserva el origen cultural del plato. Ejemplo: "Congrí con masas de cerdo" -> {"cuisine":"cuban","queries":["cuban congri pork","cuban black beans rice pork","rice black beans pork plate"]}`;

async function buildQueries(name: string, ingredients: string[]) {
  const r = await askJson("text", [
    { role: "system", content: QUERY_SYSTEM },
    { role: "user", content: `Plato: "${name}"\nIngredientes: ${ingredients.join(", ") || "no indicados"}` },
  ], 15000, 400);
  const queries = (Array.isArray(r?.json?.queries) ? r!.json.queries : []).map((q: any) => String(q).trim()).filter(Boolean).slice(0, 3);
  if (r && queries.length) return { queries: queries as string[], cuisine: String(r.json.cuisine ?? ""), viaAi: true };
  return { queries: [name], cuisine: "", viaAi: false };
}

type Score = { n: number; total: number; reason: string };

async function scoreBatch(batch: Cand[], name: string, ingredients: string[], cuisine: string): Promise<{ scores: Score[]; via: string } | null> {
  const prompt = `Eres editor de fotografía culinaria. Evalúa cada imagen numerada como foto para la tarjeta de la receta "${name}"${cuisine ? ` (cocina ${cuisine})` : ""}. Ingredientes: ${ingredients.join(", ") || "n/d"}.
Por imagen puntúa de 0 a 10: dish_match (¿es ese plato o muy parecido, con sus ingredientes visibles?), cuisine_match (¿luce de la cocina correcta? comida asiática o mexicana para un plato cubano = 0 a 3), photo_quality (nitidez, luz, encuadre). Indica has_text (texto, logos o marca de agua visibles) y has_people (personas o manos visibles).
Responde SOLO JSON: {"results":[{"n":1,"dish_match":0,"cuisine_match":0,"photo_quality":0,"has_text":false,"has_people":false,"reason":"máx 12 palabras en español sobre lo que se ve"}]}`;
  const content: unknown[] = [{ type: "text", text: prompt }];
  batch.forEach((c, i) => {
    content.push({ type: "text", text: `Imagen ${i + 1}:` });
    content.push({ type: "image_url", image_url: { url: c.preview } });
  });
  const r = await askJson("vision", [{ role: "user", content }], 25000, 900);
  if (!r) return null;
  const clamp = (v: unknown) => Math.max(0, Math.min(10, Number(v) || 0));
  const scores: Score[] = [];
  for (const it of Array.isArray(r.json?.results) ? r.json.results : []) {
    const n = Number(it?.n);
    if (!Number.isInteger(n) || n < 1 || n > batch.length) continue;
    const total = Math.max(0, clamp(it.dish_match) * 0.45 + clamp(it.cuisine_match) * 0.25 + clamp(it.photo_quality) * 0.3 - (it.has_text ? 3 : 0) - (it.has_people ? 1.5 : 0));
    scores.push({ n, total, reason: String(it.reason ?? "").slice(0, 120) });
  }
  return scores.length ? { scores, via: r.via } : null;
}

// ---------- AI image fallback (only on request) ----------
const HF_IMAGE_MODELS = ["black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-xl-base-1.0"];

async function generateImage(name: string, ingredients: string[]) {
  const list5 = ingredients.slice(0, 6).join(", ");
  const prompt = `Professional food photography of "${name}"${list5 ? `, with visible ${list5}` : ""}, home-cooked dish served on a ceramic plate, overhead 45 degree angle, natural window light, shallow depth of field, rustic wooden table, realistic textures, appetizing, no text, no people, no hands, no logos`;
  const negative = "cartoon, illustration, blurry, distorted food, extra utensils, text, watermark, plastic look";
  const errors: string[] = [];
  const hf = env("HF_API_KEY");
  if (hf) {
    for (const model of HF_IMAGE_MODELS) {
      try {
        const r = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${hf}`, "Content-Type": "application/json", Accept: "image/jpeg" },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({ inputs: prompt, parameters: { width: 768, height: 576, negative_prompt: negative } }),
        });
        const type = (r.headers.get("content-type") ?? "").split(";")[0];
        if (!r.ok || !type.startsWith("image/")) throw new Error(`${r.status} ${(await r.text()).slice(0, 100)}`);
        return { bytes: new Uint8Array(await r.arrayBuffer()), type, via: model };
      } catch (e) { errors.push(`${model}: ${describe(e, "HuggingFace")}`); }
    }
  } else errors.push("HF_API_KEY no configurada");
  try {
    const r = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=768&height=576&nologo=true`, { signal: AbortSignal.timeout(35000) });
    const type = (r.headers.get("content-type") ?? "").split(";")[0];
    if (!r.ok || !type.startsWith("image/")) throw new Error(`${r.status}`);
    return { bytes: new Uint8Array(await r.arrayBuffer()), type, via: "pollinations" };
  } catch (e) { errors.push(`pollinations: ${describe(e, "Pollinations")}`); }
  throw new StageError("ai", "No se pudo generar la imagen con IA.", errors.join(" | ").slice(0, 300));
}

// ---------- Pipeline ----------
async function saveImage(key: string, bytes: Uint8Array, type: string, oldPath?: string) {
  const store = sb().storage.from(BUCKET);
  const path = `${key}-${Date.now()}.${extFor(type)}`; // unique path so CDN/browser caches never serve a stale photo
  const { error } = await store.upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error) throw new StageError("save", `No se pudo guardar la foto: ${error.message}`);
  if (oldPath && oldPath !== path) await store.remove([oldPath]).catch(() => {});
  return { path, url: store.getPublicUrl(path).data.publicUrl };
}

async function pipeline(body: any, send: Send) {
  const t0 = Date.now();
  const left = () => TOTAL_MS - (Date.now() - t0);
  const name = String(body?.name ?? "").trim();
  if (!name) throw new StageError("servidor", "Falta el nombre de la receta.");
  const ingredients: string[] = Array.isArray(body?.ingredients) ? body.ingredients.slice(0, 8).map(String) : [];
  const aiMode = body?.mode === "ai";
  const force = !!body?.forceRefresh || aiMode;
  const key = await hashKey(norm(name));
  const kvKey = `recipe_image:${key}`;

  try { await ensureBucket(); }
  catch (e) { throw new StageError("storage", `No se pudo preparar el almacenamiento de fotos: ${describe(e, "Supabase")}`); }

  send({ stage: "cache", status: "start", message: `Revisando si ya hay una foto guardada de "${name}"…` });
  let prev: any = null;
  try { prev = await kv.get(kvKey); } catch (e) { console.log(`cache read failed: ${e}`); }
  if (prev?.url && !force) {
    send({ stage: "cache", status: "ok", message: "Ya había una foto guardada." });
    send({ stage: "done", status: "ok", message: "Lista.", result: { url: prev.url, meta: prev.meta, cached: true } });
    return;
  }
  send({ stage: "cache", status: "ok", message: force ? "Voy a buscar una foto distinta a la anterior." : "Todavía no hay foto guardada." });

  const tried: number[] = Array.isArray(prev?.tried) ? prev.tried : [];
  const persist = async (url: string, path: string, meta: Record<string, unknown>, stockId?: number) => {
    await kv.set(kvKey, { url, path, meta, tried: stockId ? [...tried, stockId] : tried, createdAt: Date.now() })
      .catch((e: unknown) => console.log(`cache write failed: ${e}`));
    send({ stage: "done", status: "ok", message: "Foto lista.", result: { url, meta } });
  };

  // --- AI image (explicit request only) ---
  if (aiMode) {
    send({ stage: "ai", status: "start", message: "Generando una imagen con IA (queda peor que una foto real)…" });
    const img = await generateImage(name, ingredients);
    send({ stage: "save", status: "start", message: "Guardando la imagen…" });
    const saved = await saveImage(key, img.bytes, img.type, prev?.path);
    await persist(saved.url, saved.path, { source: "ai" });
    return;
  }

  // --- Stock search ---
  send({ stage: "queries", status: "start", message: "Preparando las búsquedas con IA…" });
  const { queries, cuisine, viaAi } = await buildQueries(name, ingredients);
  send({
    stage: "queries", status: "ok",
    message: viaAi ? `Voy a buscar: ${queries.map((q) => `“${q}”`).join(", ")}.` : "La IA de texto no respondió; busco con el nombre original en español.",
  });

  const seen = new Set<number>(tried);
  let chosen: { c: Cand; total?: number } | null = null;
  let fallbackBest: { c: Cand; total: number } | null = null;
  let stockError: StageError | null = null;
  let reviewed = 0;

  for (const q of queries) {
    if (left() < 25_000) { send({ stage: "search", status: "skip", message: "Queda poco tiempo; dejo de buscar." }); break; }
    send({ stage: "search", status: "start", message: `Buscando en Magnific: “${q}”…` });
    let cands: Cand[];
    try {
      cands = await searchStock(q, viaAi ? "en-US" : "es-ES", seen);
    } catch (e) {
      const msg = describe(e);
      const fatal = e instanceof StageError || (e instanceof HttpError && [401, 403, 429].includes(e.status));
      stockError = e instanceof StageError ? e : new StageError("search", msg);
      if (fatal) break;
      send({ stage: "search", status: "error", message: `Esta búsqueda falló: ${msg} Pruebo otra.` });
      continue;
    }
    const fresh = cands.slice(0, 5);
    fresh.forEach((c) => seen.add(c.id));
    if (!fresh.length) { send({ stage: "search", status: "ok", message: `Sin resultados nuevos para “${q}”.` }); continue; }
    stockError = null;
    reviewed += fresh.length;
    send({ stage: "search", status: "ok", message: `${fresh.length} fotos candidatas para “${q}”.` });

    send({ stage: "vision", status: "start", message: `Revisando ${fresh.length} fotos con IA de visión…` });
    const res = await scoreBatch(fresh, name, ingredients, cuisine);
    if (!res) {
      send({ stage: "vision", status: "skip", message: "La IA de visión no respondió; uso la primera foto sin verificar." });
      chosen = { c: fresh[0] };
      break;
    }
    let best: { c: Cand; total: number } | null = null;
    for (const s of res.scores.sort((a, b) => a.n - b.n)) {
      send({ stage: "vision", status: "info", message: `Foto ${s.n}: ${s.total.toFixed(1)}/10 — ${s.reason || "sin comentario"}` });
      if (!best || s.total > best.total) best = { c: fresh[s.n - 1], total: s.total };
    }
    if (best && best.total >= minScore()) {
      chosen = best;
      send({ stage: "vision", status: "ok", message: `Elegí “${best.c.title.slice(0, 50)}” (${best.total.toFixed(1)}/10, revisada con ${res.via}).` });
      break;
    }
    if (best && best.total >= 5 && (!fallbackBest || best.total > fallbackBest.total)) fallbackBest = best;
    send({ stage: "vision", status: "skip", message: `Ninguna llegó a ${minScore()}/10; pruebo con otra búsqueda.` });
  }

  if (!chosen && fallbackBest) {
    chosen = fallbackBest;
    send({ stage: "vision", status: "info", message: `Uso la mejor disponible (${fallbackBest.total.toFixed(1)}/10).` });
  }
  if (!chosen) {
    if (stockError) throw stockError;
    throw new StageError("vision", `No encontré una foto de stock que se pareciera a "${name}" (revisé ${reviewed}).`, "Puedes subir tu propia foto o generar una con IA.");
  }

  // --- Download (the only step that spends Magnific credits) ---
  send({ stage: "download", status: "start", message: `Descargando la foto de ${chosen.c.author}…` });
  let file: { bytes: Uint8Array; type: string };
  try { file = await downloadStock(chosen.c.id); }
  catch (e) { throw new StageError("download", describe(e), `Foto ${chosen.c.id}`); }
  console.log(`recipe-image: downloaded stock ${chosen.c.id} for "${name}" (${Math.round(file.bytes.length / 1024)} KB)`);
  send({ stage: "download", status: "ok", message: `Descargada (${Math.round(file.bytes.length / 1024)} KB).` });

  send({ stage: "save", status: "start", message: "Guardando la foto en la nube…" });
  const saved = await saveImage(key, file.bytes, file.type, prev?.path);
  await persist(saved.url, saved.path, { source: "stock", credit: `Foto: ${chosen.c.author} · Magnific`, link: chosen.c.link }, chosen.c.id);
}

export function registerPhotos(app: any, P: string) {
  app.get(`${P}/recipe-image/health`, async (c: any) => {
    const out: Record<string, unknown> = {
      magnific_key: !!env("MAGNIFIC_API_KEY"), groq_key: !!env("GROQ_API_KEY"), hf_key: !!env("HF_API_KEY"),
      premium_allowed: env("ALLOW_PREMIUM_STOCK") === "true", bucket_ok: false, magnific: null,
    };
    try { await ensureBucket(); out.bucket_ok = true; } catch (e) { out.bucket_error = describe(e, "Supabase"); }
    if (out.magnific_key) {
      try {
        const b = await magnific("/v1/resources", { term: "rice", limit: "1", "filters[content_type][photo]": "1" });
        out.magnific = { ok: true, results: b?.data?.length ?? 0 };
      } catch (e) { out.magnific = { ok: false, status: e instanceof HttpError ? e.status : null, message: describe(e) }; }
    }
    return c.json(out);
  });

  app.post(`${P}/recipe-image`, async (c: any) => {
    let body: any;
    try { body = await c.req.json(); } catch { return c.json({ error: "JSON inválido" }, 400); }
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(ctrl) {
        const send: Send = (e) => { try { ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n")); } catch { /* client disconnected */ } };
        try { await pipeline(body, send); }
        catch (e) {
          if (e instanceof StageError) send({ stage: "error", status: "error", failedStage: e.stage, message: e.message, detail: e.detail });
          else { console.log(`recipe-image failed: ${e}`); send({ stage: "error", status: "error", failedStage: "servidor", message: describe(e, "El servidor") }); }
        } finally { try { ctrl.close(); } catch { /* already closed */ } }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "Access-Control-Allow-Origin": "*" },
    });
  });

  app.post(`${P}/recipe-image/upload`, async (c: any) => {
    try {
      await ensureBucket();
      const form = await c.req.formData();
      const file = form.get("file") as File | string | null;
      const recipeId = String(form.get("recipeId") ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "recipe";
      if (!file || typeof file === "string") return c.json({ error: "Falta el archivo de la foto." }, 400);
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return c.json({ error: `Formato no admitido (${file.type || "desconocido"}). Usa JPG, PNG o WebP.` }, 415);
      if (file.size > MAX_BYTES) return c.json({ error: "La foto pesa más de 5 MB." }, 413);
      const store = sb().storage.from(BUCKET);
      const path = `user-${recipeId}-${Date.now()}.${extFor(file.type)}`;
      const { error } = await store.upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) throw error;
      return c.json({ url: store.getPublicUrl(path).data.publicUrl, meta: { source: "user" } });
    } catch (e) { console.log(`POST /recipe-image/upload failed: ${e}`); return c.json({ error: describe(e, "Supabase") }, 500); }
  });
}
