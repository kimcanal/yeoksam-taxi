import { mkdir, readFile, writeFile } from "node:fs/promises";
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

async function loadEnvFile(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] == null) process.env[key] = value;
    }
  } catch {
    // Optional local file.
  }
}

await loadEnvFile(path.join(projectRoot, ".env.local"));

const collectedAt = new Date();
const kst = kstParts(collectedAt);
const { base_date, base_time } = kmaBaseTime(collectedAt);
const apiKeyCandidates = [
  ["KMA_API_KEY", process.env.KMA_API_KEY],
  ["DATA_GO_KR_API", process.env.DATA_GO_KR_API],
  ["DATA_GO_KR_API_KEY", process.env.DATA_GO_KR_API_KEY],
  ["apihub_kma_go_kr_api", process.env.apihub_kma_go_kr_api],
]
  .filter(([, value]) => value)
  .filter((candidate, index, candidates) => (
    candidates.findIndex(([, value]) => value === candidate[1]) === index
  ));
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
let credentialSource = null;

if (apiKeyCandidates.length === 0) {
  error = "KMA API key is not configured. Expected KMA_API_KEY or DATA_GO_KR_API.";
} else {
  for (const [source, apiKey] of apiKeyCandidates) {
    const url =
      "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst" +
      `?serviceKey=${apiKey}&${params}`;
    const res = await fetch(url, { cache: "no-store" });
    status = res.status;
    credentialSource = source;
    if (res.ok) {
      ok = true;
      data = await res.json();
      error = null;
      break;
    }

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
    credential_source: credentialSource,
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
