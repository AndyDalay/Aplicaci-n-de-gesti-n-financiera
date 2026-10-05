type Slice = { label: string; value: number; color: string };

export function PieChart({ data, size = 160 }: { data: Slice[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  if (total <= 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="sketch-border rounded-full bg-white flex items-center justify-center font-hand text-muted-foreground" style={{ width: size - 12, height: size - 12, boxShadow: "3px 3px 0 0 #1A1A1A" }}>
          Sin datos
        </div>
      </div>
    );
  }
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += d.value;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const single = data.length === 1;
        const path = single
          ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        return <path key={i} d={path} fill={d.color} stroke="#1A1A1A" strokeWidth={2} strokeLinejoin="round" />;
      })}
      <circle cx={cx + 4} cy={cy + 4} r={r} fill="none" stroke="#1A1A1A" strokeWidth={2} opacity={0.15} />
    </svg>
  );
}

export function PieLegend({ data }: { data: Slice[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="sketch-border rounded-full bg-white px-2 py-0.5 text-xs font-bold inline-flex items-center gap-1.5" style={{ boxShadow: "1.5px 1.5px 0 0 #1A1A1A" }}>
          <span className="w-3 h-3 rounded-full sketch-border" style={{ background: d.color }} />
          {d.label} <span className="text-muted-foreground">{d.value.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}
