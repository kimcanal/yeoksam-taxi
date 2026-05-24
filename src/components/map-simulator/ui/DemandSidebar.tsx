import { LineChart } from "lucide-react";
import {
  PANEL_CARD_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_SECTION_LABEL_CLASS,
} from "@/components/map-simulator/panel-classes";
import {
  DEMAND_VISUAL_UNIT_CALLS,
  demandSlotLabel,
  weekdayLabel,
} from "@/components/map-simulator/demand-utils";
import {
  DEMAND_WEEKDAYS,
  TARGET_DONGS,
  type DemandChartGeometry,
  type DemandMiniMapData,
  type DemandWeekdayId,
  type FiveMinuteDemandPoint,
  type HourlyDemandPoint,
  type MapPoiFeatureRow,
} from "@/components/map-simulator/demand-types";
import { DemandChart } from "@/components/map-simulator/ui/DemandChart";
import { DemandMiniMapPanel } from "@/components/map-simulator/ui/DemandMiniMapPanel";

export type DemandSidebarProps = {
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
}: DemandSidebarProps) {
  return (
    <div
      data-ui-panel="right-sidebar"
      className="absolute bottom-0 left-0 right-0 z-20 max-h-[min(68vh,calc(100vh-4rem))] overflow-y-auto rounded-t-[1.75rem] border-t border-white/14 bg-slate-950/98 p-4 text-white shadow-2xl backdrop-blur-md sm:max-h-[min(72vh,calc(100vh-4rem))] lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[38vw] lg:min-w-[400px] lg:max-w-[500px] lg:rounded-none lg:border-l lg:border-t-0 lg:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={PANEL_EYEBROW_CLASS}>수요 예측</p>
          <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-50">
            행정동별 수요 분포 및 배차 제어
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {selectedDongName} · {weekdayLabel(selectedWeekday)}요일 · 0-23시
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
                시간당 호출 수요 분석 곡선
              </div>
            </div>
          </div>
          <span className="inline-flex whitespace-nowrap rounded-full border border-white/12 bg-white/[0.08] px-2 py-0.5 text-[10px] text-slate-300">
            1H / 12
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">
            동
            <select
              value={selectedDongName}
              onChange={(event) => setSelectedDongName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/12 bg-slate-900/88 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
              aria-label="수요 예측 행정동"
            >
              {TARGET_DONGS.map((dongName) => (
                <option key={dongName} value={dongName}>
                  {dongName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">
            요일
            <select
              value={selectedWeekday}
              onChange={(event) =>
                setSelectedWeekday(event.target.value as DemandWeekdayId)
              }
              className="mt-1 w-full rounded-xl border border-white/12 bg-slate-900/88 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
              aria-label="수요 예측 요일"
            >
              {DEMAND_WEEKDAYS.map((weekday) => (
                <option key={weekday.id} value={weekday.id}>
                  {weekday.label}요일
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/12 bg-white/[0.08] text-center">
          <div className="px-2 py-2">
            <div className="text-[10px] text-slate-500">최대 수요 시간</div>
            <div className="mt-1 font-semibold tabular-nums text-slate-100">
              {hasDemandData ? `${selectedPeakDemand.hour}시` : "-"}
            </div>
          </div>
          <div className="px-2 py-2">
            <div className="text-[10px] text-slate-500">시간당 최대 호출</div>
            <div className="mt-1 font-semibold tabular-nums text-rose-100">
              {hasDemandData
                ? selectedPeakDemand.demandPred.toLocaleString("ko-KR")
                : "-"}
            </div>
          </div>
          <div className="px-2 py-2">
            <div className="text-[10px] text-slate-500">현재 수요 혼잡도</div>
            <div className="mt-1 font-semibold tabular-nums text-cyan-100">
              {selectedDemandIntensityLabel}
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-center">
          <div className="px-2 py-2">
            <div className="text-[10px] text-slate-500">실시간 분석 구간</div>
            <div className="mt-1 text-[11px] font-semibold tabular-nums text-slate-100">
              {demandSlotLabel(currentDemandSlot)}
            </div>
          </div>
          <div className="px-2 py-2">
            <div className="text-[10px] text-slate-500">5분 단기 예측 수요</div>
            <div className="mt-1 font-semibold tabular-nums text-cyan-100">
              {hasDemandData
                ? Math.round(currentFiveMinuteDemand).toLocaleString("ko-KR")
                : "-"}
            </div>
          </div>
          <div className="px-2 py-2">
            <div className="text-[10px] text-slate-500">시뮬레이션 택시 수</div>
            <div className="mt-1 font-semibold tabular-nums text-amber-100">
              {hasDemandData ? `${appliedTaxiCount}대` : "-"}
            </div>
          </div>
        </div>
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] leading-4 text-slate-400 font-normal">
          5분 단위 예측 수치는 시간당 호출 예측 총량을 균등 분배한 정밀 분석 지표이며,
          시뮬레이션 차량 1대는 실제 호출 약 {DEMAND_VISUAL_UNIT_CALLS.toLocaleString("ko-KR")}건을 반영합니다.
          지도는 선택된 행정동 내 주요 도로 회랑과 정적 수요 앵커 영역을 시각화합니다.
        </div>

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
  );
}
