import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TAXI_COUNT } from "@/components/map-simulator/simulation";
import { DEMAND_SLOT_MINUTES } from "@/components/map-simulator/constants/demand-constants";
import {
  averageDemand,
  buildDemandChartGeometry,
  buildFiveMinuteDemandSeries,
  normalizeRemoteDailyDemandSeries,
  normalizeRemoteDemandPoints,
  scoreDemandAtHour,
  TARGET_DONGS,
} from "@/components/map-simulator/demand";
import type {
  DemandFetchStatus,
  DemandHeatmapScope,
  HourlyDemandPoint,
} from "@/components/map-simulator/demand";
import type { CircumstanceMode } from "@/components/map-simulator/types";

const DEMAND_API_ENDPOINT =
  process.env.NEXT_PUBLIC_DEMAND_API_ENDPOINT?.trim() ?? "";

type DemandSeriesByDong = Record<string, HourlyDemandPoint[]>;

function demandAtHour(points: HourlyDemandPoint[] | undefined, hour: number) {
  return points?.find((point) => point.hour === hour)?.demandPred ?? null;
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
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
  const [heatmapScope, setHeatmapScope] =
    useState<DemandHeatmapScope>("all");
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
      Math.floor(normalizedSimulationTimeMinutes / DEMAND_SLOT_MINUTES),
    );
    return fiveMinuteDemandSeries[slotIndex] ?? null;
  }, [fiveMinuteDemandSeries, normalizedSimulationTimeMinutes]);
  const currentDemandVisualUnits = currentDemandSlot?.visualUnits ?? 0;
  const currentFiveMinuteDemand = currentDemandSlot?.demand ?? 0;
  const appliedTaxiCount = hasDemandData
    ? currentDemandVisualUnits
    : DEFAULT_TAXI_COUNT;



  useEffect(() => {
    if (!DEMAND_API_ENDPOINT) {
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
      const response = await fetch(url.toString(), {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `Daily demand heatmap request failed: ${response.status}`,
        );
      }
      const normalized = normalizeRemoteDailyDemandSeries(
        await response.json(),
      );
      if (!normalized) {
        throw new Error("Daily demand heatmap response invalid.");
      }
      return normalized;
    }

    async function fetchHourlySeriesByDong() {
      const results = await Promise.allSettled(
        TARGET_DONGS.map(async (dongName) => {
          const url = new URL(DEMAND_API_ENDPOINT, window.location.origin);
          url.searchParams.set("dong", dongName);
          url.searchParams.set("date", simulationDate);
          const response = await fetch(url.toString(), {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Demand heatmap request failed: ${response.status}`);
          }
          const normalized = normalizeRemoteDemandPoints(await response.json());
          if (!normalized) {
            throw new Error(`Demand heatmap response invalid: ${dongName}`);
          }
          return [dongName, normalized] as const;
        }),
      );
      const nextSeries: DemandSeriesByDong = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const [dongName, points] = result.value;
          nextSeries[dongName] = points;
        } else if (!controller.signal.aborted && !isAbortError(result.reason)) {
          console.error(result.reason);
        }
      });
      return nextSeries;
    }

    fetchDailySeries()
      .catch((error) => {
        if (controller.signal.aborted) {
          return null;
        }
        console.error(error);
        return fetchHourlySeriesByDong();
      })
      .then((nextSeries) => {
        if (controller.signal.aborted || nextSeries === null) {
          return;
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
        console.error(error);
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
    () => scoreDemandAtHour(hourlyDemandSeries, normalizedSimulationTimeMinutes),
    [hourlyDemandSeries, normalizedSimulationTimeMinutes],
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
  const heatmapDemandByDong = useMemo(() => {
    if (heatmapScope === "all") {
      return heatmapAllDemandByDong;
    }
    const selectedDemand = heatmapAllDemandByDong[selectedDongName];
    return selectedDemand === undefined
      ? {}
      : { [selectedDongName]: selectedDemand };
  }, [heatmapAllDemandByDong, heatmapScope, selectedDongName]);
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
    appliedTaxiCount,
    hasDemandData,
    demandChart,
    selectedAverageDemand,
    selectedPeakDemand,
    selectedDemandScore,
    selectedDemandIntensityLabel,
    heatmapDemandByDong,
    heatmapFetchStatus,
    heatmapHour: effectiveHeatmapHour,
    heatmapMaxDemand,
    heatmapScope,
    setHeatmapHour,
    setHeatmapScope,
    demandFetchStatus,
    demandFetchBadgeText,
    demandFetchBadgeClass,
  };
}
