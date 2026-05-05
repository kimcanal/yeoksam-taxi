import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);

const period = process.argv[2] ?? "2026-03";
if (!/^\d{4}-\d{2}$/.test(period)) {
  console.error("Usage: node scripts/collect-topis-dong-traffic.mjs YYYY-MM");
  process.exit(1);
}

const [year, month] = period.split("-");
const nearestKm = Number(process.env.TOPIS_NEAREST_KM ?? 2.2);
const rawDir = path.join(projectRoot, "data", "raw", "topis");
const xlsxPath = path.join(rawDir, `topis_traffic_${period}.xlsx`);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchTopisMonthlyMetadata() {
  const body = new URLSearchParams({
    blbdDivCd: "08",
    bdwrDivCd: year,
    mainBdwrRowNum: "12",
  });
  const res = await fetch("https://topis.seoul.go.kr/refroom/selectRefRoomListASC.do", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://topis.seoul.go.kr/refRoom/openRefRoom_2.do",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`TOPIS metadata request failed: ${res.status}`);
  }
  const json = await res.json();
  const row = (json.rows ?? []).find((item) => item.months === month);
  if (!row?.apndFileNm || !row?.apndFilePathNm || !row?.bdwrSeq) {
    throw new Error(`TOPIS ${period} monthly traffic file is not available yet.`);
  }
  return row;
}

async function downloadTopisWorkbook() {
  if (await exists(xlsxPath)) {
    console.log(`Using cached ${path.relative(projectRoot, xlsxPath)}`);
    return;
  }

  await mkdir(rawDir, { recursive: true });
  const meta = await fetchTopisMonthlyMetadata();
  const body = new URLSearchParams({
    apndFileNm: meta.apndFileNm,
    apndFilePathNm: meta.apndFilePathNm,
    bdwrSeq: String(meta.bdwrSeq),
    blbdDivCd: String(meta.blbdDivCd ?? "08"),
  });

  const res = await fetch("https://topis.seoul.go.kr/downloadFileRefRoom.do", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://topis.seoul.go.kr/refRoom/openRefRoom_2.do",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`TOPIS workbook download failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1024 || buffer.subarray(0, 2).toString() !== "PK") {
    throw new Error("TOPIS download did not return a valid XLSX workbook.");
  }

  await writeFile(xlsxPath, buffer);
  console.log(`Downloaded ${path.relative(projectRoot, xlsxPath)} (${buffer.length} bytes)`);
}

await downloadTopisWorkbook();

const processorPath = path.join(projectRoot, "scripts", "process_topis_dong_traffic.py");
const { stdout, stderr } = await execFileAsync(
  "python3",
  [
    processorPath,
    "--period",
    period,
    "--xlsx",
    xlsxPath,
    "--dongs",
    path.join(projectRoot, "public", "dongs.geojson"),
    "--out-dir",
    path.join(projectRoot, "data", "processed", "topis"),
    "--nearest-km",
    String(nearestKm),
  ],
  {
    cwd: projectRoot,
    maxBuffer: 10 * 1024 * 1024,
  },
);

if (stdout.trim()) {
  console.log(stdout.trim());
}
if (stderr.trim()) {
  console.error(stderr.trim());
}
