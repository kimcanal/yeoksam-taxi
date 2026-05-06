import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_PATTERN_CACHE =
  "data/processed/model_live_compatible/pattern_cache.json";
const FALLBACK_PATTERN_CACHE =
  "data/processed/model_live_compatible/demand_pattern_cache_2023_2025.json";
const DEFAULT_HOLIDAYS = "data/processed/calendar/korean_public_holidays_2023_2026.csv";
const DEFAULT_OUT = "public/forecast/latest.json";

const TARGET_DONGS = [
  "논현1동",
  "논현2동",
  "대치4동",
  "삼성1동",
  "삼성2동",
  "신사동",
  "역삼1동",
  "역삼2동",
  "청담동",
];

function resolveFromRoot(maybePath) {
  if (!maybePath) return null;
  return path.isAbsolute(maybePath) ? maybePath : path.join(projectRoot, maybePath);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function kstDate(date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

function nowKstIso() {
  const kst = kstDate(new Date());
  return [
    kst.getUTCFullYear(),
    pad(kst.getUTCMonth() + 1),
    pad(kst.getUTCDate()),
  ].join("-") + `T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())}+09:00`;
}

function parseKstHour(value) {
  // Accept "YYYY-MM-DD HH:00" or ISO with timezone.
  const text = String(value).trim();
  if (text.includes("T")) {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid datetime: ${value}`);
    const kst = kstDate(date);
    kst.setUTCMinutes(0, 0, 0);
    const utcMs = kst.getTime() - 9 * 60 * 60 * 1000;
    return new Date(utcMs);
  }
  const [datePart, timePart] = text.split(" ");
  const [year, month, day] = datePart.split("-").map((v) => Number(v));
  const [hour] = timePart.split(":").map((v) => Number(v));
  const utcMs = Date.UTC(year, month - 1, day, hour - 9, 0, 0);
  return new Date(utcMs);
}

function weekdayLabel(date) {
  const weekday = kstDate(date).getUTCDay(); // 0=Sun..6=Sat
  return ["일", "월", "화", "수", "목", "금", "토"][weekday];
}

function dayTypeLabel(date) {
  const weekday = kstDate(date).getUTCDay();
  return weekday === 0 || weekday === 6 ? "주말" : "평일";
}

function patternTypeFor(date) {
  const weekday = kstDate(date).getUTCDay();
  return weekday === 0 || weekday === 6 ? "weekend" : "weekday";
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  return { header, rows: lines.slice(1).map((line) => line.split(",")) };
}

function loadHolidayContext(csvText) {
  const { header, rows } = parseCsv(csvText);
  const dateIndex = header.indexOf("date");
  const isHolidayIndex = header.indexOf("is_holiday");
  const nameIndex = header.indexOf("date_name");

  const map = new Map();
  for (const row of rows) {
    const date = row[dateIndex];
    if (!date) continue;
    const entry = map.get(date) ?? { is_holiday: "N", holiday_names: [] };
    const isHoliday = String(row[isHolidayIndex] ?? "").trim() === "Y";
    const name = String(row[nameIndex] ?? "").trim();
    if (isHoliday) entry.is_holiday = "Y";
    if (name) entry.holiday_names.push(name);
    map.set(date, entry);
  }

  return (date) => {
    const entry = map.get(date);
    if (!entry) return { is_holiday: "N", holiday_names: "" };
    const names = [...new Set(entry.holiday_names)].join("|");
    return { is_holiday: entry.is_holiday, holiday_names: names };
  };
}

function normalizeScores(values) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0.5);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (Object.is(min, max)) return values.map(() => 0.5);
  return values.map((v) => (Number.isFinite(v) ? (v - min) / (max - min) : 0.5));
}

function weatherFromSnapshot(snapshot) {
  const items = snapshot?.data?.response?.body?.items?.item;
  if (!Array.isArray(items)) return { label: "clear", overrides: {} };
  const byCategory = Object.fromEntries(items.map((item) => [item.category, item.obsrValue]));
  const pty = Number(byCategory.PTY);
  const rn1 = Number(byCategory.RN1);
  const temp = Number(byCategory.T1H);
  const humidity = Number(byCategory.REH);
  const wind = Number(byCategory.WSD);

  const overrides = {
    temperature_c: Number.isFinite(temp) ? temp : null,
    precipitation_mm: Number.isFinite(rn1) ? rn1 : null,
    precipitation_type: Number.isFinite(pty) ? pty : null,
    humidity_pct: Number.isFinite(humidity) ? humidity : null,
    wind_speed_ms: Number.isFinite(wind) ? wind : null,
  };

  const label = pty === 3 || pty === 7 ? "snow" : pty === 1 || pty === 2 || pty === 5 || pty === 6
    ? "rain"
    : (Number.isFinite(rn1) && rn1 > 0 ? "rain" : "clear");
  return { label, overrides };
}

function makeLookup(cache, keyFields, listField) {
  const lookup = new Map();
  for (const row of cache?.[listField] ?? []) {
    const key = keyFields.map((field) => row[field]).join("|");
    lookup.set(key, row);
  }
  return lookup;
}

function lookupPattern(exactLookup, fallbackLookup, { dongName, month, hour, patternType }) {
  const exactKey = `${dongName}|${month}|${hour}|${patternType}`;
  const fallbackKey = `${dongName}|${hour}|${patternType}`;
  const weekdayFallbackKey = `${dongName}|${hour}|weekday`;
  return (
    exactLookup.get(exactKey)
    || fallbackLookup.get(fallbackKey)
    || fallbackLookup.get(weekdayFallbackKey)
    || null
  );
}

function clippedRatio(value, denominator) {
  const number = Number(value);
  if (!Number.isFinite(number) || denominator <= 0) return 0;
  return Math.max(0, Math.min(number / denominator, 1));
}

function heuristicDemandProxy(patternRow, latestRow, weather) {
  const row = { ...(latestRow ?? {}), ...(patternRow ?? {}) };
  const transitScore =
    clippedRatio(row.transit_importance_sum, 130) * 0.28 +
    clippedRatio(row.subway_station_count, 16) * 0.18 +
    clippedRatio(row.bus_stop_count, 35) * 0.08;
  const densityScore =
    clippedRatio(Math.log1p(Number(row.estimated_floor_area_m2 ?? 0)), Math.log1p(1_500_000)) * 0.18 +
    clippedRatio(row.commercial_building_count, 30) * 0.08 +
    clippedRatio(row.hotel_building_count, 5) * 0.04 +
    clippedRatio(row.avg_building_height_m, 45) * 0.06;
  const roadScore =
    clippedRatio(row.arterial_road_length_m, 9000) * 0.04 +
    clippedRatio(row.connector_road_length_m, 5000) * 0.02;
  const weatherBoost =
    weather.label === "rain" ? 0.04 :
    weather.label === "snow" ? 0.06 :
    0;
  const pressure = Math.max(0, Math.min(transitScore + densityScore + roadScore + weatherBoost, 1));

  return 8 + pressure * 62;
}

function demandValueFromPattern(patternRow, latestRow, weather) {
  const targetMean = Number(patternRow?.mean_target_inbound_boardings_per_1k_pop_t_plus_1h);
  if (Number.isFinite(targetMean)) {
    return { value: targetMean, source: "target_pattern_mean" };
  }

  const modelMean = Number(patternRow?.mean_model_prediction);
  if (Number.isFinite(modelMean)) {
    return { value: modelMean, source: "model_prediction_pattern_mean" };
  }

  return {
    value: heuristicDemandProxy(patternRow, latestRow, weather),
    source: "feature_pattern_heuristic",
  };
}

function defaultTargetHour() {
  const now = new Date();
  const kst = kstDate(now);
  kst.setUTCMinutes(0, 0, 0);
  const targetKstAsUtc = new Date(kst.getTime() + 60 * 60 * 1000);
  const targetUtc = new Date(targetKstAsUtc.getTime() - 9 * 60 * 60 * 1000);
  return targetUtc;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const targetArg = args.find((arg) => !arg.startsWith("--"));
  const options = {
    targetDatetime: targetArg ?? null,
    patternCache: DEFAULT_PATTERN_CACHE,
    holidays: DEFAULT_HOLIDAYS,
    weatherSnapshot: null,
    out: DEFAULT_OUT,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--pattern-cache" && next) {
      options.patternCache = next;
      index += 1;
    } else if (arg === "--holidays" && next) {
      options.holidays = next;
      index += 1;
    } else if (arg === "--weather-snapshot" && next) {
      options.weatherSnapshot = next;
      index += 1;
    } else if (arg === "--out" && next) {
      options.out = next;
      index += 1;
    }
  }

  return options;
}

const options = parseArgs();
const targetUtc = options.targetDatetime ? parseKstHour(options.targetDatetime) : defaultTargetHour();
const featureUtc = new Date(targetUtc.getTime() - 60 * 60 * 1000);

let cache = null;
let resolvedPatternCache = options.patternCache;
try {
  cache = JSON.parse(await readFile(resolveFromRoot(options.patternCache), "utf8"));
} catch (error) {
  if (options.patternCache === DEFAULT_PATTERN_CACHE) {
    resolvedPatternCache = FALLBACK_PATTERN_CACHE;
    cache = JSON.parse(await readFile(resolveFromRoot(FALLBACK_PATTERN_CACHE), "utf8"));
  } else {
    throw error;
  }
}
const exactLookup = makeLookup(cache, cache.group_keys ?? [], "patterns");
const fallbackLookup = makeLookup(cache, cache.fallback_group_keys ?? [], "fallback_patterns");

const holidayCsv = await readFile(resolveFromRoot(options.holidays), "utf8");
const holidayContext = loadHolidayContext(holidayCsv);
const targetKst = kstDate(targetUtc);
const targetDateStr = [
  targetKst.getUTCFullYear(),
  pad(targetKst.getUTCMonth() + 1),
  pad(targetKst.getUTCDate()),
].join("-");
const holiday = holidayContext(targetDateStr);

const weatherSnapshot = options.weatherSnapshot
  ? JSON.parse(await readFile(resolveFromRoot(options.weatherSnapshot), "utf8"))
  : null;
const weather = weatherFromSnapshot(weatherSnapshot);

const featureMonth = kstDate(featureUtc).getUTCMonth() + 1;
const featureHour = kstDate(featureUtc).getUTCHours();
const patternType = patternTypeFor(featureUtc);

const rawPredictions = [];
const rawPredictionSources = new Set();
const regionRows = TARGET_DONGS.map((dongName) => {
  const row = lookupPattern(exactLookup, fallbackLookup, {
    dongName,
    month: featureMonth,
    hour: featureHour,
    patternType,
  });
  const latestRow = cache.latest_by_dong?.[dongName] ?? null;
  const raw = demandValueFromPattern(row, latestRow, weather);
  rawPredictionSources.add(raw.source);
  rawPredictions.push(Number(raw.value));
  return { dong_name: dongName, raw_prediction: raw.value, raw_prediction_source: raw.source };
});

const scores = normalizeScores(rawPredictions);
const regions = regionRows
  .map((row, index) => ({
    dong_name: row.dong_name,
    score: Number(scores[index].toFixed(4)),
    confidence: 0.55,
    raw_prediction: row.raw_prediction == null ? null : Number(row.raw_prediction.toFixed(6)),
    raw_prediction_source: row.raw_prediction_source,
  }))
  .sort((left, right) => right.score - left.score);

const payload = {
  source: "pattern_baseline",
  pattern_cache_source: resolvedPatternCache,
  target_datetime: [
    targetKst.getUTCFullYear(),
    pad(targetKst.getUTCMonth() + 1),
    pad(targetKst.getUTCDate()),
  ].join("-") + `T${pad(targetKst.getUTCHours())}:00:00+09:00`,
  feature_datetime: [
    kstDate(featureUtc).getUTCFullYear(),
    pad(kstDate(featureUtc).getUTCMonth() + 1),
    pad(kstDate(featureUtc).getUTCDate()),
  ].join("-") + `T${pad(kstDate(featureUtc).getUTCHours())}:00:00+09:00`,
  strategy: "pattern",
  pattern_cache_used: true,
  feature_set: "pattern_mean_from_historical_proxy_targets",
  model_feature_set: "node_only_fallback",
  weather_override_applied: Boolean(options.weatherSnapshot),
  calendar: {
    weekday: weekdayLabel(targetUtc),
    day_type: dayTypeLabel(targetUtc),
    is_holiday: holiday.is_holiday,
    holiday_names: holiday.holiday_names,
  },
  weather: weather.label,
  generated_at: nowKstIso(),
  model_target: "target_inbound_boardings_per_1k_pop_t_plus_1h",
  raw_prediction_unit: "inbound_boardings_per_1k_pop (t+1h)",
  raw_prediction_sources: [...rawPredictionSources],
  proxy_source:
    "Seoul transit OD-derived movement demand proxy (normalized by living population).",
  regions,
  note:
    "JS-only fallback forecast built from historical same-hour pattern means (public transit movement proxy). "
    + "Not a direct call-volume model.",
};

const outputPath = resolveFromRoot(options.out);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${options.out}`);
