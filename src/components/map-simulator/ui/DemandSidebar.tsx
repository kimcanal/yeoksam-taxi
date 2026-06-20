import { memo, useState, useRef, useCallback, useEffect } from "react";
import { AlertTriangle, Clock, History, LineChart, Settings2, X } from "lucide-react";
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
  TAXI_MARKER_SCALE_MIN_PERCENT,
  TAXI_MARKER_SCALE_STEP_PERCENT,
} from "@/components/map-simulator/constants/demand-constants";

import type { CircumstanceMode } from "@/components/map-simulator/types";
import {
  type DemandChartGeometry,
  type DemandFetchStatus,
  type DemandMiniMapData,
  type FiveMinuteDemandPoint,
  type HourlyDemandPoint,
  type MapPoiFeatureRow,
  type HourlySupplyPoint,
  type HourlyPricingPoint,
  type PricingChartGeometry,
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
  currentMapSupply: number;
  taxiMarkerScalePercent: number;
  effectiveTaxiMarkerScalePercent: number;
  maxSafeTaxiMarkerScalePercent: number;
  setTaxiMarkerScalePercent: (percent: number) => void;
  appliedTaxiCount: number;
  appliedMapTaxiCount: number;
  demandChart: DemandChartGeometry;
  selectedAverageDemand: number;
  heatmapFetchStatus: DemandFetchStatus;
  heatmapHour: number;
  heatmapMaxDemand: number;
  setHeatmapHour: (hour: number) => void;
  demandMiniMap: DemandMiniMapData | null;
  minimapShadingMode: "demand" | "supply" | "shortage";
  setMinimapShadingMode: (mode: "demand" | "supply" | "shortage") => void;
  currentSupplyPoint: HourlySupplyPoint | null;
  currentPricingPoint: HourlyPricingPoint | null;
  pricingChart: PricingChartGeometry;
  selectedAverageSupply: number;
  selectedPeakSupply: HourlySupplyPoint | null;
  hasSupplyData: boolean;
  hasPricingData: boolean;
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
  onValidationError: (msg: string) => void;
};

function SpecificModeControls({
  simulationDate,
  formattedSimulationTime,
  setCircumstanceMode,
  setSimulationDate,
  setSimulationTimeMinutes,
  setHeatmapHour,
  onValidationError,
}: SpecificModeControlsProps) {
  const [y, m, d] = simulationDate.split("-");
  const [hStr] = formattedSimulationTime.split(":");
  const currentHour = parseInt(hStr || "0", 10);
  const currentYear = parseInt(y || "2026", 10);

  const currentMonth = parseInt(m || "1", 10);
  const currentDay = parseInt(d || "1", 10);

  // 현재 현실 시각 구하기
  const realNow = new Date();
  const realYear = realNow.getFullYear();
  const realMonth = realNow.getMonth() + 1; // 1-indexed
  const realDay = realNow.getDate();
  const realHour = realNow.getHours();

  function updateDateTime(newYear: number, newMonth: number, newDay: number, newHour: number) {
    setCircumstanceMode("specific");
    
    // 해당 연도/월의 마지막 날 계산하여 일자 보정
    const daysInNewMonth = new Date(newYear, newMonth, 0).getDate();
    const safeDay = Math.min(newDay, daysInNewMonth);

    const target = new Date(newYear, newMonth - 1, safeDay, newHour, 0, 0);
    const now = new Date();
    
    let finalYear = newYear;
    let finalMonth = newMonth;
    let finalDay = safeDay;
    let finalHour = newHour;

    // 미래 시간일 경우 현재 현실 시간으로 클램핑
    if (target > now) {
      onValidationError("미래 시점의 수요 데이터는 조회할 수 없습니다.");
      finalYear = now.getFullYear();
      finalMonth = now.getMonth() + 1;
      finalDay = now.getDate();
      finalHour = now.getHours();
    }

    setSimulationDate(
      `${finalYear}-${finalMonth.toString().padStart(2, "0")}-${finalDay.toString().padStart(2, "0")}`,
    );
    setHeatmapHour(finalHour);
    setSimulationTimeMinutes(finalHour * 60);
  }

  // 해당 연도/월의 마지막 날 계산
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // 연도 범위: 2020 ~ 현재 연도
  const yearOptions = Array.from(
    { length: realYear - 2020 + 1 },
    (_, i) => 2020 + i,
  );

  const isCurrentYear = currentYear === realYear;
  const isCurrentMonth = isCurrentYear && currentMonth === realMonth;
  const isToday = isCurrentMonth && currentDay === realDay;

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
            onChange={(event) => updateDateTime(parseInt(event.target.value, 10), currentMonth, currentDay, currentHour)}
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
            value={currentMonth.toString()}
            onChange={(event) => updateDateTime(currentYear, parseInt(event.target.value, 10), currentDay, currentHour)}
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
            value={currentDay}
            onChange={(event) => updateDateTime(currentYear, currentMonth, parseInt(event.target.value, 10), currentHour)}
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
            onChange={(event) => updateDateTime(currentYear, currentMonth, currentDay, Number(event.target.value))}
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
    currentMapSupply,
    effectiveTaxiMarkerScalePercent,
    maxSafeTaxiMarkerScalePercent,
    setTaxiMarkerScalePercent,
    appliedTaxiCount,
    appliedMapTaxiCount,
    demandChart,
    selectedAverageDemand,
    heatmapFetchStatus,
    heatmapHour,
    heatmapMaxDemand,
    setHeatmapHour,
    demandMiniMap,
    minimapShadingMode,
    setMinimapShadingMode,
    currentSupplyPoint,
    currentPricingPoint,
    pricingChart,
    selectedAverageSupply,
    selectedPeakSupply,
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSupplyValue = currentSupplyPoint?.supplyPred ?? null;
  const currentSupplyDemandGap =
    currentSupplyValue === null
      ? null
      : Math.max(0, currentFiveMinuteDemand - currentSupplyValue);
  const currentSupplyDemandGapRatio =
    currentSupplyDemandGap === null || currentFiveMinuteDemand <= 0
      ? null
      : currentSupplyDemandGap / currentFiveMinuteDemand;

  const triggerToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

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

    // 미니맵 조작 시 미래 시각 검증
    const [y, m, d] = simulationDate.split("-");
    const currentYear = parseInt(y || "2026", 10);
    const currentM = parseInt(m || "1", 10);
    const currentD = parseInt(d || "1", 10);

    const target = new Date(currentYear, currentM - 1, currentD, hour, 0, 0);
    const now = new Date();

    if (target > now) {
      triggerToast("미래 시점의 수요 데이터는 조회할 수 없습니다.");
      const safeHour = now.getHours();
      setHeatmapHour(safeHour);
      setSimulationTimeMinutes(safeHour * 60);
      return;
    }

    setHeatmapHour(hour);
    setSimulationTimeMinutes(hour * 60);
  }

  return (
    <>
      {/* 커스텀 토스트 알림 오버레이 */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 z-[9999] -translate-x-1/2 animate-bounce">
          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-slate-950/90 px-4 py-3 text-sm font-semibold text-rose-200 shadow-2xl backdrop-blur-md shadow-rose-950/20">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
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
            onValidationError={triggerToast}
          />
        ) : null}

        {/* 예측 택시 공급 마커 슬라이더 — 실시간/과거 공통 */}
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1.5">
            예측 택시 공급 마커
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-slate-900/30 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {selectedDongName} 예측 공급의{" "}
                <span className="font-bold text-amber-300 tabular-nums">
                  {effectiveTaxiMarkerScalePercent.toFixed(1)}%
                </span>
                {" "}표시 중
              </span>
              <span className="text-sm font-bold tabular-nums text-slate-50">
                마커 {appliedTaxiCount.toLocaleString("ko-KR")}개
              </span>
            </div>
            <input
              type="range"
              min={TAXI_MARKER_SCALE_MIN_PERCENT}
              max={maxSafeTaxiMarkerScalePercent}
              step={TAXI_MARKER_SCALE_STEP_PERCENT}
              value={effectiveTaxiMarkerScalePercent}
              onChange={(event) => {
                setTaxiMarkerScalePercent(
                  Math.min(Number(event.target.value), maxSafeTaxiMarkerScalePercent),
                );
              }}
              className="h-1.5 w-full accent-amber-300"
              aria-label="예측 택시 공급 마커 표시 비율"
            />
            <div className="mt-1 text-[9px] leading-3 text-slate-500">
              공급 모델의 시간대별 택시 공급량을 축약해 지도에 띄운 마커입니다.
            </div>
            <div className="mt-1 text-[9px] leading-3 text-slate-500">
              수요 {Math.round(currentFiveMinuteDemand).toLocaleString("ko-KR")}건/h ·
              공급 {currentSupplyValue === null ? "-" : Math.round(currentSupplyValue).toLocaleString("ko-KR")}대 ·
              전체 공급 {Math.round(currentMapSupply).toLocaleString("ko-KR")}대 ·
              택시 마커 {appliedMapTaxiCount.toLocaleString("ko-KR")}개 ·
              최대 {maxSafeTaxiMarkerScalePercent.toFixed(1)}%
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
              <div className={PANEL_SECTION_LABEL_CLASS}>분석 시뮬레이터</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-slate-100">
                시간대별 데이터 분석 및 인센티브
              </div>
            </div>
          </div>
        </div>

        {/* 대시보드 모드 전환 탭 */}
        <div className="mt-4 flex rounded-xl bg-slate-950/50 p-1 border border-white/5 shadow-inner">
          <button
            onClick={() => setMinimapShadingMode("demand")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              minimapShadingMode === "demand"
                ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 shadow-md shadow-cyan-900/40"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            수요 분석
          </button>
          <button
            onClick={() => setMinimapShadingMode("supply")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              minimapShadingMode === "supply"
                ? "bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shadow-md shadow-emerald-900/40"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            공급 분석
          </button>
          <button
            onClick={() => setMinimapShadingMode("shortage")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              minimapShadingMode === "shortage"
                ? "bg-amber-500/20 border border-amber-400/30 text-amber-300 shadow-md shadow-amber-900/40"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            인센티브
          </button>
        </div>

        <DemandControls
          selectedDongName={selectedDongName}
          setSelectedDongName={setSelectedDongName}
        />

        {/* 탭별 통계 수치 시각화 */}
        {minimapShadingMode === "demand" && (
          <DemandSummaryStats
            hasDemandData={hasDemandData}
            selectedPeakDemand={selectedPeakDemand}
            selectedDemandIntensityLabel={selectedDemandIntensityLabel}
            currentDemandSlot={currentDemandSlot}
            currentTaxiDemandBase={currentFiveMinuteDemand}
            currentTaxiSupplyBase={currentSupplyValue}
            appliedTaxiCount={appliedTaxiCount}
          />
        )}

        {minimapShadingMode === "supply" && (
          <div className="mt-4 space-y-3 rounded-2xl border border-white/5 bg-slate-900/20 p-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-950/45 p-2.5 border border-white/5">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">평균 공급량</span>
                <div className="mt-1 text-base font-bold text-emerald-400">
                  {selectedAverageSupply.toLocaleString("ko-KR")}대
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/45 p-2.5 border border-white/5">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">피크 공급량</span>
                <div className="mt-1 text-base font-bold text-slate-100">
                  {selectedPeakSupply ? `${selectedPeakSupply.hour}시` : "-"}
                  <span className="text-[10.5px] text-slate-400 font-medium ml-1.5">
                    ({selectedPeakSupply ? Math.round(selectedPeakSupply.supplyPred).toLocaleString("ko-KR") : "0"}대)
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 text-[10.5px] font-medium text-slate-400">
              조회 {String(heatmapHour).padStart(2, "0")}:00 기준 · 수요{" "}
              {Math.round(currentFiveMinuteDemand).toLocaleString("ko-KR")}건/h ·
              공급{" "}
              {currentSupplyValue === null
                ? "-"
                : Math.round(currentSupplyValue).toLocaleString("ko-KR")}
              {currentSupplyValue === null ? "" : "대"}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="text-center">
                <span className="text-[9.5px] text-slate-400 font-semibold">현재 공급량</span>
                <div className="mt-1 text-sm font-bold text-emerald-300">
                  {currentSupplyPoint ? Math.round(currentSupplyPoint.supplyPred).toLocaleString("ko-KR") : "-"}대
                </div>
              </div>
              <div className="text-center border-x border-white/5">
                <span className="text-[9.5px] text-slate-400 font-semibold">현재 차이</span>
                <div className="mt-1 text-sm font-bold text-rose-400">
                  {currentSupplyDemandGap === null
                    ? "-"
                    : Math.round(currentSupplyDemandGap).toLocaleString("ko-KR")}
                  {currentSupplyDemandGap === null ? "" : "대"}
                </div>
              </div>
              <div className="text-center">
                <span className="text-[9.5px] text-slate-400 font-semibold">현재 미충족률</span>
                <div className="mt-1 text-sm font-bold text-amber-400">
                  {currentSupplyDemandGapRatio === null
                    ? "-"
                    : `${(currentSupplyDemandGapRatio * 100).toFixed(1)}%`}
                </div>
              </div>
            </div>
          </div>
        )}

        {minimapShadingMode === "shortage" && (
          <div className="mt-4 space-y-3 rounded-2xl border border-white/5 bg-slate-900/20 p-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-950/45 p-2.5 border border-white/5">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">서지 요금 배율</span>
                <div className="mt-1 text-base font-bold text-amber-400">
                  {currentPricingPoint ? `${currentPricingPoint.surgeMultiplier.toFixed(2)}x` : "1.00x"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/45 p-2.5 border border-white/5">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">추천 인센티브</span>
                <div className="mt-1 text-base font-bold text-cyan-400">
                  {currentPricingPoint ? `${currentPricingPoint.suggestedDriverIncentiveKrw.toLocaleString("ko-KR")}원` : "0원"}
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 space-y-2 text-[11px]">
              <div className="flex justify-between items-center text-slate-400">
                <span>인센티브 도입 시 공급 증가 (예상)</span>
                <span className="font-semibold text-emerald-400">
                  +{currentPricingPoint ? Math.round(currentPricingPoint.expectedSupplyIncrease).toLocaleString("ko-KR") : "0"}대
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>도입 후 잔여 부족량 (예상)</span>
                <span className="font-semibold text-slate-300">
                  {currentPricingPoint ? Math.round(currentPricingPoint.postIncentiveShortage).toLocaleString("ko-KR") : "0"}대
                </span>
              </div>
            </div>
          </div>
        )}

        <DemandChart
          hasDemandData={hasDemandData}
          selectedDongName={selectedDongName}
          simulationDate={simulationDate}
          demandChart={demandChart}
          selectedAverageDemand={selectedAverageDemand}
          currentHour={heatmapHour}
          onHourSelect={handleHeatmapHourChange}
          minimapShadingMode={minimapShadingMode}
          pricingChart={pricingChart}
          selectedAverageSupply={selectedAverageSupply}
        />
      </div>

      <DemandMiniMapPanel
        demandMiniMap={demandMiniMap}
        heatmapFetchStatus={heatmapFetchStatus}
        heatmapHour={heatmapHour}
        heatmapMaxDemand={heatmapMaxDemand}
        selectedDongName={selectedDongName}
        setHeatmapHour={handleHeatmapHourChange}
        mapPoiFeatureRows={mapPoiFeatureRows}
        onPoiSelect={onPoiSelect}
        onDongSelect={setSelectedDongName}
        circumstanceMode={circumstanceMode}
        minimapShadingMode={minimapShadingMode}
        setMinimapShadingMode={setMinimapShadingMode}
      />
    </div>
    </>
  );
});
