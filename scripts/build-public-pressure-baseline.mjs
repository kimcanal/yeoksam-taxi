import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const LOG_PATH = "data/processed/live_validation/taxi_pressure_log.jsonl";
const PROCESSED_OUTPUT = "data/processed/live_validation/public_pressure_baseline_comparison.json";
const PUBLIC_OUTPUT = "public/public-pressure-baseline-comparison.json";
const MATCH_WINDOW_MINUTES = 90;

async function loadAreaToDong() {
  try {
    const config = JSON.parse(
      await readFile(path.join(projectRoot, "data", "config", "gangnam-pois.json"), "utf8"),
    );
    const entries = Array.isArray(config?.citydata_collection)
      ? config.citydata_collection
      : [];
    return new Map(
      entries
        .filter((poi) => poi?.collection_enabled !== false && poi?.code && poi?.coverage_dong)
        .map((poi) => [poi.code, poi.coverage_dong]),
    );
  } catch {
    return new Map([
      ["POI042", "역삼1동"],
      ["POI001", "논현1동"],
    ]);
  }
}

const AREA_TO_DONG = await loadAreaToDong();

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

function clamp(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
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

function unwrapCitydata(response) {
  return (
    response?.["SeoulRtd.citydata"]?.CITYDATA ??
    response?.CITYDATA_ALL?.CITYDATA ??
    response?.CITYDATA ??
    null
  );
}

function citydataObservedAt(snapshot) {
  const metaTime = parseTime(snapshot?.meta?.collected_at ?? null);
  if (metaTime) return metaTime;

  for (const result of snapshot?.results ?? []) {
    const data = unwrapCitydata(result.data);
    const pop = data?.LIVE_PPLTN_STTS?.[0] ?? null;
    const observedAt = parseTime(pop?.PPLTN_TIME ?? data?.PPLTN_TIME ?? null);
    if (observedAt) return observedAt;
  }

  return null;
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

async function loadCitydataSnapshots() {
  const files = await walkJsonFiles("data/raw/citydata");
  const snapshots = [];

  for (const file of files) {
    const snapshot = await readJsonIfExists(file.relative_path);
    const observedAt = citydataObservedAt(snapshot);
    const hasUsableResult = (snapshot?.results ?? []).some((result) => result?.ok);
    if (
      !observedAt
      || snapshot?.meta?.ok === false
      || !Array.isArray(snapshot?.results)
      || !hasUsableResult
    ) {
      continue;
    }
    snapshots.push({ ...file, observed_at: observedAt, snapshot });
  }

  return snapshots.sort((left, right) => left.observed_at - right.observed_at);
}

function findSnapshot(targetAt, snapshots) {
  const maxTime = targetAt.getTime() + MATCH_WINDOW_MINUTES * 60 * 1000;
  return snapshots.find((snapshot) => {
    const observedTime = snapshot.observed_at.getTime();
    return observedTime >= targetAt.getTime() && observedTime <= maxTime;
  }) ?? null;
}

function summarizeCitydataPopulation(citydataSnapshot) {
  const rows = [];

  for (const result of citydataSnapshot.snapshot.results ?? []) {
    if (!result?.ok) continue;
    const data = unwrapCitydata(result.data);
    const code = result.code ?? data?.AREA_CD ?? null;
    const dongName = AREA_TO_DONG.get(code);
    if (!dongName || !data) continue;

    const population = data.LIVE_PPLTN_STTS?.[0] ?? {};
    const populationMin = numberOrNull(population.PPLTN_MIN ?? population.AREA_PPLTN_MIN);
    const populationMax = numberOrNull(population.PPLTN_MAX ?? population.AREA_PPLTN_MAX);
    if (populationMin == null || populationMax == null) continue;

    const populationMid = (populationMin + populationMax) / 2;
    const populationScore = clamp((populationMid - 10000) / 60000);
    if (populationScore == null) continue;

    rows.push({
      dong_name: dongName,
      area_code: code,
      area_name: data.AREA_NM ?? population.AREA_NM ?? null,
      population_min: populationMin,
      population_max: populationMax,
      population_mid: round(populationMid, 1),
      observed_population_score: round(populationScore, 4),
    });
  }

  const bestByDong = new Map();
  for (const row of rows) {
    const previous = bestByDong.get(row.dong_name);
    if (
      !previous
      || row.observed_population_score > previous.observed_population_score
    ) {
      bestByDong.set(row.dong_name, row);
    }
  }

  return bestByDong;
}

function comparePressureToPublicBaseline(forecast, trafficSnapshot, citydataSnapshot) {
  const predictedRows = Array.isArray(forecast.regions) ? forecast.regions : [];
  const trafficByDong = new Map(
    (trafficSnapshot.snapshot.dong_summary ?? []).map((row) => [row.dong_name, row]),
  );
  const populationByDong = summarizeCitydataPopulation(citydataSnapshot);

  const rows = predictedRows
    .map((predicted) => {
      const traffic = trafficByDong.get(predicted.dong_name);
      const population = populationByDong.get(predicted.dong_name);
      if (!traffic || !population) return null;

      const predictedPriority = numberOrNull(predicted.dispatch_priority_score);
      const observedPopulationScore = numberOrNull(population.observed_population_score);
      const observedCongestionScore = numberOrNull(traffic.congestion_score);
      const observedSpeed = numberOrNull(traffic.avg_speed_kmh);
      const observedSpeedScore = observedSpeed == null ? null : clamp(1 - observedSpeed / 60);

      if (
        observedPopulationScore == null
        || observedCongestionScore == null
        || observedSpeedScore == null
      ) {
        return null;
      }

      const observedPublicPressure =
        0.45 * observedPopulationScore
        + 0.35 * observedCongestionScore
        + 0.2 * observedSpeedScore;

      return {
        dong_name: predicted.dong_name,
        predicted_dispatch_priority_score: predictedPriority,
        observed_population_score: round(observedPopulationScore, 4),
        observed_congestion_score: round(observedCongestionScore, 4),
        observed_speed_score: round(observedSpeedScore, 4),
        observed_public_pressure: round(observedPublicPressure, 4),
      };
    })
    .filter(Boolean);

  const predictedRanks = rankRows(rows, "predicted_dispatch_priority_score");
  const observedRanks = rankRows(rows, "observed_public_pressure");

  const rankedRows = rows
    .map((row) => ({
      ...row,
      predicted_priority_rank: predictedRanks.get(row.dong_name) ?? null,
      observed_pressure_rank: observedRanks.get(row.dong_name) ?? null,
    }))
    .sort((left, right) => (left.predicted_priority_rank ?? 999) - (right.predicted_priority_rank ?? 999));

  const topPredicted = rankedRows.find((row) => row.predicted_priority_rank === 1) ?? null;
  const topObserved = rankedRows.find((row) => row.observed_pressure_rank === 1) ?? null;

  return {
    generated_at: forecast.generated_at ?? null,
    target_datetime: forecast.target_datetime ?? null,
    feature_datetime: forecast.feature_datetime ?? null,
    actual_traffic_observed_at: trafficSnapshot.observed_at.toISOString(),
    actual_citydata_observed_at: citydataSnapshot.observed_at.toISOString(),
    traffic_snapshot_path: trafficSnapshot.relative_path,
    citydata_snapshot_path: citydataSnapshot.relative_path,
    overall: {
      priority_vs_public_pressure_spearman: round(
        pearson(
          rankedRows.map((row) => row.predicted_priority_rank),
          rankedRows.map((row) => row.observed_pressure_rank),
        ),
        4,
      ),
      top_predicted_priority_dong: topPredicted?.dong_name ?? null,
      top_observed_public_pressure_dong: topObserved?.dong_name ?? null,
      same_top_dong:
        topPredicted?.dong_name != null
        && topPredicted?.dong_name === topObserved?.dong_name,
      row_count: rankedRows.length,
    },
    rows: rankedRows,
  };
}

const forecasts = await readJsonlIfExists(LOG_PATH);
const trafficSnapshots = await loadTrafficSnapshots();
const citydataSnapshots = await loadCitydataSnapshots();
const completed = [];
const waiting = [];
const now = new Date();

for (const forecast of forecasts) {
  const targetAt = parseTime(forecast.target_datetime);
  if (!targetAt) continue;

  const matchedTraffic = findSnapshot(targetAt, trafficSnapshots);
  const matchedCitydata = findSnapshot(targetAt, citydataSnapshots);

  if (matchedTraffic && matchedCitydata) {
    completed.push(comparePressureToPublicBaseline(forecast, matchedTraffic, matchedCitydata));
  } else {
    waiting.push({
      generated_at: forecast.generated_at ?? null,
      target_datetime: forecast.target_datetime ?? null,
      feature_datetime: forecast.feature_datetime ?? null,
      top_predicted_priority_dong: forecast.regions?.[0]?.dong_name ?? null,
      top_predicted_priority_score: forecast.regions?.[0]?.dispatch_priority_score ?? null,
      matched_traffic_snapshot_path: matchedTraffic?.relative_path ?? null,
      matched_citydata_snapshot_path: matchedCitydata?.relative_path ?? null,
      status: now < targetAt
        ? "waiting_for_target_time"
        : "waiting_for_observed_public_pressure_snapshot",
    });
  }
}

const latestCompleted = completed.at(-1) ?? null;
const latestWaiting = waiting.at(-1) ?? null;
const completedWithKind = completed.map((comparison) => ({ kind: "completed", ...comparison }));
const waitingWithKind = waiting.map((comparison) => ({ kind: "waiting", ...comparison }));
const output = {
  generated_at: new Date().toISOString(),
  description:
    "Comparison of predicted taxi pressure vs observed public-pressure baseline (population + road congestion + speed). No taxi-call labels used.",
  comparison_type: "predicted_pressure_vs_observed_public_pressure_baseline",
  source_log_path: LOG_PATH,
  traffic_source_dir: "data/raw/traffic",
  citydata_source_dir: "data/raw/citydata",
  match_window_minutes: MATCH_WINDOW_MINUTES,
  log_count: forecasts.length,
  completed_count: completed.length,
  waiting_count: waiting.length,
  latest: latestCompleted
    ? { kind: "completed", ...latestCompleted }
    : latestWaiting
      ? { kind: "waiting", ...latestWaiting }
      : null,
  completed: completedWithKind,
  waiting: waitingWithKind,
};

for (const relativePath of [PROCESSED_OUTPUT, PUBLIC_OUTPUT]) {
  const absolutePath = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${relativePath}`);
}
