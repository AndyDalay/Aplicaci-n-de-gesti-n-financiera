export type Tab = "compras" | "inventario" | "cocina" | "admin" | "config";

const assetPathPrefix = "/assets";

type NavItem = {
  id: Tab;
  label: string;
  active: string;
  /** Line-duotone glyph plus the Figma group insets that keep its stroke from clipping. */
  idle: { src: string; inset: string; bleed: string };
};

export const NAV_ITEMS: NavItem[] = [
  { id: "compras", label: "Compras", active: `${assetPathPrefix}/f6e73.svg`, idle: { src: `${assetPathPrefix}/d074e.svg`, inset: "inset-[12.49%_12.4%_12.51%_12.41%]", bleed: "inset-[-4.17%_-4.16%_-4.17%_-4.15%]" } },
  { id: "inventario", label: "Inventario", active: `${assetPathPrefix}/2c7ea.svg`, idle: { src: `${assetPathPrefix}/195e8.svg`, inset: "inset-[8.33%]", bleed: "inset-[-3.75%]" } },
  { id: "cocina", label: "Cocina", active: `${assetPathPrefix}/chef-bold.svg`, idle: { src: `${assetPathPrefix}/chef-line.svg`, inset: "inset-0", bleed: "inset-0" } },
  { id: "admin", label: "Administración", active: `${assetPathPrefix}/225df.svg`, idle: { src: `${assetPathPrefix}/9f024.svg`, inset: "inset-[10.04%_10.04%_8.33%_8.34%]", bleed: "inset-[-3.83%_-3.83%_-3.82%_-3.83%]" } },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const index = NAV_ITEMS.findIndex((i) => i.id === active);
  return (
    <nav className="sticky bottom-0 z-30 flex flex-col items-center px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#ffe8ce] via-[#ffe8ce] via-50% to-[rgba(255,232,206,0)]">
      <div className="relative flex items-center gap-2 p-2 bg-amber border-2 border-[#262626] rounded-full raised-amber overflow-clip">
        <span
          className="absolute top-[7px] left-[7px] size-14 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(.5,1.5,.5,1)]"
          style={{ transform: `translateX(${index * 64}px)` }}
          aria-hidden
        />
        {NAV_ITEMS.map((it) => {
          const isActive = it.id === active;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              aria-label={it.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex items-center justify-center p-4 rounded-full active:scale-90 transition-transform"
            >
              <span className="relative block size-6">
                {isActive ? (
                  <img src={it.active} alt="" className="absolute inset-0 block size-full" />
                ) : (
                  <span className={`absolute ${it.idle.inset}`}>
                    <span className={`absolute ${it.idle.bleed}`}>
                      <img src={it.idle.src} alt="" className="block max-w-none size-full" />
                    </span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
