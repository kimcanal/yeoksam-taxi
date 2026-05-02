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

async function latestRawPath(...segments) {
  const rawRoot = path.join(projectRoot, ...segments);
  try {
    const days = (await readdir(rawRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
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

function buildFeatureRow(result, temporal, nowcast) {
  const data = unwrapCitydata(result.data);
  if (!data) return null;

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
  const proxyScore =
    populationScore * 0.42 +
    congestionScore * 0.2 +
    trafficScore * 0.12 +
    precipitationScore * 0.14 +
    transitScore * 0.08 +
    eventScore * 0.04;

  return {
    area_code: data.AREA_CD ?? result.code,
    area_name: data.AREA_NM ?? result.code,
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
  };
}

const citydataPath = await latestRawPath("data", "raw", "citydata");
const weatherPath = await latestRawPath("data", "raw", "weather");

if (!citydataPath) {
  console.error("No raw citydata snapshot found. Run npm run data:collect:citydata first.");
  process.exit(1);
}

const rawCitydata = await readJson(citydataPath);
const rawWeather = weatherPath ? await readJson(weatherPath) : null;
const collectedAt = new Date(rawCitydata?.meta?.collected_at ?? Date.now());
const temporal = kstTemporalFeatures(collectedAt);
const nowcast = kmaNowcast(rawWeather);
const rows = (rawCitydata.results ?? [])
  .filter((result) => result.ok)
  .map((result) => buildFeatureRow(result, temporal, nowcast))
  .filter(Boolean)
  .sort((left, right) => right.demand_proxy_score - left.demand_proxy_score);

const output = {
  source: "public_signal_feature_snapshot_v1",
  generated_at: new Date().toISOString(),
  raw_citydata_path: path.relative(projectRoot, citydataPath),
  raw_weather_path: weatherPath ? path.relative(projectRoot, weatherPath) : null,
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

console.log("Wrote data/processed/features/latest.json");
console.log("Wrote public/feature-snapshot.json");
