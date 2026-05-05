import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const LOG_PATH = "data/processed/live_validation/taxi_pressure_log.jsonl";
const PROCESSED_OUTPUT = "data/processed/live_validation/taxi_pressure_comparison.json";
const PUBLIC_OUTPUT = "public/taxi-pressure-comparison.json";
const MATCH_WINDOW_MINUTES = 90;

async function readJsonIfExists(relativePath, fallback = null) {
  try {
    return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

async function readJsonlIfExists(relativePath) {
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
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function rankRows(rows, field, direction = "desc") {
  const sorted = [...rows]
    .filter((row) => Number.isFinite(row[field]))
    .sort((left, right) =>
      direction === "asc" ? left[field] - right[field] : right[field] - left[field],
    );
  return new Map(sorted.map((row, index) => [row.dong_name, index + 1]));
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

function trafficObservedAt(snapshot) {
  return parseTime(snapshot?.meta?.collected_at ?? snapshot?.meta?.extracted_at ?? null);
}

async function loadTrafficSnapshots() {
  const files = await walkJsonFiles("data/raw/traffic");
  const snapshots = [];

  for (const file of files) {
    const snapshot = await readJsonIfExists(file.relative_path);
    const observedAt = trafficObservedAt(snapshot);
    if (!observedAt || !Array.isArray(snapshot?.dong_summary)) continue;
    snapshots.push({ ...file, observed_at: observedAt, snapshot });
  }

  return snapshots.sort((left, right) => left.observed_at - right.observed_at);
}

function findTrafficSnapshot(targetAt, snapshots) {
  const maxTime = targetAt.getTime() + MATCH_WINDOW_MINUTES * 60 * 1000;
  return snapshots.find((snapshot) => {
    const observedTime = snapshot.observed_at.getTime();
    return observedTime >= targetAt.getTime() && observedTime <= maxTime;
  }) ?? null;
}

function comparePressureToTraffic(forecast, trafficSnapshot) {
  const predictedRows = Array.isArray(forecast.regions) ? forecast.regions : [];
  const actualRows = trafficSnapshot.snapshot.dong_summary ?? [];
  const actualByDong = new Map(actualRows.map((row) => [row.dong_name, row]));

  const rows = predictedRows
    .map((predicted) => {
      const actual = actualByDong.get(predicted.dong_name);
      if (!actual) return null;
      const predictedPriority = numberOrNull(predicted.dispatch_priority_score);
      const predictedPressure = numberOrNull(predicted.taxi_pressure_score);
      const predictedCongestion = numberOrNull(predicted.predicted_congestion_score);
      const predictedSpeed = numberOrNull(predicted.predicted_avg_speed_kmh);
      const actualCongestion = numberOrNull(actual.congestion_score);
      const actualSpeed = numberOrNull(actual.avg_speed_kmh);

      return {
        dong_name: predicted.dong_name,
        predicted_dispatch_priority_score: predictedPriority,
        predicted_taxi_pressure_score: predictedPressure,
        predicted_movement_demand_score: numberOrNull(predicted.predicted_movement_demand_score),
        predicted_traffic_volume_score: numberOrNull(predicted.predicted_traffic_volume_score),
        predicted_congestion_score: predictedCongestion,
        actual_congestion_score: actualCongestion,
        congestion_error:
          predictedCongestion == null || actualCongestion == null
            ? null
            : round(predictedCongestion - actualCongestion, 4),
        abs_congestion_error:
          predictedCongestion == null || actualCongestion == null
            ? null
            : round(Math.abs(predictedCongestion - actualCongestion), 4),
        predicted_avg_speed_kmh: predictedSpeed,
        actual_avg_speed_kmh: actualSpeed,
        speed_error_kmh:
          predictedSpeed == null || actualSpeed == null
            ? null
            : round(predictedSpeed - actualSpeed, 2),
        abs_speed_error_kmh:
          predictedSpeed == null || actualSpeed == null
            ? null
            : round(Math.abs(predictedSpeed - actualSpeed), 2),
        actual_link_count: numberOrNull(actual.link_count),
      };
    })
    .filter(Boolean);

  const priorityRanks = rankRows(rows, "predicted_dispatch_priority_score");
  const pressureRanks = rankRows(rows, "predicted_taxi_pressure_score");
  const actualCongestionRanks = rankRows(rows, "actual_congestion_score");
  const predictedSlowRanks = rankRows(rows, "predicted_avg_speed_kmh", "asc");
  const actualSlowRanks = rankRows(rows, "actual_avg_speed_kmh", "asc");

  const rankedRows = rows
    .map((row) => ({
      ...row,
      predicted_priority_rank: priorityRanks.get(row.dong_name) ?? null,
      predicted_pressure_rank: pressureRanks.get(row.dong_name) ?? null,
      actual_congestion_rank: actualCongestionRanks.get(row.dong_name) ?? null,
      predicted_slowest_rank: predictedSlowRanks.get(row.dong_name) ?? null,
      actual_slowest_rank: actualSlowRanks.get(row.dong_name) ?? null,
    }))
    .sort((left, right) => (left.predicted_priority_rank ?? 999) - (right.predicted_priority_rank ?? 999));

  const absCongestion = rankedRows
    .map((row) => row.abs_congestion_error)
    .filter((value) => Number.isFinite(value));
  const absSpeed = rankedRows
    .map((row) => row.abs_speed_error_kmh)
    .filter((value) => Number.isFinite(value));
  const topPredicted = rankedRows.find((row) => row.predicted_priority_rank === 1) ?? null;
  const topActualCongestion = rankedRows.find((row) => row.actual_congestion_rank === 1) ?? null;

  return {
    generated_at: forecast.generated_at ?? null,
    target_datetime: forecast.target_datetime ?? null,
    feature_datetime: forecast.feature_datetime ?? null,
    actual_observed_at: trafficSnapshot.observed_at.toISOString(),
    actual_snapshot_path: trafficSnapshot.relative_path,
    comparison_type: "taxi_pressure_priority_vs_observed_citydata_congestion",
    note:
      "Taxi pressure is a public-data proxy. Observed values are Seoul citydata road congestion/speed after the target time, not taxi-call labels.",
    overall: {
      row_count: rankedRows.length,
      congestion_mae: round(
        absCongestion.reduce((sum, value) => sum + value, 0) / Math.max(absCongestion.length, 1),
        4,
      ),
      speed_mae_kmh: round(
        absSpeed.reduce((sum, value) => sum + value, 0) / Math.max(absSpeed.length, 1),
        2,
      ),
      priority_vs_congestion_rank_spearman: round(
        pearson(
          rankedRows.map((row) => row.predicted_priority_rank),
          rankedRows.map((row) => row.actual_congestion_rank),
        ),
        4,
      ),
      pressure_vs_congestion_rank_spearman: round(
        pearson(
          rankedRows.map((row) => row.predicted_pressure_rank),
          rankedRows.map((row) => row.actual_congestion_rank),
        ),
        4,
      ),
      speed_rank_spearman: round(
        pearson(
          rankedRows.map((row) => row.predicted_slowest_rank),
          rankedRows.map((row) => row.actual_slowest_rank),
        ),
        4,
      ),
      top_predicted_priority_dong: topPredicted?.dong_name ?? null,
      top_actual_congestion_dong: topActualCongestion?.dong_name ?? null,
      same_top_dong:
        topPredicted?.dong_name != null
        && topPredicted?.dong_name === topActualCongestion?.dong_name,
    },
    rows: rankedRows,
  };
}

const forecasts = await readJsonlIfExists(LOG_PATH);
const trafficSnapshots = await loadTrafficSnapshots();
const completed = [];
const waiting = [];
const now = new Date();

for (const forecast of forecasts) {
  const targetAt = parseTime(forecast.target_datetime);
  if (!targetAt) continue;

  const matchedSnapshot = findTrafficSnapshot(targetAt, trafficSnapshots);
  if (matchedSnapshot) {
    completed.push(comparePressureToTraffic(forecast, matchedSnapshot));
  } else {
    waiting.push({
      generated_at: forecast.generated_at ?? null,
      target_datetime: forecast.target_datetime ?? null,
      feature_datetime: forecast.feature_datetime ?? null,
      top_predicted_priority_dong: forecast.regions?.[0]?.dong_name ?? null,
      top_predicted_priority_score: forecast.regions?.[0]?.dispatch_priority_score ?? null,
      status: now < targetAt ? "waiting_for_target_time" : "waiting_for_observed_snapshot",
    });
  }
}

const latestCompleted = completed.at(-1) ?? null;
const latestWaiting = waiting.at(-1) ?? null;
const output = {
  generated_at: new Date().toISOString(),
  source_log_path: LOG_PATH,
  traffic_source_dir: "data/raw/traffic",
  status: latestCompleted ? "has_completed_comparison" : "waiting_for_observation",
  match_window_minutes: MATCH_WINDOW_MINUTES,
  log_count: forecasts.length,
  completed_count: completed.length,
  waiting_count: waiting.length,
  latest: latestCompleted
    ? { kind: "completed", ...latestCompleted }
    : latestWaiting
      ? { kind: "waiting", ...latestWaiting }
      : null,
  completed: completed.slice(-20),
  waiting: waiting.slice(-20),
};

for (const relativePath of [PROCESSED_OUTPUT, PUBLIC_OUTPUT]) {
  const absolutePath = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${relativePath}`);
}
