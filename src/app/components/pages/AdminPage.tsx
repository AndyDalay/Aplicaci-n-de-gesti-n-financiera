import { ReactNode, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "../AppContext";
import { formatMoney, getCategory, getProductPrice, Movement, PRODUCTS } from "../data";
import { CategoryIcon, SketchButton } from "../ui-kit";
import { AddExpenseModal } from "../AddExpenseModal";
import { EditMovementModal } from "../EditMovementModal";

const assetPathPrefix = "/assets";
const imgBanknote = `${assetPathPrefix}/9d69b.svg`;
const imgMoneyBag = `${assetPathPrefix}/12308.svg`;
const imgGraphDown = `${assetPathPrefix}/70eb2.svg`;
const imgPen = `${assetPathPrefix}/4ea72.svg`;
const imgGraphUp = `${assetPathPrefix}/842ed.svg`;

function monthBounds(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start: start.getTime(), end: end.getTime(), date: d };
}

export function AdminPage() {
  const { people, fixed, setFixed, movements, removeMovement, currency, rate, priceOverrides } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [prefill, setPrefill] = useState<any>(undefined);
  const [editing, setEditing] = useState<Movement | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const { start, end, date } = monthBounds(monthOffset);
  const isFuture = monthOffset > 0;
  const monthMovs = useMemo(() => movements.filter((m) => m.at >= start && m.at < end), [movements, start, end]);

  const totalIngreso = useMemo(() => {
    if (isFuture) return 0;
    const salaryUSD = monthOffset === 0 ? people.reduce((s, p) => s + p.salaryUSD, 0) : 0;
    const extras = monthMovs.filter((m) => m.type === "ingreso").reduce((s, m) => s + m.amountCUP, 0);
    return salaryUSD * rate + extras;
  }, [people, monthMovs, rate, isFuture, monthOffset]);

  const totalGasto = monthMovs.filter((m) => m.type !== "ingreso").reduce((s, m) => s + m.amountCUP, 0);
  const variableBudget = useMemo(() => PRODUCTS.reduce((s, p) => s + getProductPrice(p.id, priceOverrides) * p.monthlyQuantity, 0), [priceOverrides]);
  const fixedBudget = useMemo(() => fixed.reduce((s, f) => s + f.amountCUP, 0), [fixed]);
  const totalBudget = variableBudget + fixedBudget;
  const ahorro = totalIngreso - totalBudget;

  const byCategory = useMemo(() => {
    if (isFuture) return {} as Record<string, { cat: string; total: number; subs: Record<string, number> }>;
    const map: Record<string, { cat: string; total: number; subs: Record<string, number> }> = {};
    monthMovs.forEach((m) => {
      if (m.type === "ingreso") return;
      const cat = m.category ?? "otros";
      map[cat] = map[cat] ?? { cat, total: 0, subs: {} };
      map[cat].total += m.amountCUP;
      const product = m.productId ? PRODUCTS.find((p) => p.id === m.productId) : undefined;
      const sub = product?.subcategory ?? m.name;
      map[cat].subs[sub] = (map[cat].subs[sub] ?? 0) + m.amountCUP;
    });
    if (Object.keys(map).length === 0 && monthOffset === 0) {
      // show planned distribution for current month if no actuals yet
      PRODUCTS.forEach((p) => {
        const cat = p.category;
        map[cat] = map[cat] ?? { cat, total: 0, subs: {} };
        const v = getProductPrice(p.id, priceOverrides) * p.monthlyQuantity;
        map[cat].total += v;
        const sub = p.subcategory ?? p.name;
        map[cat].subs[sub] = (map[cat].subs[sub] ?? 0) + v;
      });
    }
    return map;
  }, [monthMovs, isFuture, monthOffset, priceOverrides]);

  const catTotals = Object.values(byCategory)
    .map((e) => ({ cat: getCategory(e.cat), total: e.total }))
    .sort((a, b) => b.total - a.total);
  const catSum = catTotals.reduce((s, c) => s + c.total, 0);

  const monthLabel = date.toLocaleDateString("es", { month: "long", year: "numeric" }).replace(" de ", " ");
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const flowTotal = Math.max(0, ahorro) + totalBudget + totalGasto;
  const pct = (v: number) => (flowTotal > 0 ? `${(v / flowTotal) * 100}%` : "0%");

  return (
    <div className="flex flex-col gap-5 pt-5 pb-28 w-full">
      {/* Month navigation */}
      <section className="flex flex-col items-center px-4 w-full">
        <div className="flex items-center justify-between py-2 w-full">
          <NavKey label="<" onClick={() => setMonthOffset(monthOffset - 1)} aria="Mes anterior" />
          <p className={`${SG_BOLD} text-2xl text-ink`}>{monthTitle}</p>
          <NavKey label=">" onClick={() => setMonthOffset(monthOffset + 1)} aria="Mes siguiente" />
        </div>
        <span className="bg-amber-soft rounded-full px-3 py-1 font-['Nunito:Bold'] font-bold text-xs text-ink">
          {monthOffset === 0 ? "Mes actual" : monthOffset < 0 ? `Hace ${-monthOffset} ${-monthOffset === 1 ? "mes" : "meses"}` : "Próximo mes"}
        </span>

        {isFuture ? (
          <div className="mt-3 w-full bg-white rounded-[24px] p-6 text-center">
            <p className={`${SG_BOLD} text-2xl`}>📭 Sin datos aún</p>
            <p className="text-sm font-['Nunito:Regular'] text-ink/60">Este mes todavía no ha comenzado.</p>
            <SketchButton color="yellow" className="mt-3 px-4" onClick={() => setMonthOffset(0)}>Volver a hoy</SketchButton>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-3 w-full">
            <StatCard bg="bg-[#b8e7c9]" icon={imgGraphUp} label="Ingreso" value={formatMoney(totalIngreso, currency, rate)} />
            <StatCard bg="bg-[#ffb5a7]" icon={imgGraphDown} label="Gastado" value={formatMoney(totalGasto, currency, rate)} />
            <StatCard bg="bg-amber-soft" icon={imgMoneyBag} label="Presupuesto" value={formatMoney(totalBudget, currency, rate)} />
            <StatCard bg="bg-[#bde0fe]" icon={imgBanknote} label="Ahorro" value={formatMoney(Math.max(0, ahorro), currency, rate)} />
          </div>
        )}
      </section>

      {!isFuture && (
        <section className="flex flex-col gap-4 px-4 w-full sm:grid sm:grid-cols-2">
          {/* Flow */}
          <div className="bg-white flex flex-col gap-4 p-4 rounded-[24px] w-full">
            <div className="flex items-center justify-between font-bold whitespace-nowrap">
              <p className={`${SG_BOLD} text-lg text-ink`}>Flujo del mes</p>
              <p className="font-['Nunito:Bold'] text-xs text-ink/40">{monthTitle}</p>
            </div>
            <div className="bg-[#e7e7e7] flex h-4 overflow-clip rounded-full w-full">
              <div className="bg-[#ffb5a7] h-full transition-[width] duration-500" style={{ width: pct(totalGasto) }} />
              <div className="bg-amber-soft h-full transition-[width] duration-500" style={{ width: pct(totalBudget) }} />
              <div className="bg-[#bde0fe] h-full transition-[width] duration-500" style={{ width: pct(Math.max(0, ahorro)) }} />
            </div>
            <div className="flex flex-col gap-2">
              <LegendRow color="bg-[#bde0fe]" label="Ahorro" value={formatMoney(Math.max(0, ahorro), currency, rate)} />
              <LegendRow color="bg-amber-soft" label="Presupuesto" value={formatMoney(totalBudget, currency, rate)} />
              <LegendRow color="bg-[#ffb5a7]" label="Gastado" value={formatMoney(totalGasto, currency, rate)} />
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white flex flex-col gap-4 p-4 rounded-[24px] w-full">
            <p className={`${SG_BOLD} text-lg text-ink`}>Gastos por categoría</p>
            <div className="flex gap-4 items-center w-full">
              <Donut slices={catTotals.map((c) => ({ value: c.total, color: c.cat.hex }))} total={compact(catSum, currency, rate)} />
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                {catTotals.length === 0 && <p className="font-['Nunito:Regular'] text-xs text-ink/40">Sin gastos todavía</p>}
                {catTotals.map(({ cat, total }) => (
                  <div key={cat.id} className="flex items-center justify-between gap-2 w-full">
                    <div className="flex gap-1.5 items-center min-w-0">
                      <span className="rounded-[3px] size-2.5 shrink-0" style={{ background: cat.hex }} />
                      <p className="font-['Nunito:Bold'] font-bold text-xs text-ink truncate inline-flex items-center gap-1"><CategoryIcon cat={cat} size={14} /> <span className="truncate">{cat.name}</span></p>
                    </div>
                    <p className={`${SG_REG} text-xs text-ink/40 whitespace-nowrap`}>{formatMoney(total, currency, rate)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Fixed expenses */}
      <section className="flex flex-col gap-3 px-4 w-full">
        <div className="flex items-center justify-between text-ink">
          <p className={`${SG_REG} text-xl`}>Gastos fijos</p>
          <button onClick={() => { setPrefill({ type: "gasto-fijo" }); setAddOpen(true); }} className={`bg-amber-soft ${KEY} flex gap-1 items-center px-4 py-1.5 ${SG_BOLD}`}>
            <span className="text-sm">+</span><span className="text-xs">Añadir</span>
          </button>
        </div>
        <div className="grid gap-2 w-full sm:grid-cols-2">
          {fixed.map((f) => {
            const assigned = people.find((p) => p.id === f.assignedTo);
            return (
              <RowCard
                key={f.id}
                iconBg="bg-amber-soft"
                emoji={fixedEmoji(f.name, getCategory(f.category).emoji)}
                emojiCls="text-[32px] leading-[42.667px] text-center"
                title={f.name}
                meta={`Día ${f.dayOfMonth} · ${f.time}${f.repeat ? " · 🔁" : ""}${assigned ? ` · ${assigned.emoji}` : ""}`}
                amount={formatMoney(f.amountCUP, currency, rate)}
              >
                <IconKey title="Registrar pago" onClick={() => { setPrefill({ type: "gasto-fijo", name: f.name, category: f.category, amountCUP: f.amountCUP }); setAddOpen(true); }}><img alt="" src={imgPen} width={16} height={16} className="size-4" /></IconKey>
                <IconKey title="Eliminar" onClick={() => setFixed(fixed.filter((x) => x.id !== f.id))}><Trash2 className="size-3" /></IconKey>
              </RowCard>
            );
          })}
        </div>
      </section>

      {/* Movements */}
      <section className="flex flex-col gap-3 px-4 w-full">
        <div className="flex items-center justify-between gap-2">
          <p className={`${SG_REG} text-xl text-ink whitespace-nowrap`}>Movimientos</p>
          {monthOffset === 0 && (
            <div className="flex gap-2">
              <button onClick={() => { setPrefill({ type: "imprevisto" }); setAddOpen(true); }} className={`bg-[#ffb5a7] ${KEY} px-3 py-1.5 ${SG_REG} text-xs text-ink`}>+ Gasto</button>
              <button onClick={() => { setPrefill({ type: "ingreso" }); setAddOpen(true); }} className={`bg-[#b8e7c9] ${KEY} px-3 py-1.5 ${SG_REG} text-xs text-ink`}>+ Ingreso</button>
            </div>
          )}
        </div>
        {monthMovs.length === 0 && <p className={`${SG_REG} text-center text-ink/40 py-4`}>Sin movimientos este mes</p>}
        <div className="grid gap-2 w-full sm:grid-cols-2">
          {monthMovs.slice(0, 60).map((m) => {
            const cat = getCategory(m.category);
            const income = m.type === "ingreso";
            return (
              <RowCard
                key={m.id}
                iconBg={income ? "bg-[#b8e7c9]" : "bg-[#ffb5a7]"}
                emoji={<CategoryIcon cat={cat} size={24} />}
                title={m.name}
                meta={`${new Date(m.at).toLocaleDateString("es")} · ${TYPE_LABEL[m.type] ?? m.type}${m.note ? ` · ${m.note}` : ""}`}
                amount={`${income ? "+" : "-"}${formatMoney(m.amountCUP, currency, rate)}`}
                amountCls={income ? "text-ok-ink" : "text-brand"}
              >
                <IconKey title="Editar" onClick={() => setEditing(m)}><img alt="" src={imgPen} width={16} height={16} className="size-4" /></IconKey>
                <IconKey title="Eliminar" onClick={() => removeMovement(m.id)}><Trash2 className="size-3" /></IconKey>
              </RowCard>
            );
          })}
        </div>
      </section>

      <AddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} prefill={prefill} />
      <EditMovementModal open={!!editing} onClose={() => setEditing(null)} movement={editing} />
    </div>
  );
}

const SG_BOLD = "font-['Sour_Gummy:Bold'] font-bold wdth";
const SG_REG = "font-['Sour_Gummy:Regular'] font-normal wdth";
/** Raised pressable key — only interactive elements get the ink outline. */
const KEY = "border-[1.5px] border-ink rounded-full shadow-[0px_-4.5px_0px_-2px_white,0px_-4px_0px_0px_black,3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-px active:shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] transition-transform";
const TYPE_LABEL: Record<string, string> = { ingreso: "Ingreso", imprevisto: "Gasto", "gasto-fijo": "Fijo", "gasto-variable": "Gasto" };

/** Figma's fixed-expense glyphs, matched by service name. */
const FIXED_EMOJI: [RegExp, string][] = [
  [/electric|luz|corriente/i, "🔌"],
  [/agua/i, "💧"],
  [/internet|wifi|nauta|datos/i, "🌐"],
  [/gas/i, "🔥"],
  [/tel[eé]fono|m[oó]vil|celular|saldo/i, "📱"],
  [/renta|alquiler/i, "🏠"],
];
function fixedEmoji(name: string, fallback: string) {
  return FIXED_EMOJI.find(([re]) => re.test(name))?.[1] ?? fallback;
}

function compact(cup: number, currency: "CUP" | "USD", rate: number) {
  const v = currency === "USD" ? cup / rate : cup;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
}

function NavKey({ label, onClick, aria }: { label: string; onClick: () => void; aria: string }) {
  return (
    <button onClick={onClick} aria-label={aria} className="relative mt-0.5 group">
      <span className="absolute bg-white border-[1.333px] border-black bottom-0.5 right-0.5 h-[45px] w-[30px] rounded-full" aria-hidden />
      <span className="relative bg-white border-[1.5px] border-ink drop-shadow-[3px_3px_0px_rgba(0,0,0,0.3)] flex h-[45px] items-center justify-center p-3 rounded-full group-active:translate-x-px group-active:translate-y-px transition-transform">
        <span className={`${SG_BOLD} text-base text-ink leading-none`}>{label}</span>
      </span>
    </button>
  );
}

function StatCard({ bg, icon, label, value }: { bg: string; icon: string; label: string; value: string }) {
  return (
    <div className={`${bg} flex flex-col p-3 rounded-[24px] min-w-0`}>
      <div className="flex gap-1 items-center">
        <span className="relative size-4 shrink-0">
          <span className="absolute inset-[8.33%]"><span className="absolute inset-[-3.75%]"><img alt="" src={icon} className="block max-w-none size-full" /></span></span>
        </span>
        <p className="font-['Nunito:Bold'] font-bold leading-4 text-xs text-ink">{label}</p>
      </div>
      <p className="font-['Sour_Gummy:ExtraBold'] font-extrabold wdth leading-6 text-xl text-black pt-1 truncate">{value}</p>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-1.5 items-center">
        <span className={`${color} rounded-[4px] size-3`} />
        <p className="font-['Nunito:Regular'] text-sm text-ink">{label}</p>
      </div>
      <p className={`${SG_REG} text-sm text-ink`}>{value}</p>
    </div>
  );
}

function Donut({ slices, total }: { slices: { value: number; color: string }[]; total: string }) {
  const sum = slices.reduce((s, x) => s + x.value, 0);
  const r = 45.5, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative size-[110px] shrink-0">
      <svg viewBox="0 0 110 110" className="size-full -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e7e7e7" strokeWidth="19" />
        {sum > 0 && slices.map((s, i) => {
          const len = (s.value / sum) * c;
          const el = <circle key={i} cx="55" cy="55" r={r} fill="none" stroke={s.color} strokeWidth="19" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} />;
          acc += len;
          return el;
        })}
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 ${SG_REG}`}>
        <p className="text-xs text-ink">Total</p>
        <p className="text-base text-brand">{total}</p>
      </div>
    </div>
  );
}

function RowCard({ iconBg, emoji, emojiCls = "text-xl", title, meta, amount, amountCls = "text-ink", children }: { iconBg: string; emoji: ReactNode; emojiCls?: string; title: string; meta: string; amount: string; amountCls?: string; children: ReactNode }) {
  return (
    <div className="bg-white flex gap-2.5 items-center p-3 rounded-[16px] w-full min-w-0">
      <div className={`${iconBg} flex items-center justify-center rounded-[12px] size-10 shrink-0 ${emojiCls}`}>{emoji}</div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <p className="font-['Nunito:ExtraBold'] font-extrabold text-sm text-ink truncate">{title}</p>
        <p className="font-['Nunito:Regular'] text-xs text-ink/40 truncate">{meta}</p>
      </div>
      <div className="flex gap-2 items-center shrink-0">
        <p className={`${SG_REG} text-sm whitespace-nowrap ${amountCls}`}>{amount}</p>
        {children}
      </div>
    </div>
  );
}

function IconKey({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} className={`bg-white ${KEY} mt-1 size-[29px] flex items-center justify-center text-[11px] text-ink overflow-clip`}>
      {children}
    </button>
  );
}
