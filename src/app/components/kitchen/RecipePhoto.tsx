import { useEffect, useRef, useState } from "react";
import { PhotoMeta } from "../data";
import { PhotoError, PhotoEvent, requestRecipePhoto, STAGE_LABEL, stageProgress, uploadRecipePhoto } from "../sync";

type Phase = "searching" | "ready" | "error";
type Err = { stage: string; message: string; detail?: string };

const BTN = "rounded-full border-2 border-ink bg-white px-2.5 py-1 text-xs font-['Nunito:Bold'] font-bold active:translate-y-px";
const ROUND = "size-7 flex items-center justify-center rounded-full border-2 border-ink bg-white text-sm shadow-[2px_2px_0_0_rgba(0,0,0,0.25)] active:translate-y-px";

/**
 * Dish photo for a recipe card. Order of preference: the photo already saved on the recipe, a stock photo
 * (Magnific, verified by a vision model) or the photo the user uploads. While searching it narrates each step,
 * and it never waits forever: every failure shows the stage that failed with retry / upload / AI options.
 */
export function RecipePhoto({
  name, ingredients, url, meta, recipeId, onPhoto,
}: {
  name: string; ingredients: string[]; url?: string; meta?: PhotoMeta; recipeId?: string;
  onPhoto?: (url: string, meta?: PhotoMeta) => void;
}) {
  const [src, setSrc] = useState<string | undefined>(url);
  const [info, setInfo] = useState<PhotoMeta | undefined>(meta);
  const [phase, setPhase] = useState<Phase>(url ? "ready" : "searching");
  const [loaded, setLoaded] = useState(false);
  const [ev, setEv] = useState<PhotoEvent | null>(null);
  const [trail, setTrail] = useState<string[]>([]);
  const [err, setErr] = useState<Err | null>(null);
  const [secs, setSecs] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const runId = useRef(0);
  const onPhotoRef = useRef(onPhoto);
  onPhotoRef.current = onPhoto;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const begin = () => {
    const id = ++runId.current;
    setPhase("searching"); setErr(null); setEv(null); setTrail([]); setSecs(0); setLoaded(false);
    return () => mounted.current && runId.current === id;
  };
  const pushStep = (e: PhotoEvent) => {
    setEv(e);
    setTrail((t) => (t[t.length - 1] === e.message ? t : [...t, e.message]).slice(-4));
  };
  const fail = (e: unknown) => {
    const pe = e as Partial<PhotoError>;
    setErr({ stage: pe.stage ?? "servidor", message: pe.message || "Error desconocido.", detail: pe.detail });
    setPhase("error");
  };
  const done = (r: { url: string; meta: PhotoMeta }) => {
    setSrc(r.url); setInfo(r.meta); setLoaded(false); setPhase("ready");
    onPhotoRef.current?.(r.url, r.meta);
  };

  const run = (opts: { force?: boolean; mode?: "stock" | "ai" } = {}) => {
    const alive = begin();
    const sub = requestRecipePhoto({ name, ingredients, forceRefresh: !!opts.force, mode: opts.mode ?? "stock" }, (e) => { if (alive()) pushStep(e); });
    sub.promise
      .then((r) => { if (alive()) done(r); })
      .catch((e) => { if (alive()) fail(e); })
      .finally(() => sub.unsubscribe());
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    const alive = begin();
    pushStep({ stage: "subida", status: "start", message: "Preparando tu foto…" });
    try {
      const r = await uploadRecipePhoto(file, recipeId, (m) => { if (alive()) pushStep({ stage: "subida", status: "info", message: m }); });
      if (alive()) done(r);
    } catch (e) { if (alive()) fail(e); }
  };

  // Auto-search only when the recipe has no photo yet. Duplicate mounts share one request (see sync.ts).
  useEffect(() => {
    if (url) { runId.current++; setSrc(url); setInfo(meta); setPhase("ready"); setLoaded(false); setErr(null); return; }
    run();
    return () => { runId.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, url]);

  useEffect(() => {
    if (phase !== "searching") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const another = () => {
    if (info?.source === "user" && !window.confirm("Esto reemplaza tu foto por otra del banco de imágenes. ¿Seguir?")) return;
    run({ force: true });
  };

  const headline = trail[trail.length - 1] ?? "Empezando…";
  const earlier = trail.slice(0, -1).slice(-2);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-white border-2 border-ink">
      <input
        ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; onFile(f); }}
      />

      {phase !== "error" && !(phase === "ready" && loaded) && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white to-app-bg" />}

      {phase === "ready" && src && (
        <img
          src={src} alt={name} width={768} height={576} decoding="async" loading="lazy" referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => { setErr({ stage: "imagen", message: "La foto guardada ya no se puede cargar." }); setPhase("error"); }}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {phase === "ready" && loaded && (
        <>
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button type="button" title="Subir mi foto" aria-label="Subir mi foto" className={ROUND} onClick={() => fileRef.current?.click()}>📷</button>
            <button type="button" title="Buscar otra foto" aria-label="Buscar otra foto" className={ROUND} onClick={another}>↻</button>
          </div>
          {info?.source === "stock" && info.credit && (
            <a
              href={info.link || undefined} target="_blank" rel="noreferrer noopener"
              className="absolute bottom-1.5 left-1.5 max-w-[85%] truncate rounded-full bg-white/85 px-2 py-0.5 font-['Nunito:Regular'] text-[10px] text-ink/70"
            >
              {info.credit}
            </a>
          )}
          {info?.source === "ai" && (
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/85 px-2 py-0.5 font-['Nunito:Regular'] text-[10px] text-ink/70">Generada con IA</span>
          )}
        </>
      )}

      {phase === "searching" && (
        <>
          <div className="absolute inset-x-0 top-6 flex justify-center text-3xl animate-pulse" aria-hidden>🍽️</div>
          <div role="status" aria-live="polite" className="absolute inset-x-0 bottom-0 space-y-1.5 border-t-2 border-ink bg-white/90 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-['Nunito:Bold'] text-xs font-bold text-ink">{STAGE_LABEL[ev?.stage ?? "cache"] ?? "Trabajando"}</span>
              <span className="font-['Nunito:Regular'] text-[11px] text-ink/50">{secs} s</span>
            </div>
            <p className="font-['Nunito:Regular'] text-xs leading-snug text-ink/80">{headline}</p>
            {earlier.map((t, i) => <p key={i} className="truncate font-['Nunito:Regular'] text-[10px] text-ink/40">✓ {t}</p>)}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              <div className="h-full bg-brand transition-all duration-500" style={{ width: `${stageProgress(ev?.stage)}%` }} />
            </div>
          </div>
        </>
      )}

      {phase === "error" && err && (
        <div role="alert" className="absolute inset-0 flex flex-col justify-center gap-1.5 overflow-auto bg-white p-3">
          <p className="font-['Sour_Gummy:Bold'] font-bold wdth text-base leading-5 text-ink">No pude conseguir la foto</p>
          <p className="font-['Nunito:Regular'] text-xs text-ink">
            <span className="font-['Nunito:Bold'] font-bold">Falló en:</span> {STAGE_LABEL[err.stage] ?? err.stage}
          </p>
          <p className="font-['Nunito:Regular'] text-xs leading-snug text-ink/80">{err.message}</p>
          {err.detail && <p className="break-words font-['Nunito:Regular'] text-[11px] leading-snug text-ink/50 line-clamp-2">{err.detail}</p>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button type="button" className={`${BTN} bg-brand text-white`} onClick={() => run({ force: err.stage === "imagen" })}>↻ Reintentar</button>
            <button type="button" className={BTN} onClick={() => fileRef.current?.click()}>📷 Subir mi foto</button>
            <button type="button" className={BTN} onClick={() => run({ mode: "ai" })}>🎨 Generar con IA</button>
          </div>
        </div>
      )}
    </div>
  );
}
