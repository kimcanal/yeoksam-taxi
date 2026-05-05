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
  const date = new Date(value);
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

function topRows(rows, scoreField, limit = 5) {
  return [...(rows ?? [])]
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      dong_name: row.dong_name,
      score: row[scoreField] ?? null,
      action_level: row.action_level ?? null,
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

const dataSummary = await readJson("public/data-summary.json", {});
const featureSnapshot = await readJson("public/feature-snapshot.json", {});
const forecast = await readJson("public/forecast/latest.json", {});
const trafficForecast = await readJson("public/traffic-forecast/latest.json", {});
const taxiPressure = await readJson("public/taxi-pressure/latest.json", {});
const taxiPressureComparison = await readJson("public/taxi-pressure-comparison.json", {});
const liveLogs = await readJsonl("data/processed/live_validation/live_forecast_log.jsonl");
const taxiPressureLogs = await readJsonl("data/processed/live_validation/taxi_pressure_log.jsonl");

const latestWeather = featureSnapshot.kma_nowcast ?? {};
const latestPressureRows = topRows(taxiPressure.regions, "dispatch_priority_score");
const latestDemandRows = topRows(forecast.regions, "score", 3);
const latestTrafficRows = topRows(trafficForecast.regions, "predicted_congestion_score", 3);
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
  },
  validation: {
    taxi_pressure_status: taxiPressureComparison.status ?? null,
    taxi_pressure_log_count: taxiPressureComparison.log_count ?? taxiPressureLogs.length,
    taxi_pressure_completed_count: taxiPressureComparison.completed_count ?? 0,
    taxi_pressure_waiting_count: taxiPressureComparison.waiting_count ?? 0,
    latest_pressure_comparison: latestComparison,
    live_log_count: liveLogs.length,
  },
  note:
    "This status tracks public-data proxy forecasts, not direct KakaoT taxi-call predictions.",
};

const publicPath = path.join(projectRoot, "public", "overnight-status.json");
await mkdir(path.dirname(publicPath), { recursive: true });
await writeFile(publicPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");

const md = `# Overnight Model QA Status

Generated: ${status.generated_at_kst} KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct KakaoT taxi-call predictions.

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

## Validation

- Taxi pressure comparison status: ${status.validation.taxi_pressure_status ?? "-"}
- Taxi pressure log count: ${status.validation.taxi_pressure_log_count}
- Completed comparisons: ${status.validation.taxi_pressure_completed_count}
- Waiting comparisons: ${status.validation.taxi_pressure_waiting_count}
- Live demand log count: ${status.validation.live_log_count}
- Latest comparison kind: ${status.validation.latest_pressure_comparison?.kind ?? "-"}
- Latest comparison target: ${formatKst(status.validation.latest_pressure_comparison?.target_datetime)}
- Latest comparison top predicted: ${
  status.validation.latest_pressure_comparison?.overall?.top_predicted_priority_dong
  ?? status.validation.latest_pressure_comparison?.top_predicted_priority_dong
  ?? "-"
}
- Latest comparison top observed congestion: ${
  status.validation.latest_pressure_comparison?.overall?.top_actual_congestion_dong ?? "-"
}
- Latest rank Spearman: ${
  status.validation.latest_pressure_comparison?.overall?.priority_vs_congestion_rank_spearman ?? "-"
}
`;

const docsPath = path.join(projectRoot, "docs", "overnight-model-qa-status.md");
await mkdir(path.dirname(docsPath), { recursive: true });
await writeFile(docsPath, md, "utf8");

console.log(`Wrote ${path.relative(projectRoot, publicPath)}`);
console.log(`Wrote ${path.relative(projectRoot, docsPath)}`);
