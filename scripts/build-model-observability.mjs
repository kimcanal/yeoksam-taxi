import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

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

async function artifactStatus(relativePath, expectedMinBytes = 1) {
  try {
    const info = await stat(path.join(projectRoot, relativePath));
    return {
      path: relativePath,
      exists: true,
      size_bytes: info.size,
      usable: info.size >= expectedMinBytes,
    };
  } catch {
    return {
      path: relativePath,
      exists: false,
      size_bytes: null,
      usable: false,
    };
  }
}

function topFeatures(rows, limit = 10) {
  const positiveRows = rows
    .filter((row) => Number.isFinite(row.importance_mean) && row.importance_mean > 0)
    .sort((left, right) => right.importance_mean - left.importance_mean);
  const maxImportance = positiveRows[0]?.importance_mean ?? 0;

  return positiveRows.slice(0, limit).map((row, index) => ({
    rank: index + 1,
    feature: row.feature,
    importance_mean: Number(row.importance_mean.toFixed(6)),
    importance_std: Number((row.importance_std ?? 0).toFixed(6)),
    normalized_importance:
      maxImportance > 0 ? Number((row.importance_mean / maxImportance).toFixed(4)) : 0,
  }));
}

function validationSummary(entries) {
  const latest = entries.at(-1) ?? null;
  const recent = entries.slice(-5).reverse().map((entry) => ({
    generated_at: entry.generated_at ?? null,
    target_datetime: entry.target_datetime ?? null,
    strategy: entry.strategy ?? null,
    top_region: entry.forecast_top_regions?.[0]?.dong_name ?? null,
    top_score: entry.forecast_top_regions?.[0]?.score ?? null,
    dispatch_region: entry.dispatch_top_decisions?.[0]?.dong_name ?? null,
    dispatch_action: entry.dispatch_top_decisions?.[0]?.action ?? null,
  }));

  return {
    source_path: "data/processed/live_validation/live_forecast_log.jsonl",
    log_count: entries.length,
    latest_generated_at: latest?.generated_at ?? null,
    latest_target_datetime: latest?.target_datetime ?? null,
    latest_strategy: latest?.strategy ?? null,
    latest_top_region: latest?.forecast_top_regions?.[0]?.dong_name ?? null,
    latest_dispatch_region: latest?.dispatch_top_decisions?.[0]?.dong_name ?? null,
    latest_dispatch_action: latest?.dispatch_top_decisions?.[0]?.action ?? null,
    recent,
  };
}

function observedValidationSummary(data) {
  if (!data) return null;
  const perDong = Object.entries(data.per_dong ?? {})
    .map(([dongName, row]) => ({
      dong_name: dongName,
      spearman_r: row.spearman_r ?? null,
      spearman_p: row.spearman_p ?? null,
      row_count: row.row_count ?? 0,
      normalized_mape_pct: row.normalized_mape_pct ?? null,
    }))
    .sort((left, right) => (right.spearman_r ?? -Infinity) - (left.spearman_r ?? -Infinity));

  return {
    source_path: "data/processed/model_live_compatible/validation_2026_q1.json",
    validation_dataset: data.validation_dataset ?? null,
    generated_at: data.generated_at ?? null,
    note: data.note ?? null,
    row_count: data.row_count ?? 0,
    normalized_row_count: data.normalized_row_count ?? 0,
    dongs: data.dongs ?? [],
    date_range: data.date_range ?? null,
    overall: data.overall ?? null,
    per_dong: perDong,
  };
}

function pctImprovement(baseline, model) {
  if (!Number.isFinite(baseline) || !Number.isFinite(model) || baseline === 0) {
    return null;
  }
  return Number((((baseline - model) / baseline) * 100).toFixed(1));
}

function baselineReadinessSummary({ modelSummary, demandPattern, observedValidation }) {
  const liveModel = modelSummary?.models?.find((model) => model.live_usable) ?? null;
  const persistence = modelSummary?.baseline?.persistence?.metrics ?? null;
  const pattern = demandPattern?.pattern_mean_loo ?? null;
  const patternModel = demandPattern?.model_prediction ?? null;
  const observedOverall = observedValidation?.overall ?? null;
  const perDong = Object.entries(observedValidation?.per_dong ?? {})
    .map(([dongName, row]) => ({
      dong_name: dongName,
      spearman_r: row.spearman_r ?? null,
      row_count: row.row_count ?? 0,
    }))
    .sort((left, right) => (right.spearman_r ?? -Infinity) - (left.spearman_r ?? -Infinity));

  return {
    verdict: "usable_for_public_proxy_ranking_not_direct_taxi_demand",
    decision:
      "Use the demand model as a dong-level monitoring/ranking signal. Do not use it as an absolute taxi-call forecast until direct taxi labels or a stronger observed proxy backtest are added.",
    supervised_2025_holdout: {
      live_model_r2: liveModel?.metrics?.r2 ?? null,
      live_model_mae: liveModel?.metrics?.mae ?? patternModel?.mae ?? null,
      persistence_mae: persistence?.mae ?? null,
      pattern_mean_loo_mae: pattern?.mae ?? null,
      pattern_mean_loo_mape_pct: pattern?.mape_pct ?? null,
      model_vs_persistence_mae_improvement_pct: pctImprovement(
        persistence?.mae,
        liveModel?.metrics?.mae ?? patternModel?.mae,
      ),
      model_vs_pattern_mae_improvement_pct: pctImprovement(
        pattern?.mae,
        patternModel?.mae ?? liveModel?.metrics?.mae,
      ),
      caveat:
        "The supervised target is a public movement-demand proxy. Pattern baseline remains strong on percentage error, so model confidence should be reduced when it disagrees with time-pattern and live citydata pressure.",
    },
    observed_2026_proxy_check: {
      row_count: observedValidation?.row_count ?? null,
      spearman_r: observedOverall?.spearman_r ?? null,
      per_dong_spearman_mean: observedOverall?.per_dong_spearman_mean ?? null,
      strongest_dongs: perDong.slice(0, 3),
      weakest_dongs: perDong.slice(-3).reverse(),
      caveat:
        "2026 validation compares normalized transit boardings against the model proxy, not taxi-call labels. It supports directional monitoring more than exact magnitude prediction.",
    },
    recommended_next_steps: [
      "Keep same-hour pattern baseline as a guardrail and expose model-vs-pattern disagreement as confidence.",
      "Use Seoul citydata POI population forecast and TOPIS congestion as live nowcast corrections.",
      "Accumulate at least several days of hourly live snapshots before claiming live accuracy.",
      "Add direct taxi-call or taxi stand pickup labels if they become available.",
    ],
  };
}

const importancePath = "data/processed/model_live_compatible/dong_demand_proxy_live_feature_importance.json";
const logPath = "data/processed/live_validation/live_forecast_log.jsonl";
const observedValidationPath = "data/processed/model_live_compatible/validation_2026_q1.json";
const modelSummaryPath = "public/model-summary.json";
const demandPatternPath = "public/demand-pattern-summary.json";
const importanceRows = await readJsonIfExists(importancePath, []);
const validationEntries = await readJsonlIfExists(logPath);
const observedValidation = await readJsonIfExists(observedValidationPath);
const modelSummary = await readJsonIfExists(modelSummaryPath);
const demandPattern = await readJsonIfExists(demandPatternPath);

const output = {
  generated_at: new Date().toISOString(),
  feature_importance: {
    source_path: importancePath,
    model_feature_set: "live_compatible_calendar_weather_static",
    feature_count: Array.isArray(importanceRows) ? importanceRows.length : 0,
    top_features: topFeatures(Array.isArray(importanceRows) ? importanceRows : []),
  },
  live_validation: validationSummary(validationEntries),
  observed_validation_2026: observedValidationSummary(observedValidation),
  baseline_readiness: baselineReadinessSummary({
    modelSummary,
    demandPattern,
    observedValidation,
  }),
  reproducibility_artifacts: [
    await artifactStatus(
      "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv",
      70 * 1024 * 1024,
    ),
    await artifactStatus(
      "data/processed/model_live_compatible/dong_demand_proxy_live_predictions_2025.csv",
      5 * 1024 * 1024,
    ),
    await artifactStatus("data/processed/model_live_compatible/pattern_cache.json", 1024 * 1024),
  ],
};

const outputDir = path.join(projectRoot, "public");
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "model-observability.json");
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
