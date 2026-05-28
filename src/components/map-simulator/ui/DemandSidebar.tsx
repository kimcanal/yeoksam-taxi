import { memo } from "react";
import { LineChart, Settings2, X } from "lucide-react";
import {
  PANEL_CARD_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_SECTION_LABEL_CLASS,
} from "@/components/map-simulator/panel-classes";
import { WEATHER_OPTIONS, type WeatherMode } from "@/components/map-simulator/environment";
import {
  MAX_TRAFFIC_LOAD_PERCENT,
  MIN_TRAFFIC_LOAD_PERCENT,
} from "@/components/map-simulator/simulation";

import { weekdayLabel } from "@/components/map-simulator/demand";
import {
  type DemandChartGeometry,
  type DemandMiniMapData,
  type DemandWeekdayId,
  type FiveMinuteDemandPoint,
  type HourlyDemandPoint,
  type MapPoiFeatureRow,
} from "@/components/map-simulator/demand";
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
  
  // Environment Controls
  simulationDate: string;
  formattedSimulationTime: string;
  setCircumstanceMode: (mode: "live" | "specific") => void;
  setSimulationDate: (date: string) => void;
  setSimulationTimeMinutes: (minutes: number) => void;
  weatherMode: WeatherMode;
  setWeatherMode: (mode: WeatherMode) => void;
  trafficLoadPercent: number;
  setTrafficLoadPercent: (percent: number) => void;
  appliedTrafficCount: number;
};

function parseTimeInput(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export const DemandSidebar = memo(function DemandSidebar({
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
  simulationDate,
  formattedSimulationTime,
  setCircumstanceMode,
  setSimulationDate,
  setSimulationTimeMinutes,
  weatherMode,
  setWeatherMode,
  trafficLoadPercent,
  setTrafficLoadPercent,
  appliedTrafficCount,
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
      className={`absolute bottom-0 left-0 right-0 z-20 max-h-[min(68dvh,calc(100dvh-4rem))] overflow-y-auto rounded-t-[1.75rem] border-t border-white/14 bg-slate-950/98 p-4 text-white shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out sm:max-h-[min(72dvh,calc(100dvh-4rem))] lg:right-auto lg:left-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[var(--demand-sidebar-width)] lg:min-w-0 lg:max-w-none lg:rounded-none lg:border-r lg:border-t-0 lg:p-5 ${
        isVisible
          ? "translate-y-0 lg:translate-x-0"
          : "pointer-events-none translate-y-full lg:-translate-x-full lg:translate-y-0"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={PANEL_EYEBROW_CLASS}>백엔드 수요 API</p>
          <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-50">
            행정동별 수요 곡선 및 지도 시각화
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {selectedDongName} · {weekdayLabel(selectedWeekday)}요일 · 하루 24시간
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${demandFetchBadgeClass}`}
          >
            {demandFetchBadgeText}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            aria-label="정보 패널 닫기"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={`mt-5 ${PANEL_CARD_CLASS} p-4`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/[0.08] text-teal-100">
              <Settings2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className={PANEL_SECTION_LABEL_CLASS}>시뮬레이션 환경</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-slate-100">
                환경 변수 제어
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            날짜
            <input
              type="date"
              value={simulationDate}
              onChange={(event) => {
                setCircumstanceMode("specific");
                setSimulationDate(event.target.value);
              }}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400 focus:bg-slate-900/80"
              aria-label="지도 기준 날짜"
            />
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            시간
            <input
              type="time"
              step={300}
              value={formattedSimulationTime}
              onChange={(event) => {
                const nextMinutes = parseTimeInput(event.target.value);
                if (nextMinutes === null) return;
                setCircumstanceMode("specific");
                setSimulationTimeMinutes(nextMinutes);
              }}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400 focus:bg-slate-900/80"
              aria-label="지도 기준 시간"
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            날씨
            <select
              value={weatherMode}
              onChange={(event) => {
                setCircumstanceMode("specific");
                setWeatherMode(event.target.value as WeatherMode);
              }}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400 focus:bg-slate-900/80"
              aria-label="지도 날씨 조건"
            >
              {WEATHER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            교통 스케일
            <div className="mt-1 flex flex-col justify-center rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
              <div className="mb-1 flex items-center justify-between text-[10px] normal-case tracking-normal text-slate-300">
                <span className="font-semibold text-slate-50">
                  {trafficLoadPercent === 100 ? "기본" : `x${(trafficLoadPercent / 100).toFixed(2)}`}
                </span>
                <span className="text-[9px] text-slate-500">
                  {appliedTrafficCount}대
                </span>
              </div>
              <input
                type="range"
                min={MIN_TRAFFIC_LOAD_PERCENT}
                max={MAX_TRAFFIC_LOAD_PERCENT}
                step={5}
                value={trafficLoadPercent}
                onChange={(event) => {
                  setCircumstanceMode("specific");
                  setTrafficLoadPercent(Number(event.target.value));
                }}
                className="h-1.5 w-full accent-cyan-400"
                aria-label="지도 교통량"
              />
            </div>
          </label>
        </div>
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
                시간대별 호출 수요
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
});
