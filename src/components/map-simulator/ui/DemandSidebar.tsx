import { LineChart } from "lucide-react";
import {
  PANEL_CARD_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_SECTION_LABEL_CLASS,
} from "@/components/map-simulator/panel-classes";
import { weekdayLabel } from "@/components/map-simulator/demand-math";
import {
  type DemandChartGeometry,
  type DemandMiniMapData,
  type DemandWeekdayId,
  type FiveMinuteDemandPoint,
  type HourlyDemandPoint,
  type MapPoiFeatureRow,
} from "@/components/map-simulator/demand-types";
import { DemandChart } from "@/components/map-simulator/ui/DemandChart";
import { DemandControls } from "@/components/map-simulator/ui/DemandControls";
import { DemandMiniMapPanel } from "@/components/map-simulator/ui/DemandMiniMapPanel";
import { DemandSummaryStats } from "@/components/map-simulator/ui/DemandSummaryStats";

export type DemandSidebarProps = {
  isVisible: boolean;
  onClose: () => void;
  selectedDongName: string;
  setSelectedDongName: (dongName: string) => void;
  selectedWeekday: DemandWeekdayId;
  setSelectedWeekday: (weekday: DemandWeekdayId) => void;
  demandFetchBadgeText: string;
  demandFetchBadgeClass: string;
  hasDemandData: boolean;
  selectedPeakDemand: HourlyDemandPoint;
  selectedDemandIntensityLabel: string;
  currentDemandSlot: FiveMinuteDemandPoint | null;
  currentFiveMinuteDemand: number;
  appliedTaxiCount: number;
  demandChart: DemandChartGeometry;
  selectedAverageDemand: number;
  demandMiniMap: DemandMiniMapData | null;
  mapPoiFeatureRows: MapPoiFeatureRow[];
  onPoiSelect: (poiCode: string) => void;
};

export function DemandSidebar({
  isVisible,
  selectedDongName,
  setSelectedDongName,
  selectedWeekday,
  setSelectedWeekday,
  demandFetchBadgeText,
  demandFetchBadgeClass,
  hasDemandData,
  selectedPeakDemand,
  selectedDemandIntensityLabel,
  currentDemandSlot,
  currentFiveMinuteDemand,
  appliedTaxiCount,
  demandChart,
  selectedAverageDemand,
  demandMiniMap,
  mapPoiFeatureRows,
  onPoiSelect,
  onClose,
}: DemandSidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="정보 패널 닫기"
        aria-hidden={!isVisible}
        tabIndex={isVisible ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 z-10 bg-slate-950/56 transition-opacity duration-300 ease-in-out lg:hidden ${
          isVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />
    <div
      data-ui-panel="left-sidebar"
      aria-hidden={!isVisible}
      className={`absolute bottom-0 left-0 right-0 z-20 max-h-[min(68vh,calc(100vh-4rem))] overflow-y-auto rounded-t-[1.75rem] border-t border-white/14 bg-slate-950/98 p-4 text-white shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out sm:max-h-[min(72vh,calc(100vh-4rem))] lg:right-auto lg:left-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[var(--demand-sidebar-width)] lg:min-w-0 lg:max-w-none lg:rounded-none lg:border-r lg:border-t-0 lg:p-5 ${
        isVisible
          ? "translate-y-0 lg:translate-x-0"
          : "pointer-events-none translate-y-full lg:-translate-x-full lg:translate-y-0"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={PANEL_EYEBROW_CLASS}>수요 예측</p>
          <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-50">
            행정동별 수요 분포 및 배차 제어
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {selectedDongName} · {weekdayLabel(selectedWeekday)}요일 · 하루 24시간
          </p>
        </div>
        <span
          className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${demandFetchBadgeClass}`}
        >
          {demandFetchBadgeText}
        </span>
      </div>

      <div
        className={`mt-4 ${PANEL_CARD_CLASS} p-4`}
        data-ui-panel="hourly-demand-api-series"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100">
              <LineChart className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className={PANEL_SECTION_LABEL_CLASS}>수요 곡선</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-slate-100">
                시간대별 호출 예측
              </div>
            </div>
          </div>
        </div>

        <DemandControls
          selectedDongName={selectedDongName}
          setSelectedDongName={setSelectedDongName}
          selectedWeekday={selectedWeekday}
          setSelectedWeekday={setSelectedWeekday}
        />

        <DemandSummaryStats
          hasDemandData={hasDemandData}
          selectedPeakDemand={selectedPeakDemand}
          selectedDemandIntensityLabel={selectedDemandIntensityLabel}
          currentDemandSlot={currentDemandSlot}
          currentFiveMinuteDemand={currentFiveMinuteDemand}
          appliedTaxiCount={appliedTaxiCount}
        />

        <DemandChart
          hasDemandData={hasDemandData}
          selectedDongName={selectedDongName}
          selectedWeekday={selectedWeekday}
          demandChart={demandChart}
          selectedAverageDemand={selectedAverageDemand}
        />
      </div>

      <DemandMiniMapPanel
        demandMiniMap={demandMiniMap}
        selectedDongName={selectedDongName}
        mapPoiFeatureRows={mapPoiFeatureRows}
        onPoiSelect={onPoiSelect}
      />
    </div>
    </>
  );
}
