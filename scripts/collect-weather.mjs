import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const KMA_NX = 61;
const KMA_NY = 125;

function kstDate(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function kstParts(date = new Date()) {
  const kst = kstDate(date);
  return {
    date: [
      kst.getUTCFullYear(),
      pad(kst.getUTCMonth() + 1),
      pad(kst.getUTCDate()),
    ].join("-"),
    time: `${pad(kst.getUTCHours())}${pad(kst.getUTCMinutes())}`,
  };
}

function kmaBaseTime(date = new Date()) {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  let hour = kst.getUTCHours();

  if (kst.getUTCMinutes() < 10) {
    if (hour === 0) {
      const yesterday = new Date(kstMs - 24 * 60 * 60 * 1000);
      return {
        base_date: [
          yesterday.getUTCFullYear(),
          pad(yesterday.getUTCMonth() + 1),
          pad(yesterday.getUTCDate()),
        ].join(""),
        base_time: "2300",
      };
    }
    hour -= 1;
  }

  return {
    base_date: [
      kst.getUTCFullYear(),
      pad(kst.getUTCMonth() + 1),
      pad(kst.getUTCDate()),
    ].join(""),
    base_time: `${pad(hour)}00`,
  };
}

const collectedAt = new Date();
const kst = kstParts(collectedAt);
const { base_date, base_time } = kmaBaseTime(collectedAt);
const apiKey = process.env.KMA_API_KEY;
const params = new URLSearchParams({
  numOfRows: "20",
  pageNo: "1",
  dataType: "JSON",
  base_date,
  base_time,
  nx: String(KMA_NX),
  ny: String(KMA_NY),
});

let ok = false;
let status = null;
let data = null;
let error = null;

if (!apiKey) {
  error = "KMA_API_KEY is not configured";
} else {
  const url =
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst" +
    `?serviceKey=${apiKey}&${params}`;
  const res = await fetch(url, { cache: "no-store" });
  status = res.status;
  ok = res.ok;
  if (res.ok) {
    data = await res.json();
  } else {
    error = (await res.text()).slice(0, 500);
  }
}

const payload = {
  meta: {
    source: "KMA VilageFcstInfoService_2.0 getUltraSrtNcst",
    ok,
    status,
    error,
    collected_at: collectedAt.toISOString(),
    base_date,
    base_time,
    grid: { nx: KMA_NX, ny: KMA_NY },
  },
  data,
};

const outputDir = path.join(projectRoot, "data", "raw", "weather", kst.date);
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${kst.time}.json`);
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
if (!ok) {
  console.log(`KMA snapshot saved with warning: ${error ?? status}`);
}
