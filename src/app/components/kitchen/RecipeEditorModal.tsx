import { useEffect, useState } from "react";
import { Modal } from "../Modal";
import { useApp } from "../AppContext";
import { Input, Select, SketchButton, TextArea } from "../ui-kit";
import { PRODUCTS, Recipe, RecipeIngredient } from "../data";
import { SG_BOLD } from "./kit";

type Draft = Omit<Recipe, "id" | "createdAt"> & { id?: string };
const blank = (): Draft => ({ name: "", emoji: "🍲", minutes: 30, ingredients: [{ name: "", qty: "" }], steps: [] });

export function RecipeEditorModal({ open, recipe, onClose, onSaved }: { open: boolean; recipe?: Recipe | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const { people, saveRecipe, removeRecipe } = useApp();
  const [d, setD] = useState<Draft>(blank);
  const [stepsText, setStepsText] = useState("");

  useEffect(() => {
    if (!open) return;
    const base = recipe ? { ...recipe, ingredients: recipe.ingredients.map((i) => ({ ...i })) } : blank();
    setD(base);
    setStepsText(base.steps.join("\n"));
  }, [open, recipe]);

  const setIng = (k: number, patch: Partial<RecipeIngredient>) =>
    setD((x) => ({ ...x, ingredients: x.ingredients.map((i, j) => (j === k ? { ...i, ...patch } : i)) }));

  const save = () => {
    const rid = saveRecipe({
      ...d,
      name: d.name.trim() || "Receta sin nombre",
      ingredients: d.ingredients.filter((i) => i.name.trim()),
      steps: stepsText.split("\n").map((s) => s.trim()).filter(Boolean),
    });
    onSaved?.(rid);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={recipe ? "Editar receta" : "Nueva receta"}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input aria-label="Emoji" value={d.emoji} onChange={(e) => setD({ ...d, emoji: e.target.value })} className="!w-14 text-center text-xl" />
          <Input placeholder="Nombre del plato" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-['Nunito:Bold'] font-bold text-ink/60">Minutos
            <Input type="number" value={d.minutes ?? ""} onChange={(e) => setD({ ...d, minutes: parseInt(e.target.value) || undefined })} />
          </label>
          <label className="text-xs font-['Nunito:Bold'] font-bold text-ink/60">Quién cocina
            <Select value={d.cookId ?? ""} onChange={(e) => setD({ ...d, cookId: e.target.value || undefined })}>
              <option value="">Cualquiera</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </Select>
          </label>
        </div>

        <div>
          <h4 className={`${SG_BOLD} text-base text-ink mb-1.5`}>Ingredientes</h4>
          <div className="space-y-2">
            {d.ingredients.map((i, k) => (
              <div key={k} className="bg-white rounded-[16px] p-2 space-y-1.5">
                <Select
                  value={i.productId ?? ""}
                  onChange={(e) => {
                    const p = PRODUCTS.find((x) => x.id === e.target.value);
                    setIng(k, { productId: p?.id, name: p ? p.name : i.name });
                  }}
                >
                  <option value="">✏️ Otro (no está en productos)</option>
                  {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                </Select>
                <div className="flex gap-1.5">
                  {!i.productId && <Input placeholder="Ingrediente" value={i.name} onChange={(e) => setIng(k, { name: e.target.value })} />}
                  <Input placeholder="Cantidad" value={i.qty} onChange={(e) => setIng(k, { qty: e.target.value })} className={i.productId ? "" : "!w-28"} />
                  <button
                    aria-label="Quitar ingrediente"
                    onClick={() => setD((x) => ({ ...x, ingredients: x.ingredients.filter((_, j) => j !== k) }))}
                    className="shrink-0 px-2 text-ink/40 hover:text-brand text-lg"
                  >×</button>
                </div>
              </div>
            ))}
          </div>
          <SketchButton size="sm" className="mt-2" onClick={() => setD((x) => ({ ...x, ingredients: [...x.ingredients, { name: "", qty: "" }] }))}>+ Ingrediente</SketchButton>
        </div>

        <label className="block">
          <h4 className={`${SG_BOLD} text-base text-ink mb-1.5`}>Pasos <span className="font-['Nunito:Regular'] font-normal text-xs text-ink/50">(uno por línea)</span></h4>
          <TextArea rows={5} value={stepsText} onChange={(e) => setStepsText(e.target.value)} placeholder={"Sofríe el ajo y la cebolla\nAñade…"} />
        </label>

        <div className="flex gap-2 pt-1">
          {recipe && (
            <SketchButton color="white" onClick={() => { if (confirm(`¿Borrar "${recipe.name}"?`)) { removeRecipe(recipe.id); onClose(); } }}>
              <img src="/assets/b0b9d.svg" alt="" className="size-4 invert" /> Borrar
            </SketchButton>
          )}
          <SketchButton color="brand" block onClick={save}>Guardar receta</SketchButton>
        </div>
      </div>
    </Modal>
  );
}
