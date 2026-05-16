import { z } from "zod";

export const livePopulationSchema = z.object({
  observed_at: z.string(),
  congestion_level: z.string(),
  congestion_message: z.string(),
  population_min: z.number(),
  population_max: z.number(),
});

export const roadTrafficSchema = z.object({
  observed_at: z.string(),
  index: z.string(),
  message: z.string(),
  speed_kmh: z.number(),
  segment_count: z.number(),
});

export const weatherSchema = z.object({
  observed_at: z.string(),
  temp_c: z.number(),
  precipitation: z.string(),
  precipitation_type: z.string(),
});

export const poiRealtimePlaceSchema = z.object({
  area_name: z.string(),
  area_code: z.string(),
  poi_meta: z.object({
    configured_name: z.string().nullable(),
    coverage_dong: z.string().nullable(),
    category: z.string().nullable(),
    lon: z.number().nullable(),
    lat: z.number().nullable(),
    note: z.string().nullable(),
  }),
  fetched_at: z.string(),
  live_population: livePopulationSchema,
  road_traffic: roadTrafficSchema,
  weather: weatherSchema,
});

export const realtimeResponseSchema = z.object({
  meta: z.object({
    source: z.string(),
    fetched_at: z.string(),
    served_at: z.string().optional(),
    cache_status: z.enum(["miss", "hit", "stale-if-error"]).optional(),
    cache_ttl_seconds: z.number().optional(),
    expected_count: z.number(),
    returned_count: z.number(),
    requested_codes: z.array(z.string()),
    returned_codes: z.array(z.string()),
    failed_codes: z.array(z.string()),
    failed_items: z.array(
      z.object({
        code: z.string(),
        reason: z.string(),
        status: z.number().nullable(),
      }),
    ),
    partial_failure: z.boolean(),
  }),
  places: z.array(poiRealtimePlaceSchema),
});

export type RealtimeResponse = z.infer<typeof realtimeResponseSchema>;
