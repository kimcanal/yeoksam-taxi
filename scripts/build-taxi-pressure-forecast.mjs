import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_DEMAND_FORECAST = "public/forecast/latest.json";
const DEFAULT_TRAFFIC_FORECAST = "public/traffic-forecast/latest.json";
const DEFAULT_CURRENT_TRAFFIC = "data/processed/traffic/citydata_dong_traffic_latest.json";
const DEFAULT_OUT = "public/taxi-pressure/latest.json";
const DEFAULT_LOG = "data/processed/live_validation/taxi_pressure_log.jsonl";

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    demandForecast: DEFAULT_DEMAND_FORECAST,
    trafficForecast: DEFAULT_TRAFFIC_FORECAST,
    currentTraffic: DEFAULT_CURRENT_TRAFFIC,
    out: DEFAULT_OUT,
    log: DEFAULT_LOG,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--demand-forecast" && next) {
      options.demandForecast = next;
      index += 1;
    } else if (arg === "--traffic-forecast" && next) {
      options.trafficForecast = next;
      index += 1;
    } else if (arg === "--current-traffic" && next) {
      options.currentTraffic = next;
      index += 1;
    } else if (arg === "--out" && next) {
      options.out = next;
      index += 1;
    } else if (arg === "--log" && next) {
      options.log = next;
      index += 1;
    }
  }

  return options;
}

async function readJson(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const text = await readFile(absolutePath, "utf8");
  return JSON.parse(text);
}

async function readJsonIfExists(relativePath, fallback = null) {
  try {
    return await readJson(relativePath);
  } catch {
    return fallback;
  }
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function nowIso() {
  return new Date().toISOString();
}

function byDong(rows) {
  return new Map(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.dong_name)
      .map((row) => [row.dong_name, row]),
  );
}

function minmaxScore(value, values, fallback = 0.5) {
  const finite = values.filter((candidate) => Number.isFinite(candidate));
  if (!Number.isFinite(value) || finite.length === 0) return fallback;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (Object.is(min, max)) return fallback;
  return clamp01((value - min) / (max - min));
}

function roadAccessibility(predictedCongestion, predictedSpeed, currentCongestion, currentSpeed) {
  const congestion = numberOrNull(predictedCongestion) ?? numberOrNull(currentCongestion) ?? 0.5;
  const speed = numberOrNull(predictedSpeed) ?? numberOrNull(currentSpeed) ?? 22;
  const congestionAccess = 1 - clamp01(congestion);
  const speedAccess = clamp01(speed / 35);
  return clamp01(congestionAccess * 0.68 + speedAccess * 0.32);
}

function actionFor(priorityScore) {
  if (priorityScore >= 0.72) {
    return {
      action_level: "high",
      action: "proactive_relocation_and_incentive",
      monitoring_units: 3,
      incentive_multiplier: 1.25,
    };
  }
  if (priorityScore >= 0.55) {
    return {
      action_level: "medium",
      action: "light_relocation_or_queue_watch",
      monitoring_units: 2,
      incentive_multiplier: 1.15,
    };
  }
  if (priorityScore >= 0.4) {
    return {
      action_level: "watch",
      action: "monitor_next_refresh",
      monitoring_units: 1,
      incentive_multiplier: 1.05,
    };
  }
  return {
    action_level: "low",
    action: "hold",
    monitoring_units: 0,
    incentive_multiplier: 1,
  };
}

function confidenceFor({ demandRegion, trafficRegion, currentTraffic }) {
  const demandConfidence = numberOrNull(demandRegion?.confidence) ?? 0.5;
  const trafficConfidence = trafficRegion ? 0.65 : 0.35;
  const linkCount = numberOrNull(currentTraffic?.link_count) ?? 0;
  const liveCoverage = clamp01(linkCount / 24);
  return clamp01(demandConfidence * 0.45 + trafficConfidence * 0.3 + liveCoverage * 0.25);
}

function buildRows({ demandForecast, trafficForecast, currentTraffic }) {
  const demandByDong = byDong(demandForecast?.regions);
  const trafficForecastByDong = byDong(trafficForecast?.regions);
  const currentTrafficByDong = byDong(currentTraffic?.dong_summary);

  const dongNames = [
    ...new Set([
      ...demandByDong.keys(),
      ...trafficForecastByDong.keys(),
      ...currentTrafficByDong.keys(),
    ]),
  ].sort();

  const trafficPredictionValues = [...trafficForecastByDong.values()]
    .map((row) => numberOrNull(row.predicted_traffic_volume_proxy))
    .filter((value) => value != null);

  return dongNames
    .map((dongName) => {
      const demandRegion = demandByDong.get(dongName);
      const trafficRegion = trafficForecastByDong.get(dongName);
      const liveTraffic = currentTrafficByDong.get(dongName);

      const demandScore = clamp01(numberOrNull(demandRegion?.score) ?? 0);
      const trafficVolumeScore = clamp01(
        numberOrNull(trafficRegion?.predicted_traffic_volume_score)
          ?? minmaxScore(
            numberOrNull(trafficRegion?.predicted_traffic_volume_proxy),
            trafficPredictionValues,
          ),
      );
      const predictedCongestion = numberOrNull(trafficRegion?.predicted_congestion_score)
        ?? numberOrNull(liveTraffic?.congestion_score)
        ?? 0.5;
      const predictedSpeed = numberOrNull(trafficRegion?.predicted_avg_speed_kmh)
        ?? numberOrNull(liveTraffic?.avg_speed_kmh)
        ?? 22;
      const accessibility = roadAccessibility(
        predictedCongestion,
        predictedSpeed,
        liveTraffic?.congestion_score,
        liveTraffic?.avg_speed_kmh,
      );
      const congestionPressure = 1 - accessibility;
      const taxiPressureScore = clamp01(
        demandScore * 0.52 + trafficVolumeScore * 0.2 + congestionPressure * 0.28,
      );
      const demandAccessGap = Math.max(0, demandScore - accessibility);
      const dispatchPriorityScore = clamp01(taxiPressureScore * 0.74 + demandAccessGap * 0.26);
      const action = actionFor(dispatchPriorityScore);

      return {
        dong_name: dongName,
        taxi_pressure_score: round(taxiPressureScore),
        dispatch_priority_score: round(dispatchPriorityScore),
        demand_access_gap: round(demandAccessGap),
        predicted_movement_demand_score: round(demandScore),
        predicted_movement_raw: round(numberOrNull(demandRegion?.raw_prediction), 6),
        predicted_traffic_volume_score: round(trafficVolumeScore),
        predicted_traffic_volume_proxy: round(
          numberOrNull(trafficRegion?.predicted_traffic_volume_proxy),
          3,
        ),
        predicted_congestion_score: round(predictedCongestion),
        predicted_avg_speed_kmh: round(predictedSpeed, 1),
        road_accessibility_score: round(accessibility),
        current_congestion_score: round(numberOrNull(liveTraffic?.congestion_score)),
        current_avg_speed_kmh: round(numberOrNull(liveTraffic?.avg_speed_kmh), 1),
        current_link_count: liveTraffic?.link_count ?? null,
        confidence: round(confidenceFor({ demandRegion, trafficRegion, currentTraffic: liveTraffic })),
        ...action,
      };
    })
    .sort(
      (left, right) =>
        right.dispatch_priority_score - left.dispatch_priority_score
        || right.taxi_pressure_score - left.taxi_pressure_score,
    );
}

const options = parseArgs();
const demandForecast = await readJson(options.demandForecast);
const trafficForecast = await readJson(options.trafficForecast);
const currentTraffic = await readJsonIfExists(options.currentTraffic, null);
const rows = buildRows({ demandForecast, trafficForecast, currentTraffic });

const payload = {
  source: "taxi_pressure_fusion_model_v1",
  model_type: "public_data_proxy_ensemble",
  generated_at: nowIso(),
  target_datetime: demandForecast.target_datetime ?? trafficForecast.target_datetime ?? null,
  feature_datetime: demandForecast.feature_datetime ?? trafficForecast.feature_datetime ?? null,
  horizon_hours: 1,
  inputs: {
    movement_demand_forecast: options.demandForecast,
    traffic_forecast: options.trafficForecast,
    current_traffic_snapshot: options.currentTraffic,
  },
  formula: {
    taxi_pressure_score:
      "0.52 * movement_demand_score + 0.20 * traffic_volume_score + 0.28 * congestion_pressure",
    congestion_pressure: "1 - road_accessibility_score",
    road_accessibility_score:
      "0.68 * (1 - predicted_congestion_score) + 0.32 * clamp(predicted_avg_speed_kmh / 35)",
    dispatch_priority_score:
      "0.74 * taxi_pressure_score + 0.26 * max(0, movement_demand_score - road_accessibility_score)",
  },
  interpretation:
    "Ranks dong-level future taxi-dispatch pressure from public proxy signals. It is not direct taxi-call volume.",
  regions: rows,
};

for (const relativePath of [options.out]) {
  const absolutePath = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

if (options.log) {
  const logPath = path.join(projectRoot, options.log);
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(payload)}\n`, "utf8");
}

console.log(`Wrote ${options.out}`);
if (options.log) console.log(`Appended ${options.log}`);
console.log(
  JSON.stringify(
    {
      target_datetime: payload.target_datetime,
      top_regions: rows.slice(0, 5).map((row) => ({
        dong_name: row.dong_name,
        dispatch_priority_score: row.dispatch_priority_score,
        taxi_pressure_score: row.taxi_pressure_score,
        action_level: row.action_level,
      })),
    },
    null,
    2,
  ),
);
