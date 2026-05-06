import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function readJson(relativePath, fallback = null) {
  try {
    const text = await readFile(path.join(projectRoot, relativePath), "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function readJsonl(relativePath) {
  try {
    const text = await readFile(path.join(projectRoot, relativePath), "utf8");
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

function formatKst(value) {
  if (!value) return "-";
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(String(value))
    ? `${String(value).slice(0, 16).replace(" ", "T")}:00+09:00`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function oneLine(value) {
  if (value == null || value === "") return "-";
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function topRows(rows, scoreField, limit = 5) {
  return [...(rows ?? [])]
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      dong_name: oneLine(row.dong_name),
      score: row[scoreField] ?? null,
      action_level: oneLine(row.action_level),
    }));
}

function markdownTable(rows) {
  if (!rows.length) return "_No rows._";
  return [
    "| Rank | Dong | Score | Level |",
    "| ---: | --- | ---: | --- |",
    ...rows.map((row) => (
      `| ${row.rank} | ${row.dong_name ?? "-"} | ${
        row.score == null ? "-" : Number(row.score).toFixed(4)
      } | ${row.action_level ?? "-"} |`
    )),
  ].join("\n");
}

function guardrailRows(rows, limit = 5) {
  return [...(rows ?? [])].slice(0, limit).map((row, index) => ({
    rank: index + 1,
    dong_name: oneLine(row.dong_name),
    priority: row.monitoring_priority_score ?? null,
    pressure: row.composite_pressure_score ?? null,
    confidence: row.confidence_score ?? null,
    level: oneLine(row.confidence_level),
    risks: (row.guardrails?.risk_flags ?? []).map(oneLine).join(", ") || "-",
  }));
}

function guardrailTable(rows) {
  if (!rows.length) return "_No rows._";
  return [
    "| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |",
    "| ---: | --- | ---: | ---: | ---: | --- | --- |",
    ...rows.map((row) => (
      `| ${row.rank} | ${row.dong_name ?? "-"} | ${
        row.priority == null ? "-" : Number(row.priority).toFixed(4)
      } | ${row.pressure == null ? "-" : Number(row.pressure).toFixed(4)} | ${
        row.confidence == null ? "-" : Number(row.confidence).toFixed(4)
      } | ${row.level ?? "-"} | ${row.risks ?? "-"} |`
    )),
  ].join("\n");
}

const dataSummary = await readJson("public/data-summary.json", {});
const featureSnapshot = await readJson("public/feature-snapshot.json", {});
const forecast = await readJson("public/forecast/latest.json", {});
const trafficForecast = await readJson("public/traffic-forecast/latest.json", {});
const taxiPressure = await readJson("public/taxi-pressure/latest.json", {});
const dispatchPlan = await readJson("public/dispatch-plan.json", {});
const taxiPressureComparison = await readJson("public/taxi-pressure-comparison.json", {});
const poiForecastComparison = await readJson("public/poi-forecast-comparison.json", {});
const populationPressure = await readJson("public/population-pressure-summary.json", {});
const demandGuardrail = await readJson("public/demand-guardrail-summary.json", {});
const liveLogs = await readJsonl("data/processed/live_validation/live_forecast_log.jsonl");
const taxiPressureLogs = await readJsonl("data/processed/live_validation/taxi_pressure_log.jsonl");

const latestWeather = featureSnapshot.kma_nowcast ?? {};
const latestPressureRows = topRows(taxiPressure.regions, "dispatch_priority_score");
const latestDemandRows = topRows(forecast.regions, "score", 3);
const latestTrafficRows = topRows(trafficForecast.regions, "predicted_congestion_score", 3);
const latestGuardrailRows = guardrailRows(demandGuardrail.top_monitoring_dongs, 5);
const latestComparison = taxiPressureComparison.latest ?? null;

const status = {
  generated_at: new Date().toISOString(),
  generated_at_kst: formatKst(new Date().toISOString()),
  automation_window: {
    until_kst: "2026-05-06 09:00",
    purpose: "overnight model QA and public-data proxy model improvement",
  },
  latest_api_collection: {
    citydata_collected_at: dataSummary.citydata?.collected_at ?? null,
    raw_citydata_path: dataSummary.raw_citydata_path ?? null,
    raw_weather_path: dataSummary.raw_weather_path ?? null,
    kma_ok: featureSnapshot.weather_status?.kma_ok ?? null,
    kma_status: featureSnapshot.weather_status?.kma_status ?? null,
    weather_meaning:
      latestWeather.precipitation_mm_1h === 0
        ? "강수 없음. 데이터 누락이 아닙니다."
        : "강수 관측 또는 API 값을 확인하세요.",
    kma_nowcast: latestWeather,
  },
  latest_targets: {
    demand_target_datetime: forecast.target_datetime ?? null,
    traffic_target_datetime: trafficForecast.target_datetime ?? null,
    taxi_pressure_target_datetime: taxiPressure.target_datetime ?? null,
  },
  top_predictions: {
    taxi_pressure: latestPressureRows,
    demand_proxy: latestDemandRows,
    traffic_congestion: latestTrafficRows,
    demand_guardrail: latestGuardrailRows,
  },
  population_pressure: {
    target_datetime: populationPressure.target_datetime ?? null,
    live_poi_count: populationPressure.coverage?.live_poi_count ?? 0,
    covered_dong_count: populationPressure.coverage?.covered_dong_count ?? 0,
    forecast_population_mid_sum:
      populationPressure.overall?.forecast_population_mid_sum ?? null,
    top_dongs: (populationPressure.dongs ?? []).slice(0, 5).map((row, index) => ({
      rank: index + 1,
      dong_name: oneLine(row.dong_name),
      forecast_population_mid_sum: row.forecast_population_mid_sum ?? null,
      avg_poi_pressure_score: row.avg_poi_pressure_score ?? null,
    })),
  },
  guardrail: {
    target_datetime: demandGuardrail.target_datetime ?? null,
    forecast_strategy: demandGuardrail.forecast_strategy ?? null,
    baseline_strength_score:
      demandGuardrail.global_baseline_readiness?.baseline_strength_score ?? null,
    model_vs_pattern_mae_improvement_pct:
      demandGuardrail.global_baseline_readiness
        ?.model_vs_pattern_mae_improvement_pct ?? null,
    top_monitoring_dong: latestGuardrailRows[0] ?? null,
  },
  validation: {
    taxi_pressure_status: taxiPressureComparison.status ?? null,
    taxi_pressure_log_count: taxiPressureComparison.log_count ?? taxiPressureLogs.length,
    taxi_pressure_completed_count: taxiPressureComparison.completed_count ?? 0,
    taxi_pressure_waiting_count: taxiPressureComparison.waiting_count ?? 0,
    latest_pressure_comparison: latestComparison,
    poi_forecast_comparison_type: poiForecastComparison.comparison_type ?? null,
    poi_forecast_completed_count: poiForecastComparison.completed_count ?? 0,
    poi_forecast_waiting_count: poiForecastComparison.waiting_count ?? 0,
    latest_poi_forecast_comparison: poiForecastComparison.latest ?? null,
    live_log_count: liveLogs.length,
  },
  dispatch_effect: dispatchPlan.policy_effect_summary ?? null,
  note:
    "This status tracks public-data proxy forecasts, not direct call-volume predictions.",
};

const publicPath = path.join(projectRoot, "public", "overnight-status.json");
await mkdir(path.dirname(publicPath), { recursive: true });
await writeFile(publicPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");

const latestPressureComparison = status.validation.latest_pressure_comparison;
const latestPressureOverall = latestPressureComparison?.overall ?? {};
const latestPredictedPressureDong =
  oneLine(
    latestPressureOverall.top_predicted_priority_dong ??
      latestPressureComparison?.top_predicted_priority_dong,
  );
const latestObservedCongestionDong =
  oneLine(latestPressureOverall.top_actual_congestion_dong);
const latestRoadSignalSpearman =
  latestPressureOverall.priority_vs_road_congestion_spearman ?? "-";
const latestPoiComparison = status.validation.latest_poi_forecast_comparison;
const latestPoiOverall = latestPoiComparison?.overall ?? {};

const md = `# Overnight Model QA Status

Generated: ${status.generated_at_kst} KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: ${formatKst(status.latest_api_collection.citydata_collected_at)}
- Raw citydata: \`${status.latest_api_collection.raw_citydata_path ?? "-"}\`
- Raw weather: \`${status.latest_api_collection.raw_weather_path ?? "-"}\`
- KMA status: ${status.latest_api_collection.kma_ok ? "OK" : "CHECK"} (${status.latest_api_collection.kma_status ?? "-"})
- Weather note: ${status.latest_api_collection.weather_meaning}
- Temperature: ${status.latest_api_collection.kma_nowcast.temperature_c ?? "-"} C
- Precipitation 1h: ${status.latest_api_collection.kma_nowcast.precipitation_mm_1h ?? "-"} mm
- Humidity: ${status.latest_api_collection.kma_nowcast.humidity_pct ?? "-"}%
- Wind: ${status.latest_api_collection.kma_nowcast.wind_speed_ms ?? "-"} m/s

## Latest Targets

- Demand target: ${formatKst(status.latest_targets.demand_target_datetime)}
- Traffic target: ${formatKst(status.latest_targets.traffic_target_datetime)}
- Taxi pressure target: ${formatKst(status.latest_targets.taxi_pressure_target_datetime)}

## Taxi Pressure Top Regions

${markdownTable(status.top_predictions.taxi_pressure)}

## Demand Proxy Top Regions

${markdownTable(status.top_predictions.demand_proxy)}

## Traffic Congestion Top Regions

${markdownTable(status.top_predictions.traffic_congestion)}

## Guardrail Monitoring Priority

${guardrailTable(status.top_predictions.demand_guardrail)}

- Guardrail target: ${formatKst(status.guardrail.target_datetime)}
- Forecast strategy: ${status.guardrail.forecast_strategy ?? "-"}
- Baseline strength score: ${status.guardrail.baseline_strength_score ?? "-"}
- Model vs pattern MAE improvement: ${status.guardrail.model_vs_pattern_mae_improvement_pct ?? "-"}%

## Population Pressure Proxy

- Target: ${formatKst(status.population_pressure.target_datetime)}
- Live POIs: ${status.population_pressure.live_poi_count}
- Covered dongs: ${status.population_pressure.covered_dong_count}
- Forecast population midpoint sum: ${status.population_pressure.forecast_population_mid_sum ?? "-"}

## Validation

- Taxi pressure comparison status: ${status.validation.taxi_pressure_status ?? "-"}
- Taxi pressure log count: ${status.validation.taxi_pressure_log_count}
- Completed comparisons: ${status.validation.taxi_pressure_completed_count}
- Waiting comparisons: ${status.validation.taxi_pressure_waiting_count}
- Live demand log count: ${status.validation.live_log_count}
- Latest comparison kind: ${latestPressureComparison?.kind ?? "-"}
- Latest comparison target: ${formatKst(latestPressureComparison?.target_datetime)}
- Latest comparison top predicted: ${latestPredictedPressureDong}
- Latest comparison top observed congestion: ${latestObservedCongestionDong}
- Latest road-signal Spearman (policy check): ${latestRoadSignalSpearman}
- POI forecast completed/waiting: ${status.validation.poi_forecast_completed_count} / ${status.validation.poi_forecast_waiting_count}
- Latest POI forecast target: ${formatKst(latestPoiComparison?.target_datetime)}
- Latest POI matched rows: ${latestPoiOverall.row_count ?? "-"}
- Latest POI population MAE: ${latestPoiOverall.population_mae ?? "-"}
- Latest POI congestion-level hit rate: ${latestPoiOverall.congestion_level_accuracy_pct ?? "-"}%
- Latest POI top predicted/observed: ${oneLine(latestPoiOverall.top_predicted_population_poi)} / ${oneLine(latestPoiOverall.top_observed_population_poi)}

## Dispatch Effect Proxy

- Method: ${status.dispatch_effect?.method ?? "-"}
- Intervention areas: ${status.dispatch_effect?.intervention_area_count ?? "-"}
- Monitoring units: ${status.dispatch_effect?.total_monitoring_units ?? "-"}
- Max incentive multiplier: ${status.dispatch_effect?.max_incentive_multiplier ?? "-"}
- Positive imbalance before: ${status.dispatch_effect?.total_positive_imbalance_before ?? "-"}
- Estimated positive imbalance after: ${status.dispatch_effect?.estimated_total_positive_imbalance_after ?? "-"}
- Estimated relief score: ${status.dispatch_effect?.estimated_total_relief_score ?? "-"}
- Highest relief dong: ${status.dispatch_effect?.highest_relief_dong ?? "-"}
`;

const docsPath = path.join(projectRoot, "docs", "overnight-model-qa-status.md");
await mkdir(path.dirname(docsPath), { recursive: true });
await writeFile(docsPath, md, "utf8");

console.log(`Wrote ${path.relative(projectRoot, publicPath)}`);
console.log(`Wrote ${path.relative(projectRoot, docsPath)}`);
