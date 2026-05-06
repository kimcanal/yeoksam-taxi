import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const congestionScores = new Map([
  ["여유", 0.2],
  ["보통", 0.45],
  ["약간 붐빔", 0.7],
  ["붐빔", 0.9],
]);

const trafficScores = new Map([
  ["원활", 0.2],
  ["서행", 0.6],
  ["정체", 0.9],
]);

const precipitationScores = new Map([
  ["없음", 0],
  ["비", 0.25],
  ["눈", 0.35],
  ["비 또는 눈", 0.3],
]);

async function readJson(filePath) {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text);
}

async function readJsonIfExists(filePath, fallback = null) {
  try {
    return await readJson(filePath);
  } catch {
    return fallback;
  }
}

async function loadPoiConfig() {
  const config = await readJsonIfExists(
    path.join(projectRoot, "data", "config", "gangnam-pois.json"),
    {},
  );
  const citydataPois = Array.isArray(config?.citydata_collection)
    ? config.citydata_collection
    : [];
  const supplementalPois = Array.isArray(config?.supplemental_watchlist)
    ? config.supplemental_watchlist
    : [];

  return {
    config,
    citydataPois,
    supplementalPois,
    byCode: new Map(citydataPois.map((poi) => [poi.code, poi])),
  };
}

async function latestRawPath(...segments) {
  const rawRoot = path.join(projectRoot, ...segments);
  const kind = segments.includes("citydata")
    ? "citydata"
    : segments.includes("weather")
      ? "weather"
      : "other";

  const isOkSnapshot = async (filePath) => {
    try {
      const json = JSON.parse(await readFile(filePath, "utf8"));
      const metaOk = json?.meta?.ok;
      if (typeof metaOk === "boolean") return metaOk;
      if (kind === "citydata") {
        return Array.isArray(json?.results) && json.results.some((r) => r?.ok);
      }
      return true;
    } catch {
      return false;
    }
  };

  try {
    const days = (await readdir(rawRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
      .sort();
    const day = days.at(-1);
    if (!day) return null;
    const dayRoot = path.join(rawRoot, day);
    const files = (await readdir(dayRoot)).filter((file) => file.endsWith(".json"));
    const infos = await Promise.all(
      files.map(async (file) => ({
        file,
        mtimeMs: (await stat(path.join(dayRoot, file))).mtimeMs,
      })),
    );
    const sorted = infos.sort((left, right) => left.mtimeMs - right.mtimeMs);
    const candidates = sorted.map((info) => path.join(dayRoot, info.file));
    if (kind === "other") return candidates.at(-1) ?? null;

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      if (await isOkSnapshot(candidates[index])) return candidates[index];
    }
    return candidates.at(-1) ?? null;
  } catch {
    return null;
  }
}

async function latestRawAttemptPath(...segments) {
  const rawRoot = path.join(projectRoot, ...segments);
  try {
    const days = (await readdir(rawRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
      .sort();
    const day = days.at(-1);
    if (!day) return null;
    const dayRoot = path.join(rawRoot, day);
    const files = (await readdir(dayRoot)).filter((file) => file.endsWith(".json"));
    const infos = await Promise.all(
      files.map(async (file) => ({
        file,
        mtimeMs: (await stat(path.join(dayRoot, file))).mtimeMs,
      })),
    );
    const latest = infos.sort((left, right) => left.mtimeMs - right.mtimeMs).at(-1);
    return latest ? path.join(dayRoot, latest.file) : null;
  } catch {
    return null;
  }
}

function unwrapCitydata(response) {
  return (
    response?.["SeoulRtd.citydata"]?.CITYDATA ??
    response?.CITYDATA_ALL?.CITYDATA ??
    response?.CITYDATA ??
    null
  );
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function kstTemporalFeatures(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const hour = kst.getUTCHours();
  const weekday = kst.getUTCDay();
  const timeBand =
    hour < 6 ? "late_night" :
    hour < 11 ? "morning" :
    hour < 17 ? "daytime" :
    hour < 21 ? "evening_peak" :
    "night";

  return {
    hour,
    weekday,
    is_weekend: weekday === 0 || weekday === 6,
    time_band: timeBand,
  };
}

function weatherItems(rawWeather) {
  const items =
    rawWeather?.data?.response?.body?.items?.item ??
    rawWeather?.response?.body?.items?.item ??
    [];
  return new Map(
    normalizeArray(items).map((item) => [item.category, item.obsrValue]),
  );
}

function kmaNowcast(rawWeather) {
  const items = weatherItems(rawWeather);
  return {
    temperature_c: Number(items.get("T1H") ?? 0),
    precipitation_mm_1h: Number(items.get("RN1") ?? 0),
    precipitation_type_code: String(items.get("PTY") ?? "0"),
    humidity_pct: Number(items.get("REH") ?? 0),
    wind_speed_ms: Number(items.get("WSD") ?? 0),
  };
}

function countTransitArrivals(subwayStations) {
  return subwayStations.reduce(
    (sum, station) => sum + normalizeArray(station.SUB_DETAIL).length,
    0,
  );
}

function populationForecastSummary(pop) {
  const forecast = normalizeArray(pop.FCST_PPLTN)[0] ?? null;
  if (!forecast) return null;

  const min = numberOrNull(forecast.FCST_PPLTN_MIN);
  const max = numberOrNull(forecast.FCST_PPLTN_MAX);
  const mid = min != null && max != null ? Math.round((min + max) / 2) : null;

  return {
    forecast_time: forecast.FCST_TIME ?? null,
    congestion_level: forecast.FCST_CONGEST_LVL ?? null,
    population_min: min,
    population_max: max,
    population_mid: mid,
    congestion_score: congestionScores.get(forecast.FCST_CONGEST_LVL) ?? null,
  };
}

function buildFeatureRow(result, temporal, nowcast, poiByCode) {
  const data = unwrapCitydata(result.data);
  if (!data) return null;
  const areaCode = data.AREA_CD ?? result.code;
  const poiMeta = poiByCode.get(areaCode) ?? poiByCode.get(result.code) ?? null;
  if (poiMeta?.collection_enabled === false) return null;

  const pop = normalizeArray(data.LIVE_PPLTN_STTS)[0] ?? {};
  const traffic = normalizeArray(data.ROAD_TRAFFIC_STTS)[0] ?? {};
  const trafficAverage = traffic.AVG_ROAD_DATA ?? traffic;
  const weather = normalizeArray(data.WEATHER_STTS)[0] ?? {};
  const subwayStations = normalizeArray(data.SUB_STTS);
  const busStops = normalizeArray(data.BUS_STN_STTS);
  const events = normalizeArray(data.EVENT_STTS);

  const congestionLevel = pop.AREA_CONGEST_LVL ?? data.AREA_CONGEST_LVL ?? "unknown";
  const trafficIndex = trafficAverage.ROAD_TRAFFIC_IDX ?? "unknown";
  const precipitationType = weather.PRECPT_TYPE ?? "unknown";
  const populationMin = Number(pop.AREA_PPLTN_MIN ?? 0);
  const populationMax = Number(pop.AREA_PPLTN_MAX ?? 0);
  const populationMid = Math.round((populationMin + populationMax) / 2);
  const congestionScore = congestionScores.get(congestionLevel) ?? 0.35;
  const trafficScore = trafficScores.get(trafficIndex) ?? 0.35;
  const precipitationScore =
    precipitationScores.get(precipitationType) ??
    (nowcast.precipitation_mm_1h > 0 ? 0.25 : 0);
  const eventScore = Math.min(events.length * 0.08, 0.24);
  const transitScore = Math.min((subwayStations.length + busStops.length) * 0.03, 0.24);
  const populationScore = Math.min(populationMid / 30000, 1);
  const forecast1h = populationForecastSummary(pop);
  const forecastPopulationDelta =
    forecast1h?.population_mid != null
      ? forecast1h.population_mid - populationMid
      : null;
  const forecastPopulationDeltaPct =
    forecastPopulationDelta != null && populationMid > 0
      ? forecastPopulationDelta / populationMid
      : null;
  const futureCongestionScore =
    typeof forecast1h?.congestion_score === "number"
      ? forecast1h.congestion_score
      : congestionScore;
  const proxyScore =
    populationScore * 0.42 +
    congestionScore * 0.2 +
    trafficScore * 0.12 +
    precipitationScore * 0.14 +
    transitScore * 0.08 +
    eventScore * 0.04;

  return {
    area_code: areaCode,
    area_name: data.AREA_NM ?? result.code,
    poi_code: areaCode,
    poi_name: data.AREA_NM ?? poiMeta?.name ?? result.code,
    coverage_dong: poiMeta?.coverage_dong ?? null,
    poi_category: poiMeta?.category ?? null,
    lon: poiMeta?.lon ?? null,
    lat: poiMeta?.lat ?? null,
    poi_note: poiMeta?.note ?? null,
    observed_at: pop.PPLTN_TIME ?? data.PPLTN_TIME ?? null,
    traffic_observed_at: trafficAverage.ROAD_TRAFFIC_TIME ?? null,
    ...temporal,
    live_population_min: populationMin,
    live_population_max: populationMax,
    live_population_mid: populationMid,
    congestion_level: congestionLevel,
    congestion_score: congestionScore,
    traffic_index: trafficIndex,
    traffic_score: trafficScore,
    traffic_speed_kmh: Number(trafficAverage.ROAD_TRAFFIC_SPD ?? trafficAverage.ROAD_AVG_SPD ?? 0),
    city_weather_temp_c: Number(weather.TEMP ?? 0),
    city_precipitation_type: precipitationType,
    kma_temperature_c: nowcast.temperature_c,
    kma_precipitation_mm_1h: nowcast.precipitation_mm_1h,
    kma_humidity_pct: nowcast.humidity_pct,
    kma_wind_speed_ms: nowcast.wind_speed_ms,
    subway_station_count: subwayStations.length,
    subway_arrival_count: countTransitArrivals(subwayStations),
    bus_stop_count: busStops.length,
    event_count: events.length,
    demand_proxy_score: Number(proxyScore.toFixed(3)),
    population_forecast_1h: forecast1h,
    forecast_population_delta: forecastPopulationDelta,
    forecast_population_delta_pct: round(forecastPopulationDeltaPct, 4),
    poi_pressure_score: round(proxyScore * 0.7 + futureCongestionScore * 0.3, 3),
  };
}

const citydataAttemptPath = await latestRawAttemptPath("data", "raw", "citydata");
const citydataPath = await latestRawPath("data", "raw", "citydata");
const weatherAttemptPath = await latestRawAttemptPath("data", "raw", "weather");
const weatherPath = await latestRawPath("data", "raw", "weather");

if (!citydataPath) {
  console.error("No raw citydata snapshot found. Run npm run data:collect:citydata first.");
  process.exit(1);
}

const rawCitydata = await readJson(citydataPath);
const rawWeather = weatherPath ? await readJson(weatherPath) : null;
const rawCitydataAttempt = citydataAttemptPath ? await readJson(citydataAttemptPath) : null;
const rawWeatherAttempt = weatherAttemptPath ? await readJson(weatherAttemptPath) : null;
const poiConfig = await loadPoiConfig();
const collectedAt = new Date(rawCitydata?.meta?.collected_at ?? Date.now());
const temporal = kstTemporalFeatures(collectedAt);
const nowcast = kmaNowcast(rawWeather);
const rows = (rawCitydata.results ?? [])
  .filter((result) => result.ok)
  .map((result) => buildFeatureRow(result, temporal, nowcast, poiConfig.byCode))
  .filter(Boolean)
  .sort((left, right) => right.demand_proxy_score - left.demand_proxy_score);

const livePoiRows = rows
  .map((row) => ({
    source_status: "citydata_live",
    poi_code: row.poi_code,
    poi_name: row.poi_name,
    area_name: row.area_name,
    coverage_dong: row.coverage_dong,
    category: row.poi_category,
    lon: row.lon,
    lat: row.lat,
    observed_at: row.observed_at ?? null,
    current_population_min: row.live_population_min,
    current_population_max: row.live_population_max,
    current_population_mid: row.live_population_mid,
    current_congestion_level: row.congestion_level,
    current_congestion_score: row.congestion_score,
    current_traffic_index: row.traffic_index,
    current_traffic_score: row.traffic_score,
    current_traffic_speed_kmh: row.traffic_speed_kmh,
    current_weather_temp_c: row.city_weather_temp_c,
    current_precipitation_type: row.city_precipitation_type,
    demand_proxy_score: row.demand_proxy_score,
    poi_pressure_score: row.poi_pressure_score,
    population_forecast_1h: row.population_forecast_1h,
    forecast_population_delta: row.forecast_population_delta,
    forecast_population_delta_pct: row.forecast_population_delta_pct,
    note: row.poi_note,
  }))
  .sort((left, right) => (right.poi_pressure_score ?? 0) - (left.poi_pressure_score ?? 0));

const supplementalPoiRows = poiConfig.supplementalPois.map((poi) => ({
  source_status: "osm_context_only",
  poi_code: poi.id,
  poi_name: poi.name,
  area_name: poi.name,
  coverage_dong: poi.coverage_dong ?? null,
  category: poi.category ?? null,
  lon: poi.lon ?? null,
  lat: poi.lat ?? null,
  observed_at: null,
  current_population_min: null,
  current_population_max: null,
  current_population_mid: null,
  current_congestion_level: null,
  current_congestion_score: null,
  current_traffic_index: null,
  current_traffic_score: null,
  current_traffic_speed_kmh: null,
  current_weather_temp_c: null,
  current_precipitation_type: null,
  demand_proxy_score: null,
  poi_pressure_score: null,
  population_forecast_1h: null,
  forecast_population_delta: null,
  forecast_population_delta_pct: null,
  note: poi.note ?? "Supplemental POI without confirmed Seoul citydata hotspot code.",
}));

const poiOutput = {
  source: "gangnam_poi_feature_snapshot_v1",
  generated_at: new Date().toISOString(),
  raw_citydata_path: path.relative(projectRoot, citydataPath),
  official_reference: poiConfig.config?.official_reference ?? null,
  citydata_collection_count: poiConfig.citydataPois
    .filter((poi) => poi.collection_enabled !== false)
    .length,
  live_poi_count: livePoiRows.length,
  supplemental_poi_count: supplementalPoiRows.length,
  row_count: livePoiRows.length + supplementalPoiRows.length,
  direct_citydata_rows: livePoiRows,
  supplemental_watchlist: supplementalPoiRows,
  top_live_poi: livePoiRows[0] ?? null,
  note:
    "Citydata rows have current population/congestion/road speed. Supplemental watchlist rows are OSM/context POIs and must not be treated as live citydata observations.",
};

const output = {
  source: "public_signal_feature_snapshot_v1",
  generated_at: new Date().toISOString(),
  raw_citydata_path: path.relative(projectRoot, citydataPath),
  raw_weather_path: weatherPath ? path.relative(projectRoot, weatherPath) : null,
  raw_citydata_attempt_path: citydataAttemptPath ? path.relative(projectRoot, citydataAttemptPath) : null,
  raw_weather_attempt_path: weatherAttemptPath ? path.relative(projectRoot, weatherAttemptPath) : null,
  raw_citydata_attempt_meta: rawCitydataAttempt?.meta ?? null,
  raw_weather_attempt_meta: rawWeatherAttempt?.meta ?? null,
  weather_status: rawWeather
    ? {
        kma_ok: Boolean(rawWeather.meta?.ok),
        kma_status: rawWeather.meta?.status ?? null,
        kma_error: rawWeather.meta?.error ?? null,
      }
    : {
        kma_ok: false,
        kma_status: null,
        kma_error: "No raw KMA weather snapshot found.",
      },
  target_use: "pre-model taxi demand proxy features",
  row_count: rows.length,
  kma_nowcast: nowcast,
  features: rows,
};

const processedDir = path.join(projectRoot, "data", "processed", "features");
await mkdir(processedDir, { recursive: true });
await writeFile(
  path.join(processedDir, "latest.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
await writeFile(
  path.join(projectRoot, "public", "feature-snapshot.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
await writeFile(
  path.join(processedDir, "poi-features.json"),
  `${JSON.stringify(poiOutput, null, 2)}\n`,
);
await writeFile(
  path.join(projectRoot, "public", "poi-features.json"),
  `${JSON.stringify(poiOutput, null, 2)}\n`,
);

console.log("Wrote data/processed/features/latest.json");
console.log("Wrote public/feature-snapshot.json");
console.log("Wrote data/processed/features/poi-features.json");
console.log("Wrote public/poi-features.json");
