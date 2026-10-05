import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
const imgSwitchKnob = "/assets/bed44.svg";
import { Smartphone, Monitor } from "lucide-react";

export function ViewModeToggle({ value, onChange }: { value: "mobile" | "desktop"; onChange: (v: "mobile" | "desktop") => void }) {
  return (
    <Toggle
      checked={value === "desktop"}
      onChange={(b) => onChange(b ? "desktop" : "mobile")}
      colors={["bg-pastel-mint", "bg-pastel-sky"]}
      width={88}
      renderLabel={(i) => (i === 0 ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />)}
    />
  );
}

export function SketchCard({ children, className = "", color = "bg-card-bg", onClick }: { children: ReactNode; className?: string; color?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`${color === "bg-white" ? "bg-card-bg" : color} border border-card-line rounded-[24px] drop-shadow-[4px_4px_0px_var(--card-line-strong)] ${onClick ? "cursor-pointer active:translate-x-[2px] active:translate-y-[2px] transition-transform" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: "yellow" | "lavender" | "mint" | "coral" | "pink" | "sky" | "white" | "ink" | "brand";
  size?: "sm" | "md" | "lg";
  block?: boolean;
};
const colorMap: Record<string, string> = {
  yellow: "bg-amber-soft raised",
  lavender: "bg-pastel-lavender raised",
  mint: "bg-pastel-mint raised",
  coral: "bg-pastel-coral raised",
  pink: "bg-pastel-pink raised",
  sky: "bg-pastel-sky raised",
  white: "surface-white raised",
  ink: "bg-ink text-white raised",
  brand: "surface-brand raised-brand text-white border-2",
};
/** Raised "3D" pill button from the v2 design system. */
export function SketchButton({ children, color = "white", size = "md", block, className = "", ...rest }: BtnProps) {
  const sz = size === "sm" ? "px-3 py-1 text-xs" : size === "lg" ? "px-5 py-2.5 text-base" : "pl-2 pr-3 py-1.5 text-sm";
  return (
    <button
      {...rest}
      className={`${colorMap[color]} border-[1.5px] border-ink rounded-full ${sz} ${block ? "w-full" : ""} font-['Sour_Gummy:SemiBold'] font-semibold wdth inline-flex items-center justify-center gap-1 mt-1 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** Category glyph: Figma line icon when available, emoji otherwise. */
export function CategoryIcon({ cat, size = 24, className = "" }: { cat: { icon?: string; emoji: string }; size?: number; className?: string }) {
  return cat.icon ? (
    <img alt="" src={cat.icon} width={24} height={24} className={`shrink-0 ${className}`} style={{ width: size, height: size }} />
  ) : (
    <span className={`shrink-0 leading-none ${className}`} style={{ fontSize: size * 0.75 }}>{cat.emoji}</span>
  );
}

export function Pill({ children, color = "bg-cream", className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={`${color} border-[1.5px] border-ink rounded-full px-2.5 py-0.5 text-xs font-['Nunito:Bold'] font-bold inline-flex items-center gap-1 ${className}`}>
      {children}
    </span>
  );
}

const fieldCls = "bg-white border border-card-line-strong rounded-[16px] px-3 py-2.5 w-full outline-none font-['Nunito:Regular'] text-sm text-ink placeholder:text-muted-ink/70 focus:border-amber focus:ring-2 focus:ring-amber-soft transition-shadow";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return <select {...props} className={`${fieldCls} ${props.className ?? ""}`}>{props.children}</select>;
}

/**
 * Two-segment switch ("Switch-two" in Figma): the active half sits flat and filled,
 * the inactive half pops up as a raised white key.
 */
export function Toggle({ checked, onChange, labels = ["A", "B"], colors = ["bg-amber-soft", "bg-amber-soft"], renderLabel, width = 110, className = "" }: { className?: string; checked: boolean; onChange: (b: boolean) => void; labels?: [string, string] | string[] | ReactNode[]; colors?: [string, string] | string[]; renderLabel?: (i: 0 | 1, active: boolean) => ReactNode; width?: number }) {
  const segW = Math.round(width / 2);
  const seg = (i: 0 | 1) => {
    const active = (i === 1) === checked;
    const side = i === 0 ? "rounded-l-full" : "rounded-r-full";
    return (
      <span className={`flex flex-col h-8 shrink-0 transition-[padding] duration-150 ${active ? "" : "pt-1"} ${i === 0 ? "-mr-0.5" : ""}`}>
        <span
          className={`${side} border-[1.5px] border-ink p-1 flex items-center justify-center ${active ? `${colors[i]} relative z-10` : "surface-white raised"}`}
          style={{ width: segW }}
        >
          <span className={`h-4 leading-4 text-xs font-['Nunito:Bold'] font-bold inline-flex items-center gap-1 ${active ? "text-black" : "text-ink/40"}`}>
            {renderLabel ? renderLabel(i, active) : labels[i]}
          </span>
        </span>
      </span>
    );
  };
  return (
    <button type="button" onClick={() => onChange(!checked)} translate="no" className={`flex items-center notranslate ${className}`}>
      {seg(0)}
      {seg(1)}
    </button>
  );
}

export function CurrencyToggle({ value, onChange, className }: { value: "CUP" | "USD"; onChange: (v: "CUP" | "USD") => void; className?: string }) {
  return (
    <span translate="no" className="notranslate">
      <Toggle checked={value === "USD"} onChange={(b) => onChange(b ? "USD" : "CUP")} labels={["CUP", "USD"]} width={114} className={className} />
    </span>
  );
}

/** On/Off pill switch with sliding knob (Figma "Switch"). */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2" aria-pressed={checked}>
      {label && <span className="font-['Sour_Gummy:Regular'] wdth text-xs text-black text-right whitespace-nowrap">{label}</span>}
      <span className={`relative w-16 h-8 rounded-full border-[1.333px] border-black transition-colors ${checked ? "bg-ok-ink" : "bg-[#fe5457]"}`}>
        <span className={`absolute top-1/2 -translate-y-1/2 font-['Sour_Gummy:Regular'] wdth text-[10.667px] text-white ${checked ? "left-2.5" : "right-2.5"}`}>
          {checked ? "On" : "Off"}
        </span>
        <img
          alt=""
          src={imgSwitchKnob}
          width={38.3594}
          height={41.7326}
          className={`absolute top-[-1.35px] max-w-none transition-[left] duration-200 ${checked ? "left-[27.6px]" : "left-[-1.69px]"}`}
        />
      </span>
    </button>
  );
}

export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 8" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 4 Q 12 -1 22 4 T 42 4 T 62 4 T 82 4 T 102 4 T 118 4" />
    </svg>
  );
}
