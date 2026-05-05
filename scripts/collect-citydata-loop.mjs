import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const POI_CODES = [
  "POI001",
  "POI014",
  "POI034",
  "POI037",
  "POI071",
  "POI042",
  "POI080",
];

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

function kstTimestamp(date = new Date()) {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  const year = kstDate.getUTCFullYear();
  const month = pad(kstDate.getUTCMonth() + 1);
  const day = pad(kstDate.getUTCDate());
  const hour = pad(kstDate.getUTCHours());
  const minute = pad(kstDate.getUTCMinutes());
  const second = pad(kstDate.getUTCSeconds());

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}-${minute}`,
    iso: `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`,
  };
}

async function fetchPoi(apiKey, code) {
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/citydata/1/5/${code}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return { code, ok: false, status: response.status, data: null };
  }

  return { code, ok: true, status: response.status, data: await response.json() };
}

await loadEnvFile(path.join(projectRoot, ".env.local"));

const apiKey = process.env.SEOUL_OPEN_API_KEY;
if (!apiKey) {
  console.error("SEOUL_OPEN_API_KEY is required");
  process.exit(1);
}

const collectedAt = new Date();
const kst = kstTimestamp(collectedAt);
const places = await Promise.all(POI_CODES.map((code) => fetchPoi(apiKey, code)));

const payload = {
  collected_at: kst.iso,
  source: "Seoul citydata OA-21285",
  poi_codes: POI_CODES,
  places,
};

const outputDir = path.join(projectRoot, "data", "raw", "citydata_history", kst.date);
await mkdir(outputDir, { recursive: true });

const outputPath = path.join(outputDir, `${kst.time}.json`);
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

const okCount = places.filter((place) => place.ok).length;
console.log(`Wrote ${path.relative(projectRoot, outputPath)} (${okCount}/${places.length} ok)`);
