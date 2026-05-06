import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import readline from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_INPUT =
  "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv";
const DEFAULT_OUT =
  "data/processed/model_live_compatible/demand_pattern_cache_2023_2025.json";

function resolveFromRoot(maybePath) {
  if (!maybePath) return null;
  return path.isAbsolute(maybePath) ? maybePath : path.join(projectRoot, maybePath);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { input: DEFAULT_INPUT, out: DEFAULT_OUT };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--input" && next) {
      options.input = next;
      index += 1;
    } else if (arg === "--out" && next) {
      options.out = next;
      index += 1;
    }
  }

  return options;
}

function splitCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

function parseKstDatetime(value) {
  // Input format: "YYYY-MM-DD HH:mm:ss" (KST, naive).
  const [datePart, timePart] = String(value).trim().split(" ");
  const [year, month, day] = datePart.split("-").map((v) => Number(v));
  const [hour, minute, second] = timePart.split(":").map((v) => Number(v));
  const utcMs = Date.UTC(year, month - 1, day, hour - 9, minute, second);
  return new Date(utcMs);
}

function formatKstDatetime(date) {
  // The Date is stored as UTC = KST - 09:00.
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join("-") + ` ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function patternTypeFor(date, fallbackDayType) {
  const weekday = date.getUTCDay(); // 0=Sun..6=Sat
  if (weekday === 0 || weekday === 6) return "weekend";
  if (fallbackDayType === "주말") return "weekend";
  return "weekday";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function meanState() {
  return { sum: 0, count: 0 };
}

function addMean(state, value) {
  if (!Number.isFinite(value)) return;
  state.sum += value;
  state.count += 1;
}

function meanValue(state) {
  return state.count ? state.sum / state.count : null;
}

async function readCsvHeader(filePath) {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const first = await new Promise((resolve, reject) => {
    rl.once("line", (line) => resolve(line));
    rl.once("close", () => resolve(""));
    rl.once("error", reject);
  });
  rl.close();
  stream.destroy();

  const header = splitCsvLine(String(first ?? ""));
  return Object.fromEntries(header.map((name, idx) => [name, idx]));
}

async function buildInboundLookup(filePath, indexes) {
  const dtIndex = indexes.datetime_kst;
  const dongIndex = indexes.dong_name;
  const inboundIndex = indexes.inbound_boardings_per_1k_pop;

  if (dtIndex == null || dongIndex == null || inboundIndex == null) {
    throw new Error(
      `Missing required columns: datetime_kst/dong_name/inbound_boardings_per_1k_pop`,
    );
  }

  const lookup = new Map();
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line) continue;
    const fields = splitCsvLine(line);
    const dt = fields[dtIndex];
    const dong = fields[dongIndex];
    if (!dt || !dong) continue;
    const inbound = numberOrNull(fields[inboundIndex]);
    lookup.set(`${dong}|${dt}`, inbound);
  }
  return lookup;
}

const options = parseArgs();
const inputPath = resolveFromRoot(options.input);
const outPath = resolveFromRoot(options.out);

const headerIndex = await readCsvHeader(inputPath);
const dayTypeIndex = headerIndex.day_type;

const inboundLookup = await buildInboundLookup(inputPath, headerIndex);

const exact = new Map();
const fallback = new Map();
const dongSet = new Set();

const stream = createReadStream(inputPath, { encoding: "utf8" });
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
let isHeader = true;
for await (const line of rl) {
  if (isHeader) {
    isHeader = false;
    continue;
  }
  if (!line) continue;

  const fields = splitCsvLine(line);
  const dtText = fields[headerIndex.datetime_kst];
  const dong = fields[headerIndex.dong_name];
  if (!dtText || !dong) continue;

  const dt = parseKstDatetime(dtText);
  const next = new Date(dt.getTime() + 60 * 60 * 1000);
  const nextKey = `${dong}|${formatKstDatetime(next)}`;
  const target = inboundLookup.get(nextKey);
  if (target == null) continue;

  const month = dt.getUTCMonth() + 1;
  const hour = dt.getUTCHours();
  const patternType = patternTypeFor(dt, dayTypeIndex != null ? fields[dayTypeIndex] : null);

  dongSet.add(dong);

  const exactKey = `${dong}|${month}|${hour}|${patternType}`;
  const fallbackKey = `${dong}|${hour}|${patternType}`;

  const exactState = exact.get(exactKey) ?? {
    key: { dong_name: dong, month, hour, pattern_type: patternType },
    target_mean: meanState(),
  };
  addMean(exactState.target_mean, target);
  exact.set(exactKey, exactState);

  const fallbackState = fallback.get(fallbackKey) ?? {
    key: { dong_name: dong, hour, pattern_type: patternType },
    target_mean: meanState(),
  };
  addMean(fallbackState.target_mean, target);
  fallback.set(fallbackKey, fallbackState);
}

const patterns = [...exact.values()]
  .map((state) => ({
    ...state.key,
    mean_target_inbound_boardings_per_1k_pop_t_plus_1h: meanValue(state.target_mean),
    sample_count: state.target_mean.count,
  }))
  .filter((row) => row.sample_count > 0);

const fallbackPatterns = [...fallback.values()]
  .map((state) => ({
    ...state.key,
    mean_target_inbound_boardings_per_1k_pop_t_plus_1h: meanValue(state.target_mean),
    sample_count: state.target_mean.count,
  }))
  .filter((row) => row.sample_count > 0);

let sourceModelSummary = null;
try {
  sourceModelSummary = JSON.parse(await readFile(path.join(projectRoot, "public", "model-summary.json"), "utf8"));
} catch {
  // Optional.
}

const payload = {
  schema_version: 1,
  created_at: new Date().toISOString(),
  source_feature_csv: options.input,
  target: "inbound_boardings_per_1k_pop_t_plus_1h",
  horizon_hours: 1,
  group_keys: ["dong_name", "month", "hour", "pattern_type"],
  fallback_group_keys: ["dong_name", "hour", "pattern_type"],
  target_dongs: [...dongSet].sort(),
  patterns,
  fallback_patterns: fallbackPatterns,
  note:
    "Pattern cache computed from historical dong-hour feature rows (2023-01..2025-12). "
    + "Target is next-hour inbound_boardings_per_1k_pop (movement-demand proxy; not direct call volume).",
  provenance: sourceModelSummary
    ? {
        model_summary_generated_at: sourceModelSummary.generated_at ?? null,
        model_target: sourceModelSummary.prediction_target?.name ?? null,
      }
    : null,
};

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(projectRoot, outPath)}`);
