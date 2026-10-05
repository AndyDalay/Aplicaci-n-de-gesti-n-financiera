import { projectId, publicAnonKey } from "/utils/supabase/info";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-b709b97b`;

const headers = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${publicAnonKey}`,
  ...extra,
});

export async function fetchState(): Promise<{ state: any; version: number } | null> {
  try {
    const res = await fetch(`${BASE}/state`, { headers: headers() });
    if (!res.ok) {
      console.log(`fetchState non-ok response while loading shared state: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.log(`fetchState network error while loading shared state: ${e}`);
    return null;
  }
}

export async function fetchVersion(): Promise<{ version: number; updatedAt: number } | null> {
  try {
    const res = await fetch(`${BASE}/state/version`, { headers: headers() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.log(`fetchVersion network error during polling: ${e}`);
    return null;
  }
}

export async function pushState(payload: any): Promise<{ ok: boolean; version: number; updatedAt: number } | null> {
  try {
    const res = await fetch(`${BASE}/state`, {
      method: "PUT",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.log(`pushState non-ok response while saving shared state: ${res.status} ${text}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.log(`pushState network error while saving shared state: ${e}`);
    return null;
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
  emoji: string;
  minutes: number;
  servings?: number;
  description: string;
  ingredients: { name: string; qty: string }[];
  steps: string[];
};

export async function fetchRecipeSuggestions(ctx: { couple: string; inventory: string; missing: string; planned: string; slot?: string }): Promise<AISuggestion[]> {
  const res = await fetch(`${BASE}/ai/recipes`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(ctx),
  });
  const data = await res.json().catch(() => ({}));
  if (Array.isArray(data.suggestions)) {
    data.suggestions = data.suggestions.map((s: AISuggestion) => ({
      ...s,
      ingredients: Array.isArray(s.ingredients) ? s.ingredients : [],
      steps: (Array.isArray(s.steps) ? s.steps : [String(s.steps ?? "")]).map((x) => String(x).trim()).filter(Boolean),
    }));
  }
  if (!res.ok || !Array.isArray(data.suggestions)) {
    console.log(`fetchRecipeSuggestions failed: ${res.status} ${data.error ?? ""}`);
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data.suggestions;
}


const photoCache = new Map<string, Promise<string>>();

/** Asks the server for a product-style photo of the dish (cached server-side by name). Rejects on any failure. */
export function fetchRecipePhoto(name: string, ingredients: string[]): Promise<string> {
  const k = name.trim().toLowerCase();
  const hit = photoCache.get(k);
  if (hit) return hit;
  const p = (async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
    const res = await fetch(`${BASE}/ai/photo`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, ingredients }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.url !== "string") {
      console.log(`fetchRecipePhoto failed: ${res.status} ${data.error ?? ""}`);
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    return data.url as string;
  })();
  photoCache.set(k, p);
  p.catch(() => photoCache.delete(k));
  return p;
}
