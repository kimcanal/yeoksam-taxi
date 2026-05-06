import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const INPUTS = {
  demand: "public/forecast/latest.json",
  traffic: "public/traffic-forecast/latest.json",
  population: "public/population-pressure-summary.json",
  observability: "public/model-observability.json",
};

const PROCESSED_OUTPUT =
  "data/processed/live_validation/demand_guardrail_summary.json";
const PUBLIC_OUTPUT = "public/demand-guardrail-summary.json";

function clamp(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(value, min), max);
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

function scoreOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function byDong(rows, key = "dong_name") {
  return new Map((rows ?? []).map((row) => [row[key], row]));
}

function rankMap(rows, valueFn) {
  return new Map(
    [...rows]
      .filter((row) => Number.isFinite(valueFn(row)))
      .sort((left, right) => valueFn(right) - valueFn(left))
      .map((row, index) => [row.dong_name, index + 1]),
  );
}

function recentTopCountMap(recentRows) {
  const counts = new Map();
  for (const row of recentRows ?? []) {
    if (!row?.top_region) continue;
    counts.set(row.top_region, (counts.get(row.top_region) ?? 0) + 1);
  }
  return counts;
}

function validationStrength(spearman) {
  if (!Number.isFinite(spearman)) return 0.35;
  return clamp((spearman - 0.15) / 0.55, 0.15, 1);
}

function globalBaselineStrength(readiness) {
  const modelVsPattern =
    readiness?.supervised_2025_holdout?.model_vs_pattern_mae_improvement_pct;
  const modelVsPersistence =
    readiness?.supervised_2025_holdout?.model_vs_persistence_mae_improvement_pct;

  const patternComponent = Number.isFinite(modelVsPattern)
    ? clamp(modelVsPattern / 15, 0.25, 1)
    : 0.35;
  const persistenceComponent = Number.isFinite(modelVsPersistence)
    ? clamp(modelVsPersistence / 50, 0.4, 1)
    : 0.5;

  return round(patternComponent * 0.65 + persistenceComponent * 0.35, 4);
}

function rankAgreement(dongName, demandRank, trafficRank, populationRank, totalCount) {
  const ranks = [demandRank.get(dongName), trafficRank.get(dongName), populationRank.get(dongName)]
    .filter(Number.isFinite);
  if (ranks.length < 2 || totalCount <= 1) return 0.45;

  const demand = demandRank.get(dongName);
  if (!Number.isFinite(demand)) return 0.45;

  const otherRanks = ranks.filter((rank) => rank !== demand);
  if (!otherRanks.length) return 0.45;

  const avgDiff =
    otherRanks.reduce((sum, rank) => sum + Math.abs(rank - demand), 0) / otherRanks.length;
  return round(clamp(1 - avgDiff / (totalCount - 1), 0, 1), 4);
}

function confidenceLevel(score) {
  if (!Number.isFinite(score)) return "unknown";
  if (score >= 0.68) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function useCase(level) {
  if (level === "high") return "monitoring_priority";
  if (level === "medium") return "watch_with_live_signals";
  return "needs_more_validation";
}

function riskFlags({
  rankAgreementScore,
  validationScore,
  populationRow,
  trafficRow,
  forecast,
  recentTopCount,
  demandRankValue,
  totalCount,
  latestTopRegion,
  dongName,
}) {
  const flags = [];
  if (forecast?.strategy === "pattern") {
    flags.push("pattern_fallback_used");
  }
  if (rankAgreementScore < 0.45) {
    flags.push("signals_disagree");
  }
  if (validationScore < 0.35) {
    flags.push("weak_2026_proxy_validation");
  }
  if (!populationRow) {
    flags.push("no_live_population_poi_coverage");
  }
  if (!trafficRow || Number(trafficRow.current_link_count ?? 0) < 5) {
    flags.push("thin_current_traffic_links");
  }
  if (
    recentTopCount >= 2
    && Number.isFinite(demandRankValue)
    && totalCount >= 3
    && (
      demandRankValue > Math.ceil(totalCount * 0.66)
      || (latestTopRegion && latestTopRegion !== dongName && demandRankValue > 1)
    )
  ) {
    flags.push("recent_rank_volatility");
  }
  return flags;
}

const demand = await readJsonIfExists(INPUTS.demand, {});
const traffic = await readJsonIfExists(INPUTS.traffic, {});
const population = await readJsonIfExists(INPUTS.population, {});
const observability = await readJsonIfExists(INPUTS.observability, {});

const demandRows = Array.isArray(demand.regions) ? demand.regions : [];
const trafficRows = Array.isArray(traffic.regions) ? traffic.regions : [];
const populationRows = Array.isArray(population.dongs) ? population.dongs : [];
const validationRows = observability?.observed_validation_2026?.per_dong ?? [];
const readiness = observability?.baseline_readiness ?? null;

const trafficByDong = byDong(trafficRows);
const populationByDong = byDong(populationRows);
const validationByDong = byDong(validationRows);
const demandRank = rankMap(demandRows, (row) => scoreOrZero(row.score));
const trafficRank = rankMap(trafficRows, (row) => scoreOrZero(row.predicted_congestion_score));
const populationRank = rankMap(populationRows, (row) => scoreOrZero(row.avg_poi_pressure_score));
const baselineScore = globalBaselineStrength(readiness);
const totalCount = demandRows.length;
const recentRows = observability?.live_validation?.recent ?? [];
const recentTopCounts = recentTopCountMap(recentRows);
const latestTopRegion =
  observability?.live_validation?.latest_top_region ?? recentRows[0]?.top_region ?? null;

const dongs = demandRows
  .map((row) => {
    const dongName = row.dong_name;
    const trafficRow = trafficByDong.get(dongName) ?? null;
    const populationRow = populationByDong.get(dongName) ?? null;
    const validationRow = validationByDong.get(dongName) ?? null;
    const validationScore = validationStrength(validationRow?.spearman_r);
    const demandRankValue = demandRank.get(dongName) ?? null;
    const recentTopCount = recentTopCounts.get(dongName) ?? 0;
    const rankAgreementScore = rankAgreement(
      dongName,
      demandRank,
      trafficRank,
      populationRank,
      totalCount,
    );
    const liveCoverageScore =
      (trafficRow ? 0.45 : 0) +
      (populationRow ? 0.45 : 0) +
      (Number(row.confidence) > 0 ? 0.1 : 0);
    const signalPressureScore = round(
      scoreOrZero(row.score) * 0.45 +
        scoreOrZero(trafficRow?.predicted_congestion_score) * 0.3 +
        scoreOrZero(populationRow?.avg_poi_pressure_score) * 0.25,
      4,
    );
    const confidenceScore = round(
      baselineScore * 0.25 +
        validationScore * 0.25 +
        rankAgreementScore * 0.3 +
        liveCoverageScore * 0.2,
      4,
    );
    const monitoringPriorityScore = round(
      signalPressureScore * (0.55 + scoreOrZero(confidenceScore) * 0.45),
      4,
    );
    const level = confidenceLevel(confidenceScore);

    return {
      dong_name: dongName,
      target_datetime: demand.target_datetime ?? traffic.target_datetime ?? population.target_datetime ?? null,
      composite_pressure_score: signalPressureScore,
      confidence_score: confidenceScore,
      monitoring_priority_score: monitoringPriorityScore,
      confidence_level: level,
      recommended_use: useCase(level),
      demand: {
        score: row.score ?? null,
        rank: demandRank.get(dongName) ?? null,
        raw_prediction: row.raw_prediction ?? null,
        model_confidence: row.confidence ?? null,
      },
      traffic: {
        predicted_congestion_score: trafficRow?.predicted_congestion_score ?? null,
        rank: trafficRank.get(dongName) ?? null,
        current_congestion_score: trafficRow?.current_congestion_score ?? null,
        current_link_count: trafficRow?.current_link_count ?? null,
      },
      population: {
        avg_poi_pressure_score: populationRow?.avg_poi_pressure_score ?? null,
        rank: populationRank.get(dongName) ?? null,
        live_poi_count: populationRow?.poi_count ?? 0,
        forecast_population_mid_sum: populationRow?.forecast_population_mid_sum ?? null,
        forecast_population_delta: populationRow?.forecast_population_delta ?? null,
      },
      validation: {
        spearman_r_2026_proxy: validationRow?.spearman_r ?? null,
        validation_strength_score: round(validationScore, 4),
        row_count: validationRow?.row_count ?? null,
      },
      guardrails: {
        baseline_strength_score: baselineScore,
        rank_agreement_score: rankAgreementScore,
        live_coverage_score: round(liveCoverageScore, 4),
        risk_flags: riskFlags({
          rankAgreementScore,
          validationScore,
          populationRow,
          trafficRow,
          forecast: demand,
          recentTopCount,
          demandRankValue,
          totalCount,
          latestTopRegion,
          dongName,
        }),
        recent_top_count: recentTopCount,
        latest_top_region: latestTopRegion,
      },
    };
  })
  .sort((left, right) => {
    if (right.monitoring_priority_score !== left.monitoring_priority_score) {
      return right.monitoring_priority_score - left.monitoring_priority_score;
    }
    return right.confidence_score - left.confidence_score;
  });

const output = {
  source: "public_proxy_demand_guardrail_v1",
  generated_at: new Date().toISOString(),
  target_datetime: demand.target_datetime ?? traffic.target_datetime ?? population.target_datetime ?? null,
  forecast_strategy: demand.strategy ?? null,
  interpretation:
    "동별 수요 proxy 예측을 패턴 baseline, 2026 사후 proxy 검증, live 교통 혼잡, citydata POI 인구 pressure와 대조해 monitoring confidence를 산출합니다. 택시 호출량 정확도나 배차 지시가 아닙니다.",
  global_baseline_readiness: {
    verdict: readiness?.verdict ?? null,
    model_vs_persistence_mae_improvement_pct:
      readiness?.supervised_2025_holdout?.model_vs_persistence_mae_improvement_pct ?? null,
    model_vs_pattern_mae_improvement_pct:
      readiness?.supervised_2025_holdout?.model_vs_pattern_mae_improvement_pct ?? null,
    baseline_strength_score: baselineScore,
  },
  scoring: {
    confidence_score:
      "0.25 baseline strength + 0.25 per-dong 2026 proxy validation + 0.30 rank agreement across demand/traffic/population + 0.20 live coverage",
    composite_pressure_score:
      "0.45 demand score + 0.30 predicted traffic congestion + 0.25 citydata POI population pressure",
    monitoring_priority_score:
      "composite pressure weighted by confidence. This field sorts the monitoring list.",
  },
  coverage: {
    dong_count: dongs.length,
    population_covered_dong_count: population.coverage?.covered_dong_count ?? 0,
    live_poi_count: population.coverage?.live_poi_count ?? 0,
    traffic_dong_count: trafficRows.length,
  },
  top_monitoring_dongs: dongs.slice(0, 5),
  dongs,
};

for (const relativePath of [PROCESSED_OUTPUT, PUBLIC_OUTPUT]) {
  const absolutePath = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${relativePath}`);
}
