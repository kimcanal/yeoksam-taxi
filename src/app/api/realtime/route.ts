const POI_CODES = ["POI001", "POI014", "POI034", "POI037", "POI071", "POI042", "POI080"];

interface CityDataResponse {
  CITYDATA?: {
    AREA_NM?: string;
    AREA_CONGEST_LVL?: string;
    AREA_CONGEST_MSG?: string;
    PPLTN_TIME?: string;
    LIVE_PPLTN_STTS?: Array<{
      AREA_PPLTN_MIN?: string;
      AREA_PPLTN_MAX?: string;
      AREA_CONGEST_LVL?: string;
      PPLTN_TIME?: string;
    }>;
    ROAD_TRAFFIC_STTS?: Array<{
      ROAD_TRAFFIC_IDX?: string;
      ROAD_AVG_SPD?: string;
      ROAD_TRAFFIC_TIME?: string;
      ROAD_MSG?: string;
    }>;
    WEATHER_STTS?: Array<{
      TEMP?: string;
      WEATHER_TIME?: string;
      PRECIPITATION?: string;
      PRECPT_TYPE?: string;
    }>;
  };
}

async function fetchPoi(apiKey: string, code: string) {
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/citydata/1/5/${code}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const json = await res.json() as Record<string, unknown>;
  // Response key varies by dataset version
  const root = (
    (json["SeoulRtd.citydata"] as CityDataResponse | undefined) ??
    (json["CITYDATA_ALL"] as CityDataResponse | undefined) ??
    (json as CityDataResponse)
  );
  const data = root?.CITYDATA;
  if (!data) return null;

  const pop = data.LIVE_PPLTN_STTS?.[0];
  const road = data.ROAD_TRAFFIC_STTS?.[0];
  const weather = data.WEATHER_STTS?.[0];

  return {
    area_name: data.AREA_NM ?? code,
    area_code: code,
    fetched_at: new Date().toISOString(),
    live_population: {
      observed_at: pop?.PPLTN_TIME ?? data.PPLTN_TIME ?? "",
      congestion_level: pop?.AREA_CONGEST_LVL ?? data.AREA_CONGEST_LVL ?? "여유",
      congestion_message: data.AREA_CONGEST_MSG ?? "",
      population_min: parseInt(pop?.AREA_PPLTN_MIN ?? "0", 10),
      population_max: parseInt(pop?.AREA_PPLTN_MAX ?? "0", 10),
    },
    road_traffic: {
      observed_at: road?.ROAD_TRAFFIC_TIME ?? "",
      index: road?.ROAD_TRAFFIC_IDX ?? "원활",
      message: road?.ROAD_MSG ?? "",
      speed_kmh: parseFloat(road?.ROAD_AVG_SPD ?? "0"),
      segment_count: 0,
    },
    weather: {
      observed_at: weather?.WEATHER_TIME ?? "",
      temp_c: parseFloat(weather?.TEMP ?? "0"),
      precipitation: weather?.PRECIPITATION ?? "-",
      precipitation_type: weather?.PRECPT_TYPE ?? "없음",
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
