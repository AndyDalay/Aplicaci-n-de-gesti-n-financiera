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

export type Product = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  subcategory?: string;
  pricePerUnitCUP: number;
  monthlyQuantity: number;
  unit?: string;
};

const p = (
  id: string,
  name: string,
  emoji: string,
  category: string,
  subcategory: string,
  pricePerUnitCUP: number,
  monthlyQuantity: number,
): Product => ({ id, name, emoji, category, subcategory, pricePerUnitCUP, monthlyQuantity });

export const PRODUCTS: Product[] = [
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
};

export type ShoppingItem = {
  id: string;
  productId?: string;
  customName?: string;
  qtySuggested: number;
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
    return `$${v.toFixed(2)}`;
  }
  return `${Math.round(cup).toLocaleString("es-CU")} CUP`;
};

// ── Cocina ─────────────────────────────────────────────
export type MealSlot = "desayuno" | "almuerzo" | "comida";
export const MEAL_SLOTS: { id: MealSlot; label: string; emoji: string }[] = [
  { id: "desayuno", label: "Desayuno", emoji: "☕" },
  { id: "almuerzo", label: "Almuerzo", emoji: "🍛" },
  { id: "comida", label: "Comida", emoji: "🌙" },
];

export type RecipeIngredient = { productId?: string; name: string; qty: string };
export type RecipeScale = "rapido" | "saludable" | "elegante";
/** Where a recipe photo came from; `credit`/`link` are shown for stock photos (attribution). */
export type PhotoMeta = { source: "stock" | "ai" | "user"; credit?: string; link?: string };

export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  minutes?: number;
  description?: string;
  scale?: RecipeScale;
  ingredients: RecipeIngredient[];
  steps: string[];
  cookId?: string;
  imageUrl?: string;
  imageMeta?: PhotoMeta;
  createdAt: number;
};

export type PlannedMeal = { recipeId: string; cookId?: string };
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

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
/** Best-effort match of a free-text ingredient to a catalogue product. */
export const matchProduct = (name: string): Product | undefined => {
  const n = norm(name);
  return PRODUCTS.find((p) => norm(p.name) === n)
    ?? PRODUCTS.find((p) => n.includes(norm(p.name)) || norm(p.name).includes(n))
    ?? PRODUCTS.find((p) => norm(p.name).split(" ").some((w) => w.length > 3 && n.includes(w)));
};

export const DEFAULT_RECIPES: Recipe[] = [
  {
    id: "congri-cerdo", name: "Congrí con cerdo frito", emoji: "🍛", minutes: 60, scale: "rapido", createdAt: 0,
    ingredients: [{ productId: "carne-cerdo", name: "Carne de Cerdo", qty: "500 g" }, { name: "Frijoles negros", qty: "1 taza" }, { name: "Arroz", qty: "2 tazas" }],
    steps: ["Ablanda los frijoles y guarda el caldo.", "Sofríe ajo, cebolla y ají.", "Añade arroz, frijoles y caldo; cocina tapado.", "Fríe el cerdo en trozos con sal y comino."],
  },
  {
    id: "picadillo-arroz", name: "Picadillo a la criolla", emoji: "🥘", minutes: 30, scale: "rapido", createdAt: 0,
    ingredients: [{ productId: "picadillo", name: "Picadillo", qty: "1 paquete" }, { name: "Arroz", qty: "2 tazas" }, { name: "Puré de tomate", qty: "1/2 lata" }],
    steps: ["Sofríe ajo, cebolla y ají.", "Añade el picadillo y dora.", "Agrega tomate, comino y un chorro de vino seco.", "Sirve con arroz blanco."],
  },
];
