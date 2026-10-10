import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useApp } from "../AppContext";
import { calculateShoppingReview, CATEGORIES, formatAmount, formatMoney, getProductPrice, PRODUCTS, shiftWeek, weekKey } from "../data";
import { SketchButton } from "../ui-kit";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { SG_BOLD } from "./kit";

const fmtDate = (date: Date) => date.toLocaleDateString("es", { day: "numeric", month: "short" });

export function WeeklyShoppingReview({ week, open, onOpenChange }: { week: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { weeks, recipes, cooked, stock, productMeasures, priceOverrides, currency, rate, shopping, addWeeklyShopping } = useApp();
  const [includeNextWeek, setIncludeNextWeek] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const nextWeek = shiftWeek(week, 1);
  const weekKeys = includeNextWeek ? [week, nextWeek] : [week];
  const needs = useMemo(() => calculateShoppingReview(weeks, weekKeys, recipes, cooked, stock, productMeasures, priceOverrides, shopping), [weeks, weekKeys, recipes, cooked, stock, productMeasures, priceOverrides, shopping]);

  useEffect(() => {
    if (!open) return;
    setSelected(Object.fromEntries(needs.map((need) => [need.key, true])));
  }, [open, needs.length, includeNextWeek]);

  const included = needs.filter((need) => selected[need.key] !== false);
  const totalCost = included.reduce((sum, need) => {
    const toAdd = Math.max(0, need.packsSuggested - need.pendingPacks);
    return sum + (need.costCUP && need.packsSuggested > 0 ? toAdd / need.packsSuggested * need.costCUP : 0);
  }, 0);
  const costUnknown = included.filter((need) => need.unknown).length;

  const addSelected = () => {
    addWeeklyShopping(included.map((need) => {
      const product = need.productId ? PRODUCTS.find((entry) => entry.id === need.productId) : undefined;
      const targetPacks = Math.max(product ? need.packsSuggested : need.amountNeeded || 1, need.pendingPacks);
      const pack = product ? (productMeasures[product.id]?.pack ?? product.pack) : 1;
      return {
        productId: need.productId,
        customName: need.customName,
        qtySuggested: targetPacks,
        amountSuggested: need.productId ? targetPacks * pack : need.unit !== "sin conversión" ? targetPacks : undefined,
        unitSuggested: need.unit,
        priority: product && (stock[product.id]?.current ?? 0) <= 0 ? "alta" as const : "normal" as const,
        note: `Para: ${need.dishes.join(", ")}`,
      };
    }));
    onOpenChange(false);
  };

  const grouped = CATEGORIES.map((category) => ({ category, items: needs.filter((need) => need.category === category.id) })).filter((group) => group.items.length);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[94dvh] gap-0 overflow-hidden rounded-t-[24px] border-2 border-ink bg-app-bg p-0">
        <DrawerHeader className="shrink-0 border-b border-ink/10 px-4 pb-3 pt-4 text-left">
          <DrawerTitle className={`${SG_BOLD} pr-10 text-xl text-ink`}>Preparar compras de la semana</DrawerTitle>
          <DrawerDescription className="font-['Nunito:Regular'] text-xs text-ink/60">Se suma lo necesario, se descuenta el stock y se fusionan los pendientes existentes.</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 overflow-y-auto px-4 py-3 pb-5">
          <label className="flex min-h-11 items-center justify-between rounded-xl bg-white px-3">
            <span className="font-['Nunito:Bold'] text-sm text-ink">Incluir semana siguiente <span className="font-normal text-ink/55">({fmtDate(new Date(nextWeek))})</span></span>
            <input type="checkbox" checked={includeNextWeek} onChange={(event) => setIncludeNextWeek(event.target.checked)} className="size-5 accent-ink" />
          </label>

          {!needs.length && <p className="rounded-xl bg-pastel-mint p-4 text-center font-['Nunito:Bold'] text-sm">Ya tienes stock suficiente para las comidas pendientes.</p>}
          {grouped.map(({ category, items }) => (
            <section key={category.id} className="space-y-2">
              <h3 className={`${SG_BOLD} text-base text-ink`}>{category.emoji} {category.name}</h3>
              {items.map((need) => {
                const product = need.productId ? PRODUCTS.find((entry) => entry.id === need.productId) : undefined;
                const pack = product ? (productMeasures[product.id]?.pack ?? product.pack) : undefined;
                const toAdd = Math.max(0, need.packsSuggested - need.pendingPacks);
                const price = product ? getProductPrice(product.id, priceOverrides) * toAdd : undefined;
                const isIncluded = selected[need.key] !== false;
                return (
                  <label key={need.key} className={`block rounded-[14px] border-[1.5px] bg-white p-3 ${isIncluded ? "border-ink" : "border-ink/15 opacity-60"}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={isIncluded} onChange={(event) => setSelected((current) => ({ ...current, [need.key]: event.target.checked }))} aria-label={`Incluir ${product?.name ?? need.customName}`} className="mt-1 size-5 shrink-0 accent-ink" />
                      <div className="min-w-0 flex-1">
                        <p className="font-['Nunito:ExtraBold'] text-sm text-ink">{product?.emoji ?? "📝"} {product?.name ?? need.customName}</p>
                        <p className="font-['Nunito:Bold'] text-xs text-ink/75">{need.approximate ? "≈ " : ""}{need.productId ? `${new Intl.NumberFormat("es").format(need.packsSuggested)} ${need.packsSuggested === 1 ? "paquete" : "paquetes"} · ${formatAmount((pack ?? 0) * need.packsSuggested, need.unit as "g" | "ml" | "u")}` : `${need.amountNeeded || 1} ${need.unit === "sin conversión" ? "cantidad sin convertir" : need.unit}`}</p>
                        {need.pendingPacks > 0 && <p className="font-['Nunito:Regular'] text-[10px] text-ink/55">Ya en lista: {need.pendingPacks} packs{toAdd ? ` · se actualizará a ${need.packsSuggested}` : " · no aumenta"}</p>}
                        <p className="mt-1 font-['Nunito:Regular'] text-[10px] text-ink/55">Para: {need.dishes.join(", ")}</p>
                        <p className="mt-1 font-['Nunito:Bold'] text-xs text-ink">{need.unknown ? "≈ Sin precio estimable" : `≈ ${formatMoney(price ?? 0, currency, rate)}`}{need.approximate && !need.unknown ? " · equivalencia por confirmar" : ""}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </section>
          ))}
          {needs.length > 0 && <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 font-['Nunito:Bold'] text-sm text-ink"><span>Total estimado{costUnknown ? " · parcial" : ""}</span><span>{costUnknown ? "≈ " : ""}{formatMoney(totalCost, currency, rate)}</span></div>}
        </div>
        {needs.length > 0 && <div className="shrink-0 border-t border-ink/10 bg-app-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SketchButton color="mint" block disabled={!included.length} onClick={addSelected}><Check size={17} /> Añadir {included.length} productos a la lista</SketchButton>
        </div>}
      </DrawerContent>
    </Drawer>
  );
}
