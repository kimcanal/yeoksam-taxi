import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const POI_FEATURES_INPUT = "public/poi-features.json";
const POI_COMPARISON_INPUT = "public/poi-forecast-comparison.json";
const PROCESSED_OUTPUT =
  "data/processed/live_validation/population_pressure_summary.json";
const PUBLIC_OUTPUT = "public/population-pressure-summary.json";

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

async function readJsonIfExists(relativePath, fallback = null) {
  try {
    return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

function mean(values, digits = 4) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return round(valid.reduce((sum, value) => sum + value, 0) / valid.length, digits);
}

function sum(values, digits = 1) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return round(valid.reduce((total, value) => total + value, 0), digits);
}

function populationForecast(row) {
  const forecast = row.population_forecast_1h ?? {};
  return {
    target_datetime: forecast.forecast_time ?? null,
    population_mid: numberOrNull(forecast.population_mid),
    congestion_level: forecast.congestion_level ?? null,
    congestion_score: numberOrNull(forecast.congestion_score),
  };
}

function dominantTargetDatetime(rows) {
  const counts = new Map();
  for (const row of rows) {
    const targetDatetime = populationForecast(row).target_datetime;
    if (!targetDatetime) continue;
    counts.set(targetDatetime, (counts.get(targetDatetime) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function buildDongSummaries(rows) {
  const byDong = new Map();

  for (const row of rows) {
    const dong = row.coverage_dong ?? "미분류";
    const bucket = byDong.get(dong) ?? [];
    bucket.push(row);
    byDong.set(dong, bucket);
  }

  return [...byDong.entries()]
    .map(([dongName, dongRows]) => {
      const forecasts = dongRows.map(populationForecast);
      const currentPopulation = sum(
        dongRows.map((row) => numberOrNull(row.current_population_mid)),
        0,
      );
      const forecastPopulation = sum(
        forecasts.map((forecast) => forecast.population_mid),
        0,
      );
      const forecastPopulationDelta =
        currentPopulation != null && forecastPopulation != null
          ? forecastPopulation - currentPopulation
          : null;
      const topPoi = [...dongRows].sort(
        (left, right) =>
          (numberOrNull(right.poi_pressure_score) ?? 0) -
          (numberOrNull(left.poi_pressure_score) ?? 0),
      )[0];

      return {
        dong_name: dongName,
        poi_count: dongRows.length,
        target_datetime: dominantTargetDatetime(dongRows),
        current_population_mid_sum: currentPopulation,
        forecast_population_mid_sum: forecastPopulation,
        forecast_population_delta: forecastPopulationDelta,
        forecast_population_delta_pct:
          forecastPopulationDelta != null && currentPopulation > 0
            ? round(forecastPopulationDelta / currentPopulation, 4)
            : null,
        avg_current_congestion_score: mean(
          dongRows.map((row) => numberOrNull(row.current_congestion_score)),
          4,
        ),
        avg_forecast_congestion_score: mean(
          forecasts.map((forecast) => forecast.congestion_score),
          4,
        ),
        avg_poi_pressure_score: mean(
          dongRows.map((row) => numberOrNull(row.poi_pressure_score)),
          4,
        ),
        avg_demand_proxy_score: mean(
          dongRows.map((row) => numberOrNull(row.demand_proxy_score)),
          4,
        ),
        top_poi: topPoi
          ? {
              poi_code: topPoi.poi_code ?? null,
              poi_name: topPoi.poi_name ?? null,
              current_population_mid: numberOrNull(topPoi.current_population_mid),
              forecast_population_mid: populationForecast(topPoi).population_mid,
              poi_pressure_score: numberOrNull(topPoi.poi_pressure_score),
            }
          : null,
      };
    })
    .sort((left, right) => {
      const rightPressure = right.avg_poi_pressure_score ?? -1;
      const leftPressure = left.avg_poi_pressure_score ?? -1;
      if (rightPressure !== leftPressure) return rightPressure - leftPressure;
      return (
        (right.forecast_population_mid_sum ?? 0) -
        (left.forecast_population_mid_sum ?? 0)
      );
    });
}

function validationSummary(comparison) {
  const latest = comparison?.latest ?? null;
  const overall = latest?.kind === "completed" ? latest.overall : null;
  return {
    comparison_type: comparison?.comparison_type ?? null,
    completed_count: comparison?.completed_count ?? 0,
    waiting_count: comparison?.waiting_count ?? 0,
    latest_kind: latest?.kind ?? null,
    latest_target_datetime: latest?.target_datetime ?? null,
    population_mae: overall?.population_mae ?? null,
    population_mape_pct: overall?.population_mape_pct ?? null,
    congestion_level_accuracy_pct: overall?.congestion_level_accuracy_pct ?? null,
    population_rank_spearman: overall?.population_rank_spearman ?? null,
    top_predicted_population_poi: overall?.top_predicted_population_poi ?? null,
    top_observed_population_poi: overall?.top_observed_population_poi ?? null,
    same_top_poi: overall?.same_top_poi ?? null,
    status:
      latest?.kind === "completed"
        ? "validated_against_later_citydata_observation"
        : "waiting_for_future_citydata_observation",
  };
}

const poiFeatures = await readJsonIfExists(POI_FEATURES_INPUT, {});
const poiComparison = await readJsonIfExists(POI_COMPARISON_INPUT, {});
const liveRows = Array.isArray(poiFeatures.direct_citydata_rows)
  ? poiFeatures.direct_citydata_rows.filter(
      (row) =>
        row.source_status === "citydata_live" &&
        row.coverage_dong &&
        numberOrNull(row.current_population_mid) != null,
    )
  : [];
const dongs = buildDongSummaries(liveRows);
const targetDatetime = dominantTargetDatetime(liveRows);
const topPopulationPois = [...liveRows]
  .sort(
    (left, right) =>
      (numberOrNull(right.current_population_mid) ?? 0) -
      (numberOrNull(left.current_population_mid) ?? 0),
  )
  .slice(0, 5)
  .map((row) => ({
    poi_code: row.poi_code ?? null,
    poi_name: row.poi_name ?? null,
    coverage_dong: row.coverage_dong ?? null,
    current_population_mid: numberOrNull(row.current_population_mid),
    forecast_population_mid: populationForecast(row).population_mid,
    forecast_population_delta: numberOrNull(row.forecast_population_delta),
    current_congestion_level: row.current_congestion_level ?? null,
    forecast_congestion_level: populationForecast(row).congestion_level,
    poi_pressure_score: numberOrNull(row.poi_pressure_score),
  }));

const output = {
  source: "seoul_citydata_poi_population_forecast_proxy_v1",
  generated_at: new Date().toISOString(),
  input_generated_at: poiFeatures.generated_at ?? null,
  target_datetime: targetDatetime,
  interpretation:
    "서울 실시간 도시데이터 POI의 현재 인구와 1시간 예측 인구를 행정동 coverage로 집계한 생활/유동인구 pressure proxy입니다. 행정동 전체 생활인구 확정값이나 택시 호출량 라벨은 아닙니다.",
  coverage: {
    live_poi_count: liveRows.length,
    covered_dong_count: dongs.length,
    supplemental_poi_count: poiFeatures.supplemental_poi_count ?? 0,
  },
  validation: validationSummary(poiComparison),
  overall: {
    current_population_mid_sum: sum(
      liveRows.map((row) => numberOrNull(row.current_population_mid)),
      0,
    ),
    forecast_population_mid_sum: sum(
      liveRows.map((row) => populationForecast(row).population_mid),
      0,
    ),
    avg_current_congestion_score: mean(
      liveRows.map((row) => numberOrNull(row.current_congestion_score)),
      4,
    ),
    avg_forecast_congestion_score: mean(
      liveRows.map((row) => populationForecast(row).congestion_score),
      4,
    ),
    avg_poi_pressure_score: mean(
      liveRows.map((row) => numberOrNull(row.poi_pressure_score)),
      4,
    ),
  },
  dongs,
  top_population_pois: topPopulationPois,
};

for (const relativePath of [PROCESSED_OUTPUT, PUBLIC_OUTPUT]) {
  const absolutePath = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${relativePath}`);
}
