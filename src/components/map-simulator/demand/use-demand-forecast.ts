import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEMAND_SLOT_MINUTES,
  DEMAND_VISUAL_MAX_TAXIS,
  TAXI_MARKER_SCALE_DEFAULT_PERCENT,
  TAXI_MARKER_SCALE_MAX_PERCENT,
  TAXI_MARKER_SCALE_MIN_PERCENT,
  TAXI_MARKER_SCALE_STEP_PERCENT,
} from "@/components/map-simulator/constants/demand-constants";
import {
  averageDemand,
  buildDemandChartGeometry,
  buildFiveMinuteDemandSeries,
  normalizeRemoteDailyDemandSeries,
  scoreDemandAtHour,
  TARGET_DONGS,
  normalizeRemoteDailySupplySeries,
  normalizeRemotePricingSeries,
  buildPricingChartGeometry,
  buildDongDemandScores,
} from "@/components/map-simulator/demand";
import type {
  DemandFetchStatus,
  HourlyDemandPoint,
  HourlySupplyPoint,
  HourlyPricingPoint,
} from "@/components/map-simulator/demand";
import type { CircumstanceMode } from "@/components/map-simulator/types";

const DEMAND_API_ENDPOINT =
  process.env.NEXT_PUBLIC_DEMAND_API_ENDPOINT?.trim() || "/api/demand";

type DemandSeriesByDong = Record<string, HourlyDemandPoint[]>;

function demandAtHour(points: HourlyDemandPoint[] | undefined, hour: number) {
  return points?.find((point) => point.hour === hour)?.demandPred ?? null;
}

function supplyAtHour(points: HourlySupplyPoint[] | undefined, hour: number) {
  return points?.find((point) => point.hour === hour)?.supplyPred ?? null;
}

function hasCompleteTargetDemandSeries(seriesByDong: DemandSeriesByDong) {
  return TARGET_DONGS.every((dongName) => {
    const series = seriesByDong[dongName] ?? [];
    if (series.length < 24) {
      return false;
    }

    const hours = new Set(series.map((point) => point.hour));
    for (let hour = 0; hour < 24; hour += 1) {
      if (!hours.has(hour)) {
        return false;
      }
    }
    return true;
  });
}

export function useDemandForecast({
  circumstanceMode,
  simulationDate,
  normalizedSimulationTimeMinutes,
}: {
  circumstanceMode: CircumstanceMode;
  simulationDate: string;
  normalizedSimulationTimeMinutes: number;
}) {
  const [selectedDongName, setSelectedDongName] = useState<string>("역삼1동");
  const [demandSeriesByDong, setDemandSeriesByDong] =
    useState<DemandSeriesByDong>({});
  const [supplySeriesByDong, setSupplySeriesByDong] =
    useState<Record<string, HourlySupplyPoint[]>>({});
  const [pricingSeriesByDong, setPricingSeriesByDong] =
    useState<Record<string, HourlyPricingPoint[]>>({});

  const [minimapShadingMode, setMinimapShadingMode] =
    useState<"demand" | "supply" | "shortage">("demand");

  const [heatmapHour, setHeatmapHour] = useState(() =>
    Math.floor(normalizedSimulationTimeMinutes / 60),
  );
  const [taxiMarkerScalePercent, setTaxiMarkerScalePercent] = useState(
    TAXI_MARKER_SCALE_DEFAULT_PERCENT,
  );
  const [heatmapFetchStatus, setHeatmapFetchStatus] =
    useState<DemandFetchStatus>(() => (DEMAND_API_ENDPOINT ? "idle" : "error"));
  const dashboardFetchSeqRef = useRef(0);
  const demandFetchStatus = heatmapFetchStatus;
  const selectedForecastHour = Math.floor(normalizedSimulationTimeMinutes / 60);
  const liveHourlyRefreshKey =
    circumstanceMode === "live"
      ? `${simulationDate}:${selectedForecastHour}`
      : "";
  const effectiveHeatmapHour =
    circumstanceMode === "live" ? selectedForecastHour : heatmapHour;
  const effectiveDemandTimeMinutes = effectiveHeatmapHour * 60;

  const hourlyDemandSeries = useMemo(
    () => demandSeriesByDong[selectedDongName] ?? [],
    [demandSeriesByDong, selectedDongName],
  );
  const hourlySupplySeries = useMemo(
    () => supplySeriesByDong[selectedDongName] ?? [],
    [supplySeriesByDong, selectedDongName],
  );
  const hourlyPricingSeries = useMemo(
    () => pricingSeriesByDong[selectedDongName] ?? [],
    [pricingSeriesByDong, selectedDongName],
  );

  const hasDemandData = hourlyDemandSeries.length > 0;
  const hasSupplyData = hourlySupplySeries.length > 0;
  const hasPricingData = hourlyPricingSeries.length > 0;

  const fiveMinuteDemandSeries = useMemo(
    () => buildFiveMinuteDemandSeries(hourlyDemandSeries),
    [hourlyDemandSeries],
  );
  const currentDemandSlot = useMemo(() => {
    if (!fiveMinuteDemandSeries.length) {
      return null;
    }
    const slotIndex = Math.min(
      fiveMinuteDemandSeries.length - 1,
      Math.floor(effectiveDemandTimeMinutes / DEMAND_SLOT_MINUTES),
    );
    return fiveMinuteDemandSeries[slotIndex] ?? null;
  }, [effectiveDemandTimeMinutes, fiveMinuteDemandSeries]);
  const currentDemandVisualUnits = currentDemandSlot?.visualUnits ?? 0;
  const currentFiveMinuteDemand = currentDemandSlot?.demand ?? 0;

  const currentSupplyPoint = useMemo(
    () => hourlySupplySeries.find((p) => p.hour === effectiveHeatmapHour) ?? null,
    [hourlySupplySeries, effectiveHeatmapHour],
  );
  const currentPricingPoint = useMemo(
    () => hourlyPricingSeries.find((p) => p.hour === effectiveHeatmapHour) ?? null,
    [hourlyPricingSeries, effectiveHeatmapHour],
  );

  const currentMapSupply = useMemo(
    () =>
      TARGET_DONGS.reduce((sum, dongName) => {
        const supply =
          supplyAtHour(supplySeriesByDong[dongName], effectiveHeatmapHour) ?? 0;
        return sum + supply;
      }, 0),
    [supplySeriesByDong, effectiveHeatmapHour],
  );
  const hasAnySupplyData = Object.values(supplySeriesByDong).some(
    (series) => series.length > 0,
  );
  const maxSafeTaxiMarkerScalePercent = currentMapSupply > 0
    ? Math.max(
        TAXI_MARKER_SCALE_MIN_PERCENT,
        Math.min(
          TAXI_MARKER_SCALE_MAX_PERCENT,
          Math.floor(
            (DEMAND_VISUAL_MAX_TAXIS / currentMapSupply) *
              100 *
              (1 / TAXI_MARKER_SCALE_STEP_PERCENT),
          ) * TAXI_MARKER_SCALE_STEP_PERCENT,
        ),
      )
    : TAXI_MARKER_SCALE_MAX_PERCENT;
  const effectiveTaxiMarkerScalePercent = Math.min(
    taxiMarkerScalePercent,
    maxSafeTaxiMarkerScalePercent,
  );
  const appliedTaxiCount = currentSupplyPoint
    ? Math.min(
        DEMAND_VISUAL_MAX_TAXIS,
        Math.round(currentSupplyPoint.supplyPred * (effectiveTaxiMarkerScalePercent / 100)),
      )
    : 0;
  const appliedMapTaxiCount = hasAnySupplyData
    ? Math.min(
        DEMAND_VISUAL_MAX_TAXIS,
        Math.round(currentMapSupply * (effectiveTaxiMarkerScalePercent / 100)),
      )
    : 0;

  useEffect(() => {
    if (!DEMAND_API_ENDPOINT) {
      return;
    }

    const requestSeq = dashboardFetchSeqRef.current + 1;
    dashboardFetchSeqRef.current = requestSeq;
    const controller = new AbortController();
    const isCurrentRequest = () =>
      dashboardFetchSeqRef.current === requestSeq && !controller.signal.aborted;

    queueMicrotask(() => {
      if (isCurrentRequest()) {
        setHeatmapFetchStatus("loading");
      }
    });

    async function fetchDashboardData() {
      const cacheMode: RequestCache = "no-store";

      // 1. Fetch weather first to determine the daily weather code
      const wUrl = `/api/weather?date=${simulationDate.replaceAll("-", "")}`;
      let weatherCode = 1;
      try {
        const wRes = await fetch(wUrl, {
          cache: cacheMode,
          signal: controller.signal,
        });
        if (wRes.ok) {
          const wJson = await wRes.json();
          const weatherObj = wJson.weather || {};
          const hours = Object.values(weatherObj) as { prcp_mm?: number; temp_c?: number }[];
          if (hours.length > 0) {
            const avgPrec = hours.reduce((s, h) => s + (h.prcp_mm || 0), 0) / hours.length;
            const avgTemp = hours.reduce((s, h) => s + (h.temp_c || 20), 0) / hours.length;
            if (avgPrec > 0.3 && avgTemp < 2) {
              weatherCode = 3;
            } else if (avgPrec > 0.3) {
              weatherCode = 2;
            }
          }
        }
      } catch (e) {
        if (controller.signal.aborted) {
          throw e;
        }
        console.warn("Failed to fetch weather for supply mapping:", e);
      }

      const demandUrl = new URL(DEMAND_API_ENDPOINT, window.location.origin);
      demandUrl.searchParams.set("scope", "daily");
      demandUrl.searchParams.set("date", simulationDate);
      const supplyUrl = `/api/supply?scope=daily&date=${simulationDate}&weather=${weatherCode}&scale=pattern&alpha=0.35`;
      const pricingUrl = `/api/pricing?scope=dong-hourly&date=${simulationDate}&weather=${weatherCode}`;

      // 2. Demand는 독립적으로 먼저 fetch — supply/pricing 실패해도 수요는 표시
      const demRes = await fetch(demandUrl.toString(), {
        cache: cacheMode,
        signal: controller.signal,
      });
      if (!demRes.ok) {
        throw new Error(`Demand API failed: ${demRes.status}`);
      }
      const demJson = await demRes.json();
      const normalizedDem = normalizeRemoteDailyDemandSeries(demJson);
      if (!normalizedDem || !hasCompleteTargetDemandSeries(normalizedDem)) {
        throw new Error("Demand API returned an incomplete 24-hour series");
      }

      // 3. Supply/Pricing은 실패해도 수요 표시에 영향 없도록 별도 처리
      const [supResult, prcResult] = await Promise.allSettled([
        fetch(supplyUrl, { cache: cacheMode, signal: controller.signal })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Supply ${r.status}`)))),
        fetch(pricingUrl, { cache: cacheMode, signal: controller.signal })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Pricing ${r.status}`)))),
      ]);

      const normalizedSup =
        supResult.status === "fulfilled"
          ? normalizeRemoteDailySupplySeries(supResult.value) ?? {}
          : {};
      const normalizedPrc =
        prcResult.status === "fulfilled"
          ? normalizeRemotePricingSeries(prcResult.value) ?? {}
          : {};

      if (supResult.status === "rejected") {
        console.warn("Supply API failed (demand still shown):", supResult.reason);
      }
      if (prcResult.status === "rejected") {
        console.warn("Pricing API failed (demand still shown):", prcResult.reason);
      }

      return {
        demand: normalizedDem,
        supply: normalizedSup,
        pricing: normalizedPrc,
      };
    }

    fetchDashboardData()
      .then((res) => {
        if (!isCurrentRequest()) {
          return;
        }
        setDemandSeriesByDong(res.demand);
        setSupplySeriesByDong(res.supply);
        setPricingSeriesByDong(res.pricing);

        const hasAny = Object.keys(res.demand).length > 0;
        setHeatmapFetchStatus(hasAny ? "ready" : "error");
      })
      .catch((error) => {
        if (!isCurrentRequest()) {
          return;
        }
        console.error("Demand fetch failed:", error);
        setDemandSeriesByDong({});
        setSupplySeriesByDong({});
        setPricingSeriesByDong({});
        setHeatmapFetchStatus("error");
      });

    return () => controller.abort();
  }, [liveHourlyRefreshKey, simulationDate]);

  const demandChart = useMemo(
    () => buildDemandChartGeometry(hourlyDemandSeries, hourlySupplySeries),
    [hourlyDemandSeries, hourlySupplySeries],
  );

  const pricingChart = useMemo(
    () => buildPricingChartGeometry(hourlyPricingSeries),
    [hourlyPricingSeries],
  );

  const selectedAverageDemand = averageDemand(hourlyDemandSeries);
  const selectedAverageSupply = useMemo(
    () =>
      hourlySupplySeries.length
        ? Math.round(hourlySupplySeries.reduce((sum, p) => sum + p.supplyPred, 0) / hourlySupplySeries.length)
        : 0,
    [hourlySupplySeries],
  );

  const selectedPeakDemand = demandChart.peakPoint;
  const selectedPeakSupply = demandChart.peakSupplyPoint;

  const selectedDemandScore = useMemo(
    () => scoreDemandAtHour(hourlyDemandSeries, effectiveDemandTimeMinutes),
    [effectiveDemandTimeMinutes, hourlyDemandSeries],
  );
  const selectedDemandIntensityLabel =
    selectedDemandScore === null
      ? "-"
      : `${Math.round(selectedDemandScore * 100).toLocaleString("ko-KR")}%`;

  const heatmapAllDemandByDong = useMemo(() => {
    const entries = TARGET_DONGS.flatMap((dongName) => {
      const demand = demandAtHour(
        demandSeriesByDong[dongName],
        effectiveHeatmapHour,
      );
      return demand === null ? [] : ([[dongName, demand]] as const);
    });
    return Object.fromEntries(entries) as Record<string, number>;
  }, [demandSeriesByDong, effectiveHeatmapHour]);
  const heatmapDailyMaxDemand = useMemo(
    () =>
      Math.max(
        0,
        ...Object.values(demandSeriesByDong).flatMap((series) =>
          series.map((point) => point.demandPred),
        ),
      ),
    [demandSeriesByDong],
  );
  const dongDailyMaxDemands = useMemo(() => {
    const maxes: Record<string, number> = {};
    Object.entries(demandSeriesByDong).forEach(([dongName, series]) => {
      maxes[dongName] = Math.max(0, ...series.map((point) => point.demandPred));
    });
    return maxes;
  }, [demandSeriesByDong]);
  const heatmapDemandByDong = heatmapAllDemandByDong;
  const heatmapMaxDemand = Math.max(0, ...Object.values(heatmapDemandByDong));
  const demandFetchBadgeText =
    demandFetchStatus === "ready"
      ? "백엔드 연동"
      : demandFetchStatus === "loading"
        ? "API 요청 중"
        : demandFetchStatus === "error"
          ? DEMAND_API_ENDPOINT
            ? "API 오류"
            : "API 설정 필요"
          : "API 대기";
  const demandFetchBadgeClass =
    demandFetchStatus === "ready"
      ? "border-sky-300/25 bg-sky-300/[0.08] text-sky-100"
      : demandFetchStatus === "loading"
        ? "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100"
        : demandFetchStatus === "error"
          ? "border-rose-300/25 bg-rose-300/[0.08] text-rose-100"
          : "border-slate-500/30 bg-slate-500/[0.08] text-slate-300";

  // 미니맵 쉐이딩 연계 점수 계산
  const dongDemandScores = useMemo(
    () =>
      buildDongDemandScores(
        heatmapDemandByDong,
        dongDailyMaxDemands,
      ),
    [dongDailyMaxDemands, heatmapDemandByDong],
  );

  const dongSupplyScores = useMemo(() => {
    const scores: Record<string, number> = {};
    Object.entries(supplySeriesByDong).forEach(([dongName, series]) => {
      const maxVal = Math.max(0, ...series.map((p) => p.supplyPred));
      const current = series.find((p) => p.hour === effectiveHeatmapHour)?.supplyPred ?? 0;
      scores[dongName] = maxVal > 0 ? current / maxVal : 0;
    });
    return scores;
  }, [supplySeriesByDong, effectiveHeatmapHour]);

  const dongShortageScores = useMemo(() => {
    const scores: Record<string, number> = {};
    TARGET_DONGS.forEach((dongName) => {
      const demSeries = demandSeriesByDong[dongName] || [];
      const supSeries = supplySeriesByDong[dongName] || [];
      const dem = demSeries.find((p) => p.hour === effectiveHeatmapHour)?.demandPred ?? 0;
      const sup = supSeries.find((p) => p.hour === effectiveHeatmapHour)?.supplyPred ?? 0;
      const shortage = Math.max(0, dem - sup);
      scores[dongName] = dem > 0 ? shortage / dem : 0;
    });
    return scores;
  }, [demandSeriesByDong, supplySeriesByDong, effectiveHeatmapHour]);

  const activeMiniMapScores = useMemo(() => {
    if (minimapShadingMode === "supply") return dongSupplyScores;
    if (minimapShadingMode === "shortage") return dongShortageScores;
    return dongDemandScores;
  }, [minimapShadingMode, dongDemandScores, dongSupplyScores, dongShortageScores]);

  const activeMiniMapCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TARGET_DONGS.forEach((dongName) => {
      if (minimapShadingMode === "supply") {
        counts[dongName] = supplySeriesByDong[dongName]?.find((p) => p.hour === effectiveHeatmapHour)?.supplyPred ?? 0;
      } else if (minimapShadingMode === "shortage") {
        const dem = demandSeriesByDong[dongName]?.find((p) => p.hour === effectiveHeatmapHour)?.demandPred ?? 0;
        const sup = supplySeriesByDong[dongName]?.find((p) => p.hour === effectiveHeatmapHour)?.supplyPred ?? 0;
        counts[dongName] = Math.max(0, dem - sup);
      } else {
        counts[dongName] = demandSeriesByDong[dongName]?.find((p) => p.hour === effectiveHeatmapHour)?.demandPred ?? 0;
      }
    });
    return counts;
  }, [minimapShadingMode, demandSeriesByDong, supplySeriesByDong, effectiveHeatmapHour]);

  return {
    selectedDongName,
    setSelectedDongName,
    currentDemandSlot,
    currentDemandVisualUnits,
    currentFiveMinuteDemand,
    currentSupplyPoint,
    currentPricingPoint,
    currentMapSupply,
    taxiMarkerScalePercent,
    effectiveTaxiMarkerScalePercent,
    maxSafeTaxiMarkerScalePercent,
    setTaxiMarkerScalePercent,
    appliedTaxiCount,
    appliedMapTaxiCount,
    hasDemandData,
    hasSupplyData,
    hasPricingData,
    demandChart,
    pricingChart,
    selectedAverageDemand,
    selectedAverageSupply,
    selectedPeakDemand,
    selectedPeakSupply,
    selectedDemandScore,
    selectedDemandIntensityLabel,
    heatmapDemandByDong,
    heatmapFetchStatus,
    heatmapHour: effectiveHeatmapHour,
    heatmapDailyMaxDemand,
    dongDailyMaxDemands,
    heatmapMaxDemand,
    setHeatmapHour,
    demandFetchStatus,
    demandFetchBadgeText,
    demandFetchBadgeClass,
    // 공급/가격/미니맵 상태 연동 추가
    supplySeriesByDong,
    pricingSeriesByDong,
    hourlySupplySeries,
    hourlyPricingSeries,
    minimapShadingMode,
    setMinimapShadingMode,
    activeMiniMapScores,
    activeMiniMapCounts,
    dongDemandScores,
  };
}
