/**
 * Processes data/raw/topis/topis_traffic_2026-03.xlsx
 * into a long-format JSON (date × location × hour → vehicle count).
 *
 * Output: data/processed/topis/topis_traffic_2026-03.json
 *
 * Usage: node scripts/process-topis-march.mjs
 */

import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ── sensor metadata for the 9-dong area ─────────────────────────────────────
// Filtered from the 수집지점 주소 및 좌표 sheet (bbox 37.489-37.535 / 127.008-127.069)
const GANGNAM_SENSORS = new Map([
  ["C-13", { name: "한남대교",            lat: 37.52711, lon: 127.01328 }],
  ["C-16", { name: "영동대교",            lat: 37.53041, lon: 127.05746 }],
  ["C-17", { name: "청담대교",            lat: 37.52840, lon: 127.06544 }],
  ["D-35", { name: "강남대로(강남역-신분당)", lat: 37.49069, lon: 127.03116 }],
  ["D-38", { name: "언주로(매봉터널)",     lat: 37.49201, lon: 127.04797 }],
  ["D-42", { name: "테헤란로(선릉역)",     lat: 37.50548, lon: 127.05213 }],
  ["D-43", { name: "강남대로(신사역)",     lat: 37.51480, lon: 127.02013 }],
  ["F-06", { name: "경부고속도로",         lat: 37.49321, lon: 127.02252 }],
]);

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 .. 23

// ── parse xlsx with node (no python dependency) ──────────────────────────────
// Use the xlsx npm package if available, otherwise fall back to a Python subprocess.

let rows;
const xlsxPath = path.join(projectRoot, "data", "raw", "topis", "topis_traffic_2026-03.xlsx");

const SENSOR_IDS = JSON.stringify([...GANGNAM_SENSORS.keys()]);

try {
  // Try xlsx package first
  const require = createRequire(import.meta.url);
  const XLSX = require("xlsx");
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets["2026년 03월"];
  rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
} catch {
  // Fall back to Python — write filtered rows to a temp file to avoid stdout limits
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { tmpdir } = await import("node:os");
  const execAsync = promisify(execFile);
  const tmpPath = path.join(tmpdir(), `topis_march_filtered_${Date.now()}.json`);
  const script = `
import json, openpyxl
target = set(${SENSOR_IDS})
wb = openpyxl.load_workbook(${JSON.stringify(xlsxPath)}, read_only=True)
ws = wb['2026년 03월']
all_rows = list(ws.iter_rows(values_only=True))
header = list(all_rows[0])
filtered = [header] + [list(r) for r in all_rows[1:] if str(r[4]) in target]
with open(${JSON.stringify(tmpPath)}, 'w', encoding='utf-8') as f:
    json.dump(filtered, f, ensure_ascii=False)
print('ok')
`;
  await execAsync("python3", ["-c", script]);
  rows = JSON.parse(await readFile(tmpPath, "utf8"));
  await import("node:fs").then((fs) => fs.promises.unlink(tmpPath).catch(() => {}));
}

// ── build records ─────────────────────────────────────────────────────────────
// Row layout (0-indexed):
//   0: 일자  1: 요일  2: 요일(2)  3: 지점명  4: 지점번호  5: 방향  6: 구분
//   7..30: counts for hour 0..23

const records = [];

for (const row of rows.slice(1)) {
  const sensorId = String(row[4] ?? "").trim();
  if (!GANGNAM_SENSORS.has(sensorId)) continue;

  const dateRaw = row[0]; // 20260301
  const dateStr = String(dateRaw);
  const dateIso = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  const dayType = String(row[2] ?? "").trim(); // 평일 / 주말
  const direction = String(row[5] ?? "").trim();
  const section = String(row[6] ?? "").trim();
  const sensor = GANGNAM_SENSORS.get(sensorId);

  for (const hour of HOURS) {
    const count = row[7 + hour];
    records.push({
      date: dateIso,
      day_type: dayType,
      sensor_id: sensorId,
      sensor_name: sensor.name,
      lat: sensor.lat,
      lon: sensor.lon,
      direction,
      section,
      hour,
      vehicle_count: typeof count === "number" ? count : null,
    });
  }
}

// ── summary stats ─────────────────────────────────────────────────────────────
const byId = {};
for (const rec of records) {
  if (!byId[rec.sensor_id]) byId[rec.sensor_id] = [];
  byId[rec.sensor_id].push(rec);
}

const sensors = Object.entries(byId).map(([id, recs]) => {
  const counts = recs.map((r) => r.vehicle_count).filter((v) => v !== null);
  return {
    sensor_id: id,
    sensor_name: GANGNAM_SENSORS.get(id)?.name,
    lat: GANGNAM_SENSORS.get(id)?.lat,
    lon: GANGNAM_SENSORS.get(id)?.lon,
    record_count: recs.length,
    total_vehicles: counts.reduce((s, v) => s + v, 0),
    avg_hourly: Math.round(counts.reduce((s, v) => s + v, 0) / counts.length),
  };
});

const payload = {
  meta: {
    source: "TOPIS 서울시 교통량 통계 2026-03",
    period: "2026-03-01 ~ 2026-03-31",
    generated_at: new Date().toISOString(),
    target_dongs: "역삼1·2동, 논현1·2동, 삼성1·2동, 신사동, 청담동, 대치4동",
    sensor_count: GANGNAM_SENSORS.size,
    record_count: records.length,
    columns: "date, day_type, sensor_id, sensor_name, lat, lon, direction, section, hour, vehicle_count",
  },
  sensors,
  records,
};

const outDir = path.join(projectRoot, "data", "processed", "topis");
await mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "topis_traffic_2026-03.json");
await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Wrote ${records.length} records (${GANGNAM_SENSORS.size} sensors × 31 days × 24 h × 2 dirs)`);
console.log(`→ ${path.relative(projectRoot, outPath)}`);
console.log("\nSensor summary:");
for (const s of sensors) {
  console.log(`  ${s.sensor_id}  ${s.sensor_name}  avg ${s.avg_hourly} veh/h`);
}
