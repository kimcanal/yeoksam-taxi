import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);

const rangeArg = process.argv[2] ?? "2023-01:2025-12";
const [startPeriod, endPeriod] = rangeArg.split(":");
if (!/^\d{4}-\d{2}$/.test(startPeriod) || !/^\d{4}-\d{2}$/.test(endPeriod)) {
  console.error("Usage: node scripts/collect-seoul-transit-od.mjs YYYY-MM:YYYY-MM");
  process.exit(1);
}

const keepRaw = process.argv.includes("--keep-raw") || process.env.KEEP_RAW_OD === "1";
const rawDir = path.join(projectRoot, "data", "raw", "transit_od");
const outDir = path.join(projectRoot, "data", "processed", "transit_od");

function periodsBetween(start, end) {
  const periods = [];
  const [startYear] = start.split("-").map(Number);
  const [endYear] = end.split("-").map(Number);
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const period = `${year}-${String(month).padStart(2, "0")}`;
      if (period >= start && period <= end) periods.push(period);
    }
  }
  return periods;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchFileIndex() {
  const res = await fetch("https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do");
  if (!res.ok) throw new Error(`OA-21226 file page failed: ${res.status}`);
  const html = await res.text();
  const files = new Map();
  const pattern =
    /title="(tpss_emd_odh_(\d{6})\.zip)"\s+onclick="javascript:downloadFile\('([^']+)'\);?"/g;
  for (const match of html.matchAll(pattern)) {
    const [, filename, yyyymm, seq] = match;
    files.set(`${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}`, { filename, seq });
  }
  return files;
}

async function downloadZip(period, meta) {
  await mkdir(rawDir, { recursive: true });
  const zipPath = path.join(rawDir, meta.filename);
  if (await exists(zipPath)) {
    console.log(`${period}: using cached ${path.relative(projectRoot, zipPath)}`);
    return zipPath;
  }

  const body = new URLSearchParams({
    infId: "OA-21226",
    seq: meta.seq,
    infSeq: "1",
  });
  const res = await fetch("https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?&useCache=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do",
    },
    body,
  });
  if (!res.ok) throw new Error(`${period}: download failed ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1024 || buffer.subarray(0, 2).toString() !== "PK") {
    throw new Error(`${period}: download did not return a valid ZIP`);
  }
  await writeFile(zipPath, buffer);
  console.log(`${period}: downloaded ${meta.filename} (${Math.round(buffer.length / 1024 / 1024)} MB)`);
  return zipPath;
}

async function processZip(period, zipPath) {
  const processor = path.join(projectRoot, "scripts", "process_seoul_transit_od_zip.py");
  const { stdout, stderr } = await execFileAsync(
    "python3",
    [
      processor,
      "--period",
      period,
      "--zip",
      zipPath,
      "--out-dir",
      outDir,
    ],
    {
      cwd: projectRoot,
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
}

await mkdir(outDir, { recursive: true });
const index = await fetchFileIndex();
const periods = periodsBetween(startPeriod, endPeriod);
const status = {
  source: "서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보 OA-21226",
  source_url: "https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do",
  range: { start: startPeriod, end: endPeriod },
  generated_at: new Date().toISOString(),
  keep_raw: keepRaw,
  months: [],
};

for (const period of periods) {
  const meta = index.get(period);
  if (!meta) {
    console.log(`${period}: no file listed`);
    status.months.push({ period, ok: false, error: "not listed" });
    continue;
  }

  try {
    const zipPath = await downloadZip(period, meta);
    await processZip(period, zipPath);
    if (!keepRaw) await rm(zipPath, { force: true });
    status.months.push({ period, ok: true, filename: meta.filename, raw_kept: keepRaw });
  } catch (error) {
    console.error(`${period}: ${error.message ?? error}`);
    status.months.push({ period, ok: false, filename: meta.filename, error: error.message ?? String(error) });
  }
}

const statusPath = path.join(outDir, `seoul_transit_od_collection_${startPeriod}_${endPeriod}.status.json`);
await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`);
console.log(`Wrote ${path.relative(projectRoot, statusPath)}`);
