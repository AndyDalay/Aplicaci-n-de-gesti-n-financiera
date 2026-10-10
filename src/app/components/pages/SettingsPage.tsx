import { useEffect, useRef, useState } from "react";
import { Camera, DollarSign } from "lucide-react";
import { useApp } from "../AppContext";
import { SketchCard, SketchButton, Input, Pill, CurrencyToggle, ViewModeToggle, Switch } from "../ui-kit";
import { CATEGORIES, MeasureBase, PRODUCTS, resolveProductMeasure } from "../data";

type MeasureDraft = { base: MeasureBase; pack: string; density: string };

function EquivalencesSection() {
  const { productMeasures, setProductMeasure } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [drafts, setDrafts] = useState<Record<string, MeasureDraft>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(PRODUCTS.map((product) => {
      const measure = resolveProductMeasure(product, productMeasures);
      return [product.id, { base: measure.base, pack: String(measure.pack), density: measure.density === undefined ? "" : String(measure.density) }];
    })));
  }, [productMeasures]);

  const visible = PRODUCTS.filter((product) =>
    (!category || product.category === category) && product.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );

  const update = (productId: string, patch: Partial<MeasureDraft>) => {
    setDrafts((current) => ({ ...current, [productId]: { ...current[productId], ...patch } }));
  };

  const save = (productId: string) => {
    const draft = drafts[productId];
    const pack = Number(draft?.pack);
    const density = draft?.density.trim() ? Number(draft.density) : undefined;
    if (!draft || !Number.isFinite(pack) || pack <= 0 || (density !== undefined && (!Number.isFinite(density) || density <= 0))) return;
    setProductMeasure(productId, { base: draft.base, pack, ...(density ? { density } : {}) });
  };

  return (
    <SketchCard color="bg-pastel-peach" className="p-3">
      <h3 className="leading-none mb-1">Equivalencias</h3>
      <p className="mb-3 text-xs text-ink/60">Define cuánto trae un pack para calcular el inventario real.</p>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto…" aria-label="Buscar equivalencia" />
      <div className="-mx-1 my-2 flex gap-2 overflow-x-auto px-1 pb-1">
        <button type="button" onClick={() => setCategory("")} aria-pressed={!category} className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold ${!category ? "border-ink bg-pastel-yellow" : "border-ink/20 bg-white"}`}>Todas</button>
        {CATEGORIES.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold ${category === item.id ? "border-ink bg-pastel-yellow" : "border-ink/20 bg-white"}`}>{item.emoji} {item.name}</button>)}
      </div>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
        {visible.map((product) => {
          const measure = resolveProductMeasure(product, productMeasures);
          const draft = drafts[product.id] ?? { base: measure.base, pack: String(measure.pack), density: measure.density ? String(measure.density) : "" };
          return (
            <div key={product.id} className="rounded-xl border border-ink/10 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-['Nunito:Bold'] text-sm">{product.emoji} {product.name}</span>
                <Pill color={measure.measureConfirmed ? "bg-pastel-mint" : "bg-pastel-yellow"}>{measure.measureConfirmed ? "Confirmado" : "Por confirmar"}</Pill>
              </div>
              <p className="mb-1 text-[11px] text-ink/60">1 unidad de {product.name} =</p>
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                <Input type="number" min="0.001" step="any" inputMode="decimal" aria-label={`Cantidad por pack de ${product.name}`} value={draft.pack} onChange={(event) => update(product.id, { pack: event.target.value })} />
                <select aria-label={`Unidad base de ${product.name}`} value={draft.base} onChange={(event) => update(product.id, { base: event.target.value as MeasureBase })} className="min-h-11 rounded-xl border border-ink/20 bg-white px-2 text-sm">
                  <option value="g">g</option><option value="ml">ml</option><option value="u">u</option>
                </select>
              </div>
              {draft.base === "g" && <label className="mt-2 block text-xs text-ink/60">Densidad (g por taza, opcional)<Input type="number" min="0.001" step="any" inputMode="decimal" value={draft.density} onChange={(event) => update(product.id, { density: event.target.value })} placeholder="Ej. 200" className="mt-1" /></label>}
              <button type="button" onClick={() => save(product.id)} disabled={!Number(draft.pack) || Number(draft.pack) <= 0} className="mt-2 min-h-10 rounded-full border border-ink/25 bg-pastel-mint px-3 text-xs font-bold disabled:opacity-40">Guardar equivalencia</button>
            </div>
          );
        })}
        {!visible.length && <p className="py-6 text-center text-sm text-ink/60">No hay productos con esos filtros.</p>}
      </div>
    </SketchCard>
  );
}

export function SettingsPage() {
  const { people, setPeople, currentUserId, setCurrentUserId, rate, setRate, defaultCurrency, setDefaultCurrency, viewMode, setViewMode, uploadAvatarFor, kitchen, setKitchen, foodBudgetCUP, setFoodBudgetCUP, readyMealReferenceCUP, setReadyMealReferenceCUP } = useApp();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [tempRate, setTempRate] = useState(rate);
  const [tempFoodBudget, setTempFoodBudget] = useState(foodBudgetCUP);
  const [tempReadyMealReference, setTempReadyMealReference] = useState(readyMealReferenceCUP);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { setTempRate(rate); }, [rate]);
  useEffect(() => { setTempFoodBudget(foodBudgetCUP); }, [foodBudgetCUP]);
  useEffect(() => { setTempReadyMealReference(readyMealReferenceCUP); }, [readyMealReferenceCUP]);

  const onAvatar = async (pid: string, f: File | null) => {
    if (!f) return;
    setUploading(pid);
    await uploadAvatarFor(pid, f);
    setUploading(null);
  };

  return (
    <div className="px-4 pb-24 pt-4 space-y-3">
      <SketchCard color="bg-pastel-pink" className="p-3">
        <h3 className="leading-none mb-2">Usuario activo</h3>
        <div className="grid grid-cols-2 gap-2">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => setCurrentUserId(p.id)}
              className={`sketch-border sketch-shadow-sm rounded-2xl p-3 flex flex-col items-center gap-1 ${currentUserId === p.id ? "bg-pastel-yellow" : "bg-white"}`}
            >
              <div className="w-14 h-14 sketch-border rounded-full overflow-hidden flex items-center justify-center text-3xl" style={{ background: p.color }}>
                {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.emoji}
              </div>
              <span className="font-bold">{p.name}</span>
              {currentUserId === p.id && <Pill color="bg-pastel-mint">Activo</Pill>}
            </button>
          ))}
        </div>
      </SketchCard>

      <SketchCard className="p-3">
        <h3 className="leading-none mb-2">Pareja</h3>
        <div className="space-y-3">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <button onClick={() => fileRefs.current[p.id]?.click()} className="relative">
                <div className="w-14 h-14 sketch-border sketch-shadow-sm rounded-full overflow-hidden flex items-center justify-center text-3xl" style={{ background: p.color }}>
                  {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.emoji}
                </div>
                <span className="absolute -bottom-1 -right-1 sketch-border rounded-full bg-white p-1">{uploading === p.id ? <span className="text-[10px] font-bold">…</span> : <Camera className="w-3 h-3" />}</span>
                <input ref={(el) => (fileRefs.current[p.id] = el)} type="file" accept="image/*" hidden onChange={(e) => onAvatar(p.id, e.target.files?.[0] ?? null)} />
              </button>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Nombre</label>
                  <Input value={p.name} onChange={(e) => setPeople(people.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
                </div>
                <div>
                  <label className="text-xs">Salario USD</label>
                  <Input type="number" value={p.salaryUSD} onChange={(e) => setPeople(people.map((x) => (x.id === p.id ? { ...x, salaryUSD: parseFloat(e.target.value) || 0 } : x)))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SketchCard>

      <SketchCard color="bg-pastel-yellow" className="p-3">
        <h3 className="leading-none mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Moneda</h3>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold">Moneda por defecto</p>
            <p className="text-xs text-muted-foreground">La que se ve al abrir la app</p>
          </div>
          <CurrencyToggle value={defaultCurrency} onChange={setDefaultCurrency} />
        </div>
        <div>
          <label>Cambio informal USD → CUP</label>
          <div className="flex items-center gap-2 mt-1">
            <Input type="number" value={tempRate} onChange={(e) => setTempRate(parseFloat(e.target.value) || 0)} />
            <SketchButton color="mint" onClick={() => setRate(tempRate)}>Guardar</SketchButton>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Actual: 1 USD = {rate} CUP</p>
        </div>
      </SketchCard>

      <EquivalencesSection />

      <SketchCard color="bg-pastel-mint" className="p-3">
        <h3 className="leading-none mb-2">Cocina</h3>
        <div className="mb-3">
          <label htmlFor="food-budget" className="font-bold">Presupuesto semanal de comida (CUP)</label>
          <div className="mt-1 flex gap-2"><Input id="food-budget" type="number" min="0" step="100" inputMode="decimal" value={tempFoodBudget || ""} placeholder="0 · sin presupuesto" onChange={(event) => setTempFoodBudget(Number(event.target.value) || 0)} /><SketchButton color="mint" onClick={() => setFoodBudgetCUP(tempFoodBudget)}>Guardar</SketchButton></div>
          <p className="mt-1 text-xs text-muted-foreground">0 = sin límite semanal configurado.</p>
        </div>
        <div className="mb-3">
          <label htmlFor="ready-meal-reference" className="font-bold">Precio de referencia de comida hecha (CUP, opcional)</label>
          <div className="mt-1 flex gap-2"><Input id="ready-meal-reference" type="number" min="0" step="50" inputMode="decimal" value={tempReadyMealReference || ""} placeholder="0 · sin comparación" onChange={(event) => setTempReadyMealReference(Number(event.target.value) || 0)} /><SketchButton color="mint" onClick={() => setReadyMealReferenceCUP(tempReadyMealReference)}>Guardar</SketchButton></div>
          <p className="mt-1 text-xs text-muted-foreground">Se usa para comparar el costo estimado por ración.</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold">Planificar desayuno</p>
            <p className="text-xs text-muted-foreground">Por defecto solo almuerzo y comida</p>
          </div>
          <Switch checked={kitchen.breakfast} onChange={(b) => setKitchen({ ...kitchen, breakfast: b })} />
        </div>
      </SketchCard>

      <SketchCard color="bg-pastel-lavender" className="p-3">
        <h3 className="leading-none mb-2">Vista</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Modo de visualización</p>
            <p className="text-xs text-muted-foreground">Móvil por defecto · Desktop para administrar</p>
          </div>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </SketchCard>

      <SketchCard className="p-3">
        <h3 className="leading-none mb-2">Acerca de</h3>
        <p className="text-sm font-hand text-base">Casita 🏡 — La economía del hogar de Andy & Rachel.</p>
        <p className="text-xs text-muted-foreground mt-1">Hecho con cariño, lápiz y colores pasteles.</p>
      </SketchCard>
    </div>
  );
}
