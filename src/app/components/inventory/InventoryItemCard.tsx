import { ReactNode, useState } from "react";
import { Switch } from "../ui-kit";
import { StockMeter } from "../StockMeter";
import { formatAmount, parseQty, Product, RecipeIngredient, toBase } from "../data";

const imgMenuDots = "/assets/e3786.svg";

type Props = {
  emoji: string;
  tint: string;
  name: string;
  qty: ReactNode;
  price: string;
  current: number;
  max: number;
  product: Product;
  measureConfirmed: boolean;
  inList: boolean;
  onStock: (v: number) => void;
  onEditPrice: () => void;
  onToggleList: (b: boolean) => void;
};

/** Round raised key used for −/+ steps. */
function StepKey({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="size-8 mt-1 rounded-full bg-white border-[1.333px] border-black raised flex items-center justify-center font-['Sour_Gummy:Bold'] font-bold wdth text-base leading-none text-ink"
    >
      {children}
    </button>
  );
}

export function InventoryItemCard({ emoji, tint, name, qty, price, current, max, product, measureConfirmed, inList, onStock, onEditPrice, onToggleList }: Props) {
  const [adjustMode, setAdjustMode] = useState<"use" | "buy" | null>(null);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const preciseStep = measureConfirmed ? (product.base === "u" ? 1 : 100) : product.pack * 0.25;
  const stepLabel = measureConfirmed ? (product.base === "u" ? "1 u" : `100 ${product.base}`) : "0,25 pack";
  const currentAmount = current * product.pack;
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const units = product.base === "g"
    ? ["g", "kg", "lb", ...(product.density ? ["taza", "cda", "cdta"] : [])]
    : product.base === "ml" ? ["ml", "l", "taza", "cda", "cdta"] : ["u"];

  const applyAdjustment = () => {
    const parsed = parseQty(`${amount} ${unit}`);
    if (!parsed) return;
    const ingredient: RecipeIngredient = { name, qty: `${amount} ${unit}`, amount: parsed.amount, unit: parsed.unit };
    const converted = toBase(ingredient, product);
    if (!converted) return;
    const deltaPacks = converted.amount / product.pack;
    const next = adjustMode === "use" ? current - deltaPacks : current + deltaPacks;
    onStock(Math.min(max, Math.max(0, next)));
    setAdjustMode(null);
    setAmount("");
  };

  const closeAdjust = () => { setAdjustMode(null); setAmount(""); };

  return (
    <article className="bg-white border border-card-line-strong drop-shadow-[4px_4px_0px_var(--card-line-strong)] rounded-[24px] p-4 flex flex-col gap-2.5">
      <div className="flex gap-3 h-12 items-center">
        <div className={`${tint} rounded-[16px] size-12 shrink-0 flex items-center justify-center text-[30px] leading-none`}>{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-['Sour_Gummy:Bold'] font-bold wdth text-base text-ink truncate">{name}</p>
            <button onClick={onEditPrice} aria-label="Editar precio" className="shrink-0 p-0.5 -m-0.5 rounded hover:bg-black/5">
              <img src={imgMenuDots} alt="" className="size-4" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <div className="flex gap-1 items-center text-xs leading-4 text-muted-ink min-w-0">
              <p className="font-['Comfortaa:Bold'] font-bold">Cantidad:</p>
              {qty}
            </div>
            <button onClick={onEditPrice} className="font-['Nunito:Bold'] font-bold text-sm text-ink">{price}</button>
          </div>
        </div>
      </div>

      <StockMeter current={current} max={max} onChange={onStock} amountLabel={`${measureConfirmed ? "" : "≈ "}${formatAmount(currentAmount, product.base)}`} percentage={percentage} />

      <div className="flex items-start justify-between pt-3">
        <div className="flex gap-2.5 items-center">
          <StepKey label={`Restar ${stepLabel}`} onClick={() => onStock(Math.max(0, current - preciseStep / product.pack))}>−</StepKey>
          <StepKey label={`Sumar ${stepLabel}`} onClick={() => onStock(Math.min(max, current + preciseStep / product.pack))}>+</StepKey>
        </div>
        <Switch checked={inList} onChange={onToggleList} label="Comprar si se acaba" />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => { setUnit(product.base); setAdjustMode("use"); }} className="min-h-10 flex-1 rounded-full border border-ink/20 bg-pastel-coral/40 px-3 font-['Nunito:Bold'] text-xs text-ink">Usé…</button>
        <button type="button" onClick={() => { setUnit(product.base); setAdjustMode("buy"); }} className="min-h-10 flex-1 rounded-full border border-ink/20 bg-pastel-mint/50 px-3 font-['Nunito:Bold'] text-xs text-ink">Compré…</button>
      </div>

      {adjustMode && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-3 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAdjust(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="stock-adjust-title" className="w-full max-w-sm space-y-3 rounded-[20px] border-[1.5px] border-ink bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.25)]">
            <h3 id="stock-adjust-title" className="font-['Sour_Gummy:Bold'] text-xl text-ink">{adjustMode === "use" ? "¿Cuánto usaste?" : "¿Cuánto compraste?"} {name}</h3>
            <div className="flex gap-2">
              <input autoFocus type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Cantidad" className="min-h-12 min-w-0 flex-1 rounded-xl border border-ink/25 px-3 text-base text-ink outline-none focus:border-ink" />
              <select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Unidad" className="min-h-12 w-28 rounded-xl border border-ink/25 bg-white px-2 text-sm text-ink">
                {units.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <p className="font-['Nunito:Regular'] text-xs text-ink/60">Disponible: {measureConfirmed ? "" : "≈ "}{formatAmount(currentAmount, product.base)} · {Math.round(percentage)} %</p>
            <div className="flex gap-2">
              <button type="button" onClick={closeAdjust} className="min-h-11 flex-1 rounded-full border border-ink/20 bg-white font-['Nunito:Bold'] text-sm">Cancelar</button>
              <button type="button" disabled={!amount || Number(amount) <= 0} onClick={applyAdjustment} className="min-h-11 flex-1 rounded-full border border-ink bg-pastel-mint font-['Nunito:Bold'] text-sm disabled:opacity-40">{adjustMode === "use" ? "Descontar" : "Añadir"}</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
