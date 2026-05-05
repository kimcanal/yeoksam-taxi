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

function kstParts(date = new Date()) {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: [
      kstDate.getUTCFullYear(),
      pad(kstDate.getUTCMonth() + 1),
      pad(kstDate.getUTCDate()),
    ].join("-"),
    time: `${pad(kstDate.getUTCHours())}${pad(kstDate.getUTCMinutes())}`,
  };
}

async function fetchPoi(apiKey, code) {
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/citydata/1/5/${code}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return { code, ok: false, status: res.status };
  }
  const json = await res.json();
  return { code, ok: true, data: json };
}

await loadEnvFile(path.join(projectRoot, ".env.local"));

const apiKey = process.env.SEOUL_OPEN_API_KEY;
if (!apiKey) {
  console.error("SEOUL_OPEN_API_KEY is required");
  process.exit(1);
}

const collectedAt = new Date();
const kst = kstParts(collectedAt);
const results = await Promise.all(POI_CODES.map((code) => fetchPoi(apiKey, code)));
const payload = {
  meta: {
    source: "Seoul citydata OA-21285",
    collected_at: collectedAt.toISOString(),
    poi_codes: POI_CODES,
  },
  results,
};

const outputDir = path.join(projectRoot, "data", "raw", "citydata", kst.date);
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${kst.time}.json`);
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
