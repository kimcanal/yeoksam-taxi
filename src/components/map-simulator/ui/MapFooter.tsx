import type { BuildVersionInfo } from "@/components/map-simulator/build-version";

const DEMAND_SLOT_ALLOCATION_LABEL = "단기 예측";

type MapFooterProps = {
  isSidebarVisible: boolean;
  demandFetchBadgeText: string;
  demandVisualUnitCalls: number;
  buildVersion: BuildVersionInfo;
};

export function MapFooter({
  isSidebarVisible,
  demandFetchBadgeText,
  demandVisualUnitCalls,
  buildVersion,
}: MapFooterProps) {
  return (
    <footer
      data-ui-panel="map-footer"
      className={`pointer-events-none absolute bottom-3 left-0 z-20 hidden max-w-[calc(100vw-5rem)] flex-wrap items-center gap-2 rounded-2xl border border-white/14 bg-slate-950/90 px-3 py-2 text-[10px] font-medium text-slate-300 shadow-2xl shadow-black/25 backdrop-blur-md transition-[margin,max-width] duration-300 ease-in-out sm:flex ${
        isSidebarVisible
          ? "ml-16 lg:ml-[var(--demand-sidebar-width)] lg:max-w-[calc(100vw-var(--demand-sidebar-width)-2rem)]"
          : "ml-16 lg:ml-16"
      }`}
    >
      <span className="font-semibold text-slate-100">역삼 택시 디지털 트윈</span>
      <span className="h-3 w-px bg-white/14" />
      <span>{demandFetchBadgeText}</span>
      <span className="h-3 w-px bg-white/14" />
      <span>5분 {DEMAND_SLOT_ALLOCATION_LABEL}</span>
      <span className="h-3 w-px bg-white/14" />
      <span>표시 스케일: {demandVisualUnitCalls.toLocaleString("ko-KR")} 호출/대</span>
      <span className="h-3 w-px bg-white/14" />
      <span>실행 환경: {buildVersion.environmentLabel}</span>
      {buildVersion.commit ? (
        <>
          <span className="h-3 w-px bg-white/14" />
          <span>빌드 버전: {buildVersion.commit}</span>
        </>
      ) : null}
    </footer>
  );
}
