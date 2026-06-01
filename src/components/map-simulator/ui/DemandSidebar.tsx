import { memo } from "react";
import { Clock, History, LineChart, Settings2, X } from "lucide-react";
import {
  PANEL_CARD_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_SECTION_LABEL_CLASS,
} from "@/components/map-simulator/panel-classes";
import {
  currentSimulationClock,
  formatDateLabel,
} from "@/components/map-simulator/environment";
import {
  DEMAND_TAXI_SCALE_MIN_PERCENT,
  DEMAND_TAXI_SCALE_STEP_PERCENT,
} from "@/components/map-simulator/constants/demand-constants";

import type { CircumstanceMode } from "@/components/map-simulator/types";
import {
  type DemandChartGeometry,
  type DemandFetchStatus,
  type DemandHeatmapScope,
  type DemandMiniMapData,
  type FiveMinuteDemandPoint,
  type HourlyDemandPoint,
  type MapPoiFeatureRow,
} from "@/components/map-simulator/demand";
import { DemandChart } from "@/components/map-simulator/ui/DemandChart";
import { DemandControls } from "@/components/map-simulator/ui/DemandControls";
import { DemandMiniMapPanel } from "@/components/map-simulator/ui/DemandMiniMapPanel";
import { DemandSummaryStats } from "@/components/map-simulator/ui/DemandSummaryStats";

type DemandSidebarDemandState = {
  selectedDongName: string;
  setSelectedDongName: (dongName: string) => void;
  demandFetchBadgeText: string;
  demandFetchBadgeClass: string;
  hasDemandData: boolean;
  selectedPeakDemand: HourlyDemandPoint;
  selectedDemandIntensityLabel: string;
  currentDemandSlot: FiveMinuteDemandPoint | null;
  currentFiveMinuteDemand: number;
  currentMapDemand: number;
  taxiDemandScalePercent: number;
  effectiveTaxiDemandScalePercent: number;
  maxSafeTaxiScalePercent: number;
  setTaxiDemandScalePercent: (percent: number) => void;
  appliedTaxiCount: number;
  appliedMapTaxiCount: number;
  demandChart: DemandChartGeometry;
  selectedAverageDemand: number;
  heatmapFetchStatus: DemandFetchStatus;
  heatmapHour: number;
  heatmapMaxDemand: number;
  heatmapScope: DemandHeatmapScope;
  setHeatmapHour: (hour: number) => void;
  setHeatmapScope: (scope: DemandHeatmapScope) => void;
  demandMiniMap: DemandMiniMapData | null;
};

type DemandSidebarPoiState = {
  mapPoiFeatureRows: MapPoiFeatureRow[];
  onPoiSelect: (poiCode: string) => void;
};

type DemandSidebarEnvironmentControls = {
  circumstanceMode: CircumstanceMode;
  simulationDate: string;
  formattedSimulationTime: string;
  setCircumstanceMode: (mode: CircumstanceMode) => void;
  setSimulationDate: (date: string) => void;
  setSimulationTimeMinutes: (minutes: number) => void;
};

export type DemandSidebarProps = {
  isVisible: boolean;
  onClose: () => void;
  demandState: DemandSidebarDemandState;
  poiState: DemandSidebarPoiState;
  environmentControls: DemandSidebarEnvironmentControls;
};

type SpecificModeControlsProps = Omit<
  DemandSidebarEnvironmentControls,
  "circumstanceMode"
> & {
  setHeatmapHour: (hour: number) => void;
};

function SpecificModeControls({
  simulationDate,
  formattedSimulationTime,
  setCircumstanceMode,
  setSimulationDate,
  setSimulationTimeMinutes,
  setHeatmapHour,
}: SpecificModeControlsProps) {
  const [y, m, d] = simulationDate.split("-");
  const [hStr] = formattedSimulationTime.split(":");
  const currentHour = parseInt(hStr || "0", 10);
  const currentYear = parseInt(y || "2026", 10);

  // 현재 현실 시각 구하기
  const realNow = new Date();
  const realYear = realNow.getFullYear();
  const realMonth = realNow.getMonth() + 1; // 1-indexed
  const realDay = realNow.getDate();
  const realHour = realNow.getHours();

  // 특정 연-월-일 시 정보가 미래인지 검증하고, 미래일 경우 현재 현실 시각으로 안전하게 클램핑해주는 헬퍼
  function getSafeDateTime(
    targetYear: number,
    targetMonth: number,
    targetDay: number,
    targetHour: number,
  ) {
    const target = new Date(targetYear, targetMonth - 1, targetDay, targetHour, 0, 0);
    const now = new Date();
    if (target > now) {
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
      };
    }
    return {
      year: targetYear,
      month: targetMonth,
      day: targetDay,
      hour: targetHour,
    };
  }

  // 해당 연도/월의 마지막 날 계산
  const daysInMonth = new Date(
    currentYear,
    parseInt(m || "1", 10),
    0,
  ).getDate();

  function handleYearChange(value: string) {
    setCircumstanceMode("specific");
    const newYear = parseInt(value, 10);
    const currentM = parseInt(m || "1", 10);
    const currentD = parseInt(d || "1", 10);

    const newDaysInMonth = new Date(newYear, currentM, 0).getDate();
    const tempDay = Math.min(currentD, newDaysInMonth);

    const safe = getSafeDateTime(newYear, currentM, tempDay, currentHour);

    setSimulationDate(
      `${safe.year}-${safe.month.toString().padStart(2, "0")}-${safe.day.toString().padStart(2, "0")}`,
    );
    if (safe.hour !== currentHour) {
      setHeatmapHour(safe.hour);
      setSimulationTimeMinutes(safe.hour * 60);
    }
  }

  function handleMonthChange(value: string) {
    setCircumstanceMode("specific");
    const newMonth = parseInt(value, 10);
    const currentD = parseInt(d || "1", 10);

    const newDaysInMonth = new Date(currentYear, newMonth, 0).getDate();
    const tempDay = Math.min(currentD, newDaysInMonth);

    const safe = getSafeDateTime(currentYear, newMonth, tempDay, currentHour);

    setSimulationDate(
      `${safe.year}-${safe.month.toString().padStart(2, "0")}-${safe.day.toString().padStart(2, "0")}`,
    );
    if (safe.hour !== currentHour) {
      setHeatmapHour(safe.hour);
      setSimulationTimeMinutes(safe.hour * 60);
    }
  }

  function handleDayChange(value: string) {
    setCircumstanceMode("specific");
    const newDay = parseInt(value, 10);
    const currentM = parseInt(m || "1", 10);

    const safe = getSafeDateTime(currentYear, currentM, newDay, currentHour);

    setSimulationDate(
      `${safe.year}-${safe.month.toString().padStart(2, "0")}-${safe.day.toString().padStart(2, "0")}`,
    );
    if (safe.hour !== currentHour) {
      setHeatmapHour(safe.hour);
      setSimulationTimeMinutes(safe.hour * 60);
    }
  }

  function handleHourSelect(value: number) {
    setCircumstanceMode("specific");
    const currentM = parseInt(m || "1", 10);
    const currentD = parseInt(d || "1", 10);

    const safe = getSafeDateTime(currentYear, currentM, currentD, value);

    setSimulationDate(
      `${safe.year}-${safe.month.toString().padStart(2, "0")}-${safe.day.toString().padStart(2, "0")}`,
    );
    setHeatmapHour(safe.hour);
    setSimulationTimeMinutes(safe.hour * 60);
  }

  // 연도 범위: 2020 ~ 현재 연도
  const yearOptions = Array.from(
    { length: realYear - 2020 + 1 },
    (_, i) => 2020 + i,
  );

  const isCurrentYear = currentYear === realYear;
  const isCurrentMonth = isCurrentYear && parseInt(m || "1", 10) === realMonth;
  const isToday = isCurrentMonth && parseInt(d || "1", 10) === realDay;

  return (
    <>
      <div className="mt-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        조회 날짜
      </div>
      <div className="grid grid-cols-3 gap-2">
        {/* 연도 — 클릭형 select */}
        <div className="group relative">
          <select
            value={currentYear}
            onChange={(event) => handleYearChange(event.target.value)}
            className="peer w-full appearance-none rounded-lg border border-white/10 bg-slate-900/40 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400/80 focus:bg-slate-900/80"
            id="date-year"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year} className="bg-slate-900 text-slate-100">
                {year}년
              </option>
            ))}
          </select>
          <label
            htmlFor="date-year"
            className="absolute left-2.5 top-0 -translate-y-1/2 bg-slate-950 px-1 text-[9px] font-semibold tracking-wider text-slate-500 peer-focus:text-amber-400"
          >
            연도
          </label>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
            ▼
          </div>
        </div>

        {/* 월 — 미래 월 비활성화 */}
        <div className="group relative">
          <select
            value={parseInt(m || "1", 10).toString()}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="peer w-full appearance-none rounded-lg border border-white/10 bg-slate-900/40 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400/80 focus:bg-slate-900/80"
            id="date-month"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (month) => {
                const isFutureMonth = isCurrentYear && month > realMonth;
                return (
                  <option
                    key={month}
                    value={month}
                    disabled={isFutureMonth}
                    className={`bg-slate-900 ${isFutureMonth ? "text-slate-600" : "text-slate-100"}`}
                  >
                    {month}월
                  </option>
                );
              },
            )}
          </select>
          <label
            htmlFor="date-month"
            className="absolute left-2.5 top-0 -translate-y-1/2 bg-slate-950 px-1 text-[9px] font-semibold tracking-wider text-slate-500 peer-focus:text-amber-400"
          >
            월
          </label>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
            ▼
          </div>
        </div>

        {/* 일 — 미래 일 비활성화 */}
        <div className="group relative">
          <select
            value={parseInt(d || "1", 10)}
            onChange={(event) => handleDayChange(event.target.value)}
            className="peer w-full appearance-none rounded-lg border border-white/10 bg-slate-900/40 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400/80 focus:bg-slate-900/80"
            id="date-day"
          >
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
              (day) => {
                const isFutureDay = isCurrentMonth && day > realDay;
                return (
                  <option
                    key={day}
                    value={day}
                    disabled={isFutureDay}
                    className={`bg-slate-900 ${isFutureDay ? "text-slate-600" : "text-slate-100"}`}
                  >
                    {day}일
                  </option>
                );
              },
            )}
          </select>
          <label
            htmlFor="date-day"
            className="absolute left-2.5 top-0 -translate-y-1/2 bg-slate-950 px-1 text-[9px] font-semibold tracking-wider text-slate-500 peer-focus:text-amber-400"
          >
            일
          </label>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
            ▼
          </div>
        </div>
      </div>

      <div className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        조회 시간
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* 시 — 미래 시 비활성화 */}
        <div className="group relative">
          <select
            value={currentHour}
            onChange={(event) => handleHourSelect(Number(event.target.value))}
            className="peer w-full appearance-none rounded-lg border border-white/10 bg-slate-900/40 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400/80 focus:bg-slate-900/80"
            id="time-hour"
          >
            {Array.from({ length: 24 }, (_, index) => index).map((hour) => {
              const isFutureHour = isToday && hour > realHour;
              return (
                <option
                  key={hour}
                  value={hour}
                  disabled={isFutureHour}
                  className={`bg-slate-900 ${isFutureHour ? "text-slate-600" : "text-slate-100"}`}
                >
                  {hour.toString().padStart(2, "0")}시 (h)
                </option>
              );
            })}
          </select>
          <label
            htmlFor="time-hour"
            className="absolute left-2.5 top-0 -translate-y-1/2 bg-slate-950 px-1 text-[9px] font-semibold tracking-wider text-slate-500 peer-focus:text-amber-400"
          >
            시 (Hour)
          </label>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
            ▼
          </div>
        </div>

        {/* 분 — 항상 00분 고정 */}
        <div className="group relative">
          <select
            value={0}
            disabled
            className="peer w-full appearance-none rounded-lg border border-white/10 bg-slate-900/40 px-3 py-3 text-sm text-slate-500 outline-none cursor-not-allowed opacity-60"
            id="time-minute"
            aria-label="분은 00분으로 고정됩니다"
          >
            <option value={0} className="bg-slate-900 text-slate-100">
              00분 (m)
            </option>
          </select>
          <label
            htmlFor="time-minute"
            className="absolute left-2.5 top-0 -translate-y-1/2 bg-slate-950 px-1 text-[9px] font-semibold tracking-wider text-slate-500"
          >
            분 (Minute)
          </label>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">
            —
          </div>
        </div>
      </div>


    </>
  );
}

export const DemandSidebar = memo(function DemandSidebar({
  isVisible,
  onClose,
  demandState,
  poiState,
  environmentControls,
}: DemandSidebarProps) {
  const {
    selectedDongName,
    setSelectedDongName,
    demandFetchBadgeText,
    demandFetchBadgeClass,
    hasDemandData,
    selectedPeakDemand,
    selectedDemandIntensityLabel,
    currentDemandSlot,
    currentFiveMinuteDemand,
    currentMapDemand,
    effectiveTaxiDemandScalePercent,
    maxSafeTaxiScalePercent,
    setTaxiDemandScalePercent,
    appliedTaxiCount,
    appliedMapTaxiCount,
    demandChart,
    selectedAverageDemand,
    heatmapFetchStatus,
    heatmapHour,
    heatmapMaxDemand,
    heatmapScope,
    setHeatmapHour,
    setHeatmapScope,
    demandMiniMap,
  } = demandState;

  const { mapPoiFeatureRows, onPoiSelect } = poiState;

  const {
    circumstanceMode,
    simulationDate,
    formattedSimulationTime,
    setCircumstanceMode,
    setSimulationDate,
    setSimulationTimeMinutes,
  } = environmentControls;
  function activateLiveMode() {
    const clock = currentSimulationClock();
    setSimulationDate(clock.dateIso);
    setSimulationTimeMinutes(clock.minutes);
    setHeatmapHour(Math.floor(clock.minutes / 60));
    setCircumstanceMode("live");
  }

  function activateSpecificMode() {
    const [hourText] = formattedSimulationTime.split(":");
    setHeatmapHour(parseInt(hourText || "0", 10));
    setCircumstanceMode("specific");
  }

  function handleHeatmapHourChange(hour: number) {
    setCircumstanceMode("specific");
    setHeatmapHour(hour);
    setSimulationTimeMinutes(hour * 60);
  }

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
            {selectedDongName} · {formatDateLabel(simulationDate)} · 하루 24시간
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
              <div className={PANEL_SECTION_LABEL_CLASS}>조회 기준</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-slate-100">
                {circumstanceMode === "live" ? "실시간 동기화" : "과거 조회"}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-slate-950/55 p-1">
          <button
            type="button"
            onClick={activateLiveMode}
            aria-pressed={circumstanceMode === "live"}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition ${
              circumstanceMode === "live"
                ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
            }`}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            실시간
          </button>
          <button
            type="button"
            onClick={activateSpecificMode}
            aria-pressed={circumstanceMode === "specific"}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition ${
              circumstanceMode === "specific"
                ? "bg-amber-300 text-slate-950 shadow-lg shadow-amber-950/20"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
            }`}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            과거
          </button>
        </div>

        {circumstanceMode === "specific" ? (
          <SpecificModeControls
            simulationDate={simulationDate}
            formattedSimulationTime={formattedSimulationTime}
            setCircumstanceMode={setCircumstanceMode}
            setSimulationDate={setSimulationDate}
            setSimulationTimeMinutes={setSimulationTimeMinutes}
            setHeatmapHour={setHeatmapHour}
          />
        ) : null}

        {/* 수요 기반 택시 표시 슬라이더 — 실시간/과거 공통 */}
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1.5">
            수요 기반 택시 표시
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-slate-900/30 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {selectedDongName} 수요의{" "}
                <span className="font-bold text-amber-300 tabular-nums">
                  {effectiveTaxiDemandScalePercent.toFixed(1)}%
                </span>
                {" "}표시 중
              </span>
              <span className="text-sm font-bold tabular-nums text-slate-50">
                선택 동 {appliedTaxiCount.toLocaleString("ko-KR")}대
              </span>
            </div>
            <input
              type="range"
              min={DEMAND_TAXI_SCALE_MIN_PERCENT}
              max={maxSafeTaxiScalePercent}
              step={DEMAND_TAXI_SCALE_STEP_PERCENT}
              value={effectiveTaxiDemandScalePercent}
              onChange={(event) => {
                setTaxiDemandScalePercent(
                  Math.min(Number(event.target.value), maxSafeTaxiScalePercent),
                );
              }}
              className="h-1.5 w-full accent-amber-300"
              aria-label="수요 기반 택시 표시 비율"
            />
            <div className="mt-1 text-[9px] text-slate-500">
              {selectedDongName} 현재 수요 {Math.round(currentFiveMinuteDemand).toLocaleString("ko-KR")}건 기준 ·
              지도 전체 {appliedMapTaxiCount.toLocaleString("ko-KR")}대 표시 ·
              전체 수요 {Math.round(currentMapDemand).toLocaleString("ko-KR")}건 기준 ·
              최대 {maxSafeTaxiScalePercent.toFixed(1)}%
            </div>
          </div>
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
        />

        <DemandSummaryStats
          hasDemandData={hasDemandData}
          selectedPeakDemand={selectedPeakDemand}
          selectedDemandIntensityLabel={selectedDemandIntensityLabel}
          currentDemandSlot={currentDemandSlot}
          currentTaxiDemandBase={currentFiveMinuteDemand}
          appliedTaxiCount={appliedTaxiCount}
        />

        <DemandChart
          hasDemandData={hasDemandData}
          selectedDongName={selectedDongName}
          simulationDate={simulationDate}
          demandChart={demandChart}
          selectedAverageDemand={selectedAverageDemand}
          currentHour={heatmapHour}
        />
      </div>

      <DemandMiniMapPanel
        demandMiniMap={demandMiniMap}
        heatmapFetchStatus={heatmapFetchStatus}
        heatmapHour={heatmapHour}
        heatmapMaxDemand={heatmapMaxDemand}
        heatmapScope={heatmapScope}
        selectedDongName={selectedDongName}
        setHeatmapHour={handleHeatmapHourChange}
        setHeatmapScope={setHeatmapScope}
        mapPoiFeatureRows={mapPoiFeatureRows}
        onPoiSelect={onPoiSelect}
        onDongSelect={setSelectedDongName}
        circumstanceMode={circumstanceMode}
      />
    </div>
    </>
  );
});
