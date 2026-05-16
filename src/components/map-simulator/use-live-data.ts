"use client";

import type { WeatherMode } from "./simulation-environment";
import {
  realtimeResponseSchema,
  type RealtimeResponse,
} from "./realtime-schema";
import { useEventSourceQuery, type QueryStatus } from "./query-cache";

export interface LiveArea {
  areaCode: string;
  areaName: string;
  coverageDong: string | null;
  category: string | null;
  lon: number | null;
  lat: number | null;
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
  meta: {
    source: string;
    fetchedAt: string;
    expectedPlaceCount: number;
    returnedPlaceCount: number;
    returnedPlaceCodes: string[];
    failedPlaceCodes: string[];
    isPartial: boolean;
  };
}

interface UseLiveDataResult {
  liveData: LiveData | null;
  status: QueryStatus;
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

    const date = new Date(isoString);
    const label = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} 스냅샷`;
    return { label, isStale: true };
  } catch {
    return { label: "알 수 없음", isStale: true };
  }
}

function parseLiveData(payload: unknown): LiveData {
  const realtimeJson: RealtimeResponse = realtimeResponseSchema.parse(payload);
  const places = realtimeJson.places;
  if (!places.length) {
    throw new Error("Realtime stream returned no places");
  }

  const areas: LiveArea[] = places.map((place) => ({
    areaCode: place.area_code,
    areaName: place.area_name,
    coverageDong: place.poi_meta.coverage_dong,
    category: place.poi_meta.category,
    lon: place.poi_meta.lon,
    lat: place.poi_meta.lat,
    congestionLevel: place.live_population.congestion_level,
    speedKmh: place.road_traffic.speed_kmh,
    trafficIndex: place.road_traffic.index,
    populationMin: place.live_population.population_min,
    populationMax: place.live_population.population_max,
    observedAt: place.road_traffic.observed_at || place.live_population.observed_at,
  }));

  const cityWeather = places[0]?.weather;
  const precipitationType = cityWeather?.precipitation_type ?? "없음";
  const precipMm = parseFloat(
    cityWeather?.precipitation.replace(/[^\d.-]/g, "") || "0",
  );
  const observedAt =
    cityWeather?.observed_at || realtimeJson.meta.fetched_at || "";
  const rawFetchedAt = realtimeJson.meta.fetched_at;
  const ageInfo = snapshotLabel(rawFetchedAt);

  return {
    weather: {
      tempC: cityWeather?.temp_c ?? 0,
      humidity: 0,
      precipitationMm: precipMm,
      precipitationType,
      weatherMode: precipTypeToWeatherMode(precipitationType),
      observedAt,
    },
    areas,
    fetchedAt: new Date().toISOString(),
    dataAgeMinutes: minutesSince(rawFetchedAt),
    snapshotLabel: ageInfo.label,
    isStale: ageInfo.isStale,
    meta: {
      source: realtimeJson.meta.source,
      fetchedAt: rawFetchedAt,
      expectedPlaceCount: realtimeJson.meta.expected_count,
      returnedPlaceCount: realtimeJson.meta.returned_count,
      returnedPlaceCodes: realtimeJson.meta.returned_codes,
      failedPlaceCodes: realtimeJson.meta.failed_codes,
      isPartial:
        realtimeJson.meta.partial_failure ||
        realtimeJson.meta.returned_count < realtimeJson.meta.expected_count ||
        realtimeJson.meta.failed_codes.length > 0,
    },
  };
}

export function useLiveData(): UseLiveDataResult {
  const snapshot = useEventSourceQuery<LiveData>(
    "realtime-stream",
    "/api/realtime/stream",
    {
      parse: parseLiveData,
      retryDelayMs: 1_500,
      maxRetryDelayMs: 15_000,
    },
  );

  return {
    liveData: snapshot.data,
    status: snapshot.status,
  };
}
