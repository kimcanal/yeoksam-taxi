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

async function latestRawCitydataPath() {
  const rawRoot = path.join(projectRoot, "data", "raw", "citydata");
  try {
    const days = (await readdir(rawRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
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

function summarizeCitydata(raw) {
  const places = (raw?.results ?? [])
    .filter((result) => result.ok)
    .flatMap((result) => {
      const data = unwrapCitydata(result.data);
      if (!data) return [];
      const pop = data.LIVE_PPLTN_STTS?.[0] ?? {};
      const traffic = Array.isArray(data.ROAD_TRAFFIC_STTS)
        ? data.ROAD_TRAFFIC_STTS[0] ?? {}
        : data.ROAD_TRAFFIC_STTS ?? {};
      const weather = data.WEATHER_STTS?.[0] ?? {};
      return [{
        area_name: data.AREA_NM ?? result.code,
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

const latestPath = await latestRawCitydataPath();
const rawCitydata = latestPath
  ? JSON.parse(await readFile(latestPath, "utf8"))
  : null;
const forecast = await readJsonIfExists("public/forecast/latest.json");
const dispatchPlan = await readJsonIfExists("public/dispatch-plan.json");

const summary = {
  generated_at: new Date().toISOString(),
  raw_citydata_path: latestPath
    ? path.relative(projectRoot, latestPath)
    : null,
  citydata: rawCitydata
    ? summarizeCitydata(rawCitydata)
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
      }
    : null,
};

const outputPath = path.join(projectRoot, "public", "data-summary.json");
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
