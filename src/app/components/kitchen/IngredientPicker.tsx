import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORIES, Category, PRODUCTS } from "../data";
import { StockMeter } from "../StockMeter";
import { Checkbox } from "../ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Switch } from "../ui/switch";
import { useApp } from "../AppContext";
import { SG_BOLD } from "./kit";

type IngredientPickerProps = {
  open: boolean;
  selected: string[];
  onlyAvailable: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (productIds: string[], onlyAvailable: boolean) => void;
};

export function IngredientPicker({ open, selected, onlyAvailable: initialOnlyAvailable, onOpenChange, onDone }: IngredientPickerProps) {
  const { stock } = useApp();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(initialOnlyAvailable);
  const [draft, setDraft] = useState<string[]>(selected);

  const products = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return PRODUCTS.filter((product) => {
      const inCategory = !categoryId || product.category === categoryId;
      const inStock = !onlyAvailable || (stock[product.id]?.current ?? 0) > 0;
      const matches = !normalized || product.name.toLocaleLowerCase("es").includes(normalized);
      return inCategory && inStock && matches;
    });
  }, [categoryId, onlyAvailable, query, stock]);

  const toggleProduct = (productId: string) => {
    setDraft((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  };

  const finish = () => {
    onDone(draft.filter((id) => PRODUCTS.some((product) => product.id === id)), onlyAvailable);
    onOpenChange(false);
  };

  const close = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(selected);
      setOnlyAvailable(initialOnlyAvailable);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Drawer open={open} onOpenChange={close}>
      <DrawerContent className="max-h-[92dvh] rounded-t-[24px] border-ink bg-app-bg">
        <DrawerHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle className={`${SG_BOLD} text-xl text-ink`}>Elige ingredientes</DrawerTitle>
              <DrawerDescription className="font-['Nunito:Regular'] text-xs text-ink/60">Selecciona lo que quieres incluir en las ideas.</DrawerDescription>
            </div>
            <button type="button" aria-label="Cerrar selector" onClick={() => close(false)} className="grid size-10 shrink-0 place-items-center rounded-full border border-ink/20 bg-white text-ink">
              <X size={18} />
            </button>
          </div>
        </DrawerHeader>

        <div className="space-y-3 overflow-y-auto px-4 pb-3">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-ink/20 bg-white px-3">
            <Search size={17} className="text-ink/50" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ingrediente" aria-label="Buscar ingrediente" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/40" />
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por categoría">
            <button type="button" onClick={() => setCategoryId(null)} aria-pressed={!categoryId} className={`h-10 shrink-0 rounded-full border px-3 text-xs font-bold ${!categoryId ? "border-ink bg-pastel-yellow" : "border-ink/20 bg-white"}`}>Todo</button>
            {CATEGORIES.filter((category) => PRODUCTS.some((product) => product.category === category.id)).map((category: Category) => (
              <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} aria-pressed={categoryId === category.id} className={`h-10 shrink-0 rounded-full border px-3 text-xs font-bold ${categoryId === category.id ? "border-ink bg-pastel-yellow" : "border-ink/20 bg-white"}`}>
                {category.icon ? <img src={category.icon} alt="" aria-hidden="true" className="mr-1 inline size-4 object-contain" /> : <span className="mr-1" aria-hidden="true">{category.emoji}</span>}{category.name}
              </button>
            ))}
          </div>

          <label className="flex min-h-11 items-center justify-between rounded-xl bg-white px-3">
            <span className="font-['Nunito:Bold'] text-sm text-ink">Solo lo que hay en casa</span>
            <Switch checked={onlyAvailable} onCheckedChange={setOnlyAvailable} aria-label="Solo lo que hay en casa" className="h-10 w-14 data-[state=checked]:bg-pastel-mint" />
          </label>

          {products.length ? (
            <ul className="divide-y divide-ink/10 rounded-xl bg-white px-3">
              {products.map((product) => {
                const item = stock[product.id] ?? { current: 0, max: product.monthlyQuantity };
                const checked = draft.includes(product.id);
                return (
                  <li key={product.id}>
                    <label className="flex min-h-[64px] cursor-pointer items-center gap-3 py-2">
                      <Checkbox checked={checked} onCheckedChange={() => toggleProduct(product.id)} aria-label={`Seleccionar ${product.name}`} className="size-5" />
                      <span className="text-xl" aria-hidden="true">{product.emoji}</span>
                      <span className="min-w-0 flex-1 truncate font-['Nunito:Bold'] text-sm text-ink">{product.name}</span>
                      <span className="w-20 shrink-0"><StockMeter current={item.current} max={item.max} size="sm" /></span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl bg-white p-5 text-center font-['Nunito:Regular'] text-sm text-ink/60">No hay ingredientes que coincidan con esos filtros.</p>
          )}
        </div>

        <DrawerFooter className="border-t border-ink/10 bg-app-bg pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={finish} className="min-h-12 w-full rounded-full border-[1.5px] border-ink bg-pastel-mint px-4 font-['Nunito:Bold'] text-sm font-bold text-ink shadow-[2px_3px_0_0_rgba(0,0,0,0.2)]">
            Listo ({draft.length})
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}