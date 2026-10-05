import { ReactNode } from "react";
import { PRODUCTS, Recipe, StockItem } from "../data";

export const SG_BOLD = "font-['Sour_Gummy:Bold'] font-bold wdth";
export const SG_REG = "font-['Sour_Gummy:Regular'] font-normal wdth";
/** Raised pressable key — only interactive elements get the ink outline. */
export const KEY = "border-[1.5px] border-ink rounded-full shadow-[0px_-4.5px_0px_-2px_white,0px_-4px_0px_0px_black,3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-px active:shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] transition-transform";
export const imgPen = "/assets/4ea72.svg";

export function IconKey({ title, onClick, children, className = "bg-white" }: { title: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} className={`${className} ${KEY} mt-1 size-[29px] shrink-0 flex items-center justify-center text-[13px] text-ink overflow-clip`}>
      {children}
    </button>
  );
}

export function NavKey({ label, onClick, aria }: { label: string; onClick: () => void; aria: string }) {
  return (
    <button onClick={onClick} aria-label={aria} className="relative mt-0.5 group shrink-0">
      <span className="absolute bg-white border-[1.333px] border-black bottom-0.5 right-0.5 h-[45px] w-[30px] rounded-full" aria-hidden />
      <span className="relative bg-white border-[1.5px] border-ink drop-shadow-[3px_3px_0px_rgba(0,0,0,0.3)] flex h-[45px] items-center justify-center p-3 rounded-full group-active:translate-x-px group-active:translate-y-px transition-transform">
        <span className={`${SG_BOLD} text-base text-ink leading-none`}>{label}</span>
      </span>
    </button>
  );
}

export const SCALE_META = {
  rapido: { label: "Rápido", emoji: "⚡", bg: "bg-amber-soft" },
  saludable: { label: "Saludable", emoji: "🥗", bg: "bg-pastel-mint" },
  elegante: { label: "Elegante", emoji: "🕯️", bg: "bg-pastel-lavender" },
} as const;

export type IngredientStatus = "ok" | "low" | "buy";
export function ingredientStatus(productId: string | undefined, stock: Record<string, StockItem>): IngredientStatus {
  if (!productId) return "buy";
  const s = stock[productId];
  if (!s || s.current <= 0) return "buy";
  return s.current / Math.max(1, s.max) <= 0.25 ? "low" : "ok";
}
export const missingCount = (r: Recipe, stock: Record<string, StockItem>) =>
  r.ingredients.filter((i) => ingredientStatus(i.productId, stock) === "buy").length;

export const productEmoji = (pid?: string) => PRODUCTS.find((p) => p.id === pid)?.emoji ?? "🛒";

/** Small flat tag — informational, so no ink outline. */
export function Tag({ children, className = "bg-amber-soft" }: { children: ReactNode; className?: string }) {
  return <span className={`${className} rounded-full px-2 py-0.5 text-[11px] leading-4 font-['Nunito:Bold'] font-bold text-ink inline-flex items-center gap-1 whitespace-nowrap`}>{children}</span>;
}

export function Avatar({ person, size = 24 }: { person?: { avatar?: string; emoji: string; color: string; name: string }; size?: number }) {
  if (!person) return null;
  return (
    <span className="rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ width: size, height: size, background: person.color, fontSize: size * 0.6 }} title={person.name}>
      {person.avatar ? <img src={person.avatar} alt={person.name} className="size-full object-cover" /> : person.emoji}
    </span>
  );
}
