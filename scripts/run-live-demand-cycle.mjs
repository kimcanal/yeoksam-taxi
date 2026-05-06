import { appendFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function pad(value) {
  return String(value).padStart(2, "0");
}

function kstDate(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

function formatKstHour(date) {
  const kst = kstDate(date);
  return [
    kst.getUTCFullYear(),
    pad(kst.getUTCMonth() + 1),
    pad(kst.getUTCDate()),
  ].join("-") + ` ${pad(kst.getUTCHours())}:00`;
}

function defaultTargetHour() {
  const now = new Date();
  const kst = kstDate(now);
  kst.setUTCMinutes(0, 0, 0);
  const targetKstAsUtc = new Date(kst.getTime() + 60 * 60 * 1000);
  const targetUtc = new Date(targetKstAsUtc.getTime() - 9 * 60 * 60 * 1000);
  return formatKstHour(targetUtc);
}

function nowKstIso() {
  const kst = kstDate(new Date());
  return [
    kst.getUTCFullYear(),
    pad(kst.getUTCMonth() + 1),
    pad(kst.getUTCDate()),
  ].join("-") + `T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())}+09:00`;
}

async function runStep(label, command, args) {
  console.log(`\n[${label}] ${command} ${args.join(" ")}`);
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

async function tryStep(label, command, args) {
  try {
    await runStep(label, command, args);
    return true;
  } catch (error) {
    console.warn(`\n[warn] ${label} failed: ${error?.message ?? error}`);
    return false;
  }
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function pathExists(relativePath) {
  try {
    await stat(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function latestRawPath(relativeDir) {
  const root = path.join(projectRoot, relativeDir);
  try {
    const days = (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
      .sort();
    const day = days.at(-1);
    if (!day) return null;

    const dayRoot = path.join(root, day);
    const files = (await readdir(dayRoot)).filter((file) => file.endsWith(".json"));
    const infos = await Promise.all(
      files.map(async (file) => ({
        file,
        mtimeMs: (await stat(path.join(dayRoot, file))).mtimeMs,
      })),
    );
    const sorted = infos.sort((left, right) => left.mtimeMs - right.mtimeMs);
    const candidates = sorted.map((info) => path.join(dayRoot, info.file));

    const preferOk = relativeDir.includes("weather") || relativeDir.includes("citydata");
    if (!preferOk) {
      return candidates.at(-1) ?? null;
    }

    const isOkSnapshot = async (filePath) => {
      try {
        const json = JSON.parse(await readFile(filePath, "utf8"));
        const metaOk = json?.meta?.ok;
        if (typeof metaOk === "boolean") return metaOk;
        if (relativeDir.includes("citydata")) {
          return Array.isArray(json?.results) && json.results.some((r) => r?.ok);
        }
        return true;
      } catch {
        return false;
      }
    };

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      if (await isOkSnapshot(candidates[index])) return candidates[index];
    }
    return candidates.at(-1) ?? null;
  } catch {
    return null;
  }
}

function weatherObserved(weather) {
  const items = weather?.data?.response?.body?.items?.item;
  if (!Array.isArray(items)) return {};

  const byCategory = Object.fromEntries(
    items.map((item) => [item.category, item.obsrValue]),
  );

  return {
    temperature_c: byCategory.T1H ?? null,
    precipitation_mm: byCategory.RN1 ?? null,
    precipitation_type: byCategory.PTY ?? null,
    humidity_pct: byCategory.REH ?? null,
    wind_speed_ms: byCategory.WSD ?? null,
  };
}

function trafficAggregate(traffic) {
  const rows = traffic?.dong_summary ?? [];
  const weighted = rows.filter((row) => Number(row.total_distance_m) > 0);
  const totalDistance = weighted.reduce((sum, row) => sum + Number(row.total_distance_m), 0);

  const avgSpeed = totalDistance
    ? weighted.reduce(
        (sum, row) => sum + Number(row.avg_speed_kmh ?? 0) * Number(row.total_distance_m),
        0,
      ) / totalDistance
    : null;
  const congestionScore = totalDistance
    ? weighted.reduce(
        (sum, row) => sum + Number(row.congestion_score ?? 0) * Number(row.total_distance_m),
        0,
      ) / totalDistance
    : null;

  const topCongestedDongs = [...rows]
    .sort((left, right) => Number(right.congestion_score ?? -1) - Number(left.congestion_score ?? -1))
    .slice(0, 5)
    .map((row) => ({
      dong_name: row.dong_name,
      congestion_score: row.congestion_score,
      avg_speed_kmh: row.avg_speed_kmh,
      congested_link_count: row.congested_link_count,
      slow_link_count: row.slow_link_count,
    }));

  return {
    dong_count: rows.length,
    total_distance_m: Number(totalDistance.toFixed(1)),
    avg_speed_kmh: avgSpeed == null ? null : Number(avgSpeed.toFixed(1)),
    congestion_score: congestionScore == null ? null : Number(congestionScore.toFixed(3)),
    top_congested_dongs: topCongestedDongs,
  };
}

const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith("--"));
const skipCollect = args.includes("--skip-collect");
const offlineMode = args.includes("--offline");
const nodeModels = args.includes("--node-models");
const targetDatetime = targetArg ?? defaultTargetHour();
const pythonCommand = process.env.PYTHON_BIN ?? (process.platform === "win32" ? "python" : "python3");

if (!skipCollect && !offlineMode) {
  const citydataOk = await tryStep("citydata", "node", ["scripts/collect-citydata.mjs"]);
  const weatherOk = await tryStep("weather", "node", ["scripts/collect-weather.mjs"]);
  const trafficOk = await tryStep("traffic", "node", ["scripts/extract-traffic-links.mjs"]);
  if (!(citydataOk && weatherOk && trafficOk)) {
    console.warn("[warn] Live collection incomplete; continuing with latest cached raw snapshots.");
  }
}

const citydataPath = await latestRawPath("data/raw/citydata");
if (!skipCollect || citydataPath) {
  await runStep("feature-snapshot", "node", ["scripts/build-feature-snapshot.mjs"]);
} else {
  console.log("[skip] feature-snapshot: no raw citydata snapshot available");
}

const liveModelPath = "data/processed/model_live_compatible/dong_demand_proxy_model.joblib";
const modelPath = (await pathExists(liveModelPath))
  ? liveModelPath
  : "data/processed/model/dong_demand_proxy_model.joblib";
const weatherPath = await latestRawPath("data/raw/weather");
const forecastOk = !nodeModels
  ? await tryStep("forecast", pythonCommand, [
    "scripts/predict_dong_demand_proxy.py",
    targetDatetime,
    "--out",
    "public/forecast/latest.json",
    "--strategy",
    "auto",
    "--model",
    modelPath,
    ...(weatherPath ? ["--weather-snapshot", weatherPath] : []),
  ])
  : false;

if (!forecastOk) {
  await runStep("forecast(node)", "node", [
    "scripts/predict_dong_demand_proxy.mjs",
    targetDatetime,
    "--out",
    "public/forecast/latest.json",
    ...(weatherPath ? ["--weather-snapshot", weatherPath] : []),
  ]);
}

const trafficOk = !nodeModels
  ? await tryStep("traffic-forecast", pythonCommand, [
    "scripts/predict_traffic_forecast.py",
    targetDatetime,
  ])
  : false;

if (!trafficOk) {
  await runStep("traffic-forecast(node)", "node", [
    "scripts/predict_traffic_forecast.mjs",
    targetDatetime,
  ]);
}

await runStep("taxi-pressure", "node", ["scripts/build-taxi-pressure-forecast.mjs"]);
await runStep("traffic-comparison", "node", ["scripts/build-traffic-forecast-comparison.mjs"]);
await runStep("taxi-pressure-comparison", "node", ["scripts/build-taxi-pressure-comparison.mjs"]);
await runStep("public-pressure-baseline", "node", ["scripts/build-public-pressure-baseline.mjs"]);
await runStep("poi-forecast-comparison", "node", ["scripts/build-poi-forecast-comparison.mjs"]);
await runStep("population-pressure-summary", "node", ["scripts/build-population-pressure-summary.mjs"]);
await runStep("dispatch", "node", ["module4_dispatch/run_dispatch_policy.mjs"]);
await runStep("data-summary", "node", ["scripts/build-data-summary.mjs"]);

const forecastPath = path.join(projectRoot, "public", "forecast", "latest.json");
const dispatchPath = path.join(projectRoot, "public", "dispatch-plan.json");
const trafficPath = path.join(projectRoot, "data", "processed", "traffic", "citydata_dong_traffic_latest.json");

const forecast = await readJsonIfExists(forecastPath);
const dispatch = await readJsonIfExists(dispatchPath);
const traffic = await readJsonIfExists(trafficPath);
const weather = weatherPath ? await readJsonIfExists(weatherPath) : null;

const liveValidationDir = path.join(projectRoot, "data", "processed", "live_validation");
await mkdir(liveValidationDir, { recursive: true });

const logEntry = {
  generated_at: nowKstIso(),
  validation_status: "forecast_logged_waiting_for_future_proxy",
  forecast_path: path.relative(projectRoot, forecastPath),
  dispatch_path: path.relative(projectRoot, dispatchPath),
  model_path: modelPath,
  traffic_snapshot_path: path.relative(projectRoot, trafficPath),
  weather_snapshot_path: weatherPath ? path.relative(projectRoot, weatherPath) : null,
  target_datetime: forecast?.target_datetime ?? targetDatetime,
  feature_datetime: forecast?.feature_datetime ?? null,
  strategy: forecast?.strategy ?? null,
  calendar: forecast?.calendar ?? null,
  model_target: forecast?.model_target ?? null,
  current_weather: {
    meta: weather?.meta ?? null,
    observed: weatherObserved(weather),
  },
  current_traffic: {
    meta: traffic?.meta ?? null,
    aggregate: trafficAggregate(traffic),
  },
  forecast_top_regions: (forecast?.regions ?? []).slice(0, 5),
  dispatch_top_decisions: (dispatch?.decisions ?? []).slice(0, 5),
  note:
    "This validates live inputs, logs the forecast, and records the demand monitoring priority. It is not an operational taxi dispatch command. True demand accuracy can be scored later when a matching observed demand proxy or taxi-call label is available.",
};

const latestPath = path.join(liveValidationDir, "latest.json");
const logPath = path.join(liveValidationDir, "live_forecast_log.jsonl");
await writeFile(latestPath, `${JSON.stringify(logEntry, null, 2)}\n`);
await appendFile(logPath, `${JSON.stringify(logEntry)}\n`);
await runStep("live-comparison", "node", ["scripts/build-live-forecast-comparison.mjs"]);
await runStep("model-observability", "node", ["scripts/build-model-observability.mjs"]);
await runStep("demand-guardrail-summary", "node", ["scripts/build-demand-guardrail-summary.mjs"]);
await runStep("overnight-status", "node", ["scripts/build-overnight-status.mjs"]);

console.log(`\nWrote ${path.relative(projectRoot, latestPath)}`);
console.log(`Appended ${path.relative(projectRoot, logPath)}`);
console.log("\nLive validation summary");
console.log(JSON.stringify({
  target_datetime: logEntry.target_datetime,
  calendar: logEntry.calendar,
  strategy: logEntry.strategy,
  traffic: logEntry.current_traffic.aggregate,
  top_regions: logEntry.forecast_top_regions,
  top_dispatch_decisions: logEntry.dispatch_top_decisions,
}, null, 2));
