export type Currency = "CUP" | "USD";

export type Category = {
  id: string;
  name: string;
  emoji: string;
  color: string; // tailwind bg classes via CSS var
  hex: string;
  /** Line icon from the Figma "badges de categorias" set; falls back to emoji. */
  icon?: string;
};

export const CATEGORIES: Category[] = [
  { id: "bebidas", name: "Bebidas", emoji: "🥤", color: "bg-pastel-lavender", hex: "#B8A5E8", icon: "/assets/dc727.svg" },
  { id: "carnes", name: "Carnes", emoji: "🍖", color: "bg-pastel-coral", hex: "#FFB5A7", icon: "/assets/65fe8.svg" },
  { id: "vegetales", name: "Vegetales", emoji: "🥬", color: "bg-pastel-mint", hex: "#9DD9A6", icon: "/assets/7cb0a.svg" },
  { id: "viandas", name: "Viandas y Frutas", emoji: "🍌", color: "bg-pastel-yellow", hex: "#FFE19A", icon: "/assets/4a104.svg" },
  { id: "granos", name: "Granos y Pastas", emoji: "🍚", color: "bg-pastel-peach", hex: "#FFD3B6", icon: "/assets/03b4f.svg" },
  { id: "lacteos", name: "Lácteos y Huevos", emoji: "🥚", color: "bg-pastel-sky", hex: "#BDE0FE", icon: "/assets/12285.svg" },
  { id: "panaderia", name: "Panadería y Snacks", emoji: "🍪", color: "bg-pastel-pink", hex: "#FFC8DD", icon: "/assets/75507.svg" },
  { id: "condimentos", name: "Condimentos", emoji: "🧂", color: "bg-pastel-teal", hex: "#A8E6CF", icon: "/assets/dbcb9.svg" },
  { id: "higiene", name: "Higiene", emoji: "🧼", color: "bg-pastel-purple", hex: "#C9B8F0", icon: "/assets/3051a.svg" },
  { id: "otros", name: "Otros", emoji: "📦", color: "bg-cream", hex: "#FFF6E0" },
];

export type MeasureBase = "g" | "ml" | "u";
export type RecipeUnit = MeasureBase | "taza" | "cda" | "cdta";
export type ProductMeasure = { base: MeasureBase; pack: number; density?: number; measureConfirmed: boolean };
export type ProductMeasureOverrides = Record<string, Partial<ProductMeasure>>;

export type Product = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  subcategory?: string;
  pricePerUnitCUP: number;
  monthlyQuantity: number;
  unit?: string;
  base: MeasureBase;
  pack: number;
  density?: number;
  measureConfirmed: boolean;
};

type ProductCatalogItem = Omit<Product, "base" | "pack" | "density" | "measureConfirmed">;

const p = (
  id: string,
  name: string,
  emoji: string,
  category: string,
  subcategory: string,
  pricePerUnitCUP: number,
  monthlyQuantity: number,
): ProductCatalogItem => ({ id, name, emoji, category, subcategory, pricePerUnitCUP, monthlyQuantity });

const PRODUCT_CATALOG: ProductCatalogItem[] = [
  p("cafe", "Café", "☕", "bebidas", "Caliente", 2000, 2),
  p("te", "Té", "🍵", "bebidas", "Caliente", 50, 4),
  p("yogurt", "Yogurt", "🥛", "bebidas", "Frío", 500, 4),
  p("maltas", "Maltas", "🍺", "bebidas", "Frío", 350, 4),
  p("vino-seco", "Vino Seco", "🍷", "bebidas", "Cocina", 400, 1),
  p("leche-cond", "Leche Condensada", "🥫", "bebidas", "Cocina", 600, 2),
  p("leche-polvo", "Leche en Polvo", "🥛", "bebidas", "Cocina", 2000, 1),

  p("san-jacobo", "San Jacobo", "🥩", "carnes", "Embutidos", 2500, 1),
  p("caja-pollo", "Caja de Pollo", "🍗", "carnes", "Pollo", 14000, 1),
  p("hamburguesa", "Hamburguesa", "🍔", "carnes", "Procesados", 550, 2),
  p("picadillo", "Picadillo", "🥩", "carnes", "Procesados", 350, 2),
  p("carne-cerdo", "Carne de Cerdo", "🥓", "carnes", "Cerdo", 700, 6),
  p("lomo", "Lomo", "🥩", "carnes", "Cerdo", 1300, 1),
  p("perrito", "Perrito", "🌭", "carnes", "Embutidos", 550, 2),
  p("jamon", "Jamón", "🍖", "carnes", "Embutidos", 2500, 2),

  p("pepino", "Pepino", "🥒", "vegetales", "Frescos", 400, 4),
  p("lechuga", "Lechuga", "🥬", "vegetales", "Hojas", 180, 4),
  p("cebolla", "Cebolla", "🧅", "vegetales", "Aliáceos", 350, 2),
  p("ajo", "Ajo", "🧄", "vegetales", "Aliáceos", 250, 2),
  p("aji", "Ají Pimiento", "🌶️", "vegetales", "Frescos", 150, 2),
  p("tomates", "Tomates", "🍅", "vegetales", "Frescos", 350, 2),
  p("col", "Col", "🥬", "vegetales", "Hojas", 250, 1),

  p("boniato", "Boniato", "🍠", "viandas", "Viandas", 400, 4),
  p("yuca", "Yuca", "🥔", "viandas", "Viandas", 70, 4),
  p("plat-fruta", "Plátanos Frutas", "🍌", "viandas", "Frutas", 100, 6),
  p("plat-vianda", "Plátanos Vianda", "🍌", "viandas", "Viandas", 250, 1),
  p("pina", "Piña", "🍍", "viandas", "Frutas", 250, 1),

  p("arroz", "Arroz", "🍚", "granos", "Cereales", 700, 6),
  p("frijoles-n", "Frijoles Negros", "🫘", "granos", "Frijoles", 800, 1),
  p("spaguetti", "Spaguetti", "🍝", "granos", "Pastas", 350, 2),
  p("coditos", "Coditos", "🍝", "granos", "Pastas", 350, 1),

  p("queso", "Queso", "🧀", "lacteos", "Lácteos", 1850, 2),
  p("huevos", "Huevos", "🥚", "lacteos", "Huevos", 3000, 1),
  p("helado", "Helado", "🍦", "lacteos", "Postres", 1300, 4),

  p("galletas-m", "Galletas María", "🍪", "panaderia", "Dulces", 400, 2),
  p("galletas-s", "Galletas Saladas", "🍘", "panaderia", "Saladas", 170, 2),
  p("papas", "Papas Prefritas", "🍟", "panaderia", "Saladas", 2800, 1),
  p("bolsa-pan", "Bolsa de Panes", "🥖", "panaderia", "Pan", 250, 8),
  p("mermelada", "Mermelada", "🍓", "panaderia", "Dulces", 750, 1),

  p("sal", "Sal", "🧂", "condimentos", "Especias", 300, 0.3),
  p("sazon", "Sazón", "🌿", "condimentos", "Especias", 60, 4),
  p("vinagre", "Vinagre", "🍶", "condimentos", "Líquidos", 400, 1),
  p("aceite", "Aceite", "🫒", "condimentos", "Líquidos", 1300, 2),
  p("azucar", "Azúcar", "🍬", "condimentos", "Dulces", 620, 4),

  p("jabone", "Jabone", "🧼", "higiene", "Aseo", 180, 4),
  p("pasta-d", "Pasta Dental", "🪥", "higiene", "Aseo", 1200, 1),
  p("papel-s", "Papel Sanitario", "🧻", "higiene", "Aseo", 270, 4),

  p("carbon", "Carbón", "🪵", "otros", "Cocina", 2000, 1),
];

export const PRODUCT_MEASURES: Record<string, Omit<ProductMeasure, "measureConfirmed">> = {
  cafe: { base: "g", pack: 250, density: 200 }, te: { base: "g", pack: 50 }, yogurt: { base: "ml", pack: 1000 },
  maltas: { base: "ml", pack: 355 }, "vino-seco": { base: "ml", pack: 750 }, "leche-cond": { base: "g", pack: 395 }, "leche-polvo": { base: "g", pack: 400 },
  "san-jacobo": { base: "g", pack: 500 }, "caja-pollo": { base: "g", pack: 5000 }, hamburguesa: { base: "g", pack: 100 }, picadillo: { base: "g", pack: 500 }, "carne-cerdo": { base: "g", pack: 1000 }, lomo: { base: "g", pack: 1000 }, perrito: { base: "u", pack: 1 }, jamon: { base: "g", pack: 250 },
  pepino: { base: "u", pack: 1 }, lechuga: { base: "u", pack: 1 }, cebolla: { base: "g", pack: 500 }, ajo: { base: "g", pack: 100 }, aji: { base: "u", pack: 1 }, tomates: { base: "g", pack: 500 }, col: { base: "u", pack: 1 },
  boniato: { base: "g", pack: 1000 }, yuca: { base: "g", pack: 1000 }, "plat-fruta": { base: "u", pack: 1 }, "plat-vianda": { base: "u", pack: 1 }, pina: { base: "u", pack: 1 },
  arroz: { base: "g", pack: 1000, density: 200 }, "frijoles-n": { base: "g", pack: 500, density: 190 }, spaguetti: { base: "g", pack: 500 }, coditos: { base: "g", pack: 500 },
  queso: { base: "g", pack: 250 }, huevos: { base: "u", pack: 30 }, helado: { base: "ml", pack: 1000 },
  "galletas-m": { base: "g", pack: 200 }, "galletas-s": { base: "g", pack: 150 }, papas: { base: "g", pack: 1000 }, "bolsa-pan": { base: "u", pack: 8 }, mermelada: { base: "g", pack: 250 },
  sal: { base: "g", pack: 500 }, sazon: { base: "g", pack: 50 }, vinagre: { base: "ml", pack: 500 }, aceite: { base: "ml", pack: 1000 }, azucar: { base: "g", pack: 1000, density: 200 },
  jabone: { base: "u", pack: 1 }, "pasta-d": { base: "ml", pack: 100 }, "papel-s": { base: "u", pack: 4 }, carbon: { base: "g", pack: 3000 },
};

export const PRODUCTS: Product[] = PRODUCT_CATALOG.map((product) => ({
  ...product,
  ...(PRODUCT_MEASURES[product.id] ?? { base: "u" as const, pack: 1 }),
  measureConfirmed: false,
}));

export function resolveProductMeasure(product: Product, overrides: ProductMeasureOverrides = {}): Product {
  return { ...product, ...overrides[product.id] };
}

export function amountOf(stockItem: StockItem, product: Product): number {
  return packsToAmount(stockItem.current, product);
}

export function packsToAmount(packs: number, product: Product): number {
  return Math.max(0, packs) * product.pack;
}

export function amountToPacks(amount: number, product: Product): number {
  return product.pack > 0 ? Math.max(0, amount) / product.pack : 0;
}

export function formatAmount(amount: number, base: MeasureBase): string {
  const safeAmount = Math.max(0, amount);
  const number = (value: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value);
  if (base === "g" && safeAmount >= 1000) return `${number(safeAmount / 1000)} kg`;
  if (base === "ml" && safeAmount >= 1000) return `${number(safeAmount / 1000)} l`;
  return `${number(safeAmount)} ${base}`;
}

export function parseQty(text: string): { amount: number; unit: RecipeUnit } | null {
  const clean = text.trim().toLocaleLowerCase("es").replace(/,/g, ".");
  const match = clean.match(/^\s*(?:(\d+\s*\/\s*\d+)|(\d+(?:\.\d+)?)|un|una|uno|dos|tres|media|medio)\s*([^\d\s]+)?/u);
  if (!match) return null;
  const token = (match[1] ?? match[2] ?? match[0]).replace(/\s/g, "");
  const amount = match[1]
    ? Number(match[1].replace(/\s/g, "").split("/")[0]) / Number(match[1].replace(/\s/g, "").split("/")[1])
    : ({ un: 1, una: 1, uno: 1, dos: 2, tres: 3, media: 0.5, medio: 0.5 } as Record<string, number>)[token] ?? Number(token);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const label = (match[3] ?? "").replace(/\.$/, "").trim();
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(label)) return { amount: amount * 1000, unit: "g" };
  if (["g", "gr", "gramo", "gramos"].includes(label)) return { amount, unit: "g" };
  if (["lb", "lbs", "libra", "libras"].includes(label)) return { amount: amount * 453.6, unit: "g" };
  if (["ml", "mililitro", "mililitros"].includes(label)) return { amount, unit: "ml" };
  if (["l", "litro", "litros"].includes(label)) return { amount: amount * 1000, unit: "ml" };
  if (["taza", "tazas"].includes(label)) return { amount, unit: "taza" };
  if (["cda", "cdas", "cucharada", "cucharadas"].includes(label)) return { amount, unit: "cda" };
  if (["cdta", "cdtas", "cucharadita", "cucharaditas"].includes(label)) return { amount, unit: "cdta" };
  if (["u", "unidad", "unidades", "und", "paquete", "paquetes", "lata", "latas", "carton", "cartones", "diente", "dientes"].includes(label)) return { amount, unit: "u" };
  return null;
}

export function toBase(ingredient: RecipeIngredient, product: Product): { amount: number; base: MeasureBase } | null {
  const parsed = ingredient.amount !== undefined && ingredient.unit
    ? { amount: ingredient.amount, unit: ingredient.unit }
    : parseQty(ingredient.qty);
  if (!parsed || !Number.isFinite(parsed.amount) || parsed.amount < 0) return null;
  if (parsed.unit === product.base) return { amount: parsed.amount, base: product.base };
  if (product.base === "g" && parsed.unit === "taza" && product.density) return { amount: parsed.amount * product.density, base: "g" };
  if (product.base === "ml") {
    if (parsed.unit === "taza") return { amount: parsed.amount * 240, base: "ml" };
    if (parsed.unit === "cda") return { amount: parsed.amount * 15, base: "ml" };
    if (parsed.unit === "cdta") return { amount: parsed.amount * 5, base: "ml" };
  }
  if (product.base === "g" && product.density) {
    if (parsed.unit === "cda") return { amount: parsed.amount * product.density / 16, base: "g" };
    if (parsed.unit === "cdta") return { amount: parsed.amount * product.density / 48, base: "g" };
  }
  return null;
}

export type Person = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  salaryUSD: number;
  avatar?: string;
};

export const DEFAULT_PEOPLE: Person[] = [
  { id: "andy", name: "Andy", emoji: "👨", color: "#BDE0FE", salaryUSD: 736 },
  { id: "rachel", name: "Rachel", emoji: "👩", color: "#FFC8DD", salaryUSD: 300 },
];

export type StockItem = {
  productId: string;
  current: number;   // 0..max
  max: number;       // monthlyQuantity
  expiresAt?: number;
  openedAt?: number;
};

export function suggestedExpiryDays(productId: string): number | null {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return null;
  if (["carne-cerdo", "caja-pollo", "lomo", "san-jacobo"].includes(productId)) return 3;
  if (product.category === "vegetales") return 5;
  if (product.category === "lacteos" || ["yogurt", "leche-cond", "leche-polvo"].includes(productId)) return 7;
  if (product.category === "viandas") return 10;
  return null;
}

export function suggestedExpiryDate(productId: string, now = Date.now()): number | undefined {
  const days = suggestedExpiryDays(productId);
  if (days === null) return undefined;
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

export function expiringProductIds(stock: Record<string, StockItem>, withinDays = 4, now = Date.now()): string[] {
  const end = now + withinDays * 24 * 60 * 60 * 1000;
  return Object.values(stock).filter((item) => item.current > 0 && item.expiresAt !== undefined && item.expiresAt <= end).map((item) => item.productId);
}

export type ShoppingItem = {
  id: string;
  productId?: string;
  customName?: string;
  qtySuggested: number;
  amountSuggested?: number;
  unitSuggested?: string;
  priority: "alta" | "normal";
  assignedTo?: string;
  note?: string;
  createdBy?: string;
  createdAt: number;
  bought?: boolean;
};

export type Movement = {
  id: string;
  type: "gasto-variable" | "gasto-fijo" | "imprevisto" | "ingreso";
  productId?: string;
  name: string;
  category?: string;
  amountCUP: number;
  qty?: number;
  note?: string;
  by?: string;
  at: number;
};

export type FixedExpense = {
  id: string;
  name: string;
  category: string;
  amountCUP: number;
  dayOfMonth: number;
  time: string; // "HH:mm"
  repeat: boolean;
  assignedTo?: string;
};

export const getCategory = (id?: string) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const getProductPrice = (productId: string, overrides: Record<string, number> = {}): number => {
  if (overrides[productId] !== undefined) return overrides[productId];
  return PRODUCTS.find((p) => p.id === productId)?.pricePerUnitCUP ?? 0;
};

export const formatMoney = (cup: number, currency: Currency, rate: number) => {
  if (currency === "USD") {
    const v = cup / rate;
    return `$${new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
  }
  return `${new Intl.NumberFormat("es-ES").format(Math.round(cup))} CUP`;
};

export type RecipeCost = { total: number; perServing: number; unknownCount: number };

export function costOfRecipe(
  recipe: Pick<Recipe, "ingredients">,
  servings = 1,
  prices: Record<string, number> = {},
  measures: ProductMeasureOverrides = {},
): RecipeCost {
  let total = 0;
  let unknownCount = 0;
  for (const ingredient of recipe.ingredients) {
    const normalizeName = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const product = PRODUCTS.find((item) => item.id === ingredient.productId)
      ?? PRODUCTS.find((item) => normalizeName(item.name) === normalizeName(ingredient.name));
    if (!product) {
      unknownCount += 1;
      continue;
    }
    const measure = resolveProductMeasure(product, measures);
    const price = getProductPrice(product.id, prices);
    const explicitPack = ingredient.amount === undefined && /\b(paquete|paquetes|pack|lata|latas|cart[oó]n|cartones)\b/i.test(ingredient.qty);
    const parsed = parseQty(ingredient.qty);
    if (explicitPack && parsed && Number.isFinite(price) && price > 0) {
      total += parsed.amount * price;
      continue;
    }
    const converted = toBase(ingredient, measure);
    if (!converted || !Number.isFinite(price) || price <= 0 || !Number.isFinite(measure.pack) || measure.pack <= 0) {
      unknownCount += 1;
      continue;
    }
    total += (converted.amount / measure.pack) * price;
  }
  const safeServings = Number.isFinite(servings) && servings > 0 ? servings : 1;
  return { total, perServing: total / safeServings, unknownCount };
}

// ── Cocina ─────────────────────────────────────────────
export type MealSlot = "desayuno" | "almuerzo" | "comida";
export const MEAL_SLOTS: { id: MealSlot; label: string; emoji: string }[] = [
  { id: "desayuno", label: "Desayuno", emoji: "☕" },
  { id: "almuerzo", label: "Almuerzo", emoji: "🍛" },
  { id: "comida", label: "Comida", emoji: "🌙" },
];

export type RecipeIngredient = { productId?: string; name: string; qty: string; amount?: number; unit?: RecipeUnit; note?: string };
export type RecipeScale = "rapido" | "saludable" | "elegante";
/** Where a recipe photo came from; `credit`/`link` are shown for stock photos (attribution). */
export type PhotoMeta = { source: "stock" | "ai" | "user"; credit?: string; link?: string };

export type Recipe = {
  id: string;
  name: string;
  shortName?: string;
  emoji: string;
  minutes?: number;
  servings?: number;
  description?: string;
  scale?: RecipeScale;
  ingredients: RecipeIngredient[];
  steps: string[];
  cookId?: string;
  imageUrl?: string;
  imageMeta?: PhotoMeta;
  createdAt: number;
};

export type CookedUsedItem = { productId: string; amount: number; base: MeasureBase; packs: number; name?: string; noDiscount?: boolean };
export type CookedEntry = {
  id: string;
  recipeId: string;
  recipeName: string;
  at: number;
  week?: string;
  slotKey?: string;
  servings: number;
  cookId?: string;
  photoUrl?: string;
  used: CookedUsedItem[];
  rating?: Record<string, 1 | 2 | 3>;
  note?: string;
  undone?: boolean;
};

export type PlannedMeal = { recipeId: string; cookId?: string; cookedId?: string; sideIds?: string[]; servings?: number };
export type ShoppingReviewNeed = {
  key: string;
  productId?: string;
  customName?: string;
  category: string;
  amountNeeded: number;
  unit: string;
  packsSuggested: number;
  pendingPacks: number;
  costCUP?: number;
  dishes: string[];
  approximate: boolean;
  unknown: boolean;
};

export function calculateShoppingReview(
  weeks: Record<string, WeekPlan>,
  weekKeys: string[],
  recipes: Recipe[],
  cooked: CookedEntry[],
  stock: Record<string, StockItem>,
  measures: ProductMeasureOverrides = {},
  prices: Record<string, number> = {},
  pendingShopping: ShoppingItem[] = [],
): ShoppingReviewNeed[] {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const cookedSlots = new Set(cooked.filter((entry) => !entry.undone && entry.week && entry.slotKey).map((entry) => `${entry.week}:${entry.slotKey}`));
  const grouped = new Map<string, { productId?: string; customName?: string; category: string; amount: number; unit: string; dishes: Set<string>; approximate: boolean; unknown: boolean }>();
  for (const week of weekKeys) {
    const { plan } = resolveWeek(weeks, week);
    for (const [slotKey, meal] of Object.entries(plan)) {
      if (meal.cookedId || cookedSlots.has(`${week}:${slotKey}`)) continue;
      const mealRecipes = [meal.recipeId, ...(meal.sideIds ?? [])].map((id) => recipeById.get(id)).filter((recipe): recipe is Recipe => Boolean(recipe));
      for (const recipe of mealRecipes) {
        const sourceServings = recipe.servings ?? 1;
        const scale = meal.servings && sourceServings > 0 ? meal.servings / sourceServings : 1;
        const dishName = recipe.shortName ?? recipe.name;
        for (const ingredient of recipe.ingredients) {
          const product = ingredient.productId ? PRODUCTS.find((item) => item.id === ingredient.productId) : undefined;
          const converted = product ? toBase({ ...ingredient, amount: ingredient.amount === undefined ? undefined : ingredient.amount * scale }, resolveProductMeasure(product, measures)) : null;
          if (product && converted) {
            const measure = resolveProductMeasure(product, measures);
            const key = `product:${product.id}`;
            const current = grouped.get(key) ?? { productId: product.id, category: product.category, amount: 0, unit: measure.base, dishes: new Set<string>(), approximate: !measure.measureConfirmed, unknown: false };
            current.amount += converted.amount * (ingredient.amount === undefined ? scale : 1);
            current.dishes.add(dishName);
            current.approximate ||= !measure.measureConfirmed;
            grouped.set(key, current);
            continue;
          }

          const parsed = ingredient.amount !== undefined && ingredient.unit
            ? { amount: ingredient.amount * scale, unit: ingredient.unit }
            : parseQty(ingredient.qty);
          const customName = ingredient.name.trim() || "Ingrediente sin nombre";
          const unit = parsed?.unit ?? "sin conversión";
          const amount = parsed ? parsed.amount * (ingredient.amount !== undefined ? 1 : scale) : 0;
          const key = `custom:${customName.toLocaleLowerCase("es")}:${unit}`;
          const current = grouped.get(key) ?? { customName, category: "otros", amount: 0, unit, dishes: new Set<string>(), approximate: true, unknown: true };
          current.amount += amount;
          current.dishes.add(dishName);
          grouped.set(key, current);
        }
      }
    }
  }

  const pendingByKey = new Map<string, number>();
  const pendingCustomByName = new Map<string, number>();
  for (const item of pendingShopping.filter((entry) => !entry.bought)) {
    const key = item.productId ? `product:${item.productId}` : `custom:${(item.customName ?? "").toLocaleLowerCase("es")}:${item.unitSuggested ?? "sin conversión"}`;
    pendingByKey.set(key, (pendingByKey.get(key) ?? 0) + item.qtySuggested);
    if (!item.productId && !item.unitSuggested) {
      const nameKey = (item.customName ?? "").trim().toLocaleLowerCase("es");
      pendingCustomByName.set(nameKey, (pendingCustomByName.get(nameKey) ?? 0) + item.qtySuggested);
    }
  }

  return [...grouped.entries()].map(([key, item]) => {
    const product = item.productId ? PRODUCTS.find((entry) => entry.id === item.productId) : undefined;
    if (!product) {
      const pendingPacks = pendingByKey.get(key) ?? pendingCustomByName.get((item.customName ?? "").trim().toLocaleLowerCase("es")) ?? 0;
      return { key, customName: item.customName, category: item.category, amountNeeded: item.amount, unit: item.unit, packsSuggested: item.amount || 1, pendingPacks, dishes: [...item.dishes], approximate: item.approximate, unknown: true };
    }
    const measure = resolveProductMeasure(product, measures);
    const stockAmount = (stock[product.id]?.current ?? 0) * measure.pack;
    const remaining = Math.max(0, item.amount - stockAmount);
    const halfPackAllowed = measure.measureConfirmed && measure.base !== "u";
    const increment = halfPackAllowed ? 0.5 : 1;
    const rawPacks = remaining / measure.pack;
    const packsSuggested = Math.ceil(rawPacks / increment) * increment;
    const unitPrice = getProductPrice(product.id, prices);
    const unknown = item.unknown || !Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(measure.pack) || measure.pack <= 0;
    return {
      key,
      productId: product.id,
      category: item.category,
      amountNeeded: item.amount,
      unit: measure.base,
      packsSuggested,
      pendingPacks: pendingByKey.get(key) ?? 0,
      ...(unknown ? {} : { costCUP: packsSuggested * unitPrice }),
      dishes: [...item.dishes],
      approximate: item.approximate || !measure.measureConfirmed,
      unknown,
    };
  }).filter((need) => need.packsSuggested > 0 || need.pendingPacks > 0);
}
/** key: `${dayIndex 0-6}:${slot}` */
export type WeekPlan = Record<string, PlannedMeal>;

/** Monday of the week containing `d`, as YYYY-MM-DD (local). */
export const weekKey = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const parseWeekKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
export const shiftWeek = (k: string, n: number) => { const d = parseWeekKey(k); d.setDate(d.getDate() + n * 7); return weekKey(d); };

/** Plan for a week: explicit if stored, otherwise repeats the closest earlier week. */
export const resolveWeek = (weeks: Record<string, WeekPlan>, k: string): { plan: WeekPlan; inherited: boolean } => {
  if (weeks[k]) return { plan: weeks[k], inherited: false };
  const prev = Object.keys(weeks).filter((w) => w < k).sort().pop();
  return { plan: prev ? weeks[prev] : {}, inherited: true };
};

export function movePlannedMeal(weeks: Record<string, WeekPlan>, week: string, fromKey: string, toKey: string): Record<string, WeekPlan> {
  if (fromKey === toKey) return weeks;
  const plan = { ...resolveWeek(weeks, week).plan };
  const source = plan[fromKey];
  if (!source) return weeks;
  const destination = plan[toKey];
  plan[toKey] = source;
  if (destination) plan[fromKey] = destination;
  else delete plan[fromKey];
  return { ...weeks, [week]: plan };
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
export function displayName(recipe: Pick<Recipe, "name" | "shortName">): string {
  const preferred = recipe.shortName?.trim();
  if (preferred) return preferred.split(/\s+/).slice(0, 8).join(" ");
  const words = recipe.name.trim().split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const concise = words.filter((word) => {
    const normalized = norm(word.replace(/[.,;:!?]+$/g, ""));
    if (["a", "la", "el", "de", "del", "con", "y"].includes(normalized)) {
      if (seen.has(normalized)) return false;
      seen.add(normalized);
    }
    return true;
  });
  return concise.slice(0, 8).join(" ");
}
/** Best-effort match of a free-text ingredient to a catalogue product. */
export const matchProduct = (name: string): Product | undefined => {
  const n = norm(name);
  return PRODUCTS.find((p) => norm(p.name) === n)
    ?? PRODUCTS.find((p) => n.includes(norm(p.name)) || norm(p.name).includes(n))
    ?? PRODUCTS.find((p) => norm(p.name).split(" ").some((w) => w.length > 3 && n.includes(w)));
};

export const DEFAULT_RECIPES: Recipe[] = [
  {
    id: "congri-cerdo", name: "Congrí con cerdo frito", emoji: "🍛", minutes: 60, servings: 2, scale: "rapido", createdAt: 0,
    ingredients: [{ productId: "carne-cerdo", name: "Carne de Cerdo", qty: "500 g" }, { name: "Frijoles negros", qty: "1 taza" }, { name: "Arroz", qty: "2 tazas" }],
    steps: ["Ablanda los frijoles y guarda el caldo.", "Sofríe ajo, cebolla y ají.", "Añade arroz, frijoles y caldo; cocina tapado.", "Fríe el cerdo en trozos con sal y comino."],
  },
  {
    id: "picadillo-arroz", name: "Picadillo a la criolla", emoji: "🥘", minutes: 30, servings: 2, scale: "rapido", createdAt: 0,
    ingredients: [{ productId: "picadillo", name: "Picadillo", qty: "1 paquete" }, { name: "Arroz", qty: "2 tazas" }, { name: "Puré de tomate", qty: "1/2 lata" }],
    steps: ["Sofríe ajo, cebolla y ají.", "Añade el picadillo y dora.", "Agrega tomate, comino y un chorro de vino seco.", "Sirve con arroz blanco."],
  },
];
