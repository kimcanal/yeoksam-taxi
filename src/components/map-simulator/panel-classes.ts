export const PANEL_EYEBROW_CLASS =
  "mb-2 text-[11px] uppercase tracking-[0.28em] text-[#99cbbd]";
export const PANEL_SECTION_LABEL_CLASS =
  "text-xs uppercase tracking-[0.16em] text-[#99cbbd]/80";
export const PANEL_CARD_CLASS =
  "rounded-2xl border border-white/12 bg-white/[0.08] p-4 text-sm";
export const PANEL_CARD_COMPACT_CLASS =
  "rounded-2xl border border-white/12 bg-white/[0.08] p-3 text-sm";
export const PANEL_ACCENT_CARD_CLASS =
  "rounded-2xl border border-[#87cbb0]/18 bg-[#87cbb0]/[0.10] p-4 text-sm";
export const PANEL_INSET_CLASS =
  "rounded-2xl border border-white/10 bg-slate-950/78 px-3 py-2 text-xs leading-5 text-slate-400";
export const PANEL_INSET_PADDED_CLASS =
  "rounded-2xl border border-white/10 bg-slate-950/78 px-3 py-3";
export const PANEL_TOKEN_CLASS =
  "inline-flex max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-white/10 bg-slate-950/80 px-2 py-1 text-slate-100";
export const PANEL_STATUS_TILE_CLASS =
  "rounded-2xl border border-white/10 bg-slate-950/78 p-3";

export function panelSelectableClass(selected: boolean) {
  return selected
    ? "border-[#87cbb0]/35 bg-[#87cbb0]/14 text-[#e3f2ed]"
    : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:text-white";
}
