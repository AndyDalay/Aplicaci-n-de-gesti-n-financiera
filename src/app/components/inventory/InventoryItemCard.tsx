import { ReactNode } from "react";
import { Switch } from "../ui-kit";
import { StockMeter } from "../StockMeter";

const imgMenuDots = "/assets/e3786.svg";

type Props = {
  emoji: string;
  tint: string;
  name: string;
  qty: ReactNode;
  price: string;
  current: number;
  max: number;
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

export function InventoryItemCard({ emoji, tint, name, qty, price, current, max, inList, onStock, onEditPrice, onToggleList }: Props) {
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

      <StockMeter current={current} max={max} onChange={onStock} />

      <div className="flex items-start justify-between pt-3">
        <div className="flex gap-2.5 items-center">
          <StepKey label="Restar" onClick={() => onStock(Math.max(0, current - 1))}>−</StepKey>
          <StepKey label="Sumar" onClick={() => onStock(Math.min(max, current + 1))}>+</StepKey>
        </div>
        <Switch checked={inList} onChange={onToggleList} label="Comprar si se acaba" />
      </div>
    </article>
  );
}
