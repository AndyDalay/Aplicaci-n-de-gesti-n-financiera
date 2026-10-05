import { useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import type { Person } from "../data";

const assetPathPrefix = "/assets";
const imgSiren = `${assetPathPrefix}/4e31f.svg`;
const imgCartPlus = `${assetPathPrefix}/4191b.svg`;
const imgUserCircle = `${assetPathPrefix}/84afe.svg`;
const imgTrash = `${assetPathPrefix}/b0b9d.svg`;

/** How far the card slides left to reveal the delete area (Figma: 56px). */
const REVEAL = 56;

type Props = {
  emoji: string;
  name: string;
  qty: string;
  price?: string;
  badge?: "none" | "low";
  assigned?: Person;
  onAssign: () => void;
  onRemove: () => void;
  onBuy: () => void;
};

export function ShoppingItemCard({ emoji, name, qty, price, badge, assigned, onAssign, onRemove, onBuy }: Props) {
  const controls = useAnimationControls();
  const [open, setOpen] = useState(false);
  const snap = (o: boolean) => {
    setOpen(o);
    controls.start({ x: o ? -REVEAL : 0, transition: { type: "spring", stiffness: 500, damping: 40 } });
  };

  return (
    <div className="relative w-full min-w-0">
      {/* Swipe-revealed delete area */}
      <button
        onClick={onRemove}
        aria-label="Eliminar"
        tabIndex={open ? 0 : -1}
        className="absolute inset-0 bg-[#fd0000] rounded-[24px] flex items-center justify-end pr-4"
      >
        <img src={imgTrash} alt="" width={24} height={24} className="size-6" />
      </button>

      <motion.article
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={0.1}
        animate={controls}
        onDragEnd={(_, info) => snap(info.offset.x < -REVEAL / 2 || (open && info.offset.x < REVEAL / 2))}
        onClick={() => open && snap(false)}
        className="relative w-full min-w-0 bg-card-bg border border-card-line rounded-[24px] px-4 pt-4 pb-[18px] touch-pan-y"
      >
        <div className="flex gap-3 items-center">
          <div className="relative bg-[#fcd3e7] rounded-[16px] size-12 shrink-0 flex items-center justify-center">
            <span className="font-['Nunito:Regular'] text-[32px] leading-[42.667px] text-ink">{emoji}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onAssign(); }}
              aria-label={assigned ? `Asignado a ${assigned.name}` : "Asignar"}
              className="absolute -left-1.5 top-[30px] size-6 bg-white rounded-full overflow-hidden flex items-center justify-center"
            >
              {assigned ? (
                assigned.avatar ? <img src={assigned.avatar} alt="" className="size-full object-cover rounded-full" /> : <span className="text-sm leading-none">{assigned.emoji}</span>
              ) : (
                <img src={imgUserCircle} alt="" width={24} height={24} className="size-6" />
              )}
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-['Sour_Gummy:Bold'] font-bold wdth text-base text-ink truncate">{name}</p>
            <div className="flex gap-1 items-center text-xs leading-4 whitespace-nowrap">
              <p className="font-['Nunito:Bold'] font-bold text-black">{qty}</p>
              {price && <p className="font-['Sour_Gummy:Regular'] wdth text-black/50 truncate">{price}</p>}
            </div>
          </div>

          {badge && (
            <div className="flex flex-col items-center shrink-0">
              <img src={imgSiren} alt="" className={`size-[22.909px] ${badge === "low" ? "opacity-60" : ""}`} />
              <p className={`font-['Sour_Gummy:Medium'] font-medium wdth text-xs ${badge === "none" ? "text-brand-dark" : "text-[#C25A12]"}`}>
                {badge === "none" ? "No Hay" : "Bajo"}
              </p>
            </div>
          )}

          <div className="pt-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onBuy(); }} aria-label="Comprar" className="surface-brand raised-brand border-2 border-ink rounded-full px-3 py-1 flex items-center">
              <img src={imgCartPlus} alt="" className="size-6" />
            </button>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
