import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TAXI_COUNT } from "@/components/map-simulator/simulation";
import { DEMAND_SLOT_MINUTES } from "@/components/map-simulator/constants/demand-constants";
import {
  averageDemand,
  buildDemandChartGeometry,
  buildFiveMinuteDemandSeries,
  normalizeRemoteDemandPoints,
  scoreDemandAtHour,
  weekdayIdFromDate,
} from "@/components/map-simulator/demand";
import type {
  DemandFetchStatus,
  DemandWeekdayId,
  HourlyDemandPoint,
} from "@/components/map-simulator/demand";

const DEMAND_API_ENDPOINT =
  process.env.NEXT_PUBLIC_DEMAND_API_ENDPOINT?.trim() ?? "";

// ---------------------------------------------------------------------------
// 메모리 캐시 + 백그라운드 프리페치
// ---------------------------------------------------------------------------

type CacheKey = string; // `${dong}:${date}:${weekday}`
const demandCache = new Map<CacheKey, HourlyDemandPoint[]>();
const inflight = new Set<CacheKey>();

const TARGET_DONGS = [
  "역삼1동","역삼2동","논현1동","논현2동",
  "삼성1동","삼성2동","신사동","청담동","대치4동",
] as const;

function cacheKey(dong: string, date: string, weekday: string) {
  return `${dong}:${date}:${weekday}`;
}

async function fetchAndCache(dong: string, date: string, weekday: string) {
  if (!DEMAND_API_ENDPOINT) return;
  const key = cacheKey(dong, date, weekday);
  if (demandCache.has(key) || inflight.has(key)) return;
  inflight.add(key);
  try {
    const url = new URL(DEMAND_API_ENDPOINT, location.origin);
    url.searchParams.set("dong", dong);
    url.searchParams.set("date", date);
    url.searchParams.set("weekday", weekday);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return;
    const payload = await res.json() as unknown;
    const normalized = normalizeRemoteDemandPoints(payload);
    if (normalized) demandCache.set(key, normalized);
  } catch {
    // 무시 — 프리페치 실패는 조용히 넘김
  } finally {
    inflight.delete(key);
  }
}

/** 캐시에 있는 모든 동의 현재 시간대 수요 점수 반환 */
export function getAllDongScoresFromCache(
  date: string,
  weekday: string,
  normalizedMinutes: number,
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const dong of TARGET_DONGS) {
    const key = cacheKey(dong, date, weekday);
    const points = demandCache.get(key);
    if (!points || !points.length) continue;
    const maxDemand = Math.max(...points.map((p) => p.demandPred));
    if (maxDemand <= 0) continue;
    const hour = Math.floor(normalizedMinutes / 60);
    const point = points.find((p) => p.hour === hour) ?? points[0];
    if (point) scores[dong] = point.demandPred / maxDemand;
  }
  return scores;
}

/** 현재 동 외 나머지 동을 백그라운드로 프리페치 */
function prefetchOtherDongs(currentDong: string, date: string, weekday: string) {
  for (const dong of TARGET_DONGS) {
    if (dong !== currentDong) {
      // 비동기 — 결과를 기다리지 않음
      void fetchAndCache(dong, date, weekday);
    }
  }
}

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
    useState<DemandFetchStatus>(() => (DEMAND_API_ENDPOINT ? "idle" : "error"));

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
    if (!DEMAND_API_ENDPOINT) return;

    const key = cacheKey(selectedDongName, simulationDate, selectedWeekday);

    // 캐시 히트 — 즉시 반영
    const cached = demandCache.get(key);
    if (cached) {
      setRemoteDemandPoints(cached);
      setDemandFetchStatus("ready");
      // 다른 동 프리페치는 계속 진행
      prefetchOtherDongs(selectedDongName, simulationDate, selectedWeekday);
      return;
    }

    // 캐시 미스 — 로딩 후 저장
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setRemoteDemandPoints(null);
        setDemandFetchStatus("loading");
      }
    });

    const url = new URL(DEMAND_API_ENDPOINT, window.location.origin);
    url.searchParams.set("dong", selectedDongName);
    url.searchParams.set("date", simulationDate);
    url.searchParams.set("weekday", selectedWeekday);

    fetch(url.toString(), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Demand API request failed: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        const normalized = normalizeRemoteDemandPoints(payload);
        if (!normalized) throw new Error("Demand API response has no valid points.");
        demandCache.set(key, normalized);
        setRemoteDemandPoints(normalized);
        setDemandFetchStatus("ready");
        // 로드 완료 후 나머지 동 백그라운드 프리페치
        prefetchOtherDongs(selectedDongName, simulationDate, selectedWeekday);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setRemoteDemandPoints(null);
        setDemandFetchStatus("error");
      });

    return () => controller.abort();
  }, [
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
      ? "백엔드 연동"
      : demandFetchStatus === "loading"
        ? "API 요청 중"
        : demandFetchStatus === "error"
          ? DEMAND_API_ENDPOINT
            ? "서버 연결 불가"
            : "API 미설정"
          : "API 대기";
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
