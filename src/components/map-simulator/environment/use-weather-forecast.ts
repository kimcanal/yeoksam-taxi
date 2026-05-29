import { useEffect, useMemo, useState } from "react";
import {
  normalizeDayMinutes,
  type WeatherMode,
} from "@/components/map-simulator/environment/environment-state";

const WEATHER_API_ENDPOINT =
  process.env.NEXT_PUBLIC_WEATHER_API_ENDPOINT?.trim() || "/api/weather";

export type WeatherFetchStatus = "idle" | "loading" | "ready" | "error";

export type WeatherObservation = {
  date: string;
  hour: number;
  temperatureC: number | null;
  precipitationMm: number | null;
  condition: string | null;
  weatherMode: WeatherMode;
};

type WeatherRecord = Record<string, unknown>;

function isRecord(value: unknown): value is WeatherRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstRecord(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  for (const key of ["weather", "data", "current", "selected", "result"]) {
    const nested = payload[key];
    if (isRecord(nested)) {
      return { root: payload, nested };
    }
  }

  return { root: payload, nested: payload };
}

function valueFrom(records: WeatherRecord[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return null;
}

function numberFrom(records: WeatherRecord[], keys: string[]) {
  const value = valueFrom(records, keys);
  if (value === null) {
    return null;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function stringFrom(records: WeatherRecord[], keys: string[]) {
  const value = valueFrom(records, keys);
  return typeof value === "string" ? value.trim() || null : null;
}

function weatherModeFromObservation({
  condition,
  precipitationMm,
  precipitationType,
  skyCode,
  temperatureC,
}: {
  condition: string | null;
  precipitationMm: number | null;
  precipitationType: number | null;
  skyCode: number | null;
  temperatureC: number | null;
}): WeatherMode {
  if (precipitationType === 3) {
    return "heavy-snow";
  }
  if (precipitationType === 1 || precipitationType === 4) {
    return "heavy-rain";
  }
  if (precipitationType === 2) {
    return temperatureC !== null && temperatureC <= 1
      ? "heavy-snow"
      : "heavy-rain";
  }

  const normalizedCondition = condition?.toLowerCase() ?? "";
  if (
    normalizedCondition.includes("snow") ||
    normalizedCondition.includes("sleet") ||
    normalizedCondition.includes("눈") ||
    normalizedCondition.includes("강설") ||
    normalizedCondition.includes("적설")
  ) {
    return "heavy-snow";
  }

  if (
    normalizedCondition.includes("rain") ||
    normalizedCondition.includes("drizzle") ||
    normalizedCondition.includes("shower") ||
    normalizedCondition.includes("비") ||
    normalizedCondition.includes("강우") ||
    normalizedCondition.includes("소나기") ||
    normalizedCondition.includes("폭우")
  ) {
    return "heavy-rain";
  }

  if (precipitationMm !== null && precipitationMm >= 0.1) {
    return temperatureC !== null && temperatureC <= 1
      ? "heavy-snow"
      : "heavy-rain";
  }

  if (skyCode !== null && skyCode >= 3) {
    return "cloudy";
  }

  if (
    normalizedCondition.includes("cloud") ||
    normalizedCondition.includes("overcast") ||
    normalizedCondition.includes("mist") ||
    normalizedCondition.includes("fog") ||
    normalizedCondition.includes("흐") ||
    normalizedCondition.includes("구름") ||
    normalizedCondition.includes("안개")
  ) {
    return "cloudy";
  }

  return "clear";
}

export function normalizeRemoteWeatherPayload(
  payload: unknown,
  requestDate: string,
  requestHour: number,
): WeatherObservation | null {
  const records = firstRecord(payload);
  if (!records) {
    return null;
  }
  const candidates = [records.nested, records.root];
  const date =
    stringFrom(candidates, ["date", "base_date", "baseDate"]) ?? requestDate;
  const hour =
    numberFrom(candidates, ["hour", "time", "base_hour", "baseHour"]) ??
    requestHour;
  const temperatureC = numberFrom(candidates, [
    "temperature_c",
    "temperatureC",
    "temp_c",
    "tempC",
    "temperature",
    "temp",
    "기온",
  ]);
  const precipitationMm = numberFrom(candidates, [
    "precipitation_mm",
    "precipitationMm",
    "rainfall_mm",
    "rainfallMm",
    "rain_mm",
    "rainMm",
    "prcp_mm",
    "prcpMm",
    "precipitation",
    "rainfall",
    "rain",
    "precip",
    "강수량",
  ]);
  const precipitationType = numberFrom(candidates, [
    "pty",
    "precipitation_type",
    "precipitationType",
  ]);
  const skyCode = numberFrom(candidates, [
    "sky",
    "sky_code",
    "skyCode",
  ]);
  const condition = stringFrom(candidates, [
    "weather_condition",
    "weatherCondition",
    "condition",
    "description",
    "sky",
    "sky_condition",
    "skyCondition",
    "weather",
  ]);
  const normalizedHour = Math.trunc(hour);

  if (
    !Number.isInteger(normalizedHour) ||
    normalizedHour < 0 ||
    normalizedHour > 23
  ) {
    return null;
  }

  return {
    date,
    hour: normalizedHour,
    temperatureC,
    precipitationMm,
    condition,
    weatherMode: weatherModeFromObservation({
      condition,
      precipitationMm,
      precipitationType,
      skyCode,
      temperatureC,
    }),
  };
}

export function useWeatherForecast({
  normalizedSimulationTimeMinutes,
  setWeatherMode,
  simulationDate,
}: {
  normalizedSimulationTimeMinutes: number;
  setWeatherMode: (mode: WeatherMode) => void;
  simulationDate: string;
}) {
  const selectedWeatherHour = Math.floor(
    normalizeDayMinutes(normalizedSimulationTimeMinutes) / 60,
  );
  const [weatherObservation, setWeatherObservation] =
    useState<WeatherObservation | null>(null);
  const [weatherFetchStatus, setWeatherFetchStatus] =
    useState<WeatherFetchStatus>(() =>
      WEATHER_API_ENDPOINT ? "idle" : "error",
    );

  useEffect(() => {
    if (!WEATHER_API_ENDPOINT) {
      return;
    }

    const controller = new AbortController();
    const url = new URL(WEATHER_API_ENDPOINT, window.location.origin);
    url.searchParams.set("date", simulationDate);
    url.searchParams.set("hour", String(selectedWeatherHour));

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setWeatherFetchStatus("loading");
      }
    });

    fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          let errorMsg = `Weather API request failed: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg += ` - ${JSON.stringify(errorData)}`;
          } catch {}
          throw new Error(errorMsg);
        }
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        const normalized = normalizeRemoteWeatherPayload(
          payload,
          simulationDate,
          selectedWeatherHour,
        );
        if (!normalized) {
          throw new Error("Weather API response has no valid weather data.");
        }
        setWeatherObservation(normalized);
        setWeatherMode(normalized.weatherMode);
        setWeatherFetchStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setWeatherFetchStatus("error");
      });

    return () => controller.abort();
  }, [
    selectedWeatherHour,
    setWeatherMode,
    simulationDate,
  ]);

  return useMemo(
    () => ({
      selectedWeatherHour,
      weatherFetchStatus,
      weatherObservation,
    }),
    [
      selectedWeatherHour,
      weatherFetchStatus,
      weatherObservation,
    ],
  );
}
