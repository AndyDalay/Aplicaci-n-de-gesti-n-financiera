import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useApp } from "../AppContext";
import { SketchButton } from "../ui-kit";
import { costOfRecipe, expiringProductIds, formatMoney, matchProduct, PhotoMeta, PRODUCTS, resolveWeek } from "../data";
import { AISuggestion, fetchRecipeSuggestions } from "../sync";
import { ingredientStatus, SCALE_META, SG_BOLD, Tag } from "./kit";
import { SuggestionDetailModal } from "./SuggestionDetailModal";
import { IngredientPicker } from "./IngredientPicker";
import { CravingField } from "./CravingField";

const CRAVING_DRAFT_KEY = "casita:chef-craving-draft";
const QUICK_CRAVINGS = ["Con picadillo", "Pasta", "Algo ligero", "Con huevo", "Sin freír", "Para compartir"];
type ActiveOrder = { craving: string; ingredientIds: string[]; onlyInventory: boolean };

/** Chef-IA cards: three suggestions (rápido · saludable · elegante) built from the household context. */
export function AISuggestions({ week, onPick }: { week: string; onPick: (recipeId: string) => void }) {
  const { people, stock, recipes, weeks, kitchen, saveRecipe, currency, rate, priceOverrides, productMeasures, readyMealReferenceCUP } = useApp();
  const [items, setItems] = useState<AISuggestion[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<AISuggestion | null>(null);
  const [craving, setCraving] = useState(() => localStorage.getItem(CRAVING_DRAFT_KEY) ?? "");
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [onlyInventory, setOnlyInventory] = useState(true);
  const [cheapestFirst, setCheapestFirst] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const cravingRef = useRef<HTMLTextAreaElement>(null);
  const requestLock = useRef(false);

  useEffect(() => { localStorage.setItem(CRAVING_DRAFT_KEY, craving); }, [craving]);

  const ask = async (order: ActiveOrder | null = null) => {
    if (requestLock.current) return;
    requestLock.current = true;
    setActiveOrder(order);
    setState("loading");
    setErr("");
    try {
      const have = PRODUCTS.filter((p) => (stock[p.id]?.current ?? 0) > 0).map((p) => p.name);
      const out = PRODUCTS.filter((p) => (stock[p.id]?.current ?? 0) <= 0).map((p) => p.name);
      const plan = resolveWeek(weeks, week).plan;
      const planned = [...new Set(Object.values(plan).map((m) => recipes.find((r) => r.id === m.recipeId)?.name).filter(Boolean))];
      const res = await fetchRecipeSuggestions({
        couple: `${people.map((p) => p.name).join(" y ")}, pareja cubana que vive en Cuba, cocinan para 2 personas`,
        inventory: have.join(", "),
        missing: out.join(", "),
        planned: planned.join(", "),
        slot: kitchen.breakfast ? "desayuno, almuerzo o comida" : "almuerzo o comida",
        craving: order?.craving.trim() || undefined,
        mustUse: (order?.ingredientIds ?? []).map((id) => PRODUCTS.find((product) => product.id === id)?.name).filter((name): name is string => Boolean(name)),
        onlyInventory: order?.onlyInventory ?? false,
        productCatalog: PRODUCTS.map(({ id, name }) => ({ id, name })),
      });
      const scaleOrder = ["rapido", "saludable", "elegante"];
      setItems(res.slice(0, 3).sort((a, b) => scaleOrder.indexOf(a.scale) - scaleOrder.indexOf(b.scale)));
      setState("idle");
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e) || "No hubo respuesta. Comprueba tu conexión e inténtalo de nuevo.");
      setState("error");
    } finally {
      requestLock.current = false;
    }
  };

  const submitCraving = () => {
    const order = { craving: craving.trim().slice(0, 200), ingredientIds: ingredientIds.filter((id) => PRODUCTS.some((product) => product.id === id)), onlyInventory };
    if (!order.craving && !order.ingredientIds.length) return;
    void ask(order);
  };

  const addQuickCraving = (text: string) => {
    setCraving((current) => `${current.trim()}${current.trim() ? ", " : ""}${text}`.slice(0, 200));
    cravingRef.current?.focus();
  };

  const useExpiringSoon = () => {
    const expiring = expiringProductIds(stock, 7);
    setIngredientIds((current) => [...new Set([...current, ...expiring])]);
    setCraving((current) => current.includes("Usar lo que vence pronto") ? current : `${current.trim()}${current.trim() ? ", " : ""}Usar lo que vence pronto`.slice(0, 200));
  };

  const adopt = (s: AISuggestion, imageUrl?: string, imageMeta?: PhotoMeta) => {
    setOpen(null);
    const rid = saveRecipe({
      name: s.name, shortName: s.shortName, emoji: s.emoji || "🍲", minutes: s.minutes, servings: s.servings, description: s.description,
      scale: SCALE_META[s.scale] ? s.scale : undefined,
      ingredients: s.ingredients.map((i) => ({
        name: i.name,
        qty: i.qty,
        productId: i.productId ?? matchProduct(i.name)?.id,
        amount: i.amount,
        unit: i.unit,
        note: i.note,
      })),
      steps: s.steps,
      imageUrl: imageUrl || undefined,
      imageMeta: imageUrl ? imageMeta : undefined,
    });
    onPick(rid);
  };

  const orderedItems = useMemo(() => {
    if (!cheapestFirst) return items;
    return [...items].sort((left, right) => {
      const leftCost = costOfRecipe(left, left.servings ?? 1, priceOverrides, productMeasures);
      const rightCost = costOfRecipe(right, right.servings ?? 1, priceOverrides, productMeasures);
      if (leftCost.unknownCount && !rightCost.unknownCount) return 1;
      if (rightCost.unknownCount && !leftCost.unknownCount) return -1;
      return leftCost.total - rightCost.total;
    });
  }, [cheapestFirst, items, priceOverrides, productMeasures]);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className={`${SG_BOLD} text-[22px] leading-7 text-ink`}>Ideas del chef</h2>
          <p className="font-['Nunito:Regular'] text-xs text-ink/50">Con lo que hay en casa · sin repetir la semana</p>
        </div>
        <SketchButton color="brand" onClick={() => ask(activeOrder)} disabled={state === "loading"}>
          {state === "loading" ? "Pensando…" : items.length ? "↻ Otras ideas" : "✨ Pedir ideas"}
        </SketchButton>
      </div>

      {activeOrder && (
        <div className="flex items-start gap-2 rounded-xl border border-ink/10 bg-pastel-yellow/60 px-3 py-2">
          <p className="min-w-0 flex-1 font-['Nunito:Bold'] text-xs text-ink">
            Pedido: {activeOrder.craving || "a tu gusto"}{activeOrder.ingredientIds.length ? ` · usa: ${activeOrder.ingredientIds.map((id) => PRODUCTS.find((product) => product.id === id)?.name).filter(Boolean).join(", ")}` : ""}
          </p>
          <button type="button" aria-label="Quitar pedido" onClick={() => setActiveOrder(null)} className="grid size-8 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-white">
            <X size={16} />
          </button>
        </div>
      )}

      {state === "error" && (
        <div role="alert" className="bg-pastel-coral/60 rounded-[16px] p-3 font-['Nunito:Regular'] text-xs text-ink">
          <p>No se pudieron generar ideas. Revisa tu conexión e inténtalo de nuevo.</p>
          <p className="mt-1 opacity-60">{err.slice(0, 220)}</p>
          <button type="button" onClick={() => ask(activeOrder)} className="mt-2 min-h-10 rounded-full border border-ink/30 bg-white px-4 font-['Nunito:Bold'] text-xs">Reintentar</button>
        </div>
      )}

      {state === "loading" && (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 rounded-[20px] bg-white/70 animate-pulse" />)}
        </div>
      )}

      {state !== "loading" && items.length === 0 && state !== "error" && (
        <div className="bg-white/60 rounded-[20px] p-5 text-center">
          <p className="text-3xl mb-1">👨‍🍳</p>
          <p className="font-['Nunito:Regular'] text-sm text-ink/60">Pide tres ideas: una rápida, una saludable y una elegante.</p>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" aria-pressed={cheapestFirst} onClick={() => setCheapestFirst((value) => !value)} className={`min-h-9 rounded-full border px-3 font-['Nunito:Bold'] text-xs ${cheapestFirst ? "border-ink bg-pastel-yellow" : "border-ink/20 bg-white"}`}>Más baratas primero</button>
      </div>
      <AnimatePresence>
        {state !== "loading" && orderedItems.map((s, k) => {
          const meta = SCALE_META[s.scale] ?? SCALE_META.rapido;
          const toBuy = s.ingredients.filter((i) => ingredientStatus(matchProduct(i.name)?.id, stock) === "buy").length;
          const cost = costOfRecipe(s, s.servings ?? 1, priceOverrides, productMeasures);
          return (
            <motion.article
              key={s.name + k}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: k * 0.08 }}
              className="bg-white rounded-[20px] overflow-hidden cursor-pointer"
              role="button" tabIndex={0}
              onClick={() => setOpen(s)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(s); } }}
            >
              <div className={`${meta.bg} px-4 py-2 flex items-center justify-between`}>
                <span className={`${SG_BOLD} text-sm text-ink`}>{meta.emoji} {meta.label}</span>
                <span className="font-['Nunito:Bold'] font-bold text-xs text-ink/60">⏱ {s.minutes} min</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <span className="text-[40px] leading-none">{s.emoji}</span>
                  <div className="min-w-0">
                    <h3 className={`${SG_BOLD} text-lg leading-6 text-ink`}>{s.name}</h3>
                    <p className="font-['Nunito:Regular'] text-xs text-ink/60 line-clamp-2">{s.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.ingredients.map((i, j) => {
                    const st = ingredientStatus(matchProduct(i.name)?.id, stock);
                    return <Tag key={j} className={st === "buy" ? "bg-pastel-coral/70" : "bg-app-bg"}>{st === "buy" ? "🛒" : "✓"} {i.name}</Tag>;
                  })}
                </div>
                <p className="font-['Nunito:Bold'] text-xs text-ink">{cost.unknownCount ? "≈ " : ""}{formatMoney(cost.total, currency, rate)} · {formatMoney(cost.perServing, currency, rate)} por ración{cost.unknownCount ? ` · ${cost.unknownCount} sin precio` : ""}</p>
                {readyMealReferenceCUP > 0 && cost.unknownCount === 0 && <p className="font-['Nunito:Regular'] text-[11px] text-ink/60">En casa {formatMoney(cost.perServing, currency, rate)} · hecho {formatMoney(readyMealReferenceCUP, currency, rate)} por ración</p>}
                {s.missingNote && <p className="rounded-lg bg-pastel-coral/40 px-2 py-1 font-['Nunito:Regular'] text-xs text-ink">{s.missingNote}</p>}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-['Nunito:Regular'] text-xs text-ink/50">{toBuy ? `Faltan ${toBuy}` : "Todo en casa"} · {s.steps.length} pasos · <span className="underline">ver receta</span></span>
                  <SketchButton color="yellow" onClick={(e: any) => { e?.stopPropagation?.(); adopt(s); }}>+ Al calendario</SketchButton>
                </div>
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>

      <div className="space-y-3 rounded-[18px] border border-ink/15 bg-white/70 p-3">
        <div className="relative">
          <CravingField
            inputRef={cravingRef}
            value={craving}
            onChange={setCraving}
            placeholder="¿Qué se te antoja? Ej: algo con picadillo, una pasta, sin freír…"
            ariaLabel="Describe tu antojo"
            onSubmit={submitCraving}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_CRAVINGS.map((quick) => <button type="button" key={quick} onClick={() => addQuickCraving(quick)} className="min-h-10 rounded-full border border-ink/15 bg-white px-3 font-['Nunito:Bold'] text-xs text-ink active:bg-pastel-yellow">{quick}</button>)}
          {expiringProductIds(stock, 7).length > 0 && <button type="button" onClick={useExpiringSoon} className="min-h-10 rounded-full border border-ink/20 bg-pastel-yellow px-3 font-['Nunito:Bold'] text-xs text-ink">♻️ Usar lo que vence pronto</button>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPickerOpen(true)} className="min-h-10 rounded-full border border-ink/30 bg-pastel-mint/70 px-3 font-['Nunito:Bold'] text-xs text-ink">＋ Del inventario</button>
          {ingredientIds.filter((id) => PRODUCTS.some((product) => product.id === id)).map((id) => {
            const product = PRODUCTS.find((entry) => entry.id === id)!;
            return <span key={id} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-app-bg px-2.5 font-['Nunito:Bold'] text-xs text-ink">{product.emoji} {product.name}<button type="button" aria-label={`Quitar ${product.name}`} onClick={() => setIngredientIds((current) => current.filter((value) => value !== id))} className="grid size-7 place-items-center rounded-full hover:bg-white"><X size={14} /></button></span>;
          })}
        </div>

        <SketchButton color="brand" onClick={submitCraving} disabled={state === "loading" || (!craving.trim() && !ingredientIds.some((id) => PRODUCTS.some((product) => product.id === id)))}>
          {state === "loading" ? "Pensando…" : "✨ Pedir con este antojo"}
        </SketchButton>
      </div>
      <IngredientPicker open={pickerOpen} selected={ingredientIds} onlyAvailable={onlyInventory} onOpenChange={setPickerOpen} onDone={(ids, onlyAvailable) => { setIngredientIds(ids); setOnlyInventory(onlyAvailable); }} />
      <SuggestionDetailModal s={open} onClose={() => setOpen(null)} onAdopt={adopt} />
    </section>
  );
}

