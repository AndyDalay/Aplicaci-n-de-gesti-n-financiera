import { useEffect, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { useApp } from "../AppContext";
import { displayName, matchProduct, PhotoMeta, PRODUCTS, Recipe, RecipeScale, resolveWeek } from "../data";
import { AISuggestion, fetchRecipeReplacements } from "../sync";
import { SketchButton } from "../ui-kit";
import { CravingField } from "./CravingField";
import { IngredientPicker } from "./IngredientPicker";
import { RecipePhoto } from "./RecipePhoto";
import { ingredientStatus, SCALE_META, SG_BOLD } from "./kit";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";

type ReplacingMeal = { recipe: Recipe; day: number; slot: string; slotKey: string };
type PickedPhoto = { url: string; meta?: PhotoMeta };
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const LEVELS: RecipeScale[] = ["rapido", "saludable", "elegante"];

export function ReplaceMealSheet({ replacing, week, open, onOpenChange, onChoose }: {
  replacing: ReplacingMeal | null;
  week: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (suggestion: AISuggestion, photo?: PickedPhoto) => void;
}) {
  const { people, stock, recipes, weeks, kitchen } = useApp();
  const [instruction, setInstruction] = useState("");
  const [scale, setScale] = useState<RecipeScale>("rapido");
  const [mustUse, setMustUse] = useState<string[]>([]);
  const [onlyInventory, setOnlyInventory] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [photos, setPhotos] = useState<Record<string, PickedPhoto>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !replacing) return;
    setInstruction("");
    setScale(replacing.recipe.scale ?? "rapido");
    setMustUse([]);
    setOnlyInventory(true);
    setSuggestions([]);
    setPhotos({});
    setStatus("idle");
    setError("");
  }, [open, replacing?.slotKey, replacing?.recipe.id]);

  if (!replacing) return null;
  const { recipe, day, slot, slotKey } = replacing;
  const scaleMeta = SCALE_META[scale];

  const search = async () => {
    if (!instruction.trim() && !mustUse.length) return;
    setStatus("loading");
    setError("");
    setSuggestions([]);
    setPhotos({});
    try {
      const have = PRODUCTS.filter((product) => (stock[product.id]?.current ?? 0) > 0).map((product) => product.name);
      const missing = PRODUCTS.filter((product) => (stock[product.id]?.current ?? 0) <= 0).map((product) => product.name);
      const resolved = Object.entries(resolveWeek(weeks, week).plan).filter(([key]) => key !== slotKey);
      const planned = [...new Set(resolved.map(([, meal]) => recipes.find((entry) => entry.id === meal.recipeId)?.name).filter((name): name is string => Boolean(name)))];
      const results = await fetchRecipeReplacements({
        couple: `${people.map((person) => person.name).join(" y ")}, pareja cubana que cocina para 2 personas`,
        inventory: have.join(", "),
        missing: missing.join(", "),
        planned: planned.join(", "),
        slot: slot,
        day: DAYS[day],
        current: { name: recipe.name, ingredients: recipe.ingredients.map((ingredient) => ingredient.name) },
        instruction: instruction.trim().slice(0, 300),
        scale,
        mustUse: mustUse.map((id) => PRODUCTS.find((product) => product.id === id)?.name).filter((name): name is string => Boolean(name)),
        onlyInventory,
        productCatalog: PRODUCTS.map(({ id, name }) => ({ id, name })),
      });
      setSuggestions(results.slice(0, 3));
      setStatus("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron preparar alternativas.");
      setStatus("error");
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[94dvh] gap-0 overflow-hidden rounded-t-[24px] border-2 border-ink bg-app-bg p-0">
          <DrawerHeader className="shrink-0 border-b border-ink/10 px-4 pb-3 pt-4 text-left">
            <DrawerTitle className={`${SG_BOLD} pr-10 text-xl leading-6 text-ink`}>Cambiar: {displayName(recipe)} · {DAYS[day]} · {slot}</DrawerTitle>
            <DrawerDescription className="font-['Nunito:Regular'] text-xs text-ink/60">La otra planificación de la semana no cambiará.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 overflow-y-auto px-4 py-3 pb-5">
            <CravingField value={instruction} onChange={setInstruction} placeholder="¿Qué prefieres en su lugar? Ej: algo sin freír, con pollo…" ariaLabel="Instrucción para reemplazar el plato" maxLength={300} />

            <div role="group" aria-label="Nivel de la receta" className="grid grid-cols-3 rounded-full border-[1.5px] border-ink bg-white p-1">
              {LEVELS.map((level) => {
                const meta = SCALE_META[level];
                return <button key={level} type="button" aria-pressed={scale === level} onClick={() => setScale(level)} className={`min-h-10 rounded-full px-1 font-['Nunito:Bold'] text-xs ${scale === level ? `${meta.bg} text-ink` : "text-ink/60"}`}>{meta.emoji} {meta.label}</button>;
              })}
            </div>

            <button type="button" onClick={() => setPickerOpen(true)} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-ink/15 bg-white px-3 font-['Nunito:Bold'] text-sm text-ink">
              <span className="flex items-center gap-2"><Search size={16} /> Ingredientes obligatorios</span>
              <span className="rounded-full bg-pastel-yellow px-2 py-0.5 text-xs">{mustUse.length}</span>
            </button>
            {mustUse.length > 0 && <p className="font-['Nunito:Regular'] text-xs text-ink/60">Usar: {mustUse.map((id) => PRODUCTS.find((product) => product.id === id)?.name).filter(Boolean).join(", ")}</p>}

            <button type="button" role="switch" aria-checked={onlyInventory} onClick={() => setOnlyInventory((value) => !value)} className="flex min-h-11 w-full items-center justify-between rounded-xl bg-white px-3 text-left">
              <span className="font-['Nunito:Bold'] text-sm text-ink">Solo con lo que hay en casa</span>
              <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${onlyInventory ? "bg-pastel-mint" : "bg-ink/20"}`}><span className={`block size-5 rounded-full bg-white shadow transition-transform ${onlyInventory ? "translate-x-5" : ""}`} /></span>
            </button>

            <SketchButton color="brand" block disabled={status === "loading" || (!instruction.trim() && mustUse.length === 0)} onClick={() => void search()}>
              {status === "loading" ? "Buscando opciones…" : "Buscar opciones"}
            </SketchButton>

            {status === "error" && <div role="alert" className="flex gap-2 rounded-xl bg-pastel-coral/60 p-3 text-xs text-ink"><AlertCircle size={17} className="shrink-0" /><span>{error}</span></div>}

            {suggestions.map((suggestion, index) => {
              const meta = SCALE_META[suggestion.scale] ?? scaleMeta;
              const missingCount = suggestion.ingredients.filter((ingredient) => ingredientStatus(ingredient.productId ?? matchProduct(ingredient.name)?.id, stock) === "buy").length;
              const photoKey = `${index}:${suggestion.name}`;
              return (
                <article key={photoKey} className="overflow-hidden rounded-[16px] border-[1.5px] border-ink bg-white">
                  <div className={`${meta.bg} flex items-center justify-between px-3 py-2`}>
                    <p className={`${SG_BOLD} text-sm text-ink`}>{meta.emoji} {meta.label}</p>
                    <p className="font-['Nunito:Bold'] text-xs text-ink">⏱ {suggestion.minutes} min</p>
                  </div>
                  <div className="space-y-2.5 p-3">
                    <h3 className={`${SG_BOLD} text-lg leading-5 text-ink`}>{suggestion.emoji} {suggestion.shortName || suggestion.name}</h3>
                    <RecipePhoto name={suggestion.name} ingredients={suggestion.ingredients.map((ingredient) => ingredient.name)} onPhoto={(url, photoMeta) => setPhotos((current) => ({ ...current, [photoKey]: { url, meta: photoMeta } }))} />
                    <p className="font-['Nunito:Regular'] text-xs text-ink/60">{suggestion.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.qty}`).join(" · ")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestion.ingredients.map((ingredient) => {
                        const ingredientMissing = ingredientStatus(ingredient.productId ?? matchProduct(ingredient.name)?.id, stock) === "buy";
                        return <span key={`${photoKey}-${ingredient.name}`} className={`rounded-full px-2 py-1 font-['Nunito:Bold'] text-[10px] ${ingredientMissing ? "bg-pastel-peach" : "bg-pastel-mint"}`}>{ingredientMissing ? "🛒" : "✓"} {ingredient.name}</span>;
                      })}
                    </div>
                    {suggestion.missingNote && <p className="rounded-lg bg-pastel-peach px-2.5 py-2 font-['Nunito:Regular'] text-xs text-ink">{suggestion.missingNote}</p>}
                    <SketchButton color="yellow" block onClick={() => onChoose(suggestion, photos[photoKey])}>Usar esta opción{missingCount ? ` · faltan ${missingCount}` : ""}</SketchButton>
                  </div>
                </article>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
      <IngredientPicker open={pickerOpen} selected={mustUse} onlyAvailable={onlyInventory} onOpenChange={setPickerOpen} onDone={(ids, only) => { setMustUse(ids); setOnlyInventory(only); }} />
    </>
  );
}
