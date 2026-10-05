import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../AppContext";
import { SketchButton } from "../ui-kit";
import { matchProduct, MEAL_SLOTS, PRODUCTS, Recipe, resolveWeek } from "../data";
import { AISuggestion, fetchRecipeSuggestions } from "../sync";
import { ingredientStatus, SCALE_META, SG_BOLD, Tag } from "./kit";
import { SuggestionDetailModal } from "./SuggestionDetailModal";

/** Chef-IA cards: three suggestions (rápido · saludable · elegante) built from the household context. */
export function AISuggestions({ week, onPick }: { week: string; onPick: (recipeId: string) => void }) {
  const { people, stock, recipes, weeks, kitchen, saveRecipe } = useApp();
  const [items, setItems] = useState<AISuggestion[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<AISuggestion | null>(null);

  const ask = async () => {
    setState("loading");
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
      });
      const order = ["rapido", "saludable", "elegante"];
      setItems(res.slice(0, 3).sort((a, b) => order.indexOf(a.scale) - order.indexOf(b.scale)));
      setState("idle");
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setState("error");
    }
  };

  const adopt = (s: AISuggestion, imageUrl?: string) => {
    setOpen(null);
    const rid = saveRecipe({
      name: s.name, emoji: s.emoji || "🍲", minutes: s.minutes, description: s.description,
      scale: SCALE_META[s.scale] ? s.scale : undefined,
      ingredients: s.ingredients.map((i) => ({ name: i.name, qty: i.qty, productId: matchProduct(i.name)?.id })),
      steps: s.steps,
      imageUrl: imageUrl || undefined,
    });
    onPick(rid);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className={`${SG_BOLD} text-[22px] leading-7 text-ink`}>Ideas del chef</h2>
          <p className="font-['Nunito:Regular'] text-xs text-ink/50">Con lo que hay en casa · sin repetir la semana</p>
        </div>
        <SketchButton color="brand" onClick={ask} disabled={state === "loading"}>
          {state === "loading" ? "Pensando…" : items.length ? "↻ Otras ideas" : "✨ Pedir ideas"}
        </SketchButton>
      </div>

      {state === "error" && (
        <p className="bg-pastel-coral/60 rounded-[16px] p-3 font-['Nunito:Regular'] text-xs text-ink">
          No se pudieron generar ideas. Revisa que las claves de IA estén guardadas y la función desplegada.<br />
          <span className="opacity-60">{err.slice(0, 160)}</span>
        </p>
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

      <AnimatePresence>
        {state !== "loading" && items.map((s, k) => {
          const meta = SCALE_META[s.scale] ?? SCALE_META.rapido;
          const toBuy = s.ingredients.filter((i) => ingredientStatus(matchProduct(i.name)?.id, stock) === "buy").length;
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
                <div className="flex items-center justify-between gap-2">
                  <span className="font-['Nunito:Regular'] text-xs text-ink/50">{toBuy ? `Faltan ${toBuy}` : "Todo en casa"} · {s.steps.length} pasos · <span className="underline">ver receta</span></span>
                  <SketchButton color="yellow" onClick={(e: any) => { e?.stopPropagation?.(); adopt(s); }}>+ Al calendario</SketchButton>
                </div>
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
      <SuggestionDetailModal s={open} onClose={() => setOpen(null)} onAdopt={adopt} />
    </section>
  );
}

