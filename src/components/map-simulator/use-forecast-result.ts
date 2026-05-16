"use client";

import { z } from "zod";
import type { ForecastResult } from "./forecast-contract";
import { useJsonQuery } from "./query-cache";

const forecastResultSchema = z.object({
  source: z.string().optional(),
  strategy: z.string().optional(),
  feature_set: z.string().nullable().optional(),
  model_feature_set: z.string().nullable().optional(),
  pattern_cache_source: z.string().nullable().optional(),
  raw_prediction_unit: z.string().nullable().optional(),
  proxy_source: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  calendar: z.object({
    weekday: z.string().nullable().optional(),
    day_type: z.string().nullable().optional(),
    is_holiday: z.string().nullable().optional(),
    holiday_names: z.string().nullable().optional(),
  }).nullable().optional(),
  target_datetime: z.string(),
  feature_datetime: z.string().optional(),
  weather: z.string(),
  generated_at: z.string(),
  regions: z.array(z.object({
    dong_name: z.string(),
    score: z.number(),
    confidence: z.number().nullable(),
    raw_prediction: z.number().nullable().optional(),
  })),
});

async function fetchForecastResult(): Promise<ForecastResult | null> {
  const response = await fetch("/forecast/latest.json", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const parsed = forecastResultSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.regions.length) {
    return null;
  }

  return parsed.data satisfies ForecastResult;
}

export function useForecastResult(): ForecastResult | null {
  const snapshot = useJsonQuery<ForecastResult>(
    "forecast-latest",
    fetchForecastResult,
    {
      staleTimeMs: 60_000,
      retryCount: 1,
      retryDelayMs: 1_500,
      revalidateOnFocus: true,
    },
  );

  return snapshot.data;
}
