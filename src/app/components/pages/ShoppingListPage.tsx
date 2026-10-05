import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../AppContext";
import { getProductPrice, PRODUCTS, formatMoney, ShoppingItem } from "../data";
import { SketchCard, SketchButton, Pill } from "../ui-kit";
import { BudgetCard } from "../shopping/BudgetCard";
import { ShoppingItemCard } from "../shopping/ShoppingItemCard";

const imgAdd = "/assets/aa3cb.svg";
import { Modal } from "../Modal";
import { AddItemModal } from "../AddItemModal";
import { PurchaseModal } from "../PurchaseModal";

export function ShoppingListPage() {
  const { shopping, currency, rate, removeShopping, updateShopping, people, currentUserId, movements, fixed, stock, priceOverrides } = useApp();
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState<ShoppingItem | null>(null);
  const [assignFor, setAssignFor] = useState<ShoppingItem | null>(null);

  const me = people.find((p) => p.id === currentUserId)!;

  // budget — uses overridden prices when set
  const variableBudget = useMemo(
    () => PRODUCTS.reduce((s, p) => s + getProductPrice(p.id, priceOverrides) * p.monthlyQuantity, 0),
    [priceOverrides],
  );
  const fixedBudget = useMemo(() => fixed.reduce((s, f) => s + f.amountCUP, 0), [fixed]);
  const totalBudget = variableBudget + fixedBudget;

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthMovs = movements.filter((m) => m.at >= monthStart.getTime());
  const spentThisMonth = monthMovs.filter((m) => m.type !== "ingreso").reduce((s, m) => s + m.amountCUP, 0);
  const remaining = totalBudget - spentThisMonth;

  // newest first (by arrival to the list)
  const sorted = [...shopping].filter((s) => !s.bought).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="px-4 pb-6 pt-5 space-y-4">
      <BudgetCard
        month={new Date().toLocaleDateString("es", { month: "long" })}
        total={formatMoney(totalBudget, currency, rate)}
        spent={formatMoney(spentThisMonth, currency, rate)}
        remaining={formatMoney(Math.max(0, remaining), currency, rate)}
        progress={Math.min(1, spentThisMonth / Math.max(1, totalBudget))}
      />

      <div className="flex items-center justify-between">
        <p className="text-base leading-5 text-[#262626]">
          <span className="font-['Nunito:Regular']">Productos a comprar: </span>
          <span className="font-['Nunito:Black'] font-black">{sorted.length}</span>
        </p>
        <SketchButton onClick={() => setAdding(true)} className="!py-0.5 !text-xs">
          <img src={imgAdd} alt="" className="size-6" /> Añadir
        </SketchButton>
      </div>

      {sorted.length === 0 && (
        <SketchCard className="p-6 text-center">
          <p className="font-display text-2xl text-brand">¡Todo comprado! 🎉</p>
          <p className="text-sm font-['Comfortaa:Bold'] text-muted-ink">Sin pendientes por ahora.</p>
        </SketchCard>
      )}

      <div className="grid w-full grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
        <AnimatePresence>
          {sorted.map((item) => {
            const product = item.productId ? PRODUCTS.find((p) => p.id === item.productId) : undefined;
            const stockItem = item.productId ? stock[item.productId] : undefined;
            const noHay = stockItem ? stockItem.current === 0 : item.priority === "alta";
            const assigned = item.assignedTo ? people.find((p) => p.id === item.assignedTo) : undefined;

            return (
              <motion.div
                key={item.id}
                className="min-w-0"
                layout
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60 }}
              >
                <ShoppingItemCard
                  emoji={product?.emoji ?? "📝"}
                  name={product?.name ?? item.customName ?? ""}
                  qty={`x${item.qtySuggested}${product?.unit ? ` ${product.unit}` : ""}`}
                  price={product ? `≈ ${formatMoney(getProductPrice(product.id, priceOverrides) * item.qtySuggested, currency, rate)}` : undefined}
                  badge={noHay ? "none" : item.priority === "alta" ? "low" : undefined}
                  assigned={assigned}
                  onAssign={() => setAssignFor(item)}
                  onRemove={() => removeShopping(item.id)}
                  onBuy={() => setBuying(item)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AddItemModal open={adding} onClose={() => setAdding(false)} />
      <PurchaseModal open={!!buying} onClose={() => setBuying(null)} item={buying} />

      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title="¿Quién compra?" color="bg-pastel-sky">
        <div className="space-y-2">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => { if (assignFor) updateShopping(assignFor.id, { assignedTo: p.id }); setAssignFor(null); }}
              className="w-full sketch-border sketch-shadow-sm rounded-2xl bg-white p-3 flex items-center gap-3 text-left active:translate-y-[1px]"
            >
              <div className="w-10 h-10 sketch-border rounded-full flex items-center justify-center text-xl" style={{ background: p.color }}>
                {p.avatar ? <img src={p.avatar} className="w-full h-full rounded-full object-cover" /> : p.emoji}
              </div>
              <span className="font-bold flex-1">{p.name}</span>
              {assignFor?.assignedTo === p.id && <Pill color="bg-pastel-mint">Asignado</Pill>}
            </button>
          ))}
          <SketchButton color="white" block onClick={() => { if (assignFor) updateShopping(assignFor.id, { assignedTo: undefined }); setAssignFor(null); }}>Quitar asignación</SketchButton>
        </div>
      </Modal>
    </div>
  );
}
