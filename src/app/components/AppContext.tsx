import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import {
  CATEGORIES,
  CookedEntry,
  Currency,
  DEFAULT_PEOPLE,
  FixedExpense,
  Movement,
  Person,
  PRODUCTS,
  ProductMeasure,
  ProductMeasureOverrides,
  ShoppingItem,
  StockItem,
  DEFAULT_RECIPES,
  matchProduct,
  PlannedMeal,
  Recipe,
  resolveWeek,
  movePlannedMeal,
  WeekPlan,
  suggestedExpiryDate,
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
  cooked: CookedEntry[];
  weeks: Record<string, WeekPlan>;
  kitchen: { breakfast: boolean };
  productMeasures: ProductMeasureOverrides;
  foodBudgetCUP: number;
  readyMealReferenceCUP: number;
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
  setStockDates: (productId: string, dates: { expiresAt?: number; openedAt?: number }) => void;
  recordPurchase: (productId: string, packs: number) => void;

  shopping: ShoppingItem[];
  addShopping: (item: Omit<ShoppingItem, "id" | "createdAt">) => void;
  removeShopping: (id: string) => void;
  updateShopping: (id: string, patch: Partial<ShoppingItem>) => void;
  addWeeklyShopping: (items: Array<Pick<ShoppingItem, "productId" | "customName" | "qtySuggested" | "amountSuggested" | "unitSuggested" | "priority" | "note">>) => number;

  movements: Movement[];
  addMovement: (m: Omit<Movement, "id" | "at">) => void;
  removeMovement: (id: string) => void;
  updateMovement: (id: string, patch: Partial<Movement>) => void;

  fixed: FixedExpense[];
  setFixed: (f: FixedExpense[]) => void;

  priceOverrides: Record<string, number>;
  setProductPrice: (productId: string, priceCUP: number) => void;
  productMeasures: ProductMeasureOverrides;
  setProductMeasure: (productId: string, measure: Omit<ProductMeasure, "measureConfirmed">) => void;

  notifications: SharedNotification[];
  unreadCount: number;
  pushNotification: (n: { title: string; body: string }) => void;
  markAllRead: () => void;

  recipes: Recipe[];
  cooked: CookedEntry[];
  saveRecipe: (r: Omit<Recipe, "id" | "createdAt"> & { id?: string }) => string;
  updateRecipeShortNames: (names: { id: string; shortName: string }[]) => void;
  removeRecipe: (id: string) => void;
  recordCooked: (entry: Omit<CookedEntry, "id" | "at"> & { id?: string }) => string;
  undoCooked: (id: string) => void;
  weeks: Record<string, WeekPlan>;
  setMeal: (week: string, slotKey: string, meal: PlannedMeal | null) => void;
  kitchen: { breakfast: boolean };
  setKitchen: (k: { breakfast: boolean }) => void;
  foodBudgetCUP: number;
  setFoodBudgetCUP: (amountCUP: number) => void;
  readyMealReferenceCUP: number;
  setReadyMealReferenceCUP: (amountCUP: number) => void;
  /** Adds every missing ingredient of a recipe to the shopping list; returns how many were added. */
  shopMissing: (recipeId: string) => number;
  syncStatus: "loading" | "online" | "offline";
  lastSync: number;
  uploadAvatarFor: (personId: string, file: File) => Promise<void>;
  movePlanned: (week: string, fromKey: string, toKey: string) => void;
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
  cooked: [],
  weeks: {},
  kitchen: { breakfast: false },
  productMeasures: {},
  foodBudgetCUP: 0,
  readyMealReferenceCUP: 0,
  notifications: [{ id: id(), title: "🏡 Casita lista", body: "Andy y Rachel ya pueden colaborar.", at: Date.now(), readBy: [] }],
});

const normalizeShared = (state: Partial<SharedState>): SharedState => ({
  people: state.people ?? DEFAULT_PEOPLE,
  defaultCurrency: state.defaultCurrency ?? "CUP",
  rate: state.rate ?? 520,
  stock: state.stock ?? defaultStock(),
  shopping: state.shopping ?? [],
  movements: state.movements ?? [],
  fixed: state.fixed ?? defaultFixed(),
  priceOverrides: state.priceOverrides ?? {},
  notifications: state.notifications ?? [],
  recipes: state.recipes ?? DEFAULT_RECIPES,
  cooked: state.cooked ?? [],
  weeks: state.weeks ?? {},
  kitchen: state.kitchen ?? { breakfast: false },
  productMeasures: state.productMeasures ?? {},
  foodBudgetCUP: state.foodBudgetCUP ?? 0,
  readyMealReferenceCUP: state.readyMealReferenceCUP ?? 0,
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
  const sharedRef = useRef(shared);
  const [syncStatus, setSyncStatus] = useState<"loading" | "online" | "offline">("loading");
  const [lastSync, setLastSync] = useState(0);
  const versionRef = useRef(0);
  const writeTimer = useRef<number | null>(null);
  const pendingMutations = useRef<Array<(s: SharedState) => SharedState>>([]);
  const writingRef = useRef(false);
  const flushRef = useRef<() => Promise<void>>(async () => {});
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
        const next = normalizeShared(res.state);
        sharedRef.current = next;
        setShared(next);
        next.notifications.forEach((n) => seenNotifIds.current.add(n.id));
        versionRef.current = res.version ?? 0;
        // Apply default currency on first load only
        const pref = localStorage.getItem("casita:currency");
        if (!pref) setCurrency(res.state.defaultCurrency ?? "CUP");
      } else {
        // Bootstrap server with defaults
        const seed = defaultShared();
        sharedRef.current = seed;
        setShared(seed);
        const written = await pushState({ state: seed });
        if (written.ok) versionRef.current = written.version;
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
        if (pendingMutations.current.length || writingRef.current) return;
        const res = await fetchState();
        if (cancelled || !res?.state) return;
        if (pendingMutations.current.length || writingRef.current) return;
        const next = normalizeShared(res.state);
        // fire OS notifications for new entries (ones we haven't seen yet)
        next.notifications.forEach((n) => {
          if (!seenNotifIds.current.has(n.id)) {
            seenNotifIds.current.add(n.id);
            // skip very old (more than 60s) on first sync to avoid spam
            if (Date.now() - n.at < 60_000) fireOSNotification(n.title, n.body);
          }
        });
        sharedRef.current = next;
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

  const mutate = (fn: (s: SharedState) => SharedState) => {
    pendingMutations.current.push(fn);
    const next = fn(sharedRef.current);
    sharedRef.current = next;
    setShared(next);
    if (!writingRef.current) {
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = window.setTimeout(() => { void flushRef.current(); }, 350);
    }
  };

  flushRef.current = async () => {
    if (writingRef.current || !pendingMutations.current.length) return;
    writingRef.current = true;
    let attempt = 0;
    try {
      while (pendingMutations.current.length && attempt < 3) {
        const sentCount = pendingMutations.current.length;
        const snapshot = sharedRef.current;
        const written = await pushState({ state: snapshot, baseVersion: versionRef.current });
        if (written.ok) {
          versionRef.current = written.version;
          pendingMutations.current.splice(0, sentCount);
          setSyncStatus("online");
          setLastSync(Date.now());
          continue;
        }
        if (written.status !== 409 || !written.state || typeof written.version !== "number") break;

        attempt += 1;
        console.info(`Sincronización: conflicto 409, reintentando (${attempt}/3) sobre versión ${written.version}.`);
        versionRef.current = written.version;
        const rebased = normalizeShared(written.state);
        const replayed = pendingMutations.current.reduce((state, mutation) => mutation(state), rebased);
        sharedRef.current = replayed;
        setShared(replayed);
        if (attempt < 3) await new Promise((resolve) => window.setTimeout(resolve, 300 * attempt));
      }
      if (pendingMutations.current.length) {
        setSyncStatus("offline");
        console.warn("Sincronización offline: se agotaron los reintentos; los cambios locales siguen pendientes.");
      }
    } finally {
      writingRef.current = false;
    }
  };

  useEffect(() => {
    const retry = () => {
      if (pendingMutations.current.length && !writingRef.current) void flushRef.current();
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  const setPeople = (p: Person[]) => mutate((s) => ({ ...s, people: p }));
  const setDefaultCurrency = (c: Currency) => mutate((s) => ({ ...s, defaultCurrency: c }));
  const setRate = (r: number) => mutate((s) => ({ ...s, rate: r }));
  const setStock = (st: Record<string, StockItem>) => mutate((s) => ({ ...s, stock: st }));
  const setFixed = (f: FixedExpense[]) => mutate((s) => ({ ...s, fixed: f }));

  const reconcileStockAndShopping = (base: SharedState, nextStock: Record<string, StockItem>, touched: Iterable<string>) => {
    let shopping = base.shopping;
    for (const productId of touched) {
      const it = nextStock[productId];
      if (!it) continue;
      const ratio = it.current / Math.max(1, it.max);
      const product = PRODUCTS.find((p) => p.id === productId);
      if (ratio <= 0.25) {
        const exists = shopping.some((i) => i.productId === productId && !i.bought);
        if (!exists && product) {
          const qty = it.current === 0 ? Math.ceil(product.monthlyQuantity) : Math.ceil(product.monthlyQuantity / 2);
          shopping = [
            { id: id(), productId, qtySuggested: qty, priority: it.current === 0 ? "alta" : "normal", createdAt: Date.now() },
            ...shopping,
          ];
        } else if (exists && product) {
          shopping = shopping.map((i) =>
            i.productId === productId && !i.bought
              ? {
                  ...i,
                  priority: it.current === 0 ? "alta" : "normal",
                  qtySuggested: it.current === 0 ? Math.ceil(product.monthlyQuantity) : Math.ceil(product.monthlyQuantity / 2),
                }
              : i,
          );
        }
      } else {
        shopping = shopping.filter((i) => !(i.productId === productId && !i.bought));
      }
    }
    return { ...base, stock: nextStock, shopping };
  };

  const updateStock = (productId: string, current: number) => mutate((s) => {
    const it = s.stock[productId];
    if (!it) return s;
    const clamped = Math.max(0, Math.min(it.max, current));
    const stock = { ...s.stock, [productId]: { ...it, current: clamped, ...(clamped < it.current && !it.openedAt ? { openedAt: Date.now() } : {}) } };
    return reconcileStockAndShopping(s, stock, [productId]);
  });

  const setStockDates = (productId: string, dates: { expiresAt?: number; openedAt?: number }) => mutate((s) => {
    const item = s.stock[productId];
    if (!item) return s;
    return { ...s, stock: { ...s.stock, [productId]: { ...item, ...dates } } };
  });

  const recordPurchase = (productId: string, packs: number) => mutate((s) => {
    const item = s.stock[productId];
    if (!item || !Number.isFinite(packs) || packs <= 0) return s;
    const suggested = suggestedExpiryDate(productId);
    const expiresAt = item.expiresAt !== undefined && suggested !== undefined ? Math.min(item.expiresAt, suggested) : item.expiresAt ?? suggested;
    const stock = { ...s.stock, [productId]: { ...item, current: Math.min(item.max, item.current + packs), expiresAt } };
    return reconcileStockAndShopping(s, stock, [productId]);
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

  const addWeeklyShopping: Ctx["addWeeklyShopping"] = (items) => {
    let changedCount = 0;
    mutate((s) => {
      changedCount = 0;
      let shopping = [...s.shopping];
      for (const item of items) {
        const matches = shopping.filter((candidate) => {
          if (candidate.bought) return false;
          if (item.productId) return candidate.productId === item.productId;
          const sameCustomName = !candidate.productId && (candidate.customName ?? "").trim().toLocaleLowerCase("es") === (item.customName ?? "").trim().toLocaleLowerCase("es");
          return sameCustomName && (!candidate.unitSuggested || candidate.unitSuggested === item.unitSuggested);
        });
        const existingTotal = matches.reduce((sum, candidate) => sum + candidate.qtySuggested, 0);
        const desired = Math.max(item.qtySuggested, existingTotal);
        if (!matches.length || matches.length > 1 || matches[0].qtySuggested < desired) changedCount += 1;
        if (matches.length) {
          const first = matches[0];
          shopping = shopping.filter((candidate) => candidate.id === first.id || !matches.some((match) => match.id === candidate.id));
          shopping = shopping.map((candidate) => candidate.id === first.id ? {
            ...candidate,
            ...item,
            qtySuggested: desired,
            note: [candidate.note, item.note].filter(Boolean).join(" · ") || undefined,
          } : candidate);
        } else {
          shopping = [{ ...item, id: id(), createdAt: Date.now() }, ...shopping];
        }
      }
      return changedCount ? { ...s, shopping } : s;
    });
    return changedCount;
  };

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

  const setProductMeasure = (productId: string, measure: Omit<ProductMeasure, "measureConfirmed">) =>
    mutate((s) => ({
      ...s,
      productMeasures: { ...s.productMeasures, [productId]: { ...measure, measureConfirmed: true } },
    }));

  const pushNotification: Ctx["pushNotification"] = (n) =>
    mutate((s) => ({
      ...s,
      notifications: [{ id: id(), title: n.title, body: n.body, at: Date.now(), readBy: [] }, ...s.notifications].slice(0, 50),
    }));

  useEffect(() => {
    if (syncStatus !== "online") return;
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getTime();
    const key = `casita:expiry-notified:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    let stored: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(parsed)) stored = parsed.filter((value): value is string => typeof value === "string");
    } catch {
      stored = [];
    }
    const notified = new Set<string>(stored);
    for (const item of Object.values(shared.stock)) {
      if (item.expiresAt === undefined || item.expiresAt < tomorrowStart || item.expiresAt >= tomorrowEnd || notified.has(item.productId)) continue;
      const product = PRODUCTS.find((entry) => entry.id === item.productId);
      if (!product) continue;
      pushNotification({ title: `⏳ ${product.name} vence mañana`, body: "Abre Cocina y usa lo que vence pronto en Ideas del chef." });
      notified.add(item.productId);
    }
    localStorage.setItem(key, JSON.stringify([...notified]));
  }, [syncStatus, shared.stock]);

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
  const updateRecipeShortNames: Ctx["updateRecipeShortNames"] = (names) => {
    const byRecipeId = new Map(names.map((entry) => [entry.id, entry.shortName.trim().split(/\s+/).slice(0, 8).join(" ")]));
    mutate((s) => ({
      ...s,
      recipes: s.recipes.map((recipe) => byRecipeId.has(recipe.id) ? { ...recipe, shortName: byRecipeId.get(recipe.id) } : recipe),
    }));
  };
  const removeRecipe = (rid: string) => mutate((s) => ({
    ...s,
    recipes: s.recipes.filter((r) => r.id !== rid),
    weeks: Object.fromEntries(Object.entries(s.weeks).map(([k, w]) => [k, Object.fromEntries(Object.entries(w).filter(([, m]) => m.recipeId !== rid))])),
  }));

  const recordCooked: Ctx["recordCooked"] = (entry) => {
    const cookedId = entry.id ?? id();
    mutate((s) => {
      const nextStock = { ...s.stock };
      const touched = new Set<string>();
      const used = (entry.used ?? []).filter((item) => item.productId && item.amount > 0 && !item.noDiscount);
      for (const item of used) {
        const current = nextStock[item.productId]?.current ?? 0;
        const nextCurrent = Math.max(0, current - item.packs);
        nextStock[item.productId] = { ...nextStock[item.productId], productId: item.productId, current: nextCurrent, max: nextStock[item.productId]?.max ?? current };
        touched.add(item.productId);
      }

      const now = Date.now();
      const cookedEntry: CookedEntry = { ...entry, id: cookedId, at: now, used: entry.used ?? [] };
      const nextWeeks = { ...s.weeks };
      const weekKeyValue = entry.week ?? weekKey(new Date());
      if (entry.slotKey) {
        const plan = { ...resolveWeek(nextWeeks, weekKeyValue).plan };
        plan[entry.slotKey] = { ...(plan[entry.slotKey] ?? { recipeId: entry.recipeId }), recipeId: entry.recipeId, cookId: entry.cookId, cookedId };
        nextWeeks[weekKeyValue] = plan;
      }

      const personName = s.people.find((p) => p.id === cookedEntry.cookId)?.name ?? currentUserId;
      return reconcileStockAndShopping(
        { ...s, cooked: [cookedEntry, ...s.cooked], weeks: nextWeeks, notifications: [{ id: id(), title: "✅ Cocinado", body: `${personName} cocinó ${cookedEntry.recipeName}`, at: now, readBy: [] }, ...s.notifications].slice(0, 50) },
        nextStock,
        touched,
      );
    });
    return cookedId;
  };

  const undoCooked = (cid: string) => mutate((s) => {
    const target = s.cooked.find((entry) => entry.id === cid);
    if (!target) return s;
    const nextStock = { ...s.stock };
    const touched = new Set<string>();
    for (const item of target.used) {
      if (!item.productId) continue;
      const current = nextStock[item.productId]?.current ?? 0;
      const nextCurrent = Math.max(0, current + item.packs);
      nextStock[item.productId] = { ...nextStock[item.productId], productId: item.productId, current: nextCurrent, max: nextStock[item.productId]?.max ?? current };
      touched.add(item.productId);
    }

    const nextWeeks = { ...s.weeks };
    if (target.week && target.slotKey) {
      const plan = { ...resolveWeek(nextWeeks, target.week).plan };
      if (plan[target.slotKey]) {
        const { cookedId, ...rest } = plan[target.slotKey];
        plan[target.slotKey] = { ...rest, recipeId: rest.recipeId ?? target.recipeId };
        nextWeeks[target.week] = plan;
      }
    }

    return reconcileStockAndShopping(
      {
        ...s,
        cooked: s.cooked.map((entry) => (entry.id === cid ? { ...entry, undone: true } : entry)),
        weeks: nextWeeks,
        notifications: [{ id: id(), title: "↩️ Deshecho", body: `${target.recipeName} quedó sin registrar en el inventario.`, at: Date.now(), readBy: [] }, ...s.notifications].slice(0, 50),
      },
      nextStock,
      touched,
    );
  });

  const setMeal: Ctx["setMeal"] = (week, slotKey, meal) => mutate((s) => {
    const base = { ...resolveWeek(s.weeks, week).plan };
    if (meal) base[slotKey] = meal; else delete base[slotKey];
    return { ...s, weeks: { ...s.weeks, [week]: base } };
  });
  const movePlanned: Ctx["movePlanned"] = (week, fromKey, toKey) => mutate((s) => {
    const weeks = movePlannedMeal(s.weeks, week, fromKey, toKey);
    return weeks === s.weeks ? s : { ...s, weeks };
  });
  const setKitchen = (k: { breakfast: boolean }) => mutate((s) => ({ ...s, kitchen: k }));
  const setFoodBudgetCUP = (amountCUP: number) => mutate((s) => ({ ...s, foodBudgetCUP: Number.isFinite(amountCUP) ? Math.max(0, amountCUP) : 0 }));
  const setReadyMealReferenceCUP = (amountCUP: number) => mutate((s) => ({ ...s, readyMealReferenceCUP: Number.isFinite(amountCUP) ? Math.max(0, amountCUP) : 0 }));

  const missingOf = (s: SharedState, r: Recipe) => r.ingredients.filter((i) => !i.productId || (s.stock[i.productId]?.current ?? 0) <= 0);
  const shopMissing = (rid: string) => {
    const current = sharedRef.current;
    const r = current.recipes.find((x) => x.id === rid);
    if (!r) return 0;
    const pending = new Set(current.shopping.filter((i) => !i.bought).map((i) => i.productId ?? i.customName?.toLowerCase()));
    const toAdd = missingOf(current, r).filter((i) => !pending.has(i.productId ?? i.name.toLowerCase()));
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
      stock: shared.stock, setStock, updateStock, setStockDates, recordPurchase,
      shopping: shared.shopping, addShopping, removeShopping, updateShopping, addWeeklyShopping,
      movements: shared.movements, addMovement, removeMovement, updateMovement,
      fixed: shared.fixed, setFixed,
      priceOverrides: shared.priceOverrides, setProductPrice,
      productMeasures: shared.productMeasures, setProductMeasure,
      notifications: shared.notifications, unreadCount, pushNotification, markAllRead,
      recipes: shared.recipes, cooked: shared.cooked, saveRecipe, updateRecipeShortNames, removeRecipe, recordCooked, undoCooked,
      weeks: shared.weeks, setMeal, movePlanned, kitchen: shared.kitchen, setKitchen, foodBudgetCUP: shared.foodBudgetCUP, setFoodBudgetCUP, readyMealReferenceCUP: shared.readyMealReferenceCUP, setReadyMealReferenceCUP, shopMissing,
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
