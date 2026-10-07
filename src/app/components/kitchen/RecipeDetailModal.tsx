import { Modal } from "../Modal";
import { useApp } from "../AppContext";
import { SketchButton } from "../ui-kit";
import { Recipe } from "../data";
import { RecipePhoto } from "./RecipePhoto";
import { Avatar, ingredientStatus, productEmoji, SG_BOLD, Tag, SCALE_META } from "./kit";

const STATUS = {
  ok: { label: "En casa", cls: "bg-pastel-mint" },
  low: { label: "Queda poco", cls: "bg-amber-soft" },
  buy: { label: "Hay que comprar", cls: "bg-pastel-coral" },
} as const;

export function RecipeDetailModal({ recipe, onClose, onEdit, onCook }: { recipe: Recipe | null; onClose: () => void; onEdit: (r: Recipe) => void; onCook?: (r: Recipe) => void }) {
  const { stock, people, shopMissing, pushNotification, saveRecipe } = useApp();
  const r = recipe;
  const cook = people.find((p) => p.id === r?.cookId);
  const toBuy = r ? r.ingredients.filter((i) => ingredientStatus(i.productId, stock) === "buy").length : 0;

  return (
    <Modal open={!!r} onClose={onClose} title={r ? `${r.emoji} ${r.name}` : ""}>
      {r && (
        <div className="space-y-4">
          <RecipePhoto
            key={r.id} name={r.name} ingredients={r.ingredients.map((i) => i.name)} url={r.imageUrl} meta={r.imageMeta} recipeId={r.id}
            onPhoto={(u, m) => { if (u !== (r.imageUrl ?? "")) saveRecipe({ ...r, imageUrl: u || undefined, imageMeta: u ? m : undefined }); }}
          />
          <div className="flex flex-wrap gap-1.5">
            {r.minutes ? <Tag className="bg-white">⏱ {r.minutes} min</Tag> : null}
            {r.scale && <Tag className={SCALE_META[r.scale].bg}>{SCALE_META[r.scale].emoji} {SCALE_META[r.scale].label}</Tag>}
            {cook && <Tag className="bg-white"><Avatar person={cook} size={14} /> Cocina {cook.name}</Tag>}
          </div>
          {r.description && <p className="font-['Nunito:Regular'] text-sm text-ink/70">{r.description}</p>}

          <section>
            <h4 className={`${SG_BOLD} text-lg text-ink mb-2`}>Ingredientes</h4>
            <ul className="space-y-1.5">
              {r.ingredients.map((i, k) => {
                const st = STATUS[ingredientStatus(i.productId, stock)];
                return (
                  <li key={k} className="bg-white rounded-[14px] px-3 py-2 flex items-center gap-2">
                    <span className="text-lg">{productEmoji(i.productId)}</span>
                    <span className="flex-1 min-w-0 font-['Nunito:Bold'] font-bold text-sm text-ink truncate">{i.name}</span>
                    <span className="font-['Nunito:Regular'] text-xs text-ink/50">{i.qty}</span>
                    <Tag className={st.cls}>{st.label}</Tag>
                  </li>
                );
              })}
            </ul>
            {toBuy > 0 && (
              <SketchButton
                color="brand" block className="mt-3"
                onClick={() => {
                  const n = shopMissing(r.id);
                  pushNotification({ title: "🛒 Lista actualizada", body: n ? `${n} ingrediente(s) añadidos a compras.` : "Ya estaban en la lista." });
                }}
              >
                🛒 Añadir {toBuy} faltante{toBuy > 1 ? "s" : ""} a compras
              </SketchButton>
            )}
          </section>

          <section>
            <h4 className={`${SG_BOLD} text-lg text-ink mb-2`}>Preparación</h4>
            <ol className="space-y-2">
              {r.steps.map((s, k) => (
                <li key={k} className="flex gap-3">
                  <span className={`${SG_BOLD} size-7 shrink-0 rounded-full bg-brand text-white flex items-center justify-center text-sm`}>{k + 1}</span>
                  <p className="font-['Nunito:Regular'] text-sm text-ink pt-1">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex gap-2">
            <SketchButton block onClick={() => onEdit(r)}>
              <img src="/assets/4ea72.svg" alt="" className="size-4" /> Editar receta
            </SketchButton>
            {onCook && (
              <SketchButton color="mint" block onClick={() => onCook(r)}>
                ✅ Cocinamos esto
              </SketchButton>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
