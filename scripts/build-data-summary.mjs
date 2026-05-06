import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function readJsonIfExists(relativePath, fallback = null) {
  try {
    const text = await readFile(path.join(projectRoot, relativePath), "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function loadPoiMeta() {
  const config = await readJsonIfExists("data/config/gangnam-pois.json", {});
  const entries = Array.isArray(config?.citydata_collection)
    ? config.citydata_collection
    : [];
  return new Map(entries.filter((poi) => poi?.code).map((poi) => [poi.code, poi]));
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
    const files = (await readdir(dayRoot))
      .filter((file) => file.endsWith(".json"))
      .sort();
    const fileInfos = await Promise.all(
      files.map(async (file) => ({
        file,
        mtimeMs: (await stat(path.join(dayRoot, file))).mtimeMs,
      })),
    );
    const sorted = fileInfos.sort((left, right) => left.mtimeMs - right.mtimeMs);
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
    const files = (await readdir(dayRoot))
      .filter((file) => file.endsWith(".json"))
      .sort();
    const fileInfos = await Promise.all(
      files.map(async (file) => ({
        file,
        mtimeMs: (await stat(path.join(dayRoot, file))).mtimeMs,
      })),
    );
    const latestFile = fileInfos.sort((left, right) => left.mtimeMs - right.mtimeMs).at(-1);
    return latestFile ? path.join(dayRoot, latestFile.file) : null;
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

function summarizeCitydata(raw, poiByCode = new Map()) {
  const places = (raw?.results ?? [])
    .filter((result) => result.ok)
    .flatMap((result) => {
      const data = unwrapCitydata(result.data);
      if (!data) return [];
      const code = data.AREA_CD ?? result.code;
      const poiMeta = poiByCode.get(code) ?? poiByCode.get(result.code) ?? null;
      if (poiMeta?.collection_enabled === false) return [];

      const pop = data.LIVE_PPLTN_STTS?.[0] ?? {};
      const traffic = Array.isArray(data.ROAD_TRAFFIC_STTS)
        ? data.ROAD_TRAFFIC_STTS[0] ?? {}
        : data.ROAD_TRAFFIC_STTS ?? {};
      const weather = data.WEATHER_STTS?.[0] ?? {};
      return [{
        area_name: data.AREA_NM ?? poiMeta?.name ?? code,
        congestion_level: pop.AREA_CONGEST_LVL ?? data.AREA_CONGEST_LVL ?? "unknown",
        population_min: Number(pop.AREA_PPLTN_MIN ?? 0),
        population_max: Number(pop.AREA_PPLTN_MAX ?? 0),
        traffic_index: traffic.AVG_ROAD_DATA?.ROAD_TRAFFIC_IDX ?? traffic.ROAD_TRAFFIC_IDX ?? "unknown",
        traffic_speed_kmh: Number(
          traffic.AVG_ROAD_DATA?.ROAD_TRAFFIC_SPD ?? traffic.ROAD_TRAFFIC_SPD ?? 0,
        ),
        traffic_observed_at:
          traffic.AVG_ROAD_DATA?.ROAD_TRAFFIC_TIME ?? traffic.ROAD_TRAFFIC_TIME ?? "",
        temperature_c: Number(weather.TEMP ?? 0),
        precipitation_type: weather.PRECPT_TYPE ?? "unknown",
        observed_at: pop.PPLTN_TIME ?? data.PPLTN_TIME ?? "",
      }];
    });

  const topPopulation = [...places].sort(
    (left, right) => right.population_max - left.population_max,
  )[0] ?? null;

  return {
    collected_at: raw?.meta?.collected_at ?? null,
    source: raw?.meta?.source ?? "Seoul citydata OA-21285",
    place_count: places.length,
    top_population: topPopulation,
    places,
  };
}

const latestAttemptPath = await latestRawAttemptPath("data", "raw", "citydata");
const latestPath = await latestRawPath("data", "raw", "citydata");
const latestWeatherAttemptPath = await latestRawAttemptPath("data", "raw", "weather");
const latestWeatherPath = await latestRawPath("data", "raw", "weather");
const rawCitydata = latestPath
  ? JSON.parse(await readFile(latestPath, "utf8"))
  : null;
const rawCitydataAttempt = latestAttemptPath
  ? JSON.parse(await readFile(latestAttemptPath, "utf8"))
  : null;
const rawWeatherAttempt = latestWeatherAttemptPath
  ? JSON.parse(await readFile(latestWeatherAttemptPath, "utf8"))
  : null;
const forecast = await readJsonIfExists("public/forecast/latest.json");
const dispatchPlan = await readJsonIfExists("public/dispatch-plan.json");
const featureSnapshot = await readJsonIfExists("public/feature-snapshot.json");
const poiFeatures = await readJsonIfExists("public/poi-features.json");
const poiForecastComparison = await readJsonIfExists("public/poi-forecast-comparison.json");
const taxiPressure = await readJsonIfExists("public/taxi-pressure/latest.json");
const taxiPressureComparison = await readJsonIfExists("public/taxi-pressure-comparison.json");
const poiByCode = await loadPoiMeta();

const summary = {
  generated_at: new Date().toISOString(),
  raw_citydata_path: latestPath
    ? path.relative(projectRoot, latestPath)
    : null,
  raw_weather_path: latestWeatherPath
    ? path.relative(projectRoot, latestWeatherPath)
    : null,
  raw_citydata_attempt_path: latestAttemptPath
    ? path.relative(projectRoot, latestAttemptPath)
    : null,
  raw_weather_attempt_path: latestWeatherAttemptPath
    ? path.relative(projectRoot, latestWeatherAttemptPath)
    : null,
  raw_citydata_attempt_meta: rawCitydataAttempt?.meta ?? null,
  raw_weather_attempt_meta: rawWeatherAttempt?.meta ?? null,
  citydata: rawCitydata
    ? summarizeCitydata(rawCitydata, poiByCode)
    : {
        collected_at: null,
        source: "Seoul citydata OA-21285",
        place_count: 0,
        top_population: null,
        places: [],
      },
  forecast: forecast
    ? {
        source: forecast.source ?? "model",
        target_datetime: forecast.target_datetime,
        strategy: forecast.strategy ?? null,
        feature_set: forecast.feature_set ?? null,
        model_feature_set: forecast.model_feature_set ?? null,
        weather: forecast.weather,
        generated_at: forecast.generated_at,
        region_count: forecast.regions?.length ?? 0,
      }
    : null,
  dispatch: dispatchPlan
    ? {
        generated_at: dispatchPlan.generated_at,
        top_region: dispatchPlan.decisions?.[0] ?? null,
        decision_count: dispatchPlan.decisions?.length ?? 0,
        policy_effect_summary: dispatchPlan.policy_effect_summary ?? null,
      }
    : null,
  taxi_pressure: taxiPressure
    ? {
        source: taxiPressure.source,
        generated_at: taxiPressure.generated_at,
        target_datetime: taxiPressure.target_datetime,
        top_region: taxiPressure.regions?.[0] ?? null,
        region_count: taxiPressure.regions?.length ?? 0,
      }
    : null,
  taxi_pressure_validation: taxiPressureComparison
    ? {
        generated_at: taxiPressureComparison.generated_at,
        status: taxiPressureComparison.status,
        completed_count: taxiPressureComparison.completed_count,
        waiting_count: taxiPressureComparison.waiting_count,
        latest: taxiPressureComparison.latest ?? null,
      }
    : null,
  features: featureSnapshot
    ? {
        generated_at: featureSnapshot.generated_at,
        row_count: featureSnapshot.row_count,
        top_area: featureSnapshot.features?.[0] ?? null,
        source: featureSnapshot.source,
      }
    : null,
  poi_features: poiFeatures
    ? {
        generated_at: poiFeatures.generated_at,
        row_count: poiFeatures.row_count,
        live_poi_count: poiFeatures.live_poi_count,
        supplemental_poi_count: poiFeatures.supplemental_poi_count,
        citydata_collection_count: poiFeatures.citydata_collection_count,
        top_live_poi: poiFeatures.top_live_poi ?? null,
        source: poiFeatures.source,
        note: poiFeatures.note,
      }
    : null,
  poi_forecast_validation: poiForecastComparison
    ? {
        generated_at: poiForecastComparison.generated_at,
        comparison_type: poiForecastComparison.comparison_type,
        completed_count: poiForecastComparison.completed_count,
        waiting_count: poiForecastComparison.waiting_count,
        latest: poiForecastComparison.latest ?? null,
      }
    : null,
};

const outputPath = path.join(projectRoot, "public", "data-summary.json");
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
