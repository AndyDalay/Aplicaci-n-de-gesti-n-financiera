import { useEffect, useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { Modal } from "../Modal";
import { Select, SketchButton } from "../ui-kit";
import { CookedEntry, MEAL_SLOTS, MealSlot, parseWeekKey, Recipe, resolveWeek, shiftWeek, weekKey } from "../data";
import { Avatar, IconKey, imgPen, missingCount, NavKey, SG_BOLD, SG_REG, Tag } from "../kitchen/kit";
import { CookMealModal } from "../kitchen/CookMealModal";
import { RecipeDetailModal } from "../kitchen/RecipeDetailModal";
import { RecipeEditorModal } from "../kitchen/RecipeEditorModal";
import { AISuggestions } from "../kitchen/AISuggestions";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const fmt = (d: Date) => d.toLocaleDateString("es", { day: "numeric", month: "short" });
const todayIdx = () => (new Date().getDay() + 6) % 7;

/** Where a recipe is being placed: a fixed slot (from the calendar) or "ask me" (from the recetario / IA). */
type Placing = { recipeId?: string; day: number; slot: MealSlot } | null;

export function KitchenPage() {
  const { recipes, weeks, setMeal, people, stock, kitchen, shopMissing, cooked, undoCooked, recordCooked } = useApp();
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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const slots = MEAL_SLOTS.filter((s) => kitchen.breakfast || s.id !== "desayuno");
  const { plan, inherited } = resolveWeek(weeks, week);
  const start = parseWeekKey(week);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const isPast = week < thisWeek;
  const rel = week === thisWeek ? "Esta semana" : week === shiftWeek(thisWeek, 1) ? "Próxima semana" : isPast ? "Historial" : "Más adelante";
  const byId = useMemo(() => Object.fromEntries(recipes.map((r) => [r.id, r])), [recipes]);

  const place = (recipeId: string, d: number, slot: MealSlot, cookId?: string) => {
    setMeal(week, `${d}:${slot}`, { recipeId, cookId: cookId ?? byId[recipeId]?.cookId });
    if (!isPast) shopMissing(recipeId);
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

      {/* Day strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => {
          const date = new Date(start); date.setDate(start.getDate() + i);
          const active = i === day;
          const isToday = week === thisWeek && i === todayIdx();
          const filled = slots.filter((s) => plan[`${i}:${s.id}`]).length;
          return (
            <button
              key={d}
              onClick={() => setDay(i)}
              aria-pressed={active}
              className={`flex flex-col items-center py-1.5 rounded-[14px] border-[1.5px] border-ink transition-transform ${active ? "bg-brand text-white translate-x-0.5 translate-y-0.5" : "bg-white text-ink drop-shadow-[2px_2px_0px_#1a1a1a]"}`}
            >
              <span className="font-['Nunito:Bold'] font-bold text-[10px] uppercase opacity-70">{d}</span>
              <span className={`${SG_BOLD} text-lg leading-6`}>{date.getDate()}</span>
              <span className="flex gap-0.5 h-1.5 items-center">
                {slots.map((s, k) => <span key={k} className={`size-1 rounded-full ${k < filled ? (active ? "bg-white" : "bg-brand") : active ? "bg-white/30" : "bg-ink/15"}`} />)}
              </span>
              {isToday && <span className="sr-only">hoy</span>}
            </button>
          );
        })}
      </div>

      {/* Meals of the selected day */}
      <div className="space-y-2.5">
        {slots.map((s) => {
          const meal = plan[`${day}:${s.id}`];
          const r = meal ? byId[meal.recipeId] : undefined;
          const cook = people.find((p) => p.id === meal?.cookId);
          const missing = r ? missingCount(r, stock) : 0;
          return (
            <div key={s.id} className="bg-white rounded-[20px] p-3 flex items-center gap-3">
              <div className="size-14 shrink-0 rounded-[16px] bg-app-bg flex items-center justify-center text-[30px] leading-none">{r?.emoji ?? s.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-['Nunito:Bold'] font-bold text-[11px] uppercase tracking-wide text-ink/45">{s.label}</p>
                {r ? (
                  <>
                    <p className="font-['Nunito:ExtraBold'] font-extrabold text-[15px] text-ink truncate">{r.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {cook && <span className="flex items-center gap-1 font-['Nunito:Regular'] text-xs text-ink/60"><Avatar person={cook} size={16} />{cook.name}</span>}
                      {missing > 0 && !isPast ? <Tag className="bg-pastel-coral/70">🛒 Comprar {missing}</Tag> : r.minutes ? <span className={`${SG_REG} text-xs text-ink/50`}>⏱ {r.minutes} min</span> : null}
                    </div>
                  </>
                ) : (
                  <p className={`${SG_REG} text-[15px] text-ink/35`}>Sin planificar</p>
                )}
              </div>
              {r && <IconKey title="Ver receta" onClick={() => setDetail(r)}>📖</IconKey>}
              <IconKey title={r ? "Cambiar" : "Elegir receta"} onClick={() => setPlacing({ day, slot: s.id })} className={r ? "bg-white" : "bg-amber-soft"}>
                {r ? <img src={imgPen} alt="" className="size-4" /> : <span className={`${SG_BOLD} text-base`}>+</span>}
              </IconKey>
            </div>
          );
        })}
      </div>

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
          <AISuggestions week={week} onPick={(rid) => setPlacing({ recipeId: rid, day, slot: slots[slots.length > 2 ? 1 : 0].id })} />

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
                  <IconKey title="Planificar" onClick={() => setPlacing({ recipeId: r.id, day, slot: slots[0].id })} className="bg-amber-soft">📅</IconKey>
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
        onSave={(rid, d, slot, cookId) => { place(rid, d, slot, cookId); setDay(d); setPlacing(null); }}
        onClear={(d, slot) => { setMeal(week, `${d}:${slot}`, null); setPlacing(null); }}
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
    </div>
  );
}

function PlaceModal({ placing, onClose, slots, startDate, current, onSave, onClear }: {
  placing: Placing;
  onClose: () => void;
  slots: typeof MEAL_SLOTS;
  startDate: Date;
  current?: { recipeId: string; cookId?: string };
  onSave: (recipeId: string, day: number, slot: MealSlot, cookId?: string) => void;
  onClear: (day: number, slot: MealSlot) => void;
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
          {current && placing && !placing.recipeId && <SketchButton onClick={() => onClear(d, slot)}>Quitar</SketchButton>}
          <SketchButton color="brand" block disabled={!rid} onClick={() => onSave(rid, d, slot, cook || undefined)}>Guardar en el calendario</SketchButton>
        </div>
      </div>
    </Modal>
  );
}
