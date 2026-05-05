import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function readJson(relativePath) {
  const text = await readFile(path.join(projectRoot, relativePath), "utf8");
  return JSON.parse(text);
}

async function readJsonIfExists(relativePath) {
  try {
    return await readJson(relativePath);
  } catch {
    return null;
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function actionFor(imbalance) {
  if (imbalance >= 0.45) {
    return {
      level: "high",
      label: "선제 이동",
      coverage_units: 3,
      incentive_multiplier: 1.2,
    };
  }
  if (imbalance >= 0.25) {
    return {
      level: "medium",
      label: "커버 보강",
      coverage_units: 2,
      incentive_multiplier: 1.1,
    };
  }
  if (imbalance >= 0.1) {
    return {
      level: "watch",
      label: "관찰",
      coverage_units: 1,
      incentive_multiplier: 1.05,
    };
  }
  return {
    level: "low",
    label: "유지",
    coverage_units: 0,
    incentive_multiplier: 1.0,
  };
}

function supplyProxyFromTraffic(row) {
  if (!row) {
    return {
      supply_proxy_score: 0.5,
      supply_source: "fallback_neutral",
      congestion_score: null,
      avg_speed_kmh: null,
      link_count: 0,
      congested_link_count: 0,
      slow_link_count: 0,
    };
  }

  const congestionScore = Number(row.congestion_score);
  const avgSpeed = Number(row.avg_speed_kmh);
  const congestionSupply = Number.isFinite(congestionScore)
    ? 1 - clamp01(congestionScore)
    : null;
  const speedSupply = Number.isFinite(avgSpeed) ? clamp01(avgSpeed / 35) : null;

  let supply = 0.5;
  let source = "fallback_neutral";
  if (congestionSupply != null && speedSupply != null) {
    supply = congestionSupply * 0.7 + speedSupply * 0.3;
    source = "citydata_congestion_and_speed";
  } else if (congestionSupply != null) {
    supply = congestionSupply;
    source = "citydata_congestion";
  } else if (speedSupply != null) {
    supply = speedSupply;
    source = "citydata_speed";
  }

  return {
    supply_proxy_score: round(clamp01(supply)),
    supply_source: source,
    congestion_score: Number.isFinite(congestionScore) ? round(congestionScore) : null,
    avg_speed_kmh: Number.isFinite(avgSpeed) ? round(avgSpeed, 1) : null,
    link_count: row.link_count ?? 0,
    congested_link_count: row.congested_link_count ?? 0,
    slow_link_count: row.slow_link_count ?? 0,
  };
}

const forecast = await readJson("public/forecast/latest.json");
const traffic = await readJsonIfExists("data/processed/traffic/citydata_dong_traffic_latest.json");
const trafficByDong = new Map(
  (traffic?.dong_summary ?? []).map((region) => [region.dong_name, region]),
);

const decisions = (forecast.regions ?? [])
  .map((region) => {
    const trafficSupply = supplyProxyFromTraffic(trafficByDong.get(region.dong_name));
    const demandScore = clamp01(Number(region.score ?? 0));
    const imbalance = demandScore - trafficSupply.supply_proxy_score;
    const action = actionFor(imbalance);
    return {
      dong_name: region.dong_name,
      predicted_demand_score: round(demandScore),
      confidence: region.confidence,
      supply_proxy_score: trafficSupply.supply_proxy_score,
      supply_source: trafficSupply.supply_source,
      congestion_score: trafficSupply.congestion_score,
      avg_speed_kmh: trafficSupply.avg_speed_kmh,
      link_count: trafficSupply.link_count,
      congested_link_count: trafficSupply.congested_link_count,
      slow_link_count: trafficSupply.slow_link_count,
      imbalance_score: round(imbalance),
      action: action.label,
      action_level: action.level,
      coverage_units: action.coverage_units,
      incentive_multiplier: action.incentive_multiplier,
    };
  })
  .sort((left, right) => right.imbalance_score - left.imbalance_score);

const output = {
  source: "traffic_aware_dispatch_policy_v2",
  generated_at: new Date().toISOString(),
  forecast_source: forecast.source ?? "model",
  forecast_target_datetime: forecast.target_datetime,
  forecast_strategy: forecast.strategy ?? null,
  traffic_source: traffic?.meta?.source ?? null,
  traffic_collected_at: traffic?.meta?.collected_at ?? null,
  policy: "imbalance_score = predicted_demand_score - supply_proxy_score; coverage_units are dispatch priority bands, not taxi counts",
  decisions,
};

const outputPath = path.join(projectRoot, "public", "dispatch-plan.json");
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
