import { useMemo, useRef, useState } from "react";
import { useApp } from "../AppContext";
import { Modal } from "../Modal";
import { Input, Select, SketchButton, TextArea } from "../ui-kit";
import { formatAmount, MeasureBase, parseQty, Product, PRODUCTS, Recipe, StockItem, toBase } from "../data";
import { uploadRecipePhoto } from "../sync";

const SCALE_OPTIONS = [0.5, 1, 1.5, 2];

type DraftUsed = {
  productId?: string;
  name: string;
  qty: string;
  amount: number;
  base: MeasureBase;
  packs: number;
  noDiscount: boolean;
};

export function CookMealModal({
  recipe,
  week,
  slotKey,
  open,
  onClose,
}: {
  recipe: Recipe | null;
  week?: string;
  slotKey?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { stock, currentUserId, people, recordCooked, saveRecipe } = useApp();
  const [step, setStep] = useState(0);
  const [scale, setScale] = useState<number>(1);
  const [customScale, setCustomScale] = useState("");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoSaveToRecipe, setPhotoSaveToRecipe] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedRatings, setSelectedRatings] = useState<Record<string, 1 | 2 | 3>>({});
  const [cookId, setCookId] = useState<string>(currentUserId || "andy");
  const [used, setUsed] = useState<DraftUsed[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const effectiveScale = useMemo(() => {
    const n = Number(customScale);
    return Number.isFinite(n) && n > 0 ? n : scale;
  }, [customScale, scale]);

  const recipeId = recipe?.id;

  const buildUsed = (r: Recipe): DraftUsed[] => r.ingredients.map((ingredient) => {
    const product = ingredient.productId ? PRODUCTS.find((p) => p.id === ingredient.productId) : undefined;
    let amount = 0;
    let base: MeasureBase = product?.base ?? "g";
    let qty = ingredient.qty;

    if (product) {
      const converted = toBase({ ...ingredient, qty: ingredient.qty }, product);
      if (converted) {
        amount = converted.amount;
        base = converted.base;
      } else {
        const parsed = parseQty(ingredient.qty);
        if (parsed) {
          amount = parsed.amount;
          base = parsed.unit === "g" || parsed.unit === "ml" || parsed.unit === "u" ? parsed.unit : product.base;
        }
      }
    } else {
      const parsed = parseQty(ingredient.qty);
      if (parsed) {
        amount = parsed.amount;
        base = parsed.unit === "g" || parsed.unit === "ml" || parsed.unit === "u" ? parsed.unit : "g";
      }
    }

    const scaled = amount * effectiveScale;
    const productForStock = product ?? PRODUCTS.find((p) => p.name.toLowerCase() === ingredient.name.toLowerCase() || p.id === ingredient.productId);
    const itemStock = productForStock ? (stock[productForStock.id]?.current ?? 0) * productForStock.pack : 0;
    const stockLabel = productForStock ? `${formatAmount(itemStock, productForStock.base)} -> ${formatAmount(Math.max(0, itemStock - scaled), productForStock.base)}` : "No descontar";

    return {
      productId: ingredient.productId,
      name: ingredient.name,
      qty: ingredient.qty,
      amount: Math.max(0, scaled),
      base,
      packs: productForStock ? Math.max(0, scaled / productForStock.pack) : 0,
      noDiscount: !productForStock || !Number.isFinite(scaled) || scaled <= 0,
      // not part of persisted data but used in UI label generation
      ...(productForStock ? { _stockLabel: stockLabel } : {}),
    } as DraftUsed & { _stockLabel?: string };
  });

  const displayedIngredients = useMemo(() => {
    if (!recipe) return [];
    const next = buildUsed(recipe);
    if (used.length !== next.length) {
      return next;
    }
    return used.map((item, index) => ({ ...next[index], ...item }));
  }, [recipe, stock, effectiveScale, used]);

  const setItemAmount = (index: number, amount: number) => {
    setUsed((prev) => {
      const next = [...(prev.length ? prev : displayedIngredients)];
      const current = next[index] ?? { productId: undefined, name: "", qty: "", amount: 0, base: "g", packs: 0, noDiscount: true };
      const item = { ...current, amount: Math.max(0, amount) };
      if (item.productId) {
        const product = PRODUCTS.find((p) => p.id === item.productId);
        item.packs = product ? Math.max(0, amount / product.pack) : 0;
      }
      next[index] = item;
      return next;
    });
  };

  const setItemNoDiscount = (index: number, noDiscount: boolean) => {
    setUsed((prev) => {
      const next = [...(prev.length ? prev : displayedIngredients)];
      next[index] = { ...next[index], noDiscount };
      return next;
    });
  };

  const ensureUsed = () => {
    if (!recipe) return;
    if (used.length === 0 && recipe.ingredients.length > 0) {
      setUsed(buildUsed(recipe));
    }
  };

  const handlePhoto = async (file?: File | null) => {
    if (!file || !recipe) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadRecipePhoto(file, recipe.id, (message) => {});
      setPhotoUrl(result.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!recipe) return;
    const draft = (used.length ? used : displayedIngredients).filter((item) => !item.noDiscount && (!!item.productId || item.amount > 0));
    const usedItems = draft.map((item) => {
      const product = item.productId ? PRODUCTS.find((p) => p.id === item.productId) : undefined;
      const packs = product ? Math.max(0, item.amount / (product.pack || 1)) : 0;
      const base = item.base || (product?.base ?? "g");
      return {
        productId: item.productId ?? "",
        amount: Math.max(0, item.amount),
        base,
        packs,
        name: item.name,
      };
    }).filter((item) => item.productId && item.amount > 0);

    const entryId = recordCooked({
      id: `${recipe.id}-${Date.now()}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      week,
      slotKey,
      servings: Number((customScale && Number(customScale) > 0 ? customScale : effectiveScale).toFixed(2)) || 1,
      cookId: cookId || currentUserId,
      photoUrl: photoUrl || undefined,
      used: usedItems,
      note: note.trim() || undefined,
      rating: Object.keys(selectedRatings).length ? selectedRatings : undefined,
    });

    if (photoUrl && photoSaveToRecipe) {
      saveRecipe({ ...recipe, imageUrl: photoUrl, imageMeta: { source: "user" } });
    }

    setStep(0);
    setSelectedRatings({});
    setCustomScale("");
    setNote("");
    setPhotoUrl(undefined);
    setCookId(currentUserId || "andy");
    setUsed([]);
    onClose();
    return entryId;
  };

  const stepTitle = [
    "Porciones",
    "Ingredientes usados",
    "Foto y cierre",
  ][step];

  if (!recipe) return null;

  return (
    <Modal open={open} onClose={onClose} title={recipe.name}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className={`h-2 flex-1 rounded-full ${index <= step ? "bg-brand" : "bg-ink/10"}`} />
          ))}
        </div>

        <p className="font-['Nunito:Bold'] text-xs uppercase tracking-wide text-ink/60">Paso {step + 1}: {stepTitle}</p>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 font-['Nunito:Bold'] text-sm text-ink/70">¿Cuántas porciones cocinaste?</p>
              <div className="grid grid-cols-5 gap-2">
                {SCALE_OPTIONS.map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => {
                      setScale(value);
                      setCustomScale("");
                    }}
                    className={`rounded-full border-[1.5px] border-ink py-2 font-['Nunito:Bold'] text-sm ${effectiveScale === value ? "bg-amber-soft" : "bg-white"}`}
                  >
                    x{value}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm font-['Nunito:Bold'] text-ink/70">
              Otra escala
              <Input
                value={customScale}
                onChange={(e) => setCustomScale(e.target.value)}
                placeholder="ej. 2.5"
                type="number"
                min="0.1"
                step="0.1"
              />
            </label>

            <div className="rounded-[16px] bg-white p-3 border-[1.5px] border-ink">
              <p className="font-['Nunito:Bold'] text-sm text-ink/70">Escala aplicada</p>
              <p className="mt-1 font-['Sour_Gummy:Bold'] text-2xl text-ink">x{effectiveScale.toFixed(1).replace(".0", "")}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {displayedIngredients.map((item, index) => {
              const product = item.productId ? PRODUCTS.find((p) => p.id === item.productId) : undefined;
              const stockAmount = product ? (stock[product.id]?.current ?? 0) * product.pack : 0;
              const afterAmount = Math.max(0, stockAmount - item.amount);
              const canConvert = product && item.amount > 0 && item.base !== "u";
              return (
                <div key={`${item.name}-${index}`} className="rounded-[16px] border-[1.5px] border-ink bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-['Nunito:Bold'] text-sm text-ink">{item.name}</p>
                      <p className="font-['Nunito:Regular'] text-xs text-ink/60">
                        {product ? `${formatAmount(stockAmount, product.base)} → ${formatAmount(afterAmount, product.base)}` : "No descontar"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setItemNoDiscount(index, !item.noDiscount)}
                      className={`rounded-full border-[1.5px] border-ink px-2 py-1 text-[10px] font-['Nunito:Bold'] ${item.noDiscount ? "bg-ink text-white" : "bg-white"}`}
                    >
                      {item.noDiscount ? "No descontar" : "Descontar"}
                    </button>
                  </div>

                  {!item.noDiscount && (
                    <div className="mt-3 flex items-center gap-2">
                      <button className="h-8 w-8 rounded-full border-[1.5px] border-ink bg-white" type="button" onClick={() => setItemAmount(index, item.amount - (item.base === "u" ? 1 : 50))}>-</button>
                      <Input
                        type="number"
                        min="0"
                        step={item.base === "u" ? 1 : 50}
                        value={item.amount}
                        onChange={(e) => setItemAmount(index, Number(e.target.value || 0))}
                        className="max-w-[110px]"
                      />
                      <Select
                        value={item.base}
                        onChange={(e) => {
                          const base = e.target.value as MeasureBase;
                          setUsed((prev) => {
                            const next = [...(prev.length ? prev : displayedIngredients)];
                            const current = next[index] ?? { ...item };
                            next[index] = { ...current, base };
                            return next;
                          });
                        }}
                      >
                        {product ? <option value={product.base}>{product.base.toUpperCase()}</option> : null}
                        {!product && <option value="g">g</option>}
                        {!product && <option value="ml">ml</option>}
                        {!product && <option value="u">u</option>}
                      </Select>
                    </div>
                  )}

                  {product && item.noDiscount && product && (stock[product.id]?.current ?? 0) < 0.25 * (product.pack || 1) && (
                    <p className="mt-2 text-[11px] text-ink/60">Solo hay {formatAmount((stock[product.id]?.current ?? 0) * product.pack, product.base)} en stock.</p>
                  )}
                  {!product && <p className="mt-2 text-[11px] text-ink/60">No aparece en inventario; se dejará sin descuento.</p>}
                </div>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="font-['Nunito:Bold'] text-sm text-ink/70">Foto del plato</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void handlePhoto(file);
                }}
              />
              <div className="flex gap-2">
                <SketchButton block onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "Subiendo…" : "📷 Hacer foto / Elegir galería"}
                </SketchButton>
              </div>
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              {photoUrl && (
                <img src={photoUrl} alt="Foto del plato" className="h-40 w-full rounded-[16px] object-cover border-[1.5px] border-ink" />
              )}
            </div>

            <label className="flex items-center gap-2 text-sm font-['Nunito:Bold'] text-ink/70">
              <input type="checkbox" checked={photoSaveToRecipe} onChange={(e) => setPhotoSaveToRecipe(e.target.checked)} />
              Usar como foto de la receta
            </label>

            <div>
              <p className="mb-2 font-['Nunito:Bold'] text-sm text-ink/70">Valoración rápida</p>
              <div className="flex gap-2">
                {people.map((person) => (
                  <div key={person.id} className="flex-1 rounded-[14px] border-[1.5px] border-ink bg-white p-2">
                    <p className="mb-1 text-xs font-['Nunito:Bold'] text-ink/60">{person.name}</p>
                    <div className="flex gap-1">
                      {([1, 2, 3] as const).map((value) => (
                        <button
                          key={`${person.id}-${value}`}
                          type="button"
                          onClick={() => setSelectedRatings((prev) => ({ ...prev, [person.id]: value }))}
                          className={`flex-1 rounded-full border-[1.5px] border-ink py-1 text-sm ${selectedRatings[person.id] === value ? "bg-brand text-white" : "bg-white"}`}
                          aria-label={`${person.name} valoración ${value}`}
                        >
                          {value === 1 ? "😍" : value === 2 ? "👍" : "😐"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <label className="block text-sm font-['Nunito:Bold'] text-ink/70">
              Nota
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qué tal quedó, qué cambiaría, etc." rows={3} />
            </label>

            <label className="block text-sm font-['Nunito:Bold'] text-ink/70">
              Quién cocinó
              <Select value={cookId} onChange={(e) => setCookId(e.target.value)}>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </Select>
            </label>
          </div>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <SketchButton onClick={() => setStep((prev) => Math.max(0, prev - 1))}>Atrás</SketchButton>
          )}
          <SketchButton color="brand" block onClick={() => {
            if (step < 2) {
              ensureUsed();
              setStep((prev) => Math.min(2, prev + 1));
            } else {
              handleSave();
            }
          }}>
            {step === 2 ? "Guardar" : "Siguiente"}
          </SketchButton>
        </div>
      </div>
    </Modal>
  );
}
