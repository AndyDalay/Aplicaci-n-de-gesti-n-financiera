import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useApp } from "../AppContext";
import { CATEGORIES, formatAmount, getCategory, getProductPrice, PRODUCTS, Product, formatMoney, resolveProductMeasure } from "../data";
import { CategoryIcon, Input } from "../ui-kit";
import { getStockStatus } from "../StockMeter";
import { InventoryItemCard } from "../inventory/InventoryItemCard";
import { motion } from "motion/react";
import { EditPriceModal } from "../EditPriceModal";

export function InventoryPage() {
  const { stock, updateStock, currency, rate, addShopping, removeShopping, shopping, priceOverrides, productMeasures } = useApp();
  const [filter, setFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [editingPrice, setEditingPrice] = useState<Product | null>(null);

  const statusBucket = (current: number, max: number): 0 | 1 | 2 => {
    if (current === 0) return 2;            // empty → bottom
    if (current >= max) return 1;           // full → middle
    return 0;                                // partial → top
  };

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      if (filter && p.category !== filter) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [filter, q]);

  const groups = useMemo(() => {
    const g: Record<string, typeof PRODUCTS> = {};
    filtered.forEach((p) => {
      g[p.category] = g[p.category] ?? [];
      g[p.category].push(p);
    });
    // sort each group: partial (top) → full (middle) → empty (bottom)
    Object.keys(g).forEach((k) => {
      g[k] = [...g[k]].sort((a, b) => {
        const sa = stock[a.id]; const sb = stock[b.id];
        const ba = statusBucket(sa.current, sa.max);
        const bb = statusBucket(sb.current, sb.max);
        if (ba !== bb) return ba - bb;
        // within partial: lower fill ratio first (more urgent)
        if (ba === 0) return sa.current / sa.max - sb.current / sb.max;
        return a.name.localeCompare(b.name);
      });
    });
    return g;
  }, [filtered, stock]);


  const chip = (active: boolean) =>
    `shrink-0 border-2 border-ink rounded-full pl-2 pr-3 py-0.5 min-h-8 text-xs leading-4 font-['Nunito:Bold'] font-bold text-ink text-center whitespace-nowrap inline-flex items-center gap-0.5 transition-all ${active ? "bg-amber-soft translate-x-0.5 translate-y-0.5" : "bg-white drop-shadow-[2px_2px_0px_#1a1a1a]"}`;

  return (
    <div className="px-4 pb-6 pt-5 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-ink" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un producto…" className="pl-11" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
        <button onClick={() => setFilter("")} className={`${chip(filter === "")} pl-3`}>Todos</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={chip(filter === c.id)}>
            <CategoryIcon cat={c} /> {c.name}
          </button>
        ))}
      </div>

      {Object.entries(groups).map(([catId, items]) => {
        const cat = getCategory(catId);
        return (
          <section key={catId} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-['Sour_Gummy:Bold'] wdth text-xl leading-none text-ink inline-flex items-center gap-1"><CategoryIcon cat={cat} size={26} /> {cat.name}</h3>
              <span className={`${cat.color} rounded-full px-2 text-xs font-['Nunito:Bold'] font-bold leading-5`}>{items.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((p) => {
                const s = stock[p.id];
                const measure = resolveProductMeasure(p, productMeasures);
                const status = getStockStatus(s.current, s.max);
                const listItem = shopping.find((it) => it.productId === p.id && !it.bought);
                return (
                  <motion.div key={p.id} layout>
                    <InventoryItemCard
                      emoji={p.emoji}
                      tint={cat.color}
                      name={p.name}
                      qty={<span className="flex items-center gap-1"><span className="font-['Nunito:Bold'] font-bold">{measure.measureConfirmed ? "" : "≈ "}{formatAmount(s.current * measure.pack, measure.base)}</span>{!measure.measureConfirmed && <span className="rounded-full bg-pastel-yellow px-1.5 py-0.5 text-[9px] font-bold">por confirmar</span>}</span>}
                      price={formatMoney(getProductPrice(p.id, priceOverrides), currency, rate)}
                      current={s.current}
                      max={s.max}
                      product={measure}
                      measureConfirmed={measure.measureConfirmed}
                      inList={!!listItem}
                      onStock={(v) => updateStock(p.id, v)}
                      onEditPrice={() => setEditingPrice(p)}
                      onToggleList={(on) => {
                        if (!on) { if (listItem) removeShopping(listItem.id); return; }
                        const suggestedQty = status.fraction === 0 ? Math.ceil(p.monthlyQuantity) : Math.ceil(p.monthlyQuantity / 2);
                        addShopping({ productId: p.id, qtySuggested: suggestedQty, priority: status.fraction === 0 ? "alta" : "normal" });
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        );
      })}

      <EditPriceModal open={!!editingPrice} onClose={() => setEditingPrice(null)} product={editingPrice} />
    </div>
  );
}
