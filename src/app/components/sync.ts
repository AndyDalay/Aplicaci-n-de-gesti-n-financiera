import { projectId, publicAnonKey } from "/utils/supabase/info";
import type { PhotoMeta } from "./data";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-b709b97b`;
const CHEF = `https://${projectId}.supabase.co/functions/v1/chef`;
/** Separate Edge Function for recipe photos (supabase/functions/recipe-photos). */
const PHOTOS = `https://${projectId}.supabase.co/functions/v1/recipe-photos`;

const headers = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${publicAnonKey}`,
  ...extra,
});

const SYNC_TIMEOUT_MS = 8_000;

async function fetchWithTimeout<T>(url: string, init: RequestInit, readResponse: (response: Response) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await readResponse(response);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchState(): Promise<{ state: any; version: number } | null> {
  try {
    return await fetchWithTimeout(`${BASE}/state`, { headers: headers() }, async (res) => {
      if (!res.ok) {
        console.log(`fetchState non-ok response while loading shared state: ${res.status}`);
        return null;
      }
      return await res.json();
    });
  } catch (e) {
    console.log(`fetchState network error while loading shared state: ${e}`);
    return null;
  }
}

export async function fetchVersion(): Promise<{ version: number; updatedAt: number } | null> {
  try {
    return await fetchWithTimeout(`${BASE}/state/version`, { headers: headers() }, async (res) => {
      if (!res.ok) return null;
      return await res.json();
    });
  } catch (e) {
    console.log(`fetchVersion network error during polling: ${e}`);
    return null;
  }
}

export type PushStateResult =
  | { ok: true; version: number; updatedAt: number }
  | { ok: false; status: number; error: string; state?: any; version?: number };

export async function pushState(payload: { state: any; baseVersion?: number }): Promise<PushStateResult> {
  try {
    return await fetchWithTimeout(`${BASE}/state`, {
      method: "PUT",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    }, async (res) => {
      if (res.status === 409) {
        const current = await res.json().catch(() => ({}));
        console.warn(`pushState conflict 409; server version ${current.version ?? "unknown"}`);
        return {
          ok: false as const,
          status: 409,
          error: "La versión compartida cambió en otro dispositivo.",
          state: current.state,
          version: current.version,
        };
      }
      if (!res.ok) {
        const text = await res.text();
        console.log(`pushState non-ok response while saving shared state: ${res.status} ${text}`);
        return { ok: false as const, status: res.status, error: text || `HTTP ${res.status}` };
      }
      return await res.json();
    });
  } catch (e) {
    console.log(`pushState network error while saving shared state: ${e}`);
    return { ok: false, status: 0, error: String(e) };
  }
}

export async function uploadAvatar(personId: string, file: File): Promise<string | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("personId", personId);
    const res = await fetch(`${BASE}/avatar`, {
      method: "POST",
      headers: headers(),
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      console.log(`uploadAvatar non-ok response for person ${personId}: ${res.status} ${text}`);
      return null;
    }
    const data = await res.json();
    return data.url ?? null;
  } catch (e) {
    console.log(`uploadAvatar network error for person ${personId}: ${e}`);
    return null;
  }
}

export type AISuggestion = {
  scale: "rapido" | "saludable" | "elegante";
  name: string;
  shortName?: string;
  missingNote?: string;
  emoji: string;
  minutes: number;
  servings?: number;
  description: string;
  ingredients: { name: string; qty: string; productId?: string; amount?: number; unit?: "g" | "ml" | "u" | "taza" | "cda" | "cdta"; note?: string }[];
  steps: string[];
};

export type RecipeSuggestionContext = {
  couple: string;
  inventory: string;
  missing: string;
  planned: string;
  slot?: string;
  craving?: string;
  mustUse?: string[];
  onlyInventory?: boolean;
  productCatalog?: { id: string; name: string }[];
};

async function requestSuggestions(url: string, ctx: RecipeSuggestionContext): Promise<AISuggestion[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(ctx),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data.suggestions)) {
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    return data.suggestions.map((suggestion: AISuggestion) => ({
      ...suggestion,
      ingredients: Array.isArray(suggestion.ingredients) ? suggestion.ingredients.map((ingredient) => ({
        ...ingredient,
        qty: ingredient.qty ?? (ingredient.amount !== undefined && ingredient.unit ? `${ingredient.amount} ${ingredient.unit}` : ""),
      })) : [],
      steps: (Array.isArray(suggestion.steps) ? suggestion.steps : [String(suggestion.steps ?? "")]).map((step) => String(step).trim()).filter(Boolean),
    }));
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRecipeSuggestions(ctx: RecipeSuggestionContext): Promise<AISuggestion[]> {
  try {
    return await requestSuggestions(`${CHEF}/chef/recipes`, ctx);
  } catch (chefError) {
    console.warn(`Chef suggestions failed; falling back to legacy route: ${chefError}`);
    try {
      return await requestSuggestions(`${BASE}/ai/recipes`, ctx);
    } catch (legacyError) {
      if ((chefError as Error)?.name === "AbortError" || (legacyError as Error)?.name === "AbortError") {
        throw new Error("La cocina tardó demasiado en responder. Comprueba tu conexión e inténtalo de nuevo.");
      }
      throw new Error(`No se pudieron generar ideas. Chef: ${String(chefError)}. Respaldo: ${String(legacyError)}`);
    }
  }
}

// ---------- Recipe photos ----------
export type PhotoEvent = {
  stage: string;
  status: "start" | "ok" | "skip" | "error" | "info";
  message: string;
  failedStage?: string;
  detail?: string;
  result?: { url: string; meta?: PhotoMeta; cached?: boolean };
};
export type PhotoResult = { url: string; meta: PhotoMeta; cached?: boolean };

export class PhotoError extends Error {
  constructor(public stage: string, message: string, public detail?: string) { super(message); }
}

export const STAGE_LABEL: Record<string, string> = {
  conexión: "Conexión", servidor: "Servidor", config: "Configuración", storage: "Almacenamiento",
  cache: "Revisando fotos guardadas", queries: "Preparando búsquedas", search: "Buscando en Magnific",
  vision: "Verificando con IA", download: "Descargando", save: "Guardando", ai: "Generando con IA",
  subida: "Subiendo tu foto", imagen: "Mostrando la foto",
};
const STAGE_PCT: Record<string, number> = { cache: 8, queries: 20, search: 38, vision: 62, download: 82, save: 93, ai: 50, subida: 60 };
export const stageProgress = (stage?: string) => STAGE_PCT[stage ?? ""] ?? 5;

const PHOTO_TIMEOUT_MS = 75_000;

async function streamPhoto(
  args: { name: string; ingredients: string[]; forceRefresh?: boolean; mode?: "stock" | "ai" },
  emit: (e: PhotoEvent) => void,
): Promise<PhotoResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new PhotoError("conexión", "Sin conexión a internet.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PHOTO_TIMEOUT_MS);
  let lastStage = "conexión";
  try {
    const res = await fetch(`${PHOTOS}/recipe-image`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(args),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new PhotoError(
        "servidor",
        res.status === 404 ? "El servidor no tiene el servicio de fotos desplegado (404)." : `El servidor respondió con error ${res.status}.`,
        text.slice(0, 200),
      );
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let result: PhotoResult | null = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev: PhotoEvent;
        try { ev = JSON.parse(line); } catch { continue; }
        if (ev.stage && ev.stage !== "error" && ev.stage !== "done") lastStage = ev.stage;
        emit(ev);
        if (ev.stage === "error") throw new PhotoError(ev.failedStage ?? lastStage, ev.message, ev.detail);
        if (ev.stage === "done" && ev.result?.url) result = { url: ev.result.url, meta: ev.result.meta ?? { source: "stock" }, cached: ev.result.cached };
      }
    }
    if (!result) throw new PhotoError(lastStage, "La conexión se cortó antes de terminar.");
    return result;
  } catch (e) {
    if (e instanceof PhotoError) throw e;
    if ((e as any)?.name === "AbortError") {
      throw new PhotoError(lastStage, `Se agotó el tiempo de espera (${PHOTO_TIMEOUT_MS / 1000} s) en la etapa «${STAGE_LABEL[lastStage] ?? lastStage}».`);
    }
    throw new PhotoError("conexión", "No se pudo conectar con el servidor.", String(e));
  } finally {
    clearTimeout(timer);
  }
}

// One request per recipe at a time: remounts/StrictMode share the same stream instead of spending credits twice.
const inflight = new Map<string, { listeners: Set<(e: PhotoEvent) => void>; last?: PhotoEvent; promise: Promise<PhotoResult> }>();

export function requestRecipePhoto(
  args: { name: string; ingredients: string[]; forceRefresh?: boolean; mode?: "stock" | "ai" },
  onEvent: (e: PhotoEvent) => void,
) {
  const k = `${args.name.trim().toLowerCase()}|${args.mode ?? "stock"}|${args.forceRefresh ? "f" : ""}`;
  let entry = inflight.get(k);
  if (!entry) {
    const listeners = new Set<(e: PhotoEvent) => void>();
    const e: { listeners: typeof listeners; last?: PhotoEvent; promise: Promise<PhotoResult> } = {
      listeners,
      promise: streamPhoto(args, (ev) => { e.last = ev; listeners.forEach((l) => l(ev)); }).finally(() => inflight.delete(k)),
    };
    e.promise.catch(() => {}); // errors are delivered to subscribers through `promise`
    inflight.set(k, e);
    entry = e;
  }
  entry.listeners.add(onEvent);
  if (entry.last) onEvent(entry.last);
  const own = entry;
  return { promise: own.promise, unsubscribe: () => own.listeners.delete(onEvent) };
}

/** Resizes to max 1000 px and re-encodes as WebP/JPEG so uploads are small and always a supported format (also converts HEIC where the browser can decode it). */
async function prepareImage(file: File, maxSide = 1000): Promise<Blob> {
  let bmp: ImageBitmap | HTMLImageElement;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bmp = await new Promise<HTMLImageElement>((ok, bad) => {
      const img = new Image();
      const u = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(u); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(u); bad(new Error("Este formato de imagen no se puede leer. Prueba con JPG o PNG.")); };
      img.src = u;
    });
  }
  const w = "naturalWidth" in bmp ? bmp.naturalWidth : bmp.width;
  const h = "naturalHeight" in bmp ? bmp.naturalHeight : bmp.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext("2d")!.drawImage(bmp as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, q));
  const blob = (await toBlob("image/webp", 0.82)) ?? (await toBlob("image/jpeg", 0.85));
  if (!blob) throw new Error("No se pudo preparar la imagen.");
  return blob;
}

export async function uploadRecipePhoto(file: File, recipeId: string | undefined, onStep: (msg: string) => void): Promise<PhotoResult> {
  let blob: Blob;
  try {
    onStep("Optimizando tu foto…");
    blob = await prepareImage(file);
  } catch (e) {
    throw new PhotoError("subida", e instanceof Error ? e.message : "No se pudo leer la imagen.");
  }
  onStep(`Subiendo tu foto (${Math.round(blob.size / 1024)} KB)…`);
  const form = new FormData();
  form.append("file", new File([blob], blob.type === "image/webp" ? "foto.webp" : "foto.jpg", { type: blob.type }));
  if (recipeId) form.append("recipeId", recipeId);
  try {
    const res = await fetch(`${PHOTOS}/recipe-image/upload`, { method: "POST", headers: headers(), body: form, signal: AbortSignal.timeout(40_000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.url !== "string") throw new PhotoError("subida", data.error ?? `El servidor respondió con error ${res.status}.`);
    return { url: data.url, meta: { source: "user" } };
  } catch (e) {
    if (e instanceof PhotoError) throw e;
    if ((e as any)?.name === "TimeoutError") throw new PhotoError("subida", "La subida tardó demasiado. Revisa tu conexión.");
    throw new PhotoError("conexión", "No se pudo conectar con el servidor.", String(e));
  }
}
