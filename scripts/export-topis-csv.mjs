/**
 * Exports data/processed/topis/topis_traffic_2026-03.json
 * as a CSV with 행정동 column.
 *
 * Output: data/processed/topis/topis_traffic_2026-03.csv
 *
 * Usage: node scripts/export-topis-csv.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ── 동 할당 ──────────────────────────────────────────────────────────────────
// 폴리곤 내부 센서: point-in-polygon 결과
// 경계 외부 센서(다리·터널·고속도로): 최근접 동 centroid 기준 할당
const SENSOR_DONG = new Map([
  ["C-13", { dong: "신사동",   note: "polygon" }],  // 한남대교
  ["C-16", { dong: "청담동",   note: "nearest" }],  // 영동대교 (다리)
  ["C-17", { dong: "삼성1동",  note: "nearest" }],  // 청담대교 (다리)
  ["D-35", { dong: "역삼1동",  note: "polygon" }],  // 강남대로(강남역-신분당)
  ["D-38", { dong: "역삼2동",  note: "nearest" }],  // 언주로(매봉터널)
  ["D-42", { dong: "삼성2동",  note: "polygon" }],  // 테헤란로(선릉역)
  ["D-43", { dong: "논현1동",  note: "polygon" }],  // 강남대로(신사역)
  ["F-06", { dong: "논현1동",  note: "nearest" }],  // 경부고속도로
]);

// ── CSV helpers ───────────────────────────────────────────────────────────────
function csvRow(values) {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(",");
}

// ── main ──────────────────────────────────────────────────────────────────────
const srcPath = path.join(
  projectRoot,
  "data", "processed", "topis", "topis_traffic_2026-03.json",
);
const raw = JSON.parse(await readFile(srcPath, "utf8"));

const header = csvRow([
  "date",
  "day_type",
  "dong_name",
  "dong_assign",
  "sensor_id",
  "sensor_name",
  "lat",
  "lon",
  "direction",
  "section",
  "hour",
  "vehicle_count",
]);

const lines = [header];
for (const rec of raw.records) {
  const dongInfo = SENSOR_DONG.get(rec.sensor_id);
  lines.push(
    csvRow([
      rec.date,
      rec.day_type,
      dongInfo?.dong ?? "",
      dongInfo?.note ?? "",
      rec.sensor_id,
      rec.sensor_name,
      rec.lat,
      rec.lon,
      rec.direction,
      rec.section,
      rec.hour,
      rec.vehicle_count,
    ]),
  );
}

const outPath = path.join(
  projectRoot,
  "data", "processed", "topis", "topis_traffic_2026-03.csv",
);
await writeFile(outPath, lines.join("\n") + "\n", "utf8");

// ── summary by dong ───────────────────────────────────────────────────────────
const byDong = {};
for (const rec of raw.records) {
  const dong = SENSOR_DONG.get(rec.sensor_id)?.dong ?? "기타";
  if (!byDong[dong]) byDong[dong] = { rows: 0, sensors: new Set() };
  byDong[dong].rows += 1;
  byDong[dong].sensors.add(rec.sensor_id);
}

console.log(`Wrote ${lines.length - 1} rows → ${path.relative(projectRoot, outPath)}`);
console.log("\n행정동별 요약:");
for (const [dong, info] of Object.entries(byDong).sort()) {
  console.log(`  ${dong.padEnd(8)}  ${info.rows.toLocaleString()} rows  센서: ${[...info.sensors].join(", ")}`);
}
console.log("\n* dong_assign: polygon = 폴리곤 내부 / nearest = 경계 외부 최근접 할당");
