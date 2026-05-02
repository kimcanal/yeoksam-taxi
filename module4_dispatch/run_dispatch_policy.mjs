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

function actionFor(imbalance) {
  if (imbalance >= 0.55) {
    return {
      level: "high",
      label: "선제 이동",
      recommended_taxis: 2,
      incentive_multiplier: 1.2,
    };
  }
  if (imbalance >= 0.3) {
    return {
      level: "medium",
      label: "커버 보강",
      recommended_taxis: 1,
      incentive_multiplier: 1.1,
    };
  }
  return {
    level: "low",
    label: "유지",
    recommended_taxis: 0,
    incentive_multiplier: 1.0,
  };
}

const forecast = await readJson("public/forecast/latest.json");
const supply = await readJson("data/samples/supply-proxy.json");
const supplyByDong = new Map(
  (supply.regions ?? []).map((region) => [region.dong_name, region.idle_taxis ?? 0]),
);

const decisions = (forecast.regions ?? [])
  .map((region) => {
    const idleTaxis = supplyByDong.get(region.dong_name) ?? 0;
    const imbalance = region.score / (idleTaxis + 1);
    const action = actionFor(imbalance);
    return {
      dong_name: region.dong_name,
      predicted_demand_score: region.score,
      confidence: region.confidence,
      idle_taxis: idleTaxis,
      imbalance_score: Number(imbalance.toFixed(3)),
      action: action.label,
      action_level: action.level,
      recommended_taxis: action.recommended_taxis,
      incentive_multiplier: action.incentive_multiplier,
    };
  })
  .sort((left, right) => right.imbalance_score - left.imbalance_score);

const output = {
  source: "demo_dispatch_policy_v1",
  generated_at: new Date().toISOString(),
  forecast_source: forecast.source ?? "model",
  forecast_target_datetime: forecast.target_datetime,
  policy: "imbalance_score = predicted_demand_score / (idle_taxis + 1)",
  decisions,
};

const outputPath = path.join(projectRoot, "public", "dispatch-plan.json");
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
