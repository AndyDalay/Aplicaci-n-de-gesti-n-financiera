import { useEffect, useState } from "react";
import { Modal } from "../Modal";
import { useApp } from "../AppContext";
import { SketchButton } from "../ui-kit";
import { matchProduct, PhotoMeta } from "../data";
import { AISuggestion } from "../sync";
import { ingredientStatus, productEmoji, SCALE_META, SG_BOLD, Tag } from "./kit";
import { RecipePhoto } from "./RecipePhoto";

const STATUS = {
  ok: { label: "En casa", cls: "bg-pastel-mint" },
  low: { label: "Queda poco", cls: "bg-amber-soft" },
  buy: { label: "Hay que comprar", cls: "bg-pastel-coral" },
} as const;

export function SuggestionDetailModal({ s, onClose, onAdopt }: { s: AISuggestion | null; onClose: () => void; onAdopt: (s: AISuggestion, imageUrl?: string, imageMeta?: PhotoMeta) => void }) {
  const { stock } = useApp();
  const [photo, setPhoto] = useState<{ url: string; meta?: PhotoMeta } | undefined>();
  useEffect(() => setPhoto(undefined), [s]);
  const meta = s ? SCALE_META[s.scale] ?? SCALE_META.rapido : null;

  return (
    <Modal open={!!s} onClose={onClose} title={s ? `${s.emoji} ${s.name}` : ""}>
      {s && meta && (
        <div className="space-y-4">
          <RecipePhoto key={s.name} name={s.name} ingredients={s.ingredients.map((i) => i.name)} onPhoto={(url, meta) => setPhoto({ url, meta })} />
          <div className="flex flex-wrap gap-1.5">
            <Tag className="bg-white">⏱ {s.minutes} min</Tag>
            <Tag className={meta.bg}>{meta.emoji} {meta.label}</Tag>
            {s.servings ? <Tag className="bg-white">🍽 {s.servings} porciones</Tag> : null}
          </div>
          {s.description && <p className="font-['Nunito:Regular'] text-sm text-ink/70">{s.description}</p>}

          <section>
            <h4 className={`${SG_BOLD} text-lg text-ink mb-2`}>Ingredientes</h4>
            <ul className="space-y-1.5">
              {s.ingredients.map((i, k) => {
                const pid = matchProduct(i.name)?.id;
                const st = STATUS[ingredientStatus(pid, stock)];
                return (
                  <li key={k} className="bg-white rounded-[14px] px-3 py-2 flex items-center gap-2">
                    <span className="text-lg">{productEmoji(pid)}</span>
                    <span className="flex-1 min-w-0 font-['Nunito:Bold'] font-bold text-sm text-ink truncate">{i.name}</span>
                    <span className="font-['Nunito:Regular'] text-xs text-ink/50">{i.qty}</span>
                    <Tag className={st.cls}>{st.label}</Tag>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h4 className={`${SG_BOLD} text-lg text-ink mb-2`}>Preparación</h4>
            {s.steps.length ? (
              <ol className="space-y-2">
                {s.steps.map((t, k) => (
                  <li key={k} className="flex gap-3">
                    <span className={`${SG_BOLD} size-7 shrink-0 rounded-full bg-brand text-white flex items-center justify-center text-sm`}>{k + 1}</span>
                    <p className="font-['Nunito:Regular'] text-sm text-ink pt-1">{t}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="font-['Nunito:Regular'] text-sm text-ink/50">La IA no devolvió pasos. Pide otras ideas.</p>
            )}
          </section>

          <SketchButton color="yellow" block onClick={() => onAdopt(s, photo?.url, photo?.meta)}>+ Al calendario</SketchButton>
        </div>
      )}
    </Modal>
  );
}
