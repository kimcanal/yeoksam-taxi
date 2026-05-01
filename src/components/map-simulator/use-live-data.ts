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
  snapshotLabel: string;
  isStale: boolean;
}

type FetchStatus = "idle" | "loading" | "ok" | "error";

interface UseLiveDataResult {
  liveData: LiveData | null;
  status: FetchStatus;
}

function ptyToWeatherMode(pty: string): WeatherMode {
  if (pty === "1" || pty === "4") return "heavy-rain";
  if (pty === "2" || pty === "3") return "heavy-snow";
  return "clear";
}

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
    const d = new Date(isoString);
    const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} 스냅샷`;
    return { label, isStale: true };
  } catch {
    return { label: "알 수 없음", isStale: true };
  }
}

async function fetchLiveData(): Promise<LiveData> {
  const [realtimeRes, weatherRes] = await Promise.all([
    fetch("/seoul-realtime.json", { cache: "no-store" }),
    fetch("/seoul-weather.json", { cache: "no-store" }),
  ]);

  if (!realtimeRes.ok || !weatherRes.ok) {
    throw new Error(
      `Live data fetch failed: realtime=${realtimeRes.status}, weather=${weatherRes.status}`,
    );
  }

  const [realtimeJson, weatherJson] = await Promise.all([
    realtimeRes.json(),
    weatherRes.json(),
  ]);

  const areas: LiveArea[] = (realtimeJson.places ?? []).map(
    (place: Record<string, unknown>) => {
      const pop = (place.live_population as Record<string, unknown>) ?? {};
      const traffic = (place.road_traffic as Record<string, unknown>) ?? {};
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

  const nowcastItems: Array<{ category: string; value: string }> =
    weatherJson?.nowcast?.items ?? [];

  const getVal = (cat: string) =>
    nowcastItems.find((item) => item.category === cat)?.value ?? "";

  const pty = getVal("PTY");
  const tempC = parseFloat(getVal("T1H") || "0");
  const humidity = parseInt(getVal("REH") || "0", 10);
  const precipMm = parseFloat(getVal("RN1") || "0");

  let weatherMode: WeatherMode = ptyToWeatherMode(pty);
  if (pty === "" && areas.length > 0) {
    const cityWeather = realtimeJson.places?.[0]?.weather as Record<string, unknown>;
    const precipType = String(cityWeather?.precipitation_type ?? "없음");
    weatherMode = precipTypeToWeatherMode(precipType);
  }

  const observedAt =
    weatherJson?.nowcast?.base_date && weatherJson?.nowcast?.base_time
      ? `${weatherJson.nowcast.base_date} ${weatherJson.nowcast.base_time}`
      : String(realtimeJson?.meta?.fetched_at ?? "");

  const fetchedAt = new Date().toISOString();
  const rawFetchedAt = String(realtimeJson?.meta?.fetched_at ?? fetchedAt);
  const ageInfo = snapshotLabel(rawFetchedAt);

  return {
    weather: {
      tempC,
      humidity,
      precipitationMm: precipMm,
      precipitationType:
        pty === "0" || pty === ""
          ? "없음"
          : pty === "1"
            ? "비"
            : pty === "4"
              ? "소나기"
              : pty === "2"
                ? "비/눈"
                : "눈",
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

const POLL_INTERVAL_MS = 10 * 60 * 1000;

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
