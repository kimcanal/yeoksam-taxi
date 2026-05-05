const POI_CODES = ["POI001", "POI014", "POI034", "POI037", "POI071", "POI042", "POI080"];

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asRecordArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap((item) => asRecord(item) ? [item as JsonRecord] : []);
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

function unwrapCitydata(json: JsonRecord): JsonRecord | null {
  const root =
    asRecord(json["SeoulRtd.citydata"]) ??
    asRecord(json.CITYDATA_ALL) ??
    json;
  return asRecord(root.CITYDATA);
}

async function fetchPoi(apiKey: string, code: string) {
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/citydata/1/5/${code}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const json = await res.json() as JsonRecord;
  const data = unwrapCitydata(json);
  if (!data) return null;

  const pop = asRecordArray(data.LIVE_PPLTN_STTS)[0] ?? {};
  const roadRoot =
    asRecord(data.ROAD_TRAFFIC_STTS) ??
    asRecordArray(data.ROAD_TRAFFIC_STTS)[0] ??
    {};
  const avgRoad = asRecord(roadRoot.AVG_ROAD_DATA) ?? roadRoot;
  const roadLinks = asRecordArray(roadRoot.ROAD_TRAFFIC_STTS);
  const weather = asRecordArray(data.WEATHER_STTS)[0] ?? {};

  return {
    area_name: stringValue(data.AREA_NM, code),
    area_code: code,
    fetched_at: new Date().toISOString(),
    live_population: {
      observed_at: stringValue(pop.PPLTN_TIME ?? data.PPLTN_TIME),
      congestion_level: stringValue(pop.AREA_CONGEST_LVL ?? data.AREA_CONGEST_LVL, "여유"),
      congestion_message: stringValue(data.AREA_CONGEST_MSG),
      population_min: numberValue(pop.AREA_PPLTN_MIN),
      population_max: numberValue(pop.AREA_PPLTN_MAX),
    },
    road_traffic: {
      observed_at: stringValue(avgRoad.ROAD_TRAFFIC_TIME),
      index: stringValue(avgRoad.ROAD_TRAFFIC_IDX, "원활"),
      message: stringValue(avgRoad.ROAD_MSG),
      speed_kmh: numberValue(avgRoad.ROAD_TRAFFIC_SPD ?? avgRoad.ROAD_AVG_SPD),
      segment_count: roadLinks.length,
    },
    weather: {
      observed_at: stringValue(weather.WEATHER_TIME),
      temp_c: numberValue(weather.TEMP),
      precipitation: stringValue(weather.PRECIPITATION, "-"),
      precipitation_type: stringValue(weather.PRECPT_TYPE, "없음"),
    },
  };
}

export async function GET() {
  const apiKey = process.env.SEOUL_OPEN_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "SEOUL_OPEN_API_KEY not configured" }, { status: 503 });
  }

  const results = await Promise.allSettled(
    POI_CODES.map((code) => fetchPoi(apiKey, code)),
  );

  const places = results.flatMap((r) =>
    r.status === "fulfilled" && r.value ? [r.value] : [],
  );

  return Response.json({
    meta: {
      source: "citydata (OA-21285)",
      fetched_at: new Date().toISOString(),
    },
    places,
  });
}
