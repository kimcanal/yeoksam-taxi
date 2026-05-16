import poiConfig from "../../../data/config/gangnam-pois.json";
import {
  realtimeResponseSchema,
  type RealtimeResponse,
} from "@/components/map-simulator/realtime-schema";

type PoiConfigEntry = {
  code: string;
  name?: string;
  coverage_dong?: string;
  category?: string;
  lon?: number;
  lat?: number;
  collection_enabled?: boolean;
  note?: string;
};

type JsonRecord = Record<string, unknown>;
type PoiRealtimePlace = RealtimeResponse["places"][number];
type PoiFetchResult =
  | { ok: true; code: string; place: PoiRealtimePlace }
  | { ok: false; code: string; reason: string; status?: number };

const CITYDATA_POIS = (poiConfig.citydata_collection as PoiConfigEntry[])
  .filter((poi) => poi.collection_enabled !== false && poi.code);
const POI_BY_CODE = new Map(CITYDATA_POIS.map((poi) => [poi.code, poi]));
const POI_CODES = CITYDATA_POIS.map((poi) => poi.code);
const REALTIME_CACHE_TTL_MS = 2 * 60 * 1000;

let cachedRealtimeBody: RealtimeResponse | null = null;
let cachedRealtimeAt = 0;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asRecordArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => (asRecord(item) ? [item as JsonRecord] : []));
  }
  const record = asRecord(value);
  return record ? [record] : [];
}

function stringValue(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function numberValue(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeSeoulTimestamp(value: unknown): string {
  const raw = stringValue(value).trim();
  if (!raw) {
    return "";
  }

  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) {
    return raw;
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

function unwrapCitydata(json: JsonRecord): JsonRecord | null {
  const root =
    asRecord(json["SeoulRtd.citydata"]) ??
    asRecord(json.CITYDATA_ALL) ??
    json;
  return asRecord(root.CITYDATA);
}

async function fetchPoi(apiKey: string, code: string): Promise<PoiFetchResult> {
  const poiMeta = POI_BY_CODE.get(code);
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/citydata/1/5/${code}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return {
        ok: false,
        code,
        reason: `http_${res.status}`,
        status: res.status,
      };
    }

    const json = await res.json() as JsonRecord;
    const data = unwrapCitydata(json);
    if (!data) {
      return { ok: false, code, reason: "invalid_payload" };
    }

    const pop = asRecordArray(data.LIVE_PPLTN_STTS)[0] ?? {};
    const roadRoot =
      asRecord(data.ROAD_TRAFFIC_STTS) ??
      asRecordArray(data.ROAD_TRAFFIC_STTS)[0] ??
      {};
    const avgRoad = asRecord(roadRoot.AVG_ROAD_DATA) ?? roadRoot;
    const roadLinks = asRecordArray(roadRoot.ROAD_TRAFFIC_STTS);
    const weather = asRecordArray(data.WEATHER_STTS)[0] ?? {};

    return {
      ok: true,
      code,
      place: {
        area_name: stringValue(data.AREA_NM, code),
        area_code: code,
        poi_meta: {
          configured_name: poiMeta?.name ?? null,
          coverage_dong: poiMeta?.coverage_dong ?? null,
          category: poiMeta?.category ?? null,
          lon: poiMeta?.lon ?? null,
          lat: poiMeta?.lat ?? null,
          note: poiMeta?.note ?? null,
        },
        fetched_at: new Date().toISOString(),
        live_population: {
          observed_at: normalizeSeoulTimestamp(pop.PPLTN_TIME ?? data.PPLTN_TIME),
          congestion_level: stringValue(pop.AREA_CONGEST_LVL ?? data.AREA_CONGEST_LVL, "여유"),
          congestion_message: stringValue(data.AREA_CONGEST_MSG),
          population_min: numberValue(pop.AREA_PPLTN_MIN),
          population_max: numberValue(pop.AREA_PPLTN_MAX),
        },
        road_traffic: {
          observed_at: normalizeSeoulTimestamp(avgRoad.ROAD_TRAFFIC_TIME),
          index: stringValue(avgRoad.ROAD_TRAFFIC_IDX, "원활"),
          message: stringValue(avgRoad.ROAD_MSG),
          speed_kmh: numberValue(avgRoad.ROAD_TRAFFIC_SPD ?? avgRoad.ROAD_AVG_SPD),
          segment_count: roadLinks.length,
        },
        weather: {
          observed_at: normalizeSeoulTimestamp(weather.WEATHER_TIME),
          temp_c: numberValue(weather.TEMP),
          precipitation: stringValue(weather.PRECIPITATION, "-"),
          precipitation_type: stringValue(weather.PRECPT_TYPE, "없음"),
        },
      },
    };
  } catch {
    return { ok: false, code, reason: "fetch_failed" };
  }
}

function withCacheMeta(
  body: RealtimeResponse,
  cacheStatus: "miss" | "hit" | "stale-if-error",
): RealtimeResponse {
  return realtimeResponseSchema.parse({
    ...body,
    meta: {
      ...body.meta,
      served_at: new Date().toISOString(),
      cache_status: cacheStatus,
      cache_ttl_seconds: REALTIME_CACHE_TTL_MS / 1000,
    },
  });
}

async function buildRealtimeSnapshot(apiKey: string): Promise<RealtimeResponse> {
  const results = await Promise.allSettled(
    POI_CODES.map((code) => fetchPoi(apiKey, code)),
  );

  const places = results.flatMap((result) => {
    if (result.status !== "fulfilled" || !result.value.ok) {
      return [];
    }
    return [result.value.place];
  });
  const returnedCodes = results.flatMap((result) => {
    if (result.status !== "fulfilled" || !result.value.ok) {
      return [];
    }
    return [result.value.code];
  });
  const failedItems = results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value.ok
        ? []
        : [
          {
            code: result.value.code,
            reason: result.value.reason,
            status: result.value.status ?? null,
          },
        ];
    }

    return [{ code: "unknown", reason: "promise_rejected", status: null }];
  });

  return realtimeResponseSchema.parse({
    meta: {
      source: "citydata (OA-21285)",
      fetched_at: new Date().toISOString(),
      expected_count: POI_CODES.length,
      returned_count: places.length,
      requested_codes: POI_CODES,
      returned_codes: returnedCodes,
      failed_codes: failedItems.map((item) => item.code),
      failed_items: failedItems,
      partial_failure: failedItems.length > 0,
    },
    places,
  });
}

export async function getRealtimeSnapshot(): Promise<
  | { ok: true; body: RealtimeResponse; cacheStatus: "miss" | "hit" | "stale-if-error" }
  | { ok: false; status: number; error: string; fallbackBody?: RealtimeResponse }
> {
  if (
    cachedRealtimeBody &&
    Date.now() - cachedRealtimeAt < REALTIME_CACHE_TTL_MS
  ) {
    return { ok: true, body: withCacheMeta(cachedRealtimeBody, "hit"), cacheStatus: "hit" };
  }

  const apiKey = process.env.SEOUL_OPEN_API_KEY;
  if (!apiKey) {
    if (cachedRealtimeBody) {
      return {
        ok: true,
        body: withCacheMeta(cachedRealtimeBody, "stale-if-error"),
        cacheStatus: "stale-if-error",
      };
    }

    return {
      ok: false,
      status: 503,
      error: "SEOUL_OPEN_API_KEY not configured",
    };
  }

  const body = await buildRealtimeSnapshot(apiKey);
  if (body.places.length) {
    cachedRealtimeBody = body;
    cachedRealtimeAt = Date.now();
    return { ok: true, body: withCacheMeta(body, "miss"), cacheStatus: "miss" };
  }

  if (cachedRealtimeBody) {
    return {
      ok: true,
      body: withCacheMeta(cachedRealtimeBody, "stale-if-error"),
      cacheStatus: "stale-if-error",
    };
  }

  return {
    ok: false,
    status: 502,
    error: "Realtime upstream returned no places",
    fallbackBody: body,
  };
}
