import { useEffect, useState } from "react";
import { fetchRecipePhoto } from "../sync";

function NoPhoto({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white">
      <svg viewBox="0 0 120 90" className="w-24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <ellipse cx="60" cy="52" rx="42" ry="14" className="text-ink/30" />
        <ellipse cx="60" cy="48" rx="26" ry="8" className="text-ink/20" />
        <path d="M30 20l60 56" className="text-ink/40" />
      </svg>
      <span className="font-['Nunito:Regular'] text-xs text-ink/50">{label}</span>
    </div>
  );
}

type Status = "loading" | "ready" | "error";

/** Product-style dish photo on white. Shows a skeleton while generating and a "sin foto" SVG when it can't load. */
export function RecipePhoto({ name, ingredients, url, onUrl }: { name: string; ingredients: string[]; url?: string; onUrl?: (u: string) => void }) {
  const [src, setSrc] = useState(url);
  const [status, setStatus] = useState<Status>(url ? "loading" : "loading");
  const [attempt, setAttempt] = useState(0);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let live = true;
    if (url) { setSrc(url); setStatus("loading"); return; }
    setSrc(undefined); setStatus("loading"); setErrMsg("");
    fetchRecipePhoto(name, ingredients)
      .then((u) => { if (live) { setSrc(u); onUrl?.(u); } })
      .catch((e) => { if (live) { setErrMsg(e?.message === "offline" ? "Sin conexión" : "Sin foto de esta receta"); setStatus("error"); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, url, attempt]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-white border-2 border-ink">
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white to-app-bg" />}
      {status === "loading" && (
        <span className="absolute bottom-2 left-0 right-0 text-center font-['Nunito:Regular'] text-xs text-ink/50">
          {src ? "Cargando foto…" : "Preparando la foto del plato…"}
        </span>
      )}
      {src && status !== "error" && (
        <img
          src={src} alt={name} width={768} height={576} decoding="async" referrerPolicy="no-referrer"
          onLoad={() => setStatus("ready")} onError={() => { setErrMsg("Sin foto de esta receta"); setStatus("error"); }}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${status === "ready" ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {status === "error" && (
        <>
          <NoPhoto label={errMsg || "Sin foto de esta receta"} />
          <button
            onClick={() => { if (url && src === url) onUrl?.(""); setAttempt((a) => a + 1); }}
            className="absolute top-2 right-2 rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-['Nunito:Bold'] font-bold"
          >
            ↻ Reintentar
          </button>
        </>
      )}
    </div>
  );
}
