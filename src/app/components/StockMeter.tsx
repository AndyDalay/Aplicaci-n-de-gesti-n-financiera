
type Status = { label: string; color: string; emoji: string; ink: string };

export function getStockStatus(current: number, max: number): { fraction: 0 | 1 | 2 | 3 | 4 } & Status {
  // Snap to quarters
  const ratio = max <= 0 ? 0 : current / max;
  let f: 0 | 1 | 2 | 3 | 4 = 4;
  if (ratio <= 0) f = 0;
  else if (ratio <= 0.25) f = 1;
  else if (ratio <= 0.5) f = 2;
  else if (ratio < 1) f = 3;
  else f = 4;

  const map: Record<number, Status> = {
    4: { label: "Completo", color: "bg-meter-ok", emoji: "✅", ink: "text-ok-ink" },
    3: { label: "Bien", color: "bg-[#A8D8FF]", emoji: "👍", ink: "text-[#1F6FB2]" },
    2: { label: "Mitad", color: "bg-amber-soft", emoji: "⚖️", ink: "text-[#A86F00]" },
    1: { label: "Bajo", color: "bg-[#FFC59A]", emoji: "⚠️", ink: "text-[#C25A12]" },
    0: { label: "No hay", color: "bg-brand", emoji: "🚨", ink: "text-brand-dark" },
  };
  return { fraction: f, ...map[f] };
}

export function StockMeter({
  current,
  max,
  onChange,
  size = "md",
}: {
  current: number;
  max: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const status = getStockStatus(current, max);
  const segHeight = size === "sm" ? "h-2" : size === "lg" ? "h-4" : "h-3";
  const filled = status.fraction;

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Marcar ${i}/4`}
            onClick={onChange ? () => onChange(Math.round((i / 4) * max)) : undefined}
            className={`flex-1 ${segHeight} rounded-[12px] transition-colors duration-300 ${i <= filled ? status.color : "bg-[#F1EADD]"} ${onChange ? "cursor-pointer hover:-translate-y-px transition-transform" : ""}`}
          />
        ))}
      </div>
      {size !== "sm" && (
        <div className="flex items-center justify-between">
          <span className="font-['Sour_Gummy:Regular'] wdth text-base leading-6 text-ink">{filled}/4</span>
          <span className={`font-['Sour_Gummy:SemiBold'] font-semibold wdth text-base leading-4 ${status.ink}`}>{status.label}</span>
        </div>
      )}
    </div>
  );
}
