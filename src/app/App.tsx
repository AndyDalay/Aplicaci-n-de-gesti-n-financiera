import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./components/AppContext";
import { Header } from "./components/Header";
import { BottomNav, NAV_ITEMS, Tab } from "./components/BottomNav";
import { ShoppingListPage } from "./components/pages/ShoppingListPage";
import { InventoryPage } from "./components/pages/InventoryPage";
import { AdminPage } from "./components/pages/AdminPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { KitchenPage } from "./components/pages/KitchenPage";
import { DesktopShell } from "./components/DesktopShell";

const TITLES: Record<Tab, { title: string; sub?: string }> = {
  compras: { title: "Compras", sub: "Lo que toca buscar hoy" },
  inventario: { title: "Inventario", sub: "Cuánto queda de cada cosa" },
  cocina: { title: "Cocina", sub: "Qué comemos esta semana" },
  admin: { title: "Administración", sub: "Las cuentas claras" },
  config: { title: "Configuración", sub: "Ajustes de la casa" },
};

function MobileApp() {
  const [tab, setTab] = useState<Tab>("compras");
  const meta = TITLES[tab];
  return (
    <div className="min-h-dvh w-full bg-app-bg flex flex-col">
      <Header pageTitle={meta.title} pageSubtitle={meta.sub} pageIndex={tab === "config" ? NAV_ITEMS.length : NAV_ITEMS.findIndex((i) => i.id === tab)} onAvatar={() => setTab("config")} />
      <main className="flex-1 w-full max-w-2xl mx-auto">
        {tab === "compras" && <ShoppingListPage />}
        {tab === "inventario" && <InventoryPage />}
        {tab === "cocina" && <KitchenPage />}
        {tab === "admin" && <AdminPage />}
        {tab === "config" && <SettingsPage />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

function Root() {
  const { viewMode } = useApp();
  return viewMode === "desktop" ? <DesktopShell /> : <MobileApp />;
}

function NoTranslate() {
  useEffect(() => {
    document.documentElement.setAttribute("translate", "no");
    document.documentElement.classList.add("notranslate");
    document.documentElement.lang = "es";
    const ensure = (name: string, content: string) => {
      let m = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!m) { m = document.createElement("meta"); m.name = name; document.head.appendChild(m); }
      m.content = content;
    };
    ensure("google", "notranslate");
  }, []);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <NoTranslate />
      <Root />
    </AppProvider>
  );
}
