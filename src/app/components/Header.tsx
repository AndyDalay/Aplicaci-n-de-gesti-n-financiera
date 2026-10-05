import { useState } from "react";
import { useApp } from "./AppContext";
import { Modal } from "./Modal";
import { CurrencyToggle, Pill } from "./ui-kit";

const assetPathPrefix = "/assets";
const imgBell = `${assetPathPrefix}/299ae.svg`;
// Large page glyphs, stacked 192px apart in Figma's "moving" strip.
const PAGE_ICONS = [
  `${assetPathPrefix}/52315.svg`, // cart
  `${assetPathPrefix}/ae4e5.svg`, // box
  `${assetPathPrefix}/chef-64.svg`, // kitchen
  `${assetPathPrefix}/60162.svg`, // pie chart
  `${assetPathPrefix}/b7cf6.svg`, // settings
];

const HEADER_BG =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 360 180' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.8'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -55.825 -33.535 0 36 36)'><stop stop-color='rgba(92,48,255,0.35)' offset='0'/><stop stop-color='rgba(92,48,255,0)' offset='0.25'/></radialGradient></defs></svg>\"), " +
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 360 180' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.8'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(-0.68795 -61.159 -68.049 2.1729 254.95 180)'><stop stop-color='rgba(247,145,195,0.8)' offset='0'/><stop stop-color='rgba(247,145,195,0)' offset='0.22'/></radialGradient></defs></svg>\"), " +
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 360 180' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.8'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(-2.3196 -36.792 -22.102 3.9556 311.2 23.864)'><stop stop-color='rgba(246,188,63,0.6)' offset='0'/><stop stop-color='rgba(246,188,63,0)' offset='0.25'/></radialGradient></defs></svg>\"), " +
  "linear-gradient(#FDEFD2, #FDEFD2)";

const SYNC_DOT = { online: "bg-ok-ink", loading: "bg-amber animate-pulse", offline: "bg-brand" } as const;
const SYNC_LABEL = { online: "Sincronizado", loading: "Cargando…", offline: "Sin conexión" } as const;

export function Header({ pageTitle, pageSubtitle, pageIndex = 0, onAvatar }: { pageTitle: string; pageSubtitle?: string; pageIndex?: number; onAvatar?: () => void }) {
  const { people, currentUserId, currency, setCurrency, notifications, markAllRead, syncStatus, unreadCount } = useApp();
  const [open, setOpen] = useState(false);
  const me = people.find((p) => p.id === currentUserId)!;

  return (
    <header
      className="sticky top-0 z-30 flex flex-col gap-2 overflow-clip border border-card-line rounded-b-[24px] px-4 pt-4 h-fit"
      style={{ backgroundImage: HEADER_BG, backgroundSize: "100% 100%" }}
    >
      <div className="flex h-11 items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onAvatar}
            aria-label="Abrir configuración"
            className="relative size-11 shrink-0 rounded-full border-2 border-[#262626] p-0.5 flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: me.color || "#BDE0FE" }}
            title={SYNC_LABEL[syncStatus]}
          >
            {me.avatar ? (
              <img src={me.avatar} alt={me.name} className="size-[40.8px] h-full rounded-full object-cover" />
            ) : (
              <span className="text-xl">{me.emoji}</span>
            )}
            <span className={`absolute bottom-0 right-0 size-2.5 rounded-full ${SYNC_DOT[syncStatus]}`} />
          </button>
          <div className="min-w-0">
            <p className="font-['Nunito:Bold'] font-bold text-xs leading-4 text-[#262626] opacity-60">Hola,</p>
            <p className="font-['Sour_Gummy:Bold'] font-bold wdth text-2xl leading-6 text-[#262626] truncate">{me.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CurrencyToggle value={currency} onChange={setCurrency} className="gap-x-px gap-y-0" />
          <button
            onClick={() => { setOpen(true); markAllRead(); }}
            className="relative mt-1 surface-white raised border-[1.5px] border-ink rounded-full p-2 flex items-center justify-center"
            aria-label="Notificaciones"
          >
            <img src={imgBell} alt="" className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand text-white border-[1.5px] border-ink rounded-full min-w-5 h-5 px-1 text-[10px] font-['Nunito:Bold'] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="pt-2 w-full">
        <div className="flex h-fit pt-0 px-0 pb-[7px] items-center justify-between">
          <div className="min-w-0">
            <h1 key={pageTitle} className="font-['Sour_Gummy:ExtraBold'] font-extrabold wdth text-[36px] leading-9 text-brand truncate animate-[header-in_.35s_ease-out]">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="font-['Comfortaa:Bold'] font-bold text-sm leading-5 text-[#262626] truncate">{pageSubtitle}</p>
            )}
          </div>
          <div className="relative size-16 shrink-0 overflow-hidden" aria-hidden>
            <div
              className="absolute left-0 top-0 w-16 transition-transform duration-500 ease-[cubic-bezier(.5,1.6,.4,.9)]"
              style={{ transform: `translateY(${-pageIndex * 192}px)` }}
            >
              {PAGE_ICONS.map((src, i) => (
                <img key={src} src={src} alt="" className="absolute left-0 size-16" style={{ top: i * 192 }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Notificaciones">
        {notifications.length === 0 ? (
          <p className="text-center text-muted-ink font-hand text-lg py-8">Todo en orden 🌿</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="bg-card-bg border border-card-line rounded-2xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-['Sour_Gummy:Bold'] wdth">{n.title}</p>
                  <Pill color="bg-amber-soft">{new Date(n.at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Pill>
                </div>
                <p className="text-sm font-['Nunito:Regular']">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </header>
  );
}
