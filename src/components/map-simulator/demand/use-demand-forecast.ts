import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TAXI_COUNT } from "@/components/map-simulator/simulation";
import {
  DEMAND_SLOT_MINUTES,
  DEMAND_TAXI_SCALE_DEFAULT_PERCENT,
  DEMAND_TAXI_SCALE_MAX_PERCENT,
  DEMAND_TAXI_SCALE_MIN_PERCENT,
  DEMAND_TAXI_SCALE_STEP_PERCENT,
  DEMAND_VISUAL_MAX_TAXIS,
} from "@/components/map-simulator/constants/demand-constants";
import {
  averageDemand,
  buildDemandChartGeometry,
  buildFiveMinuteDemandSeries,
  normalizeRemoteDailyDemandSeries,
  scoreDemandAtHour,
  TARGET_DONGS,
} from "@/components/map-simulator/demand";
import type {
  DemandFetchStatus,
  HourlyDemandPoint,
} from "@/components/map-simulator/demand";
import type { CircumstanceMode } from "@/components/map-simulator/types";

const DEMAND_API_ENDPOINT =
  process.env.NEXT_PUBLIC_DEMAND_API_ENDPOINT?.trim() || "/api/demand";

type DemandSeriesByDong = Record<string, HourlyDemandPoint[]>;

let todayDemandCache: DemandSeriesByDong | null = null;

function demandAtHour(points: HourlyDemandPoint[] | undefined, hour: number) {
  return points?.find((point) => point.hour === hour)?.demandPred ?? null;
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
  const [heatmapHour, setHeatmapHour] = useState(() =>
    Math.floor(normalizedSimulationTimeMinutes / 60),
  );
  const [taxiDemandScalePercent, setTaxiDemandScalePercent] = useState(
    DEMAND_TAXI_SCALE_DEFAULT_PERCENT,
  );
  const [heatmapFetchStatus, setHeatmapFetchStatus] =
    useState<DemandFetchStatus>(() => (DEMAND_API_ENDPOINT ? "idle" : "error"));
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
  const hasDemandData = hourlyDemandSeries.length > 0;
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
  const currentMapDemand = useMemo(
    () =>
      TARGET_DONGS.reduce((sum, dongName) => {
        const demand =
          demandAtHour(demandSeriesByDong[dongName], effectiveHeatmapHour) ?? 0;
        return sum + demand;
      }, 0),
    [demandSeriesByDong, effectiveHeatmapHour],
  );
  const hasAnyDemandData = Object.values(demandSeriesByDong).some(
    (series) => series.length > 0,
  );
  const maxSafeTaxiScalePercent = currentMapDemand > 0
    ? Math.max(
        DEMAND_TAXI_SCALE_MIN_PERCENT,
        Math.min(
          DEMAND_TAXI_SCALE_MAX_PERCENT,
          Math.floor(
            (DEMAND_VISUAL_MAX_TAXIS / currentMapDemand) *
              100 *
              (1 / DEMAND_TAXI_SCALE_STEP_PERCENT),
          ) * DEMAND_TAXI_SCALE_STEP_PERCENT,
        ),
      )
    : DEMAND_TAXI_SCALE_MAX_PERCENT;
  const effectiveTaxiDemandScalePercent = Math.min(
    taxiDemandScalePercent,
    maxSafeTaxiScalePercent,
  );
  const appliedTaxiCount = hasDemandData
    ? Math.min(
        DEMAND_VISUAL_MAX_TAXIS,
        Math.round(currentFiveMinuteDemand * (effectiveTaxiDemandScalePercent / 100)),
      )
    : DEFAULT_TAXI_COUNT;
  const appliedMapTaxiCount = hasAnyDemandData
    ? Math.min(
        DEMAND_VISUAL_MAX_TAXIS,
        Math.round(currentMapDemand * (effectiveTaxiDemandScalePercent / 100)),
      )
    : DEFAULT_TAXI_COUNT;

  useEffect(() => {
    if (!DEMAND_API_ENDPOINT) {
      return;
    }

    // 현실 기준 오늘 날짜(KST) 구하기
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const todayStr = new Date(Date.now() + KST_OFFSET).toISOString().slice(0, 10);
    const isToday = simulationDate === todayStr;

    // 만약 오늘 날짜이고 이미 메모리 캐시에 데이터가 존재한다면 즉각 반환하고 통신 생략!
    if (isToday && todayDemandCache) {
      setDemandSeriesByDong(todayDemandCache);
      setHeatmapFetchStatus("ready");
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setHeatmapFetchStatus("loading");
      }
    });

    async function fetchDailySeries() {
      const url = new URL(DEMAND_API_ENDPOINT, window.location.origin);
      url.searchParams.set("scope", "daily");
      url.searchParams.set("date", simulationDate);
      
      // 오늘인 경우 브라우저 HTTP 캐싱을 타도록 cache: "default" 지정, 과거일 땐 no-store 유지
      const response = await fetch(url.toString(), {
        cache: isToday ? "default" : "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        console.warn(
          `Daily demand heatmap request failed: ${response.status}`,
        );
        return {};
      }
      const normalized = normalizeRemoteDailyDemandSeries(
        await response.json(),
      );
      if (!normalized) {
        console.warn("Daily demand heatmap response invalid.");
        return {};
      }
      return normalized;
    }

    fetchDailySeries()
      .catch((error) => {
        if (controller.signal.aborted) {
          return null;
        }
        console.warn(
          `Daily demand heatmap request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return {};
      })
      .then((nextSeries) => {
        if (controller.signal.aborted || nextSeries === null) {
          return;
        }

        // 가져온 데이터가 오늘이고 유효하다면 오늘 전용 런타임 메모리 캐시에 박제!
        if (isToday && Object.keys(nextSeries).length > 0) {
          todayDemandCache = nextSeries;
        }

        setDemandSeriesByDong(nextSeries);
        setHeatmapFetchStatus(
          Object.keys(nextSeries).length > 0 ? "ready" : "error",
        );
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.warn(
          `Demand heatmap request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        setDemandSeriesByDong({});
        setHeatmapFetchStatus("error");
      });

    return () => controller.abort();
  }, [liveHourlyRefreshKey, simulationDate]);

  const demandChart = useMemo(
    () => buildDemandChartGeometry(hourlyDemandSeries),
    [hourlyDemandSeries],
  );
  const selectedAverageDemand = averageDemand(hourlyDemandSeries);
  const selectedPeakDemand = demandChart.peakPoint;
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

  return {
    selectedDongName,
    setSelectedDongName,
    currentDemandSlot,
    currentDemandVisualUnits,
    currentFiveMinuteDemand,
    currentMapDemand,
    taxiDemandScalePercent,
    effectiveTaxiDemandScalePercent,
    maxSafeTaxiScalePercent,
    setTaxiDemandScalePercent,
    appliedTaxiCount,
    appliedMapTaxiCount,
    hasDemandData,
    demandChart,
    selectedAverageDemand,
    selectedPeakDemand,
    selectedDemandScore,
    selectedDemandIntensityLabel,
    heatmapDemandByDong,
    heatmapFetchStatus,
    heatmapHour: effectiveHeatmapHour,
    heatmapDailyMaxDemand,
    heatmapMaxDemand,
    setHeatmapHour,
    demandFetchStatus,
    demandFetchBadgeText,
    demandFetchBadgeClass,
  };
}
