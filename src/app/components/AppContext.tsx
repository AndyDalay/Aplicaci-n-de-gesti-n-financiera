import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import {
  CATEGORIES,
  Currency,
  DEFAULT_PEOPLE,
  FixedExpense,
  Movement,
  Person,
  PRODUCTS,
  ShoppingItem,
  StockItem,
  DEFAULT_RECIPES,
  matchProduct,
  PlannedMeal,
  Recipe,
  resolveWeek,
  weekKey,
  WeekPlan,
} from "./data";
import { fetchState, fetchVersion, pushState, uploadAvatar } from "./sync";

type ViewMode = "mobile" | "desktop";

type SharedNotification = {
  id: string;
  title: string;
  body: string;
  at: number;
  readBy: string[];
};

type SharedState = {
  people: Person[];
  defaultCurrency: Currency;
  rate: number;
  stock: Record<string, StockItem>;
  shopping: ShoppingItem[];
  movements: Movement[];
  fixed: FixedExpense[];
  priceOverrides: Record<string, number>;
  notifications: SharedNotification[];
  recipes: Recipe[];
  weeks: Record<string, WeekPlan>;
  kitchen: { breakfast: boolean };
};

type Ctx = {
  people: Person[];
  setPeople: (p: Person[]) => void;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  defaultCurrency: Currency;
  setDefaultCurrency: (c: Currency) => void;
  rate: number;
  setRate: (r: number) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  stock: Record<string, StockItem>;
  setStock: (s: Record<string, StockItem>) => void;
  updateStock: (productId: string, current: number) => void;

  shopping: ShoppingItem[];
  addShopping: (item: Omit<ShoppingItem, "id" | "createdAt">) => void;
  removeShopping: (id: string) => void;
  updateShopping: (id: string, patch: Partial<ShoppingItem>) => void;

  movements: Movement[];
  addMovement: (m: Omit<Movement, "id" | "at">) => void;
  removeMovement: (id: string) => void;
  updateMovement: (id: string, patch: Partial<Movement>) => void;

  fixed: FixedExpense[];
  setFixed: (f: FixedExpense[]) => void;

  priceOverrides: Record<string, number>;
  setProductPrice: (productId: string, priceCUP: number) => void;

  notifications: SharedNotification[];
  unreadCount: number;
  pushNotification: (n: { title: string; body: string }) => void;
  markAllRead: () => void;

  recipes: Recipe[];
  saveRecipe: (r: Omit<Recipe, "id" | "createdAt"> & { id?: string }) => string;
  removeRecipe: (id: string) => void;
  weeks: Record<string, WeekPlan>;
  setMeal: (week: string, slotKey: string, meal: PlannedMeal | null) => void;
  kitchen: { breakfast: boolean };
  setKitchen: (k: { breakfast: boolean }) => void;
  /** Adds every missing ingredient of a recipe to the shopping list; returns how many were added. */
  shopMissing: (recipeId: string) => number;
  syncStatus: "loading" | "online" | "offline";
  lastSync: number;
  uploadAvatarFor: (personId: string, file: File) => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

const id = () => Math.random().toString(36).slice(2, 9);

const defaultStock = (): Record<string, StockItem> => {
  const s: Record<string, StockItem> = {};
  PRODUCTS.forEach((p) => {
    s[p.id] = { productId: p.id, current: p.monthlyQuantity, max: p.monthlyQuantity };
  });
  return s;
};

const defaultFixed = (): FixedExpense[] => [
  { id: id(), name: "Electricidad", category: "otros", amountCUP: 3500, dayOfMonth: 5, time: "09:00", repeat: true, assignedTo: "andy" },
  { id: id(), name: "Agua", category: "otros", amountCUP: 1200, dayOfMonth: 10, time: "09:00", repeat: true, assignedTo: "rachel" },
  { id: id(), name: "Internet", category: "otros", amountCUP: 2500, dayOfMonth: 15, time: "10:00", repeat: true, assignedTo: "andy" },
];

const defaultShared = (): SharedState => ({
  people: DEFAULT_PEOPLE,
  defaultCurrency: "CUP",
  rate: 520,
  stock: defaultStock(),
  shopping: [],
  movements: [],
  fixed: defaultFixed(),
  priceOverrides: {},
  recipes: DEFAULT_RECIPES,
  weeks: {},
  kitchen: { breakfast: false },
  notifications: [{ id: id(), title: "🏡 Casita lista", body: "Andy y Rachel ya pueden colaborar.", at: Date.now(), readBy: [] }],
});

function fireOSNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/favicon.ico" }); } catch {}
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Local-only preferences
  const [currentUserId, setCurrentUserId] = useState<string>(() => localStorage.getItem("casita:userId") ?? "andy");
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem("casita:view") as ViewMode) ?? "mobile");
  const [currency, setCurrency] = useState<Currency>(() => (localStorage.getItem("casita:currency") as Currency) ?? "CUP");

  // Shared state
  const [shared, setShared] = useState<SharedState>(defaultShared);
  const [syncStatus, setSyncStatus] = useState<"loading" | "online" | "offline">("loading");
  const [lastSync, setLastSync] = useState(0);
  const versionRef = useRef(0);
  const writeTimer = useRef<number | null>(null);
  const pendingShared = useRef<SharedState | null>(null);
  const seenNotifIds = useRef<Set<string>>(new Set());

  // Request OS notification permission once
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch {}
    }
  }, []);

  // Persist local prefs
  useEffect(() => { localStorage.setItem("casita:userId", currentUserId); }, [currentUserId]);
  useEffect(() => { localStorage.setItem("casita:view", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("casita:currency", currency); }, [currency]);

  // Initial load + bootstrap if empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchState();
      if (cancelled) return;
      if (!res) {
        setSyncStatus("offline");
        return;
      }
      if (res.state) {
        const next: SharedState = {
          people: res.state.people ?? DEFAULT_PEOPLE,
          defaultCurrency: res.state.defaultCurrency ?? "CUP",
          rate: res.state.rate ?? 520,
          stock: res.state.stock ?? defaultStock(),
          shopping: res.state.shopping ?? [],
          movements: res.state.movements ?? [],
          fixed: res.state.fixed ?? defaultFixed(),
          priceOverrides: res.state.priceOverrides ?? {},
          notifications: res.state.notifications ?? [],
          recipes: res.state.recipes ?? DEFAULT_RECIPES,
          weeks: res.state.weeks ?? {},
          kitchen: res.state.kitchen ?? { breakfast: false },
        };
        setShared(next);
        next.notifications.forEach((n) => seenNotifIds.current.add(n.id));
        versionRef.current = res.version ?? 0;
        // Apply default currency on first load only
        const pref = localStorage.getItem("casita:currency");
        if (!pref) setCurrency(res.state.defaultCurrency ?? "CUP");
      } else {
        // Bootstrap server with defaults
        const seed = defaultShared();
        const written = await pushState(seed);
        setShared(seed);
        if (written) versionRef.current = written.version;
      }
      setLastSync(Date.now());
      setSyncStatus("online");
    })();
    return () => { cancelled = true; };
  }, []);

  // Polling for remote changes (every 5s)
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const v = await fetchVersion();
      if (cancelled || !v) {
        if (!cancelled && !v) setSyncStatus("offline");
        return;
      }
      if (v.version > versionRef.current) {
        const res = await fetchState();
        if (cancelled || !res?.state) return;
        const next: SharedState = {
          people: res.state.people ?? DEFAULT_PEOPLE,
          defaultCurrency: res.state.defaultCurrency ?? "CUP",
          rate: res.state.rate ?? 520,
          stock: res.state.stock ?? defaultStock(),
          shopping: res.state.shopping ?? [],
          movements: res.state.movements ?? [],
          fixed: res.state.fixed ?? defaultFixed(),
          priceOverrides: res.state.priceOverrides ?? {},
          notifications: res.state.notifications ?? [],
          recipes: res.state.recipes ?? DEFAULT_RECIPES,
          weeks: res.state.weeks ?? {},
          kitchen: res.state.kitchen ?? { breakfast: false },
        };
        // fire OS notifications for new entries (ones we haven't seen yet)
        next.notifications.forEach((n) => {
          if (!seenNotifIds.current.has(n.id)) {
            seenNotifIds.current.add(n.id);
            // skip very old (more than 60s) on first sync to avoid spam
            if (Date.now() - n.at < 60_000) fireOSNotification(n.title, n.body);
          }
        });
        setShared(next);
        versionRef.current = res.version;
      }
      setSyncStatus("online");
      setLastSync(Date.now());
    };
    const handle = window.setInterval(tick, 5000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      clearInterval(handle);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // Mutator: applies a local change immediately and schedules a debounced server push
  const mutate = (fn: (s: SharedState) => SharedState) => {
    setShared((prev) => {
      const next = fn(prev);
      pendingShared.current = next;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = window.setTimeout(async () => {
        if (!pendingShared.current) return;
        const written = await pushState(pendingShared.current);
        if (written) {
          versionRef.current = written.version;
          setSyncStatus("online");
          setLastSync(Date.now());
        } else {
          setSyncStatus("offline");
        }
      }, 350);
      return next;
    });
  };

  const setPeople = (p: Person[]) => mutate((s) => ({ ...s, people: p }));
  const setDefaultCurrency = (c: Currency) => mutate((s) => ({ ...s, defaultCurrency: c }));
  const setRate = (r: number) => mutate((s) => ({ ...s, rate: r }));
  const setStock = (st: Record<string, StockItem>) => mutate((s) => ({ ...s, stock: st }));
  const setFixed = (f: FixedExpense[]) => mutate((s) => ({ ...s, fixed: f }));

  const updateStock = (productId: string, current: number) => mutate((s) => {
    const it = s.stock[productId];
    if (!it) return s;
    const clamped = Math.max(0, Math.min(it.max, current));
    const stock = { ...s.stock, [productId]: { ...it, current: clamped } };
    let shopping = s.shopping;
    const ratio = clamped / Math.max(1, it.max);
    const product = PRODUCTS.find((p) => p.id === productId);
    if (ratio <= 0.25) {
      const exists = shopping.some((i) => i.productId === productId && !i.bought);
      if (!exists && product) {
        const qty = clamped === 0 ? product.monthlyQuantity : Math.ceil(product.monthlyQuantity / 2);
        shopping = [
          { id: id(), productId, qtySuggested: qty, priority: clamped === 0 ? "alta" : "normal", createdAt: Date.now() },
          ...shopping,
        ];
      } else if (exists) {
        // refresh priority/qty if status changed (e.g. went from 1/4 to 0/4)
        shopping = shopping.map((i) =>
          i.productId === productId && !i.bought && product
            ? {
                ...i,
                priority: clamped === 0 ? "alta" : "normal",
                qtySuggested: clamped === 0 ? product.monthlyQuantity : Math.ceil(product.monthlyQuantity / 2),
              }
            : i,
        );
      }
    } else {
      // stock recovered above 25% — remove auto-added shopping entries that are still pending
      shopping = shopping.filter((i) => !(i.productId === productId && !i.bought));
    }
    return { ...s, stock, shopping };
  });

  const addShopping: Ctx["addShopping"] = (item) => {
    const itemName = item.customName ?? PRODUCTS.find((p) => p.id === item.productId)?.name ?? "Item";
    mutate((s) => {
      const assignedName = item.assignedTo ? s.people.find((p) => p.id === item.assignedTo)?.name : "";
      return {
        ...s,
        shopping: [{ ...item, id: id(), createdAt: Date.now() }, ...s.shopping],
        notifications: [
          { id: id(), title: "🛒 Nuevo en lista de compras", body: `${itemName} añadido${assignedName ? ` para ${assignedName}` : ""}.`, at: Date.now(), readBy: [] },
          ...s.notifications,
        ].slice(0, 50),
      };
    });
  };

  const removeShopping = (sid: string) => mutate((s) => ({ ...s, shopping: s.shopping.filter((i) => i.id !== sid) }));
  const updateShopping = (sid: string, patch: Partial<ShoppingItem>) =>
    mutate((s) => ({ ...s, shopping: s.shopping.map((i) => (i.id === sid ? { ...i, ...patch } : i)) }));

  const addMovement: Ctx["addMovement"] = (m) => mutate((s) => ({
    ...s,
    movements: [{ ...m, id: id(), at: Date.now() }, ...s.movements],
    notifications: [
      { id: id(), title: m.type === "ingreso" ? "💰 Ingreso registrado" : "💸 Gasto registrado", body: `${m.name} · ${Math.round(m.amountCUP).toLocaleString("es-CU")} CUP`, at: Date.now(), readBy: [] },
      ...s.notifications,
    ].slice(0, 50),
  }));
  const removeMovement = (mid: string) => mutate((s) => ({ ...s, movements: s.movements.filter((m) => m.id !== mid) }));
  const updateMovement: Ctx["updateMovement"] = (mid, patch) =>
    mutate((s) => ({ ...s, movements: s.movements.map((m) => (m.id === mid ? { ...m, ...patch } : m)) }));

  const setProductPrice = (productId: string, priceCUP: number) =>
    mutate((s) => ({
      ...s,
      priceOverrides: { ...s.priceOverrides, [productId]: priceCUP },
      notifications: [
        { id: id(), title: "💲 Precio actualizado", body: `${PRODUCTS.find(p => p.id === productId)?.name ?? "Producto"} → ${Math.round(priceCUP).toLocaleString("es-CU")} CUP`, at: Date.now(), readBy: [] },
        ...s.notifications,
      ].slice(0, 50),
    }));

  const pushNotification: Ctx["pushNotification"] = (n) =>
    mutate((s) => ({
      ...s,
      notifications: [{ id: id(), title: n.title, body: n.body, at: Date.now(), readBy: [] }, ...s.notifications].slice(0, 50),
    }));

  const markAllRead = () =>
    mutate((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.readBy.includes(currentUserId) ? n : { ...n, readBy: [...n.readBy, currentUserId] },
      ),
    }));

  const saveRecipe: Ctx["saveRecipe"] = (r) => {
    const rid = r.id ?? id();
    mutate((s) => {
      const exists = s.recipes.some((x) => x.id === rid);
      const ingredients = r.ingredients.map((i) => (i.productId ? i : { ...i, productId: matchProduct(i.name)?.id }));
      const rec: Recipe = { ...(s.recipes.find((x) => x.id === rid) ?? { createdAt: Date.now() }), ...r, ingredients, id: rid } as Recipe;
      return { ...s, recipes: exists ? s.recipes.map((x) => (x.id === rid ? rec : x)) : [rec, ...s.recipes] };
    });
    return rid;
  };
  const removeRecipe = (rid: string) => mutate((s) => ({
    ...s,
    recipes: s.recipes.filter((r) => r.id !== rid),
    weeks: Object.fromEntries(Object.entries(s.weeks).map(([k, w]) => [k, Object.fromEntries(Object.entries(w).filter(([, m]) => m.recipeId !== rid))])),
  }));

  const setMeal: Ctx["setMeal"] = (week, slotKey, meal) => mutate((s) => {
    const base = { ...resolveWeek(s.weeks, week).plan };
    if (meal) base[slotKey] = meal; else delete base[slotKey];
    return { ...s, weeks: { ...s.weeks, [week]: base } };
  });
  const setKitchen = (k: { breakfast: boolean }) => mutate((s) => ({ ...s, kitchen: k }));

  const missingOf = (s: SharedState, r: Recipe) => r.ingredients.filter((i) => !i.productId || (s.stock[i.productId]?.current ?? 0) <= 0);
  const shopMissing = (rid: string) => {
    const r = shared.recipes.find((x) => x.id === rid);
    if (!r) return 0;
    const pending = new Set(shared.shopping.filter((i) => !i.bought).map((i) => i.productId ?? i.customName?.toLowerCase()));
    const toAdd = missingOf(shared, r).filter((i) => !pending.has(i.productId ?? i.name.toLowerCase()));
    if (!toAdd.length) return 0;
    mutate((s) => ({
      ...s,
      shopping: [
        ...toAdd.map((i) => ({ id: id(), productId: i.productId, customName: i.productId ? undefined : i.name, qtySuggested: 1, priority: "normal" as const, createdAt: Date.now() })),
        ...s.shopping,
      ],
      notifications: [
        { id: id(), title: "🍳 Faltan ingredientes", body: `${toAdd.map((i) => i.name).join(", ")} para ${r.name}.`, at: Date.now(), readBy: [] },
        ...s.notifications,
      ].slice(0, 50),
    }));
    return toAdd.length;
  };

  // Freeze the current week once it starts, so history keeps what was actually planned.
  useEffect(() => {
    if (syncStatus !== "online") return;
    const k = weekKey(new Date());
    if (!shared.weeks[k] && Object.keys(shared.weeks).length) mutate((s) => ({ ...s, weeks: { ...s.weeks, [k]: resolveWeek(s.weeks, k).plan } }));
  }, [syncStatus, shared.weeks]);

  const unreadCount = shared.notifications.filter((n) => !n.readBy.includes(currentUserId)).length;

  const compressImage = (file: File, maxWidth = 300, maxHeight = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
    });
  };

  const uploadAvatarFor = async (personId: string, file: File) => {
    try {
      const compressedFile = await compressImage(file, 200, 200); // Small size for avatars
      const url = await uploadAvatar(personId, compressedFile);
      if (!url) {
        pushNotification({ title: "Error subiendo avatar", body: "No se pudo subir la foto. Intenta de nuevo." });
        return;
      }
      mutate((s) => ({ ...s, people: s.people.map((p) => (p.id === personId ? { ...p, avatar: url } : p)) }));
    } catch (e) {
      pushNotification({ title: "Error subiendo avatar", body: "No se pudo subir la foto." });
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      people: shared.people, setPeople,
      currentUserId, setCurrentUserId,
      currency, setCurrency,
      defaultCurrency: shared.defaultCurrency, setDefaultCurrency,
      rate: shared.rate, setRate,
      viewMode, setViewMode,
      stock: shared.stock, setStock, updateStock,
      shopping: shared.shopping, addShopping, removeShopping, updateShopping,
      movements: shared.movements, addMovement, removeMovement, updateMovement,
      fixed: shared.fixed, setFixed,
      priceOverrides: shared.priceOverrides, setProductPrice,
      notifications: shared.notifications, unreadCount, pushNotification, markAllRead,
      recipes: shared.recipes, saveRecipe, removeRecipe,
      weeks: shared.weeks, setMeal, kitchen: shared.kitchen, setKitchen, shopMissing,
      syncStatus, lastSync, uploadAvatarFor,
    }),
    [shared, currentUserId, currency, viewMode, syncStatus, lastSync],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { CATEGORIES };
