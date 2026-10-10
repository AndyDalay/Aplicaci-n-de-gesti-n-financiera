import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { motion } from "motion/react";
import { useApp } from "../AppContext";
import { Modal } from "../Modal";
import { Select, SketchButton } from "../ui-kit";
import { CookedEntry, costOfRecipe, displayName, formatMoney, matchProduct, MEAL_SLOTS, MealSlot, parseWeekKey, PRODUCTS, Recipe, resolveWeek, shiftWeek, weekKey } from "../data";
import { Avatar, IconKey, imgPen, ingredientStatus, missingCount, NavKey, SCALE_META, SG_BOLD, SG_REG, Tag } from "../kitchen/kit";
import { CookMealModal } from "../kitchen/CookMealModal";
import { RecipeDetailModal } from "../kitchen/RecipeDetailModal";
import { RecipeEditorModal } from "../kitchen/RecipeEditorModal";
import { AISuggestions } from "../kitchen/AISuggestions";
import { ReplaceMealSheet } from "../kitchen/ReplaceMealSheet";
import { WeeklyShoppingReview } from "../kitchen/WeeklyShoppingReview";
import { AISuggestion } from "../sync";
import { RecipePhoto } from "../kitchen/RecipePhoto";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const fmt = (d: Date) => d.toLocaleDateString("es", { day: "numeric", month: "short" });
const todayIdx = () => (new Date().getDay() + 6) % 7;

/** Where a recipe is being placed: a fixed slot (from the calendar) or "ask me" (from the recetario / IA). */
type Placing = { recipeId?: string; day: number; slot: MealSlot } | null;

export function KitchenPage() {
  const { recipes, weeks, setMeal, movePlanned, saveRecipe, people, stock, kitchen, shopping, removeShopping, shopMissing, cooked, undoCooked, recordCooked, currency, rate, priceOverrides, productMeasures, foodBudgetCUP } = useApp();
  const thisWeek = weekKey(new Date());
  const [tab, setTab] = useState<"plan" | "diario">("plan");
  const [week, setWeek] = useState(thisWeek);
  const [day, setDay] = useState(todayIdx());
  const [detail, setDetail] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; recipe?: Recipe | null }>({ open: false });
  const [placing, setPlacing] = useState<Placing>(null);
  const [cooking, setCooking] = useState<{ recipe: Recipe; week?: string; slotKey?: string } | null>(null);
  const [selectedCooked, setSelectedCooked] = useState<CookedEntry | null>(null);
  const [toast, setToast] = useState<{ id: string; recipeName: string } | null>(null);
  const [replacing, setReplacing] = useState<{ recipe: Recipe; day: number; slot: string; slotKey: string; week: string; previous: NonNullable<ReturnType<typeof resolveWeek>["plan"][string]> } | null>(null);
  const [replaceToast, setReplaceToast] = useState<{ week: string; slotKey: string; previous: NonNullable<ReturnType<typeof resolveWeek>["plan"][string]>; recipeName: string } | null>(null);
  const [shoppingReviewOpen, setShoppingReviewOpen] = useState(false);
  const [missingNotice, setMissingNotice] = useState<{ count: number; recipeName: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!replaceToast) return;
    const timer = window.setTimeout(() => setReplaceToast(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [replaceToast]);

  const slots = MEAL_SLOTS.filter((s) => kitchen.breakfast || s.id !== "desayuno");
  const { plan, inherited } = resolveWeek(weeks, week);
  const start = parseWeekKey(week);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const isPast = week < thisWeek;
  const rel = week === thisWeek ? "Esta semana" : week === shiftWeek(thisWeek, 1) ? "Próxima semana" : isPast ? "Historial" : "Más adelante";
  const byId = useMemo(() => Object.fromEntries(recipes.map((r) => [r.id, r])), [recipes]);

  const place = (recipeId: string, d: number, slot: MealSlot, cookId?: string) => {
    const key = `${d}:${slot}`;
    const previous = plan[key];
    setMeal(week, key, { ...previous, recipeId, cookId: cookId ?? byId[recipeId]?.cookId, cookedId: undefined });
    const recipe = byId[recipeId];
    const missing = recipe ? missingCount(recipe, stock) : 0;
    if (!isPast && missing > 0) setMissingNotice({ count: missing, recipeName: recipe?.shortName ?? recipe?.name ?? "la comida" });
  };

  const removePlannedMeal = (slotKey: string) => {
    const removed = plan[slotKey];
    if (!removed || isPast) return;
    const removedRecipes = [removed.recipeId, ...(removed.sideIds ?? [])].map((id) => byId[id]).filter((recipe): recipe is Recipe => Boolean(recipe));
    setMeal(week, slotKey, null);
    const stillNeeded = new Set(Object.entries(plan).filter(([key]) => key !== slotKey).flatMap(([, meal]) => [meal.recipeId, ...(meal.sideIds ?? [])]).flatMap((id) => byId[id]?.ingredients ?? []).map((ingredient) => ingredient.productId ? `product:${ingredient.productId}` : `custom:${ingredient.name.trim().toLocaleLowerCase("es")}`));
    const removable = shopping.filter((item) => !item.bought && removedRecipes.some((recipe) => recipe.ingredients.some((ingredient) => {
      const key = ingredient.productId ? `product:${ingredient.productId}` : `custom:${ingredient.name.trim().toLocaleLowerCase("es")}`;
      return key === (item.productId ? `product:${item.productId}` : `custom:${(item.customName ?? "").trim().toLocaleLowerCase("es")}`) && !stillNeeded.has(key);
    })));
    if (removable.length && window.confirm(`Se quitó ${removedRecipes[0]?.shortName ?? removedRecipes[0]?.name ?? "el plato"}. ¿Retirar de compras ${removable.map((item) => item.customName ?? PRODUCTS.find((product) => product.id === item.productId)?.name).filter(Boolean).join(", ")} que solo servían para esta comida?`)) {
      removable.forEach((item) => removeShopping(item.id));
    }
  };

  const setPlannedMeal = (slotKey: string, meal: Parameters<typeof setMeal>[2]) => {
    if (meal) setMeal(week, slotKey, meal);
    else removePlannedMeal(slotKey);
  };

  return (
    <div className="px-4 pb-28 pt-4 space-y-5">
      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <NavKey label="‹" aria="Semana anterior" onClick={() => setWeek(shiftWeek(week, -1))} />
        <div className="flex-1 text-center min-w-0">
          <p className={`${SG_BOLD} text-lg leading-6 text-ink`}>{fmt(start)} – {fmt(end)}</p>
          <div className="flex justify-center gap-1 mt-0.5">
            <Tag className={isPast ? "bg-white" : "bg-amber-soft"}>{rel}</Tag>
            {inherited && !isPast && Object.keys(plan).length > 0 && <Tag className="bg-pastel-lavender">↻ Repite la anterior</Tag>}
          </div>
        </div>
        <NavKey label="›" aria="Semana siguiente" onClick={() => setWeek(shiftWeek(week, 1))} />
      </div>

      <WeekBoard
        key={week}
        week={week}
        start={start}
        plan={plan}
        recipes={recipes}
        people={people}
        stock={stock}
        slots={slots}
        isPast={isPast}
        today={week === thisWeek ? todayIdx() : -1}
        cooked={cooked}
        currency={currency}
        rate={rate}
        priceOverrides={priceOverrides}
        productMeasures={productMeasures}
        foodBudgetCUP={foodBudgetCUP}
        onPlace={(d, slot) => { setDay(d); setPlacing({ day: d, slot }); }}
        onMove={(from, to) => movePlanned(week, from, to)}
        onReviewShopping={() => setShoppingReviewOpen(true)}
        onReplace={(recipe, d, slotKey, slotLabel, previous) => setReplacing({ recipe, day: d, slot: slotLabel, slotKey, week, previous })}
        onSetMeal={(key, meal) => setPlannedMeal(key, meal)}
        onView={setDetail}
        onCook={(recipe, slotKey) => setCooking({ recipe, week, slotKey })}
      />
      {missingNotice && !isPast && <button type="button" onClick={() => { setShoppingReviewOpen(true); setMissingNotice(null); }} className="-mt-3 min-h-10 w-full rounded-xl border border-ink/15 bg-pastel-yellow px-3 text-left font-['Nunito:Bold'] text-xs text-ink">Faltan {missingNotice.count} ingredientes para {missingNotice.recipeName} · Revisar compras</button>}
      <WeeklyShoppingReview week={week} open={shoppingReviewOpen} onOpenChange={setShoppingReviewOpen} />

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("plan")} className={`flex-1 rounded-full border-[1.5px] border-ink px-3 py-2 font-['Nunito:Bold'] ${tab === "plan" ? "bg-brand text-white" : "bg-white"}`}>
          Planificación
        </button>
        <button type="button" onClick={() => setTab("diario")} className={`flex-1 rounded-full border-[1.5px] border-ink px-3 py-2 font-['Nunito:Bold'] ${tab === "diario" ? "bg-brand text-white" : "bg-white"}`}>
          Diario de cocina
        </button>
      </div>

      {tab === "plan" ? (
        <>
          {/* AI ideas */}
          {!isPast && <AISuggestions week={week} onPick={(rid) => setPlacing({ recipeId: rid, day, slot: slots[slots.length > 2 ? 1 : 0].id })} />}

          {/* Recetario */}
          <section className="space-y-2.5">
            <div className="flex items-end justify-between">
              <div>
                <h2 className={`${SG_BOLD} text-[22px] leading-7 text-ink`}>Recetario</h2>
                <p className="font-['Nunito:Regular'] text-xs text-ink/50">{recipes.length} recetas de la casa</p>
              </div>
              <SketchButton onClick={() => setEditing({ open: true, recipe: null })}>+ Nueva</SketchButton>
            </div>
            {recipes.map((r) => {
              const cook = people.find((p) => p.id === r.cookId);
              const missing = missingCount(r, stock);
              return (
                <div key={r.id} className="bg-white rounded-[16px] p-3 flex items-center gap-2.5">
                  <div className="size-10 shrink-0 rounded-[12px] bg-app-bg flex items-center justify-center text-xl">{r.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-['Nunito:ExtraBold'] font-extrabold text-sm text-ink truncate">{r.name}</p>
                    <p className="font-['Nunito:Regular'] text-xs text-ink/40 truncate">
                      {r.ingredients.length} ingredientes{missing ? ` · faltan ${missing}` : " · todo en casa"}{cook ? ` · ${cook.name}` : ""}
                    </p>
                  </div>
                  <IconKey title="Ver" onClick={() => setDetail(r)}>📖</IconKey>
                  <IconKey title="Editar" onClick={() => setEditing({ open: true, recipe: r })}><img src={imgPen} alt="" className="size-4" /></IconKey>
                  {!isPast && <IconKey title="Planificar" onClick={() => setPlacing({ recipeId: r.id, day, slot: slots[0].id })} className="bg-amber-soft">📅</IconKey>}
                </div>
              );
            })}
          </section>
        </>
      ) : (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[...cooked].filter((entry) => !entry.undone).slice(0, 12).map((entry) => (
              <button key={entry.id} type="button" onClick={() => setSelectedCooked(entry)} className="overflow-hidden rounded-[18px] border-[1.5px] border-ink bg-white text-left">
                <div className="relative h-28 w-full bg-app-bg">
                  {entry.photoUrl ? <img src={entry.photoUrl} alt={entry.recipeName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl">🍽️</div>}
                </div>
                <div className="p-2">
                  <p className="font-['Nunito:ExtraBold'] text-sm text-ink">{entry.recipeName}</p>
                  <p className="font-['Nunito:Regular'] text-[11px] text-ink/60">{new Date(entry.at).toLocaleDateString("es", { day: "numeric", month: "short" })}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <PlaceModal
        placing={placing}
        onClose={() => setPlacing(null)}
        slots={slots}
        startDate={start}
        current={placing ? plan[`${placing.day}:${placing.slot}`] : undefined}
        isPast={isPast}
        onSave={(rid, d, slot, cookId) => { if (!isPast) place(rid, d, slot, cookId); setDay(d); setPlacing(null); }}
        onClear={(d, slot) => { if (!isPast) removePlannedMeal(`${d}:${slot}`); setPlacing(null); }}
      />
      <ReplaceMealSheet
        replacing={replacing}
        week={week}
        open={!!replacing}
        onOpenChange={(open) => { if (!open) setReplacing(null); }}
        onChoose={(suggestion, photo) => {
          if (!replacing) return;
          const scale = SCALE_META[suggestion.scale] ? suggestion.scale : "rapido";
          const recipeId = saveRecipe({
            name: suggestion.name,
            shortName: suggestion.shortName,
            emoji: suggestion.emoji || "🍲",
            minutes: suggestion.minutes,
            servings: suggestion.servings,
            description: suggestion.description,
            scale,
            ingredients: suggestion.ingredients.map((ingredient) => ({ ...ingredient, productId: ingredient.productId ?? matchProduct(ingredient.name)?.id })),
            steps: suggestion.steps,
            imageUrl: photo?.url,
            imageMeta: photo?.url ? photo.meta : undefined,
          });
          setMeal(replacing.week, replacing.slotKey, { ...replacing.previous, recipeId, cookedId: undefined });
          setReplaceToast({ week: replacing.week, slotKey: replacing.slotKey, previous: replacing.previous, recipeName: suggestion.shortName || suggestion.name });
          const hasMissing = suggestion.ingredients.some((ingredient) => ingredientStatus(ingredient.productId ?? matchProduct(ingredient.name)?.id, stock) === "buy");
          if (hasMissing && window.confirm(`Faltan ingredientes para ${suggestion.shortName || suggestion.name}. ¿Añadir faltantes a compras?`)) {
            window.setTimeout(() => shopMissing(recipeId), 0);
          }
          setReplacing(null);
        }}
      />
      <CookMealModal
        open={!!cooking}
        recipe={cooking?.recipe ?? null}
        week={cooking?.week ?? week}
        slotKey={cooking?.slotKey}
        onClose={() => setCooking(null)}
      />
      <RecipeDetailModal
        recipe={detail}
        onClose={() => setDetail(null)}
        onEdit={(r) => { setDetail(null); setEditing({ open: true, recipe: r }); }}
        onCook={(r) => { setDetail(null); setCooking({ recipe: r, week, slotKey: `${day}:${slots[0]?.id ?? "almuerzo"}` }); }}
      />
      <RecipeEditorModal open={editing.open} recipe={editing.recipe} onClose={() => setEditing({ open: false })} />
      {selectedCooked && (
        <Modal open={!!selectedCooked} onClose={() => setSelectedCooked(null)} title={selectedCooked.recipeName}>
          <div className="space-y-3">
            {selectedCooked.photoUrl && <img src={selectedCooked.photoUrl} alt={selectedCooked.recipeName} className="h-40 w-full rounded-[16px] object-cover border-[1.5px] border-ink" />}
            <p className="font-['Nunito:Regular'] text-sm text-ink/70">{new Date(selectedCooked.at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}</p>
            <ul className="space-y-1.5">
              {selectedCooked.used.map((item) => (
                <li key={`${selectedCooked.id}-${item.productId}`} className="rounded-[12px] border-[1.5px] border-ink bg-white p-2 text-sm text-ink">
                  {item.name ?? item.productId} · {item.amount} {item.base}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <SketchButton block color="coral" onClick={() => { undoCooked(selectedCooked.id); setSelectedCooked(null); }}>Deshacer</SketchButton>
              <SketchButton block onClick={() => {
                const recipe = recipes.find((r) => r.id === selectedCooked.recipeId);
                if (recipe) {
                  setSelectedCooked(null);
                  setCooking({ recipe, week: selectedCooked.week ?? week, slotKey: selectedCooked.slotKey });
                }
              }}>Cocinar otra vez</SketchButton>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-[18px] border-[1.5px] border-ink bg-white p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <p className="font-['Nunito:ExtraBold'] text-sm text-ink">✅ {toast.recipeName}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => { undoCooked(toast.id); setToast(null); }} className="flex-1 rounded-full border-[1.5px] border-ink bg-pastel-coral px-3 py-1.5 font-['Nunito:Bold'] text-sm">
              Deshacer
            </button>
            <button type="button" onClick={() => setToast(null)} className="flex-1 rounded-full border-[1.5px] border-ink bg-white px-3 py-1.5 font-['Nunito:Bold'] text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}
      {replaceToast && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-[18px] border-[1.5px] border-ink bg-white p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <p className="min-w-0 flex-1 truncate font-['Nunito:ExtraBold'] text-sm text-ink">Cambiado · {replaceToast.recipeName}</p>
          <button type="button" onClick={() => { setMeal(replaceToast.week, replaceToast.slotKey, replaceToast.previous); setReplaceToast(null); }} className="rounded-full border-[1.5px] border-ink bg-pastel-yellow px-4 py-2 font-['Nunito:Bold'] text-sm">Deshacer</button>
        </div>
      )}
    </div>
  );
}

type WeekBoardProps = {
  week: string;
  start: Date;
  plan: Record<string, { recipeId: string; cookId?: string; cookedId?: string; sideIds?: string[] }>;
  recipes: Recipe[];
  people: { id: string; name: string; emoji: string; color: string; avatar?: string }[];
  stock: Record<string, any>;
  slots: typeof MEAL_SLOTS;
  isPast: boolean;
  today: number;
  cooked: CookedEntry[];
  currency: "CUP" | "USD";
  rate: number;
  priceOverrides: Record<string, number>;
  productMeasures: ReturnType<typeof useApp>["productMeasures"];
  foodBudgetCUP: number;
  onPlace: (day: number, slot: MealSlot) => void;
  onMove: (from: string, to: string) => void;
  onReviewShopping: () => void;
  onReplace: (recipe: Recipe, day: number, slotKey: string, slotLabel: string, previous: NonNullable<WeekBoardProps["plan"][string]>) => void;
  onSetMeal: (key: string, meal: { recipeId: string; cookId?: string; cookedId?: string; sideIds?: string[] } | null) => void;
  onView: (recipe: Recipe) => void;
  onCook: (recipe: Recipe, slotKey: string) => void;
};

function WeekBoard({ week, start, plan, recipes, people, stock, slots, isPast, today, cooked, currency, rate, priceOverrides, productMeasures, foodBudgetCUP, onPlace, onMove, onReviewShopping, onReplace, onSetMeal, onView, onCook }: WeekBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeDragKey, setActiveDragKey] = useState<string | null>(null);
  const [moveDay, setMoveDay] = useState(0);
  const [moveSlot, setMoveSlot] = useState<MealSlot>(slots[0]?.id ?? "almuerzo");
  const byId = useMemo(() => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const visibleMeals = Object.entries(plan).filter(([key]) => slots.some((slot) => key.endsWith(`:${slot.id}`))).map(([, meal]) => meal);
  const mealCount = visibleMeals.filter((meal) => byId[meal.recipeId]).length;
  const missingMeals = visibleMeals.filter((meal) => {
    const recipe = byId[meal.recipeId];
    return recipe && missingCount(recipe, stock) > 0;
  }).length;
  const costs = visibleMeals.map((meal) => byId[meal.recipeId] ? costOfRecipe(byId[meal.recipeId], byId[meal.recipeId].servings ?? 1, priceOverrides, productMeasures) : null).filter((cost): cost is NonNullable<typeof cost> => cost !== null);
  const weeklyTotal = costs.reduce((sum, cost) => sum + cost.total, 0);
  const unknownCosts = costs.reduce((sum, cost) => sum + cost.unknownCount, 0);
  const budgetRatio = foodBudgetCUP > 0 ? weeklyTotal / foodBudgetCUP : 0;
  const budgetTone = budgetRatio > 1 ? "bg-pastel-coral" : budgetRatio >= 0.8 ? "bg-pastel-yellow" : "bg-pastel-mint";

  useEffect(() => {
    if (today < 0 || !scrollRef.current) return;
    const header = scrollRef.current.querySelector<HTMLElement>(`[data-day="${today}"]`);
    if (header) scrollRef.current.scrollLeft = header.offsetLeft + header.offsetWidth / 2 - scrollRef.current.clientWidth / 2;
  }, [week, today]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(null); };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest("[data-board-card], [data-slot-popover]")) setExpanded(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOutside);
    return () => { window.removeEventListener("keydown", closeOnEscape); window.removeEventListener("pointerdown", closeOutside); };
  }, []);

  const onDragStart = (event: DragStartEvent) => {
    setExpanded(null);
    if (typeof navigator !== "undefined") navigator.vibrate?.(18);
    setActiveDragKey(String(event.active.id).replace(/^meal:/, ""));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragKey(null);
    if (!isPast && over && String(over.id).startsWith("cell:")) {
      const from = String(active.id).replace(/^meal:/, "");
      const to = String(over.id).replace(/^cell:/, "");
      if (slots.some((slot) => to.endsWith(`:${slot.id}`))) onMove(from, to);
    }
  };

  return (
    <section className="space-y-2" aria-label="Tablero semanal">
      <div className="flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2">
        <div className="min-w-0">
          <p className={`${SG_BOLD} text-sm text-ink`}>{mealCount} comidas · Semana {unknownCosts ? "≈ " : ""}{formatMoney(weeklyTotal, currency, rate)}</p>
          {unknownCosts > 0 && <p className="font-['Nunito:Regular'] text-[10px] text-ink/55">{unknownCosts} sin precio o conversión</p>}
        </div>
        <Tag className={missingMeals ? "bg-pastel-peach" : "bg-pastel-mint"}>🛒 {missingMeals} con faltantes</Tag>
      </div>
      {foodBudgetCUP > 0 && <div className="space-y-1 rounded-[12px] bg-white px-3 py-2">
        <div className="flex justify-between gap-2 font-['Nunito:Bold'] text-[11px] text-ink"><span>Presupuesto semanal de comida</span><span>{formatMoney(weeklyTotal, currency, rate)} / {formatMoney(foodBudgetCUP, currency, rate)}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-ink/10"><div className={`h-full rounded-full ${budgetTone}`} style={{ width: `${Math.min(100, budgetRatio * 100)}%` }} /></div>
      </div>}
      {!isPast && <button type="button" onClick={onReviewShopping} className="min-h-10 rounded-full border-[1.5px] border-ink bg-pastel-mint px-4 font-['Nunito:Bold'] text-xs text-ink">🛒 Preparar compras de la semana</button>}
      <div ref={scrollRef} className="-mx-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-2 pb-3 [scrollbar-width:thin]">
        <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll={!isPast} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setExpanded(null)}>
          <div className="grid w-max grid-cols-[68px_repeat(7,148px)] items-stretch">
            <div className="sticky left-0 z-30 flex items-end bg-app-bg px-1 pb-2" />
            {DAYS.map((name, dayIndex) => {
              const date = new Date(start); date.setDate(start.getDate() + dayIndex);
              const isToday = dayIndex === today;
              return (
                <div key={name} data-day={dayIndex} className={`snap-center border-b-2 border-ink/15 px-2 pb-2 text-center ${isToday ? "text-brand" : "text-ink"}`}>
                  <p className="font-['Nunito:Bold'] text-[11px] uppercase">{name}</p>
                  <p className={`${SG_BOLD} text-xl leading-6 ${isToday ? "mx-auto grid size-8 place-items-center rounded-full bg-brand text-white" : ""}`}>{date.getDate()}</p>
                  {isToday && <span className="sr-only">Hoy</span>}
                </div>
              );
            })}
            {slots.map((slot) => (
              <BoardSlotRow
                key={slot.id}
                slot={slot}
                plan={plan}
                byId={byId}
                people={people}
                stock={stock}
                cooked={cooked}
                currency={currency}
                rate={rate}
                priceOverrides={priceOverrides}
                productMeasures={productMeasures}
                isPast={isPast}
                expanded={expanded}
                setExpanded={setExpanded}
                recipes={recipes}
                slots={slots}
                moveDay={moveDay}
                moveSlot={moveSlot}
                setMoveDay={setMoveDay}
                setMoveSlot={setMoveSlot}
                onPlace={onPlace}
                onMove={onMove}
                onReplace={onReplace}
                onSetMeal={onSetMeal}
                onView={onView}
                onCook={onCook}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragKey && byId[plan[activeDragKey]?.recipeId] ? <DragPreview recipe={byId[plan[activeDragKey].recipeId]} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </section>
  );
}

function BoardSlotRow({ slot, plan, byId, people, stock, cooked, currency, rate, priceOverrides, productMeasures, isPast, expanded, setExpanded, recipes, slots, moveDay, moveSlot, setMoveDay, setMoveSlot, onPlace, onMove, onReplace, onSetMeal, onView, onCook }: {
  slot: typeof MEAL_SLOTS[number];
  plan: WeekBoardProps["plan"];
  byId: Record<string, Recipe>;
  people: WeekBoardProps["people"];
  stock: WeekBoardProps["stock"];
  cooked: CookedEntry[];
  currency: WeekBoardProps["currency"];
  rate: number;
  priceOverrides: Record<string, number>;
  productMeasures: WeekBoardProps["productMeasures"];
  isPast: boolean;
  expanded: string | null;
  setExpanded: (key: string | null) => void;
  recipes: Recipe[];
  slots: typeof MEAL_SLOTS;
  moveDay: number;
  moveSlot: MealSlot;
  setMoveDay: (day: number) => void;
  setMoveSlot: (slot: MealSlot) => void;
  onPlace: WeekBoardProps["onPlace"];
  onMove: WeekBoardProps["onMove"];
  onReplace: WeekBoardProps["onReplace"];
  onSetMeal: WeekBoardProps["onSetMeal"];
  onView: WeekBoardProps["onView"];
  onCook: WeekBoardProps["onCook"];
}) {
  const tone = slot.id === "desayuno" ? "bg-pastel-yellow" : slot.id === "almuerzo" ? "bg-pastel-peach" : "bg-pastel-lavender";
  return (
    <>
      <div className={`sticky left-0 z-20 flex min-h-[124px] items-center bg-app-bg px-1 py-2 ${SG_BOLD} text-[11px] leading-tight text-ink`}>
        <span className="w-[62px] rounded-r-[12px] border-y border-r border-ink/15 py-2 pr-1">{slot.emoji} {slot.label}</span>
      </div>
      {DAYS.map((_, day) => {
        const key = `${day}:${slot.id}`;
        const meal = plan[key];
        const recipe = meal ? byId[meal.recipeId] : undefined;
        const cook = people.find((person) => person.id === meal?.cookId);
        const isCooked = !!meal?.cookedId && cooked.some((entry) => entry.id === meal.cookedId && !entry.undone);
        return (
          <BoardCell key={key} id={key} disabled={isPast} tone={tone}>
            {recipe && meal ? (
              <DraggableMeal
                id={key}
                day={day}
                meal={meal}
                recipe={recipe}
                cook={cook}
                sideRecipes={(meal.sideIds ?? []).map((id) => byId[id]).filter((item): item is Recipe => !!item)}
                allRecipes={recipes}
                availableSlots={slots}
                stock={stock}
                missing={missingCount(recipe, stock)}
                cooked={isCooked}
                currency={currency}
                rate={rate}
                priceOverrides={priceOverrides}
                productMeasures={productMeasures}
                disabled={isPast}
                expanded={expanded === key}
                onToggle={() => setExpanded(expanded === key ? null : key)}
                onView={() => onView(recipe)}
                onChange={() => { setExpanded(null); onReplace(recipe, day, key, slot.label, meal); }}
                onCook={() => onCook(recipe, key)}
                onSetMeal={(next) => onSetMeal(key, next)}
                moveDay={moveDay}
                moveSlot={moveSlot}
                setMoveDay={setMoveDay}
                setMoveSlot={setMoveSlot}
                onMove={(target) => { onMove(key, target); setExpanded(null); }}
                people={people}
              />
            ) : (
              <button type="button" disabled={isPast} onClick={() => onPlace(day, slot.id)} className="grid min-h-[108px] w-full place-items-center rounded-[14px] border border-dashed border-ink/20 bg-white/55 text-2xl text-ink/35 disabled:cursor-default" aria-label={`Planificar ${slot.label} del ${DAYS[day]}`}>
                +
              </button>
            )}
          </BoardCell>
        );
      })}
    </>
  );
}

function BoardCell({ id, disabled, tone, children }: { id: string; disabled: boolean; tone: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${id}`, disabled });
  return <div ref={setNodeRef} className={`relative min-h-[124px] border-b border-ink/10 p-1.5 ${tone} ${isOver ? "ring-2 ring-inset ring-brand" : ""}`}>{children}</div>;
}

function DraggableMeal({ id, day, meal, recipe, cook, sideRecipes, allRecipes, availableSlots, stock, missing, cooked, currency, rate, priceOverrides, productMeasures, disabled, expanded, onToggle, onView, onChange, onCook, onSetMeal, moveDay, moveSlot, setMoveDay, setMoveSlot, onMove, people }: {
  id: string;
  day: number;
  meal: NonNullable<WeekBoardProps["plan"][string]>;
  recipe: Recipe;
  cook?: WeekBoardProps["people"][number];
  sideRecipes: Recipe[];
  allRecipes: Recipe[];
  availableSlots: typeof MEAL_SLOTS;
  stock: WeekBoardProps["stock"];
  missing: number;
  cooked: boolean;
  currency: WeekBoardProps["currency"];
  rate: number;
  priceOverrides: Record<string, number>;
  productMeasures: WeekBoardProps["productMeasures"];
  disabled: boolean;
  expanded: boolean;
  onToggle: () => void;
  onView: () => void;
  onChange: () => void;
  onCook: () => void;
  onSetMeal: (meal: WeekBoardProps["plan"][string] | null) => void;
  moveDay: number;
  moveSlot: MealSlot;
  setMoveDay: (day: number) => void;
  setMoveSlot: (slot: MealSlot) => void;
  onMove: (target: string) => void;
  people: WeekBoardProps["people"];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `meal:${id}`, disabled, data: { key: id } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  useEffect(() => { if (expanded) { setMoveDay(day); setMoveSlot(availableSlots[0]?.id ?? "almuerzo"); } }, [expanded, day, availableSlots, setMoveDay, setMoveSlot]);
  const setSides = (sideId: string) => {
    if (meal.sideIds?.includes(sideId)) return;
    onSetMeal({ ...meal, sideIds: [...(meal.sideIds ?? []), sideId] });
  };
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      layoutId={`planned-${id}`}
      transition={{ layout: { type: "spring", stiffness: 420, damping: 34, duration: 0.22 } }}
      data-board-card
      onClick={onToggle}
      {...attributes}
      {...listeners}
      className={`relative touch-pan-x select-none ${isDragging ? "z-40 opacity-30" : "z-10"} ${expanded ? `absolute ${day >= 5 ? "right-0" : "left-0"} top-1 z-30 w-[280px]` : "w-full"}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-expanded={expanded}
    >
      <div className={`relative overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-white text-left shadow-[2px_2px_0_rgba(0,0,0,.15)] ${expanded ? "max-h-[260px] overflow-y-auto p-2.5" : "min-h-[108px] p-2"}`}>
        <div className="flex items-start gap-1.5">
          <span className="text-xl leading-6">{recipe.emoji}</span>
          <span className={`min-w-0 flex-1 font-['Nunito:ExtraBold'] text-[11px] leading-[1.2] text-ink ${expanded ? "line-clamp-2 text-sm" : "line-clamp-2"}`}>{displayName(recipe)}</span>
          <span title={cooked ? "Cocinado" : missing ? "Faltan ingredientes" : "Ingredientes disponibles"} className="shrink-0 text-[10px]">{cooked ? "✅" : missing ? "🛒" : "●"}</span>
        </div>
        <p className="mt-1 truncate font-['Nunito:Regular'] text-[10px] text-ink/60">{sideRecipes.map((side) => `+ ${displayName(side)}`).join(" · ") || (expanded ? "Sin guarnición" : "+ Guarnición")}</p>
        <div className="mt-1 flex items-center justify-between gap-1">
          <p className="min-w-0 truncate font-['Nunito:Regular'] text-[10px] text-ink/55">{missing ? `🛒 ${missing} faltantes` : recipe.minutes ? `⏱ ${recipe.minutes} min` : "Ingredientes listos"}</p>
          <Avatar person={cook} size={22} />
        </div>
        {expanded && (
          <div className="mt-2 space-y-2 border-t border-ink/10 pt-2" onClick={(event) => event.stopPropagation()}>
            <RecipePhoto name={recipe.name} ingredients={recipe.ingredients.map((item) => item.name)} url={recipe.imageUrl} meta={recipe.imageMeta} recipeId={recipe.id} />
            <p className="font-['Nunito:Bold'] text-xs text-ink">{recipe.minutes ? `⏱ ${recipe.minutes} min` : "Ingredientes"}</p>
            {(() => {
              const cost = costOfRecipe(recipe, recipe.servings ?? 1, priceOverrides, productMeasures);
              return <p className="font-['Nunito:Bold'] text-xs text-ink">{cost.unknownCount ? "≈ " : ""}{formatMoney(cost.total, currency, rate)} · {formatMoney(cost.perServing, currency, rate)} por ración{cost.unknownCount ? ` · ${cost.unknownCount} sin precio` : ""}</p>;
            })()}
            <ul className="space-y-1">
              {recipe.ingredients.map((ingredient, index) => {
                const available = !!ingredient.productId && (stock[ingredient.productId]?.current ?? 0) > 0;
                return <li key={`${ingredient.name}-${index}`} className="text-[11px] text-ink/75">{available ? "✅" : "🛒"} {ingredient.name} · {ingredient.qty}</li>;
              })}
            </ul>
            {!disabled && <Popover>
              <PopoverTrigger asChild>
                <button type="button" data-slot-popover onClick={(event) => event.stopPropagation()} className="w-full rounded-full border-[1.5px] border-ink bg-amber-soft px-3 py-1.5 font-['Nunito:Bold'] text-xs">⋯ Acciones</button>
              </PopoverTrigger>
              <PopoverContent data-slot-popover align="start" side="bottom" className="z-[70] w-[250px] max-h-[70vh] space-y-1 overflow-y-auto rounded-[14px] border-[1.5px] border-ink bg-white p-2">
                <BoardAction onClick={onView}>👁 Ver receta</BoardAction>
                <BoardAction onClick={onChange}>🔄 Cambiar plato</BoardAction>
                <BoardAction onClick={onCook}>✅ Cocinamos esto</BoardAction>
                <p className="px-2 pt-1 font-['Nunito:Bold'] text-[10px] text-ink/50">➕ Guarnición</p>
                {allRecipes.filter((side) => side.id !== recipe.id).map((side) => (
                  <BoardAction key={side.id} disabled={meal.sideIds?.includes(side.id)} onClick={() => setSides(side.id)}>{side.emoji} {displayName(side)}</BoardAction>
                ))}
                {sideRecipes.map((side) => <BoardAction key={`remove-${side.id}`} onClick={() => onSetMeal({ ...meal, sideIds: meal.sideIds?.filter((sideId) => sideId !== side.id) })}>Quitar {displayName(side)}</BoardAction>)}
                <p className="px-2 pt-1 font-['Nunito:Bold'] text-[10px] text-ink/50">👤 Quién cocina</p>
                {people.map((person) => <BoardAction key={person.id} onClick={() => onSetMeal({ ...meal, cookId: person.id })}>{person.emoji} {person.name}{person.id === meal.cookId ? " ✓" : ""}</BoardAction>)}
                <p className="px-2 pt-1 font-['Nunito:Bold'] text-[10px] text-ink/50">↔ Mover a…</p>
                <div className="flex gap-1 px-1">
                  <select aria-label="Día destino" value={moveDay} onChange={(event) => setMoveDay(Number(event.target.value))} className="min-w-0 flex-1 rounded-lg border border-ink/20 bg-white p-1 text-xs">{DAYS.map((label, index) => <option key={label} value={index}>{label}</option>)}</select>
                  <select aria-label="Franja destino" value={moveSlot} onChange={(event) => setMoveSlot(event.target.value as MealSlot)} className="min-w-0 flex-1 rounded-lg border border-ink/20 bg-white p-1 text-xs">{availableSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}</select>
                  <button type="button" onClick={() => onMove(`${moveDay}:${moveSlot}`)} className="rounded-lg border border-ink bg-pastel-mint px-2 text-xs">Mover</button>
                </div>
                <BoardAction onClick={() => onSetMeal(null)}>🗑 Quitar del plan</BoardAction>
              </PopoverContent>
            </Popover>}
            return <div className="w-[148px] rounded-[14px] border-[1.5px] border-ink bg-white p-2 opacity-95 shadow-lg"><span className="mr-1 text-xl">{recipe.emoji}</span><span className="font-['Nunito:ExtraBold'] text-xs text-ink">{displayName(recipe)}</span></div>;
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DragPreview({ recipe }: { recipe: Recipe }) {
  return (
    <div className="w-[148px] rounded-[14px] border-[1.5px] border-ink bg-white p-2 opacity-95 shadow-lg">
      <span className="mr-1 text-xl">{recipe.emoji}</span>
      <span className="font-['Nunito:ExtraBold'] text-xs text-ink">{displayName(recipe)}</span>
    </div>
  );
}

function BoardAction({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={(event) => { event.stopPropagation(); onClick(); }} className="block w-full rounded-lg px-2 py-1.5 text-left font-['Nunito:Bold'] text-xs text-ink hover:bg-app-bg disabled:opacity-40">{children}</button>;
}

function PlaceModal({ placing, onClose, slots, startDate, current, onSave, onClear, isPast = false }: {
  placing: Placing;
  onClose: () => void;
  slots: typeof MEAL_SLOTS;
  startDate: Date;
  current?: { recipeId: string; cookId?: string };
  onSave: (recipeId: string, day: number, slot: MealSlot, cookId?: string) => void;
  onClear: (day: number, slot: MealSlot) => void;
  isPast?: boolean;
}) {
  const { recipes, people } = useApp();
  const [rid, setRid] = useState("");
  const [d, setD] = useState(0);
  const [slot, setSlot] = useState<MealSlot>("almuerzo");
  const [cook, setCook] = useState("");
  const [key, setKey] = useState<Placing>(null);

  // Reset local fields whenever a new placement starts.
  if (placing !== key) {
    setKey(placing);
    if (placing) {
      setRid(placing.recipeId ?? current?.recipeId ?? recipes[0]?.id ?? "");
      setD(placing.day);
      setSlot(placing.slot);
      setCook(current?.cookId ?? "");
    }
  }
  const r = recipes.find((x) => x.id === rid);

  return (
    <Modal open={!!placing} onClose={onClose} title="Planificar comida">
      <div className="space-y-3">
        <label className="block text-xs font-['Nunito:Bold'] font-bold text-ink/60">Receta
          <Select value={rid} onChange={(e) => setRid(e.target.value)}>
            {recipes.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.name}</option>)}
          </Select>
        </label>
        <div>
          <p className="text-xs font-['Nunito:Bold'] font-bold text-ink/60 mb-1">Día</p>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((name, i) => {
              const dt = new Date(startDate); dt.setDate(startDate.getDate() + i);
              return (
                <button key={name} onClick={() => setD(i)} className={`rounded-[12px] border-[1.5px] border-ink py-1 text-center ${d === i ? "bg-amber-soft translate-x-0.5 translate-y-0.5" : "bg-white drop-shadow-[2px_2px_0px_#1a1a1a]"}`}>
                  <span className="block font-['Nunito:Bold'] font-bold text-[10px]">{name}</span>
                  <span className={`${SG_BOLD} text-sm`}>{dt.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-['Nunito:Bold'] font-bold text-ink/60 mb-1">Comida</p>
          <div className="flex gap-1.5">
            {slots.map((s) => (
              <button key={s.id} onClick={() => setSlot(s.id)} className={`flex-1 rounded-full border-[1.5px] border-ink py-1.5 font-['Nunito:Bold'] font-bold text-xs ${slot === s.id ? "bg-amber-soft translate-x-0.5 translate-y-0.5" : "bg-white drop-shadow-[2px_2px_0px_#1a1a1a]"}`}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs font-['Nunito:Bold'] font-bold text-ink/60">Quién cocina
          <Select value={cook} onChange={(e) => setCook(e.target.value)}>
            <option value="">{r?.cookId ? `Por defecto (${people.find((p) => p.id === r.cookId)?.name})` : "Cualquiera"}</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </Select>
        </label>
        <p className="font-['Nunito:Regular'] text-xs text-ink/50">Si falta algún ingrediente, se añade solo a la lista de compras.</p>
        <div className="flex gap-2">
          {current && placing && !placing.recipeId && <SketchButton disabled={isPast} onClick={() => onClear(d, slot)}>Quitar</SketchButton>}
          <SketchButton color="brand" block disabled={!rid || isPast} onClick={() => onSave(rid, d, slot, cook || undefined)}>Guardar en el calendario</SketchButton>
        </div>
      </div>
    </Modal>
  );
}
