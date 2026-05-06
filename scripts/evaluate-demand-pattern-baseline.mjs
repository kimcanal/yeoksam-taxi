import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_INPUT =
  "data/processed/model_live_compatible/dong_demand_proxy_live_predictions_2025.csv";
const DEFAULT_CACHE =
  "data/processed/model_live_compatible/demand_pattern_cache_2025.json";
const DEFAULT_OUT_DIR = "data/processed/model_live_compatible";
const PUBLIC_SUMMARY = "public/demand-pattern-summary.json";
const LIVE_METRICS = "data/processed/model_live_compatible/dong_demand_proxy_live_metrics.json";
const OBSERVED_VALIDATION = "data/processed/model_live_compatible/validation_2026_q1.json";

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: DEFAULT_INPUT,
    cache: DEFAULT_CACHE,
    outDir: DEFAULT_OUT_DIR,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--input" && next) {
      options.input = next;
      index += 1;
    } else if (arg === "--cache" && next) {
      options.cache = next;
      index += 1;
    } else if (arg === "--out-dir" && next) {
      options.outDir = next;
      index += 1;
    }
  }

  return options;
}

function patternTypeFor(date) {
  const weekday = date.getDay(); // 0=Sun..6=Sat
  return weekday === 0 || weekday === 6 ? "weekend" : "weekday";
}

function parseKstDatetime(value) {
  // Input format: "YYYY-MM-DD HH:mm:ss" (KST, naive).
  const [datePart, timePart] = String(value).trim().split(" ");
  const [year, month, day] = datePart.split("-").map((v) => Number(v));
  const [hour, minute, second] = timePart.split(":").map((v) => Number(v));
  const utcMs = Date.UTC(year, month - 1, day, hour - 9, minute, second);
  return new Date(utcMs);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function splitCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

function metricBundle(actual, predicted) {
  let count = 0;
  let absErrorSum = 0;
  let squaredErrorSum = 0;
  let mapeCount = 0;
  let mapeSum = 0;

  for (let i = 0; i < actual.length; i += 1) {
    const y = actual[i];
    const p = predicted[i];
    if (!Number.isFinite(y) || !Number.isFinite(p)) continue;
    const err = y - p;
    count += 1;
    absErrorSum += Math.abs(err);
    squaredErrorSum += err * err;
    if (Math.abs(y) > 1e-9) {
      mapeCount += 1;
      mapeSum += Math.abs(err / y);
    }
  }

  const mae = count ? absErrorSum / count : null;
  const rmse = count ? Math.sqrt(squaredErrorSum / count) : null;
  const mapePct = mapeCount ? (mapeSum / mapeCount) * 100 : null;
  return { row_count: count, mae, rmse, mape_pct: mapePct };
}

async function readJsonIfExists(relativePath, fallback = null) {
  try {
    return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

async function artifactStatus(relativePath) {
  try {
    const info = await stat(path.join(projectRoot, relativePath));
    return {
      path: relativePath,
      exists: true,
      size_bytes: info.size,
    };
  } catch {
    return {
      path: relativePath,
      exists: false,
      size_bytes: null,
    };
  }
}

function hasTargetMean(cache) {
  return (cache?.patterns ?? []).some((row) =>
    row?.mean_target_inbound_boardings_per_1k_pop_t_plus_1h != null,
  );
}

function cachedSummary({
  options,
  reason,
  existingSummary,
  liveMetrics,
  observedValidation,
  inputStatus,
  cacheStatus,
}) {
  return {
    generated_at: new Date().toISOString(),
    evaluation_mode: "cached_summary_with_artifact_check",
    input_predictions_csv: options.input,
    pattern_cache: options.cache,
    interpretation:
      "Uses the last committed 2025 model-vs-pattern baseline metrics when the bulky reproducibility artifacts are not present locally. "
      + "This keeps the command non-blocking while surfacing the missing artifact status.",
    source_artifacts: {
      input_predictions_csv: inputStatus,
      pattern_cache: cacheStatus,
      cached_summary_used: Boolean(existingSummary),
      fallback_reason: reason,
    },
    model_prediction: existingSummary?.model_prediction ?? (
      liveMetrics?.model
        ? {
            row_count: liveMetrics?.row_counts?.test ?? null,
            mae: liveMetrics.model.mae ?? null,
            rmse: liveMetrics.model.rmse ?? null,
            mape_pct: liveMetrics.model.mape_pct ?? null,
          }
        : null
    ),
    pattern_mean_loo: existingSummary?.pattern_mean_loo ?? null,
    observed_2026_proxy_check: observedValidation
      ? {
          row_count: observedValidation.row_count ?? null,
          date_range: observedValidation.date_range ?? null,
          spearman_r: observedValidation.overall?.spearman_r ?? null,
          per_dong_spearman_mean:
            observedValidation.overall?.per_dong_spearman_mean ?? null,
        }
      : null,
    caveat:
      "Pattern baseline metrics are useful as a sanity check, but this repository currently lacks the large 2025 prediction CSV and legacy target-mean pattern cache needed to recompute them from scratch.",
  };
}

async function writeMetrics(metrics, outDir) {
  const outDirAbs = path.join(projectRoot, outDir);
  await mkdir(outDirAbs, { recursive: true });
  const outPath = path.join(outDirAbs, "demand_pattern_baseline_metrics_2025.json");
  await writeFile(outPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  const publicPath = path.join(projectRoot, PUBLIC_SUMMARY);
  await writeFile(publicPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(projectRoot, outPath)}`);
  console.log(`Wrote ${path.relative(projectRoot, publicPath)}`);
}

const options = parseArgs();
const inputStatus = await artifactStatus(options.input);
const cacheStatus = await artifactStatus(options.cache);
const existingSummary = await readJsonIfExists(PUBLIC_SUMMARY);
const liveMetrics = await readJsonIfExists(LIVE_METRICS);
const observedValidation = await readJsonIfExists(OBSERVED_VALIDATION);
const cache = cacheStatus.exists
  ? JSON.parse(await readFile(path.join(projectRoot, options.cache), "utf8"))
  : null;

if (!inputStatus.exists || !cacheStatus.exists || !hasTargetMean(cache)) {
  const reason = !inputStatus.exists
    ? "missing_input_predictions_csv"
    : !cacheStatus.exists
      ? "missing_pattern_cache"
      : "pattern_cache_lacks_target_mean";
  await writeMetrics(
    cachedSummary({
      options,
      reason,
      existingSummary,
      liveMetrics,
      observedValidation,
      inputStatus,
      cacheStatus,
    }),
    options.outDir,
  );
  process.exit(0);
}

const exactMap = new Map();
for (const row of cache.patterns ?? []) {
  const key = `${row.dong_name}|${row.month}|${row.hour}|${row.pattern_type}`;
  exactMap.set(key, row);
}

const fallbackMap = new Map();
for (const row of cache.fallback_patterns ?? []) {
  const key = `${row.dong_name}|${row.hour}|${row.pattern_type}`;
  fallbackMap.set(key, row);
}

function getGroupRow({ dong, month, hour, patternType }) {
  const exactKey = `${dong}|${month}|${hour}|${patternType}`;
  const fallbackKey = `${dong}|${hour}|${patternType}`;
  const weekdayFallbackKey = `${dong}|${hour}|weekday`;
  return (
    exactMap.get(exactKey)
    || fallbackMap.get(fallbackKey)
    || fallbackMap.get(weekdayFallbackKey)
    || null
  );
}

const csvText = await readFile(path.join(projectRoot, options.input), "utf8");
const lines = csvText.split(/\r?\n/).filter(Boolean);
const header = splitCsvLine(lines[0] ?? "");
const headerIndex = Object.fromEntries(header.map((name, idx) => [name, idx]));

const dtIndex = headerIndex.datetime_kst;
const dongIndex = headerIndex.dong_name;
const targetIndex = headerIndex.target_inbound_boardings_per_1k_pop_t_plus_1h;
const predIndex = headerIndex.prediction;

const actual = [];
const modelPred = [];
const baselinePred = [];

for (const line of lines.slice(1)) {
  const fields = splitCsvLine(line);
  const dong = fields[dongIndex];
  const dt = parseKstDatetime(fields[dtIndex]);
  const month = dt.getUTCMonth() + 1;
  const hour = dt.getUTCHours();
  const patternType = patternTypeFor(dt);

  const y = numberOrNull(fields[targetIndex]);
  const p = numberOrNull(fields[predIndex]);
  if (!dong || y == null || p == null) continue;

  const groupRow = getGroupRow({ dong, month, hour, patternType });
  const groupCount = Number(groupRow?.sample_count ?? 0);
  const groupMean = numberOrNull(groupRow?.mean_target_inbound_boardings_per_1k_pop_t_plus_1h);

  let loo = groupMean;
  if (groupMean != null && groupCount > 1) {
    const sum = groupMean * groupCount;
    loo = (sum - y) / (groupCount - 1);
  }

  actual.push(y);
  modelPred.push(p);
  baselinePred.push(loo);
}

const metrics = {
  generated_at: new Date().toISOString(),
  input_predictions_csv: options.input,
  pattern_cache: options.cache,
  interpretation:
    "Evaluates a leave-one-out same-hour pattern-mean baseline (grouped by dong, month, hour, weekday/weekend) "
    + "against the 2025 supervised test rows. This is a sanity check for the JS-only fallback mode.",
  model_prediction: metricBundle(actual, modelPred),
  pattern_mean_loo: metricBundle(actual, baselinePred),
};

await writeMetrics(metrics, options.outDir);
