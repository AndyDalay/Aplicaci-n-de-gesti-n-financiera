import { useState } from "react";
import { LayoutDashboard, Package, Settings, ChefHat, ShoppingCart } from "lucide-react";
import { useApp } from "./AppContext";
import { Tab } from "./BottomNav";
import { ShoppingListPage } from "./pages/ShoppingListPage";
import { InventoryPage } from "./pages/InventoryPage";
import { AdminPage } from "./pages/AdminPage";
import { SettingsPage } from "./pages/SettingsPage";
import { KitchenPage } from "./pages/KitchenPage";
import { CurrencyToggle, Pill, ViewModeToggle } from "./ui-kit";

const items: { id: Tab; icon: any; label: string; color: string }[] = [
  { id: "admin", icon: LayoutDashboard, label: "Dashboard", color: "bg-pastel-yellow" },
  { id: "compras", icon: ShoppingCart, label: "Lista de compras", color: "bg-pastel-pink" },
  { id: "inventario", icon: Package, label: "Inventario", color: "bg-pastel-mint" },
  { id: "cocina", icon: ChefHat, label: "Cocina", color: "bg-pastel-peach" },
  { id: "config", icon: Settings, label: "Configuración", color: "bg-pastel-lavender" },
];

export function DesktopShell() {
  const [tab, setTab] = useState<Tab>("admin");
  const { people, currentUserId, setCurrentUserId, currency, setCurrency, viewMode, setViewMode } = useApp();
  const me = people.find((p) => p.id === currentUserId)!;

  return (
    <div className="min-h-screen bg-paper squiggle-bg">
      <div className="grid grid-cols-[260px_1fr] min-h-screen">
        <aside className="border-r-2 border-ink p-4 bg-white/70 sticky top-0 h-screen overflow-y-auto">
          <div className="flex items-center gap-2 mb-5">
            <div className="text-3xl">🏡</div>
            <div>
              <p className="font-display text-3xl leading-none">Casita</p>
              <p className="text-xs text-muted-foreground font-bold">Panel administrativo</p>
            </div>
          </div>

          <div className="sketch-border sketch-shadow-sm rounded-2xl bg-pastel-yellow p-2 mb-4">
            <p className="text-xs font-bold mb-1">Usuario</p>
            <div className="flex gap-2">
              {people.map((p) => (
                <button key={p.id} onClick={() => setCurrentUserId(p.id)} className={`flex-1 sketch-border rounded-full bg-white px-2 py-1 text-xs font-bold inline-flex items-center justify-center gap-1 ${currentUserId === p.id ? "ring-2 ring-ink" : ""}`}>
                  <span>{p.emoji}</span> {p.name}
                </button>
              ))}
            </div>
          </div>

          <nav className="space-y-2">
            {items.map((it) => {
              const Icon = it.icon;
              const active = tab === it.id;
              return (
                <button key={it.id} onClick={() => setTab(it.id)} className={`w-full sketch-border sketch-shadow-sm rounded-2xl px-3 py-2.5 flex items-center gap-2 font-bold ${active ? it.color : "bg-white"}`}>
                  <Icon className="w-4 h-4" /> {it.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-5 space-y-2">
            <div className="sketch-border rounded-2xl bg-white p-2 flex items-center justify-between" style={{ boxShadow: "2px 2px 0 0 #1A1A1A" }}>
              <span className="text-xs font-bold">Moneda</span>
              <CurrencyToggle value={currency} onChange={setCurrency} />
            </div>
            <div className="sketch-border rounded-2xl bg-white p-2 flex items-center justify-between" style={{ boxShadow: "2px 2px 0 0 #1A1A1A" }}>
              <span className="text-xs font-bold">Vista</span>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </aside>

        <main className="p-6 max-w-5xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1>{items.find((i) => i.id === tab)?.label}</h1>
              <p className="text-sm text-muted-foreground font-bold">Hola {me.name} 👋</p>
            </div>
            <Pill color="bg-cream">{new Date().toLocaleDateString("es", { weekday: "long", day: "2-digit", month: "long" })}</Pill>
          </div>
          <div className="-mx-4">
            {tab === "admin" && <AdminPage />}
            {tab === "compras" && <ShoppingListPage />}
            {tab === "inventario" && <InventoryPage />}
            {tab === "cocina" && <KitchenPage />}
            {tab === "config" && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
