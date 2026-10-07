import { useEffect, useState } from "react";
import { Modal } from "../Modal";
import { useApp } from "../AppContext";
import { Input, Select, SketchButton, TextArea } from "../ui-kit";
import { PRODUCTS, Recipe, RecipeIngredient, RecipeUnit, matchProduct, parseQty, resolveProductMeasure, toBase } from "../data";
import { SG_BOLD } from "./kit";

type Draft = Omit<Recipe, "id" | "createdAt"> & { id?: string };
const blank = (): Draft => ({ name: "", emoji: "🍲", minutes: 30, ingredients: [{ name: "", qty: "" }], steps: [] });

export function RecipeEditorModal({ open, recipe, onClose, onSaved }: { open: boolean; recipe?: Recipe | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const { people, saveRecipe, removeRecipe, stock, productMeasures } = useApp();
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
            {d.ingredients.map((i, k) => {
              const catalogProduct = PRODUCTS.find((product) => product.id === i.productId) ?? matchProduct(i.name);
              const measure = catalogProduct ? resolveProductMeasure(catalogProduct, productMeasures) : null;
              const parsed = parseQty(i.qty);
              const amount = i.amount ?? parsed?.amount;
              const unit = i.unit ?? parsed?.unit ?? "g";
              const converted = measure ? toBase(i, measure) : null;
              const available = measure && catalogProduct ? (stock[catalogProduct.id]?.current ?? 0) * measure.pack : 0;
              const need = converted?.amount ?? null;
              const coverage = need === null ? "No se puede convertir" : available < need ? "Hay que comprar" : available - need <= (measure && catalogProduct ? (stock[catalogProduct.id]?.max ?? 0) * measure.pack * 0.25 : 0) ? "Queda poco" : "En casa";
              const coverageClass = coverage === "En casa" ? "bg-pastel-mint" : coverage === "Queda poco" ? "bg-pastel-yellow" : coverage === "Hay que comprar" ? "bg-pastel-coral/60" : "bg-app-bg";
              return (
                <div key={k} className="bg-white rounded-[16px] p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-ink/60">Producto</span>
                    {measure && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${measure.measureConfirmed ? "bg-pastel-mint" : "bg-pastel-yellow"}`}>{measure.measureConfirmed ? "Equivalencia confirmada" : "≈ por confirmar"}</span>}
                  </div>
                  <input
                    list="recipe-product-catalog"
                    value={catalogProduct?.name === i.name || i.productId ? (catalogProduct?.name ?? i.name) : i.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      const product = PRODUCTS.find((entry) => entry.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
                      setIng(k, { productId: product?.id, name });
                    }}
                    placeholder="Buscar producto o escribir otro"
                    aria-label={`Producto del ingrediente ${k + 1}`}
                    className="min-h-11 w-full rounded-xl border border-ink/20 bg-white px-3 text-sm text-ink outline-none focus:border-ink"
                  />
                  <datalist id="recipe-product-catalog">{PRODUCTS.map((product) => <option key={product.id} value={product.name}>{product.emoji}</option>)}</datalist>
                  <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-1.5">
                    <Input type="number" min="0" step="any" inputMode="decimal" placeholder="Cantidad" aria-label={`Cantidad del ingrediente ${k + 1}`} value={amount ?? ""} onChange={(event) => {
                      const value = event.target.value;
                      setIng(k, { amount: value === "" ? undefined : Number(value), unit, qty: value ? `${value} ${unit}` : "" });
                    }} />
                    <Select aria-label={`Unidad del ingrediente ${k + 1}`} value={unit} onChange={(event) => {
                      const nextUnit = event.target.value as RecipeUnit;
                      setIng(k, { amount, unit: nextUnit, qty: amount === undefined ? i.qty : `${amount} ${nextUnit}` });
                    }}>
                      {(["g", "ml", "u", "taza", "cda", "cdta"] as RecipeUnit[]).map((option) => <option key={option} value={option}>{option}</option>)}
                    </Select>
                    <button type="button" aria-label="Quitar ingrediente" onClick={() => setD((x) => ({ ...x, ingredients: x.ingredients.filter((_, j) => j !== k) }))} className="min-h-11 min-w-10 text-ink/50 hover:text-brand text-lg">×</button>
                  </div>
                  {i.qty && !parsed && <p className="text-[10px] text-ink/50">Texto anterior: {i.qty}; introduce una cantidad convertible.</p>}
                  <p className={`inline-flex min-h-7 items-center rounded-full px-2 text-[11px] font-bold ${coverageClass}`}>
                    {measure && !measure.measureConfirmed ? "≈ " : ""}{coverage}{need !== null ? ` · necesita ${measure ? (measure.base === "g" ? `${Math.round(need)} g` : measure.base === "ml" ? `${Math.round(need)} ml` : `${need} u`) : ""}` : ""}
                  </p>
                </div>
              );
            })}
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
