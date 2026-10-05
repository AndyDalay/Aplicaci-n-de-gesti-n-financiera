import { useEffect, useRef, useState } from "react";
import { Camera, DollarSign } from "lucide-react";
import { useApp } from "../AppContext";
import { SketchCard, SketchButton, Input, Pill, CurrencyToggle, ViewModeToggle, Switch } from "../ui-kit";

export function SettingsPage() {
  const { people, setPeople, currentUserId, setCurrentUserId, rate, setRate, defaultCurrency, setDefaultCurrency, viewMode, setViewMode, uploadAvatarFor, kitchen, setKitchen } = useApp();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [tempRate, setTempRate] = useState(rate);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { setTempRate(rate); }, [rate]);

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

      <SketchCard color="bg-pastel-mint" className="p-3">
        <h3 className="leading-none mb-2">Cocina</h3>
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
