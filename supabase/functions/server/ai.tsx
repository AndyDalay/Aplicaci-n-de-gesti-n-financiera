import { createClient } from "npm:@supabase/supabase-js";

const SYSTEM = `Eres un chef cubano con 30 años de experiencia en cocina casera y escribes recetas que cualquiera puede seguir al pie de la letra. Cocinas para una pareja en Cuba con ingredientes accesibles allí (arroz, frijoles, viandas, cerdo, pollo, huevo, picadillo, col, tomate, etc.).

Escribes UNA receta COMPLETA y REALISTA del tipo pedido. Obligatorio:
- Es un plato de verdad de la cocina cubana o criolla (ej.: picadillo, arroz con pollo, frijoles negros, ropa vieja, fricasé, tortilla, boliche, viandas con mojo...). NUNCA "pela y cómelo", ni hervir todo en agua sin sazón.
- Ingredientes COMPLETOS (entre 7 y 12): proteína o base principal + vegetales + sazón. SIEMPRE incluye sal, aceite, ajo y cebolla (o ají/pimiento) cuando el plato lo lleve, más condimentos como comino, orégano, laurel, vinagre, limón o naranja agria. Cada ingrediente con cantidad concreta para 2 personas (g, tazas, cucharadas, dientes, unidades). Proporciones lógicas: ~150-200 g de proteína por persona, ~1/2 taza de arroz crudo por persona, ~1 taza de frijoles cocidos por persona, etc.
- El inventario es una preferencia, no un límite: usa lo que hay, pero el plato debe quedar bien hecho aunque falten ingredientes básicos (sal, ajo, cebolla, aceite, especias se asumen de despensa salvo que estén agotados).
- Entre 6 y 9 pasos, en orden cronológico. Cada paso es 1-3 frases con detalle: tamaño de corte ("pica la cebolla en cuadritos de 0.5 cm", "corta el pollo en trozos de 3-4 cm"), tipo de cocción (sofreír, dorar, hervir a fuego lento, hornear), nivel de fuego, tiempos ("5 minutos hasta que la cebolla esté transparente") y señales de punto ("hasta que el arroz esté seco y suelto"). Incluye marinar/remojar si aplica, el orden en que entran los ingredientes y el reposo final.
- El tiempo total ("minutes") debe ser coherente con los pasos.

Responde SOLO JSON válido, sin texto extra ni markdown, con este formato:
{"scale":"rapido|saludable|elegante","name":"","emoji":"","minutes":0,"servings":2,"description":"una frase apetitosa","ingredients":[{"name":"","qty":""}],"steps":[""]}
Todo en español de Cuba, claro y directo.

EJEMPLO de nivel de detalle esperado (otro plato):
{"scale":"rapido","name":"Picadillo a la cubana","emoji":"🍛","minutes":35,"servings":2,"description":"Carne molida sofrita con aceitunas y pasas, jugosa y de sabor intenso.","ingredients":[{"name":"Carne molida","qty":"350 g"},{"name":"Cebolla","qty":"1 mediana"},{"name":"Ají pimiento","qty":"1/2 unidad"},{"name":"Ajo","qty":"3 dientes"},{"name":"Salsa de tomate","qty":"4 cucharadas"},{"name":"Comino molido","qty":"1/2 cucharadita"},{"name":"Orégano","qty":"1/2 cucharadita"},{"name":"Aceite","qty":"2 cucharadas"},{"name":"Vino seco o vinagre","qty":"2 cucharadas"},{"name":"Sal","qty":"1 cucharadita"},{"name":"Aceitunas","qty":"8 unidades"}],"steps":["Pica la cebolla y el ají en cuadritos de 0.5 cm y machaca los ajos con una pizca de sal hasta hacer una pasta.","Calienta el aceite en una sartén grande a fuego medio. Sofríe la cebolla y el ají 5 minutos, removiendo, hasta que la cebolla esté transparente.","Añade el ajo machacado y cocina 1 minuto más, sin dejar que se queme.","Sube el fuego a medio-alto, agrega la carne y desmenúzala con una cuchara de madera. Cocina 6-8 minutos hasta que pierda el color rosado.","Incorpora el comino, el orégano, la sal y el vino. Mezcla y deja que el líquido casi se evapore, 2 minutos.","Agrega la salsa de tomate y media taza de agua. Baja a fuego lento, tapa y cocina 12 minutos removiendo de vez en cuando, hasta que espese.","Añade las aceitunas, prueba y rectifica la sal. Deja reposar 3 minutos antes de servir con arroz blanco."]}`;

const SCALE_BRIEF: Record<string, string> = {
  rapido: 'scale "rapido": plato sustancioso que se hace en menos de 35 minutos.',
  saludable: 'scale "saludable": plato equilibrado con vegetales o viandas, poca fritura (guisado, al horno, salteado).',
  elegante: 'scale "elegante": plato especial para una cena en pareja, con más técnica y buena presentación, sin ingredientes imposibles en Cuba.',
};

// Free-tier models ordered by cooking quality. Unavailable/decommissioned ones are skipped automatically.
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "moonshotai/kimi-k2-instruct", "qwen/qwen3-32b"];
const HF_MODELS = ["Qwen/Qwen2.5-72B-Instruct", "meta-llama/Llama-3.3-70B-Instruct", "deepseek-ai/DeepSeek-V3", "meta-llama/Llama-3.1-8B-Instruct"];
const HF_IMAGE_MODELS = ["black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-xl-base-1.0", "runwayml/stable-diffusion-v1-5"];

type Sug = { scale: string; name: string; steps: string[]; ingredients: { name: string; qty: string }[]; [k: string]: any };

function toSteps(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  const out: string[] = [];
  for (const p of parts) {
    const text = typeof p === "string" ? p : (p as any)?.text ?? (p as any)?.step ?? "";
    if (typeof text !== "string") continue;
    const chunks = text.split(/\n+|(?<=[.;])\s+(?=\d{1,2}[.)]\s)|\s+(?=\d{1,2}[.)]\s+[A-ZÁÉÍÓÚÑ])/);
    for (const c of chunks) {
      const clean = c.replace(/^\s*(paso\s*)?\d{1,2}\s*[.):-]\s*/i, "").replace(/^[-•*]\s*/, "").trim();
      if (clean) out.push(clean);
    }
  }
  return out;
}

function parseOne(text: string): Sug {
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no JSON in model output");
  let o = JSON.parse(clean.slice(start, end + 1));
  if (Array.isArray(o.suggestions)) o = o.suggestions[0];
  if (!o?.name) throw new Error("missing recipe name");
  return {
    ...o,
    ingredients: Array.isArray(o.ingredients) ? o.ingredients.filter((i: any) => i?.name).map((i: any) => ({ name: String(i.name), qty: String(i.qty ?? "") })) : [],
    steps: toSteps(o.steps ?? o.instructions ?? o.preparation),
  };
}

/** 0 = unusable; higher is better. Rejects the "pela y cómelo" kind of output. */
function quality(r: Sug): number {
  const ing = r.ingredients.length, st = r.steps.length;
  const avg = st ? r.steps.reduce((n, s) => n + s.length, 0) / st : 0;
  const hasSalt = r.ingredients.some((i) => /\bsal\b/i.test(i.name));
  const lazy = r.steps.some((s) => /pela .*c[oó]melo|c[oó]melo/i.test(s));
  if (ing < 4 || st < 4 || avg < 30 || lazy) return 0;
  return Math.min(ing, 10) + Math.min(st, 8) + Math.min(avg / 20, 6) + (hasSalt ? 3 : 0) + (ing >= 7 ? 2 : 0);
}
const GOOD = 22;

async function chat(url: string, key: string, model: string, user: string, json: boolean) {
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: /gpt-oss|qwen3|deepseek/i.test(model) ? 6000 : 2600,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      ...(/gpt-oss/.test(model) ? { reasoning_effort: "medium" } : {}),
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`${model} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return (data.choices?.[0]?.message?.content ?? "") as string;
}

async function suggestOne(user: string, scale: string): Promise<Sug> {
  const prompt = `${user}\nEscribe UNA receta. ${SCALE_BRIEF[scale]}`;
  const providers = [
    { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", env: "GROQ_API_KEY", models: GROQ_MODELS, json: true },
    { name: "HF", url: "https://router.huggingface.co/v1/chat/completions", env: "HF_API_KEY", models: HF_MODELS, json: false },
  ];
  const errors: string[] = [];
  let best: { r: Sug; q: number } | null = null;
  for (const p of providers) {
    const key = Deno.env.get(p.env);
    if (!key) { errors.push(`${p.env} not set`); continue; }
    for (const model of p.models) {
      try {
        const r = parseOne(await chat(p.url, key, model, prompt, p.json));
        const q = quality(r);
        console.log(`recipe ${scale} via ${model}: quality ${q.toFixed(1)}`);
        if (q >= GOOD) return { ...r, scale };
        if (q > 0 && (!best || q > best.q)) best = { r: { ...r, scale }, q };
        errors.push(`${p.name} ${model}: calidad ${q.toFixed(1)}`);
      } catch (e) {
        errors.push(`${p.name} ${e}`);
        console.log(`AI model failed: ${e}`);
      }
    }
  }
  if (best) return best.r;
  throw new Error(errors.join(" | "));
}

async function suggest(user: string) {
  const scales = ["rapido", "saludable", "elegante"];
  const res = await Promise.allSettled(scales.map((s) => suggestOne(user, s)));
  const ok = res.filter((r): r is PromiseFulfilledResult<Sug> => r.status === "fulfilled").map((r) => r.value);
  if (!ok.length) throw new Error(res.map((r) => (r as PromiseRejectedResult).reason).join(" || "));
  return ok;
}

// ---------- Recipe photos ----------
const PHOTO_BUCKET = "make-b709b97b-recipe-photos";
const sb = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
let photoBucketReady = false;

async function ensurePhotoBucket() {
  if (photoBucketReady) return;
  const { data } = await sb().storage.listBuckets();
  if (!data?.some((b) => b.name === PHOTO_BUCKET)) await sb().storage.createBucket(PHOTO_BUCKET, { public: true });
  photoBucketReady = true;
}

async function hashKey(text: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text.toLowerCase().trim()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

const extFor = (type: string) => (type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg");

async function generateImage(prompt: string): Promise<{ bytes: Uint8Array; type: string; source: string }> {
  const errors: string[] = [];
  const hf = Deno.env.get("HF_API_KEY");
  if (hf) {
    for (const model of HF_IMAGE_MODELS) {
      try {
        const r = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${hf}`, "Content-Type": "application/json", Accept: "image/jpeg" },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({ inputs: prompt, parameters: { width: 768, height: 576 } }),
        });
        const type = r.headers.get("content-type") ?? "";
        if (!r.ok || !type.startsWith("image/")) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
        return { bytes: new Uint8Array(await r.arrayBuffer()), type, source: model };
      } catch (e) { errors.push(`${model}: ${e}`); console.log(`image model failed: ${model}: ${e}`); }
    }
  } else errors.push("HF_API_KEY not set");

  // Keyless fallback.
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=768&height=576&nologo=true`;
    const r = await fetch(url, { signal: AbortSignal.timeout(40000) });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !type.startsWith("image/")) throw new Error(`${r.status}`);
    return { bytes: new Uint8Array(await r.arrayBuffer()), type, source: "pollinations" };
  } catch (e) { errors.push(`pollinations: ${e}`); }
  throw new Error(errors.join(" | "));
}


// ---------- Real photo search (preferred over generation) ----------
type Cand = { url: string; title: string; source: string };

async function groqJSON(model: string, messages: any[], max = 400): Promise<any> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY not set");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ model, temperature: 0, max_tokens: max, response_format: { type: "json_object" }, messages }),
  });
  if (!r.ok) throw new Error(`${model} ${r.status}`);
  const data = await r.json();
  return JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
}

/** Spanish dish name -> English search queries (specific first, generic last). */
async function searchQueries(name: string, ingredients: string[]): Promise<string[]> {
  for (const model of ["llama-3.3-70b-versatile", "openai/gpt-oss-20b"]) {
    try {
      const o = await groqJSON(model, [
        { role: "system", content: 'You translate Cuban/Latin dish names into photo-search queries. Reply JSON: {"queries":["...","...","..."]}. 3 queries in English, most specific first (dish + "cuban" if it is a Cuban dish), last one generic (e.g. "rice and chicken plate"). No quotes inside, max 6 words each.' },
        { role: "user", content: `Dish: ${name}. Main ingredients: ${ingredients.slice(0, 5).join(", ")}` },
      ]);
      const q = (o.queries ?? []).filter((x: any) => typeof x === "string" && x.trim()).slice(0, 3);
      if (q.length) return q;
    } catch (e) { console.log(`queries failed ${model}: ${e}`); }
  }
  return [`${name} dish`, `${ingredients[0] ?? "home cooked"} plate food`];
}

async function jget(url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function searchPhotos(q: string): Promise<Cand[]> {
  const out: Cand[] = [];
  const jobs: Promise<void>[] = [];
  const px = Deno.env.get("PEXELS_API_KEY");
  if (px) jobs.push(jget(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q + " food")}&per_page=6&orientation=landscape`, { headers: { Authorization: px } })
    .then((d) => { for (const p of d.photos ?? []) out.push({ url: p.src?.large, title: p.alt ?? "", source: "pexels" }); }).catch((e) => console.log(`pexels: ${e}`)));
  const un = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (un) jobs.push(jget(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q + " food")}&per_page=6&orientation=landscape`, { headers: { Authorization: `Client-ID ${un}` } })
    .then((d) => { for (const p of d.results ?? []) out.push({ url: `${p.urls?.raw}&w=900&q=70&fm=jpg&fit=crop`, title: p.alt_description ?? "", source: "unsplash" }); }).catch((e) => console.log(`unsplash: ${e}`)));
  jobs.push(jget(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=8&category=photograph&extension=jpg&mature=false`)
    .then((d) => { for (const p of d.results ?? []) out.push({ url: p.thumbnail || p.url, title: p.title ?? "", source: "openverse" }); }).catch((e) => console.log(`openverse: ${e}`)));
  jobs.push(jget(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(q + " filetype:bitmap")}&prop=imageinfo&iiprop=url|mime&iiurlwidth=900`)
    .then((d) => { for (const p of Object.values<any>(d.query?.pages ?? {})) { const ii = p.imageinfo?.[0]; if (ii?.mime === "image/jpeg") out.push({ url: ii.thumburl, title: String(p.title ?? "").replace(/^File:/, ""), source: "commons" }); } }).catch((e) => console.log(`commons: ${e}`)));
  await Promise.all(jobs);
  const seen = new Set<string>();
  return out.filter((c) => c.url && !seen.has(c.url) && seen.add(c.url));
}

/** Vision model picks the candidate that really shows the dish. Returns null if none is convincing. */
async function pickBest(name: string, cands: Cand[]): Promise<Cand | null> {
  const list = cands.slice(0, 8);
  if (!list.length) return null;
  try {
    const o = await groqJSON("meta-llama/llama-4-scout-17b-16e-instruct", [{
      role: "user",
      content: [
        { type: "text", text: `Dish: "${name}". Images are numbered 0..${list.length - 1}. Choose the one that best shows this dish (or a very similar plated dish) as an appetizing, clear food photo: no people, no text, no packaging, no raw ingredients only. Reply JSON {"index": n, "match": true|false}. match=false if none looks like the dish.` },
        ...list.map((c) => ({ type: "image_url", image_url: { url: c.url } })),
      ],
    }], 100);
    if (o.match === false) return null;
    const i = Number(o.index);
    return Number.isInteger(i) && list[i] ? list[i] : list[0];
  } catch (e) { console.log(`vision pick failed: ${e}`); return list[0]; }
}

async function findRealPhoto(name: string, ingredients: string[]): Promise<{ bytes: Uint8Array; type: string; source: string } | null> {
  const queries = await searchQueries(name, ingredients);
  console.log(`photo queries for ${name}: ${queries.join(" | ")}`);
  for (const q of queries) {
    const cands = await searchPhotos(q);
    const best = await pickBest(name, cands);
    if (!best) continue;
    try {
      const r = await fetch(best.url, { signal: AbortSignal.timeout(15000) });
      const type = r.headers.get("content-type") ?? "";
      if (!r.ok || !type.startsWith("image/")) throw new Error(`${r.status}`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.length > 1_500_000) continue;
      return { bytes, type, source: `${best.source}: ${q}` };
    } catch (e) { console.log(`download failed: ${e}`); }
  }
  return null;
}

export function registerAI(app: any, P: string) {
  app.post(`${P}/ai/recipes`, async (c: any) => {
    try {
      const { couple, inventory, missing, planned, slot } = await c.req.json();
      const user = [
        `Pareja: ${couple}.`,
        `Inventario disponible: ${inventory || "casi vacío"}.`,
        missing ? `Agotado: ${missing}.` : "",
        `Ya planificado esta semana: ${planned || "nada"}.`,
        slot ? `Comida a cubrir: ${slot}.` : "",
      ].filter(Boolean).join("\n");
      return c.json({ suggestions: await suggest(user) });
    } catch (e) { console.log(`POST /ai/recipes failed: ${e}`); return c.json({ error: `${e}` }, 502); }
  });

  app.post(`${P}/ai/photo`, async (c: any) => {
    try {
      const { name, ingredients } = await c.req.json();
      if (!name || typeof name !== "string") return c.json({ error: "missing name" }, 400);
      await ensurePhotoBucket();
      const key = await hashKey(name);
      const store = sb().storage.from(PHOTO_BUCKET);

      const { data: found } = await store.list("", { search: key, limit: 1 });
      const hit = found?.find((f) => f.name.startsWith(key));
      if (hit) return c.json({ url: store.getPublicUrl(hit.name).data.publicUrl, cached: true });

      const list = Array.isArray(ingredients) ? ingredients.slice(0, 5).join(", ") : "";
      const prompt = `Realistic photo of ${name}${list ? `, containing ${list}` : ""}, served on a plain white plate, natural colors true to the real dish, neutral white background, soft daylight, shot slightly from above, no text, no people`;
      const img = (await findRealPhoto(name, Array.isArray(ingredients) ? ingredients : [])) ?? (await generateImage(prompt));
      const path = `${key}.${extFor(img.type)}`;
      const { error } = await store.upload(path, img.bytes, { contentType: img.type, cacheControl: "31536000", upsert: true });
      if (error) throw error;
      return c.json({ url: store.getPublicUrl(path).data.publicUrl, source: img.source });
    } catch (e) { console.log(`POST /ai/photo failed: ${e}`); return c.json({ error: `${e}` }, 502); }
  });
}
