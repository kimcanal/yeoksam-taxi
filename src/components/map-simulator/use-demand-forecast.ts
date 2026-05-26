import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TAXI_COUNT } from "@/components/map-simulator/simulation-defaults";
import { DEMAND_SLOT_MINUTES } from "@/components/map-simulator/constants/demand-constants";
import {
  averageDemand,
  buildDemandChartGeometry,
  buildFiveMinuteDemandSeries,
  normalizeRemoteDemandPoints,
  scoreDemandAtHour,
  weekdayIdFromDate,
} from "@/components/map-simulator/demand-math";
import type {
  DemandFetchStatus,
  DemandWeekdayId,
  HourlyDemandPoint,
} from "@/components/map-simulator/demand-types";

const DEMAND_API_ENDPOINT =
  process.env.NEXT_PUBLIC_DEMAND_API_ENDPOINT?.trim() || "/api/demand";

export function useDemandForecast({
  simulationDate,
  normalizedSimulationTimeMinutes,
}: {
  simulationDate: string;
  normalizedSimulationTimeMinutes: number;
}) {
  const [selectedDongName, setSelectedDongName] = useState<string>("역삼1동");
  const [selectedWeekday, setSelectedWeekday] = useState<DemandWeekdayId>(
    () => weekdayIdFromDate(simulationDate),
  );
  const [remoteDemandPoints, setRemoteDemandPoints] = useState<
    HourlyDemandPoint[] | null
  >(null);
  const [demandFetchStatus, setDemandFetchStatus] =
    useState<DemandFetchStatus>("idle");

  const hourlyDemandSeries = useMemo(
    () => remoteDemandPoints ?? [],
    [remoteDemandPoints],
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
  const selectedDemandHour = Math.floor(normalizedSimulationTimeMinutes / 60);

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL(DEMAND_API_ENDPOINT, window.location.origin);
    url.searchParams.set("dong", selectedDongName);
    url.searchParams.set("date", simulationDate);
    url.searchParams.set("hour", String(selectedDemandHour));
    url.searchParams.set("timezone", "Asia/Seoul");
    url.searchParams.set("weekday", selectedWeekday);
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setRemoteDemandPoints(null);
        setDemandFetchStatus("loading");
      }
    });

    fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Demand API request failed: ${response.status}`);
        }
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        const normalized = normalizeRemoteDemandPoints(payload);
        if (!normalized) {
          throw new Error("Demand API response has no valid points.");
        }
        setRemoteDemandPoints(normalized);
        setDemandFetchStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setRemoteDemandPoints(null);
        setDemandFetchStatus("error");
      });

    return () => controller.abort();
  }, [
    selectedDemandHour,
    selectedDongName,
    selectedWeekday,
    simulationDate,
  ]);

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
  const demandFetchBadgeText =
    demandFetchStatus === "ready"
      ? "AI 모델 연동"
      : demandFetchStatus === "loading"
        ? "데이터 분석 중"
        : demandFetchStatus === "error"
          ? "분석 엔진 대기"
          : "시나리오 모드";
  const demandFetchBadgeClass =
    demandFetchStatus === "ready"
      ? "border-sky-300/25 bg-sky-300/[0.08] text-sky-100"
      : demandFetchStatus === "loading"
        ? "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100"
        : demandFetchStatus === "error"
          ? "border-rose-300/25 bg-rose-300/[0.08] text-rose-100"
          : "border-slate-500/30 bg-slate-500/[0.08] text-slate-300";

  function setSimulationDateWeekday(date: string) {
    setSelectedWeekday(weekdayIdFromDate(date));
  }

  return {
    selectedDongName,
    setSelectedDongName,
    selectedWeekday,
    setSelectedWeekday,
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
    demandFetchStatus,
    demandFetchBadgeText,
    demandFetchBadgeClass,
    setSimulationDateWeekday,
  };
}
