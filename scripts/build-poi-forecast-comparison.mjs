import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const CITYDATA_DIR = "data/raw/citydata";
const PROCESSED_OUTPUT = "data/processed/live_validation/poi_forecast_comparison.json";
const PUBLIC_OUTPUT = "public/poi-forecast-comparison.json";
const MATCH_WINDOW_MINUTES = 90;

const CONGESTION_SCORES = new Map([
  ["여유", 0.2],
  ["보통", 0.45],
  ["약간 붐빔", 0.7],
  ["붐빔", 0.9],
  ["매우 붐빔", 1],
]);

async function readJsonIfExists(relativePath, fallback = null) {
  try {
    return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

async function walkJsonFiles(relativeDir) {
  const root = path.join(projectRoot, relativeDir);
  const files = [];

  async function walk(dir) {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const info = await stat(entryPath);
        files.push({
          relative_path: path.relative(projectRoot, entryPath),
          mtime_ms: info.mtimeMs,
        });
      }
    }
  }

  await walk(root);
  return files.sort((left, right) => left.mtime_ms - right.mtime_ms);
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function unwrapCitydata(response) {
  return (
    response?.["SeoulRtd.citydata"]?.CITYDATA ??
    response?.CITYDATA_ALL?.CITYDATA ??
    response?.CITYDATA ??
    null
  );
}

function parseTime(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}:00+09:00`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function populationMid(min, max) {
  return min != null && max != null ? (min + max) / 2 : null;
}

function loadPoiMeta(config) {
  const entries = Array.isArray(config?.citydata_collection)
    ? config.citydata_collection
    : [];
  return new Map(entries.map((poi) => [poi.code, poi]));
}

function extractPoiObservation(result, poiByCode) {
  if (!result?.ok) return null;

  const data = unwrapCitydata(result.data);
  if (!data) return null;

  const pop = normalizeArray(data.LIVE_PPLTN_STTS)[0] ?? {};
  const code = data.AREA_CD ?? result.code;
  const poiMeta = poiByCode.get(code) ?? poiByCode.get(result.code) ?? null;
  if (poiMeta?.collection_enabled === false) return null;

  const populationMin = numberOrNull(pop.AREA_PPLTN_MIN ?? pop.PPLTN_MIN);
  const populationMax = numberOrNull(pop.AREA_PPLTN_MAX ?? pop.PPLTN_MAX);
  const observedAt = parseTime(pop.PPLTN_TIME ?? data.PPLTN_TIME);
  const congestionLevel = pop.AREA_CONGEST_LVL ?? data.AREA_CONGEST_LVL ?? null;

  if (!observedAt || populationMin == null || populationMax == null) return null;

  return {
    poi_code: code,
    poi_name: data.AREA_NM ?? poiMeta?.name ?? code,
    coverage_dong: poiMeta?.coverage_dong ?? null,
    category: poiMeta?.category ?? null,
    observed_at: observedAt,
    observed_at_iso: observedAt.toISOString(),
    observed_population_min: populationMin,
    observed_population_max: populationMax,
    observed_population_mid: round(populationMid(populationMin, populationMax), 1),
    observed_congestion_level: congestionLevel,
    observed_congestion_score: CONGESTION_SCORES.get(congestionLevel) ?? null,
    forecasts: normalizeArray(pop.FCST_PPLTN)
      .map((forecast) => {
        const targetAt = parseTime(forecast.FCST_TIME);
        const forecastMin = numberOrNull(forecast.FCST_PPLTN_MIN);
        const forecastMax = numberOrNull(forecast.FCST_PPLTN_MAX);
        const forecastCongestionLevel = forecast.FCST_CONGEST_LVL ?? null;
        return {
          target_at: targetAt,
          target_datetime: targetAt?.toISOString() ?? null,
          predicted_population_min: forecastMin,
          predicted_population_max: forecastMax,
          predicted_population_mid: round(populationMid(forecastMin, forecastMax), 1),
          predicted_congestion_level: forecastCongestionLevel,
          predicted_congestion_score:
            CONGESTION_SCORES.get(forecastCongestionLevel) ?? null,
        };
      })
      .filter((forecast) => forecast.target_at),
  };
}

function extractSnapshot(file, raw, poiByCode) {
  if (raw?.meta?.ok === false || !Array.isArray(raw?.results)) return null;
  const rows = raw.results
    .map((result) => extractPoiObservation(result, poiByCode))
    .filter(Boolean);
  if (!rows.length) return null;

  const observedAt = rows
    .map((row) => row.observed_at)
    .sort((left, right) => left - right)[0];

  return {
    relative_path: file.relative_path,
    collected_at: parseTime(raw?.meta?.collected_at) ?? observedAt,
    observed_at: observedAt,
    rows,
    by_code: new Map(rows.map((row) => [row.poi_code, row])),
  };
}

async function loadSnapshots() {
  const config = await readJsonIfExists("data/config/gangnam-pois.json", {});
  const poiByCode = loadPoiMeta(config);
  const files = await walkJsonFiles(CITYDATA_DIR);
  const snapshots = [];

  for (const file of files) {
    const raw = await readJsonIfExists(file.relative_path);
    const snapshot = extractSnapshot(file, raw, poiByCode);
    if (snapshot) snapshots.push(snapshot);
  }

  return snapshots.sort((left, right) => left.observed_at - right.observed_at);
}

function firstOneHourForecast(row) {
  const maxTarget = row.observed_at.getTime() + MATCH_WINDOW_MINUTES * 60 * 1000;
  return row.forecasts.find((forecast) => {
    const targetTime = forecast.target_at.getTime();
    return targetTime > row.observed_at.getTime() && targetTime <= maxTarget;
  }) ?? row.forecasts[0] ?? null;
}

function findObservationAfter(targetAt, code, snapshots) {
  const maxTime = targetAt.getTime() + MATCH_WINDOW_MINUTES * 60 * 1000;
  return snapshots.find((snapshot) => {
    const observedTime = snapshot.observed_at.getTime();
    return (
      observedTime >= targetAt.getTime()
      && observedTime <= maxTime
      && snapshot.by_code.has(code)
    );
  }) ?? null;
}

function rankRows(rows, field) {
  return new Map(
    [...rows]
      .filter((row) => Number.isFinite(row[field]))
      .sort((left, right) => right[field] - left[field])
      .map((row, index) => [row.poi_code, index + 1]),
  );
}

function pearson(leftValues, rightValues) {
  const pairs = leftValues
    .map((left, index) => [left, rightValues[index]])
    .filter(([left, right]) => Number.isFinite(left) && Number.isFinite(right));
  if (pairs.length < 3) return null;

  const leftMean = pairs.reduce((sum, [left]) => sum + left, 0) / pairs.length;
  const rightMean = pairs.reduce((sum, [, right]) => sum + right, 0) / pairs.length;
  let numerator = 0;
  let leftDenominator = 0;
  let rightDenominator = 0;

  for (const [left, right] of pairs) {
    const leftDelta = left - leftMean;
    const rightDelta = right - rightMean;
    numerator += leftDelta * rightDelta;
    leftDenominator += leftDelta ** 2;
    rightDenominator += rightDelta ** 2;
  }

  const denominator = Math.sqrt(leftDenominator * rightDenominator);
  return denominator > 0 ? numerator / denominator : null;
}

function comparisonOverall(rows, forecastCount) {
  const populationErrors = rows
    .map((row) => row.population_error)
    .filter(Number.isFinite);
  const populationPctErrors = rows
    .map((row) => row.abs_population_pct_error)
    .filter(Number.isFinite);
  const congestionErrors = rows
    .map((row) => row.congestion_score_error)
    .filter(Number.isFinite);
  const predictedRanks = rankRows(rows, "predicted_population_mid");
  const observedRanks = rankRows(rows, "observed_population_mid");
  const rankedRows = rows.map((row) => ({
    ...row,
    predicted_population_rank: predictedRanks.get(row.poi_code) ?? null,
    observed_population_rank: observedRanks.get(row.poi_code) ?? null,
  }));
  const topPredicted = rankedRows.find((row) => row.predicted_population_rank === 1) ?? null;
  const topObserved = rankedRows.find((row) => row.observed_population_rank === 1) ?? null;
  const levelComparable = rankedRows.filter((row) => row.congestion_level_match != null);
  const levelMatches = levelComparable.filter((row) => row.congestion_level_match).length;

  return {
    forecast_row_count: forecastCount,
    row_count: rankedRows.length,
    row_coverage_pct: forecastCount ? round((rankedRows.length / forecastCount) * 100, 1) : null,
    population_mae: populationErrors.length
      ? round(populationErrors.reduce((sum, value) => sum + Math.abs(value), 0) / populationErrors.length, 1)
      : null,
    population_mape_pct: populationPctErrors.length
      ? round((populationPctErrors.reduce((sum, value) => sum + value, 0) / populationPctErrors.length) * 100, 1)
      : null,
    congestion_score_mae: congestionErrors.length
      ? round(congestionErrors.reduce((sum, value) => sum + Math.abs(value), 0) / congestionErrors.length, 4)
      : null,
    congestion_level_accuracy_pct: levelComparable.length
      ? round((levelMatches / levelComparable.length) * 100, 1)
      : null,
    population_rank_spearman: round(
      pearson(
        rankedRows.map((row) => row.predicted_population_rank),
        rankedRows.map((row) => row.observed_population_rank),
      ),
      4,
    ),
    top_predicted_population_poi: topPredicted?.poi_name ?? null,
    top_observed_population_poi: topObserved?.poi_name ?? null,
    same_top_poi:
      topPredicted?.poi_code != null
      && topPredicted.poi_code === topObserved?.poi_code,
  };
}

function buildComparison(sourceSnapshot, snapshots) {
  const forecastRows = sourceSnapshot.rows
    .map((row) => {
      const forecast = firstOneHourForecast(row);
      return forecast
        ? {
            row,
            forecast,
            observationSnapshot: findObservationAfter(
              forecast.target_at,
              row.poi_code,
              snapshots,
            ),
          }
        : null;
    })
    .filter(Boolean);

  const completedRows = forecastRows
    .map(({ row, forecast, observationSnapshot }) => {
      const observed = observationSnapshot?.by_code.get(row.poi_code) ?? null;
      if (!observed) return null;

      const populationError =
        forecast.predicted_population_mid != null && observed.observed_population_mid != null
          ? round(forecast.predicted_population_mid - observed.observed_population_mid, 1)
          : null;
      const absPopulationPctError =
        populationError != null && observed.observed_population_mid > 0
          ? Math.abs(populationError) / observed.observed_population_mid
          : null;
      const congestionScoreError =
        forecast.predicted_congestion_score != null && observed.observed_congestion_score != null
          ? round(forecast.predicted_congestion_score - observed.observed_congestion_score, 4)
          : null;

      return {
        poi_code: row.poi_code,
        poi_name: row.poi_name,
        coverage_dong: row.coverage_dong,
        category: row.category,
        source_observed_at: row.observed_at_iso,
        target_datetime: forecast.target_datetime,
        actual_observed_at: observed.observed_at_iso,
        actual_snapshot_path: observationSnapshot.relative_path,
        predicted_population_mid: forecast.predicted_population_mid,
        observed_population_mid: observed.observed_population_mid,
        population_error: populationError,
        abs_population_pct_error: round(absPopulationPctError, 4),
        predicted_congestion_level: forecast.predicted_congestion_level,
        observed_congestion_level: observed.observed_congestion_level,
        predicted_congestion_score: forecast.predicted_congestion_score,
        observed_congestion_score: observed.observed_congestion_score,
        congestion_score_error: congestionScoreError,
        congestion_level_match:
          forecast.predicted_congestion_level != null
            ? forecast.predicted_congestion_level === observed.observed_congestion_level
            : null,
      };
    })
    .filter(Boolean);

  const targetDatetime =
    forecastRows[0]?.forecast.target_datetime ?? null;

  if (!completedRows.length) {
    return {
      kind: "waiting",
      source_observed_at: sourceSnapshot.observed_at.toISOString(),
      source_snapshot_path: sourceSnapshot.relative_path,
      target_datetime: targetDatetime,
      forecast_row_count: forecastRows.length,
      matched_row_count: 0,
      status: "waiting_for_future_citydata_observation",
    };
  }

  const overall = comparisonOverall(completedRows, forecastRows.length);
  const rankedRows = completedRows.map((row) => ({
    ...row,
    predicted_population_rank:
      rankRows(completedRows, "predicted_population_mid").get(row.poi_code) ?? null,
    observed_population_rank:
      rankRows(completedRows, "observed_population_mid").get(row.poi_code) ?? null,
  }));

  return {
    kind: "completed",
    comparison_type: "citydata_poi_1h_forecast_vs_observed_citydata",
    source_observed_at: sourceSnapshot.observed_at.toISOString(),
    source_snapshot_path: sourceSnapshot.relative_path,
    target_datetime: targetDatetime,
    match_window_minutes: MATCH_WINDOW_MINUTES,
    overall,
    rows: rankedRows.sort(
      (left, right) => (left.predicted_population_rank ?? 999) - (right.predicted_population_rank ?? 999),
    ),
    note:
      "POI forecast validation uses Seoul citydata population/congestion forecasts versus later Seoul citydata observations. It is not taxi-call accuracy scoring.",
  };
}

const snapshots = await loadSnapshots();
const comparisons = snapshots
  .map((snapshot) => buildComparison(snapshot, snapshots))
  .filter((comparison) => comparison.target_datetime);
const completed = comparisons.filter((comparison) => comparison.kind === "completed");
const waiting = comparisons.filter((comparison) => comparison.kind === "waiting");
const output = {
  generated_at: new Date().toISOString(),
  description:
    "Seoul citydata POI 1-hour forecast validation against later citydata observations. No taxi-call labels used.",
  comparison_type: "citydata_poi_1h_forecast_vs_observed_citydata",
  source_dir: CITYDATA_DIR,
  match_window_minutes: MATCH_WINDOW_MINUTES,
  snapshot_count: snapshots.length,
  comparison_count: comparisons.length,
  completed_count: completed.length,
  waiting_count: waiting.length,
  latest: completed.at(-1) ?? waiting.at(-1) ?? null,
  completed,
  waiting,
};

for (const relativePath of [PROCESSED_OUTPUT, PUBLIC_OUTPUT]) {
  const absolutePath = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${relativePath}`);
}
