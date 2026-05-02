"use client";

import { useEffect, useRef, useState } from "react";
import type { WeatherMode } from "./simulation-environment";

export interface LiveArea {
  areaName: string;
  congestionLevel: "여유" | "보통" | "약간 붐빔" | "붐빔" | "매우 붐빔" | string;
  speedKmh: number;
  trafficIndex: "원활" | "서행" | "정체" | string;
  populationMin: number;
  populationMax: number;
  observedAt: string;
}

export interface LiveWeather {
  tempC: number;
  humidity: number;
  precipitationMm: number;
  precipitationType: string;
  weatherMode: WeatherMode;
  observedAt: string;
}

export interface LiveData {
  weather: LiveWeather;
  areas: LiveArea[];
  fetchedAt: string;
  dataAgeMinutes: number;
  snapshotLabel: string; // "방금" / "N분 전" / "M시간 전" / "YYYY-MM-DD 수집" (stale)
  isStale: boolean;      // 3시간 이상 오래된 경우
}

type FetchStatus = "idle" | "loading" | "ok" | "error";

interface UseLiveDataResult {
  liveData: LiveData | null;
  status: FetchStatus;
}

// Precipitation type string (from citydata) → WeatherMode
function precipTypeToWeatherMode(type: string): WeatherMode {
  if (type.includes("눈")) return "heavy-snow";
  if (type.includes("비")) return "heavy-rain";
  return "clear";
}

function minutesSince(isoString: string): number {
  try {
    const ms = Date.now() - new Date(isoString).getTime();
    return Math.round(ms / 60_000);
  } catch {
    return 0;
  }
}

function snapshotLabel(isoString: string): { label: string; isStale: boolean } {
  try {
    const minutes = minutesSince(isoString);
    if (minutes < 2) return { label: "방금", isStale: false };
    if (minutes < 60) return { label: `${minutes}분 전`, isStale: false };
    if (minutes < 180) {
      return { label: `${Math.round(minutes / 60)}시간 전`, isStale: false };
    }
    // 3시간 이상: 날짜만 표시
    const d = new Date(isoString);
    const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} 스냅샷`;
    return { label, isStale: true };
  } catch {
    return { label: "알 수 없음", isStale: true };
  }
}

async function fetchLiveData(): Promise<LiveData> {
  const realtimeRes = await fetch("/api/realtime", { cache: "no-store" });
  const realtimeJson = await realtimeRes.json();

  // Parse areas from citydata
  const areas: LiveArea[] = (realtimeJson.places ?? []).map(
    (place: Record<string, unknown>) => {
      const pop = place.live_population as Record<string, unknown> ?? {};
      const traffic = place.road_traffic as Record<string, unknown> ?? {};
      return {
        areaName: String(place.area_name ?? ""),
        congestionLevel: String(pop.congestion_level ?? "여유"),
        speedKmh: Number(traffic.speed_kmh ?? 0),
        trafficIndex: String(traffic.index ?? "원활"),
        populationMin: Number(pop.population_min ?? 0),
        populationMax: Number(pop.population_max ?? 0),
        observedAt: String(traffic.observed_at ?? pop.observed_at ?? ""),
      };
    },
  );

  const cityWeather = realtimeJson.places?.[0]?.weather as
    | Record<string, unknown>
    | undefined;
  const precipitationType = String(cityWeather?.precipitation_type ?? "없음");
  const precipitation = String(cityWeather?.precipitation ?? "0");
  const precipMm = parseFloat(precipitation.replace(/[^\d.-]/g, "") || "0");
  const weatherMode = precipTypeToWeatherMode(precipitationType);
  const tempC = Number(cityWeather?.temp_c ?? 0);
  const observedAt = String(
    cityWeather?.observed_at ?? realtimeJson?.meta?.fetched_at ?? "",
  );

  const fetchedAt = new Date().toISOString();
  const rawFetchedAt = String(realtimeJson?.meta?.fetched_at ?? fetchedAt);
  const ageInfo = snapshotLabel(rawFetchedAt);

  return {
    weather: {
      tempC,
      humidity: 0,
      precipitationMm: precipMm,
      precipitationType,
      weatherMode,
      observedAt,
    },
    areas,
    fetchedAt,
    dataAgeMinutes: minutesSince(rawFetchedAt),
    snapshotLabel: ageInfo.label,
    isStale: ageInfo.isStale,
  };
}

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function useLiveData(): UseLiveDataResult {
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      try {
        const data = await fetchLiveData();
        if (!cancelled) {
          setLiveData(data);
          setStatus("ok");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    load();

    intervalRef.current = setInterval(() => {
      if (!cancelled) {
        load();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { liveData, status };
}
