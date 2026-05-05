import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const rangeArg = process.argv[2] ?? "2023-01-01:2025-12-31";
const stationId = process.argv[3] ?? "108";
const stationName = stationId === "108" ? "서울" : stationId;
const [startDate, endDate] = rangeArg.split(":");

if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
  console.error("Usage: node scripts/collect-kma-asos-hourly.mjs YYYY-MM-DD:YYYY-MM-DD [stationId]");
  process.exit(1);
}

function loadEnvFile(filePath) {
  return readFile(filePath, "utf8")
    .then((text) => {
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const index = trimmed.indexOf("=");
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        if (key && process.env[key] == null) process.env[key] = value;
      }
    })
    .catch(() => {});
}

function ymd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function monthRanges(start, end) {
  const ranges = [];
  let cursor = new Date(`${start}T00:00:00Z`);
  const endTime = new Date(`${end}T00:00:00Z`);

  while (cursor <= endTime) {
    const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const monthEnd = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000);
    const rangeStart = cursor > monthStart ? cursor : monthStart;
    const rangeEnd = monthEnd < endTime ? monthEnd : endTime;
    ranges.push({ start: iso(rangeStart), end: iso(rangeEnd), period: iso(monthStart).slice(0, 7) });
    cursor = nextMonth;
  }
  return ranges;
}

function csvRow(values) {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
}

function selectedWeatherRow(item) {
  return {
    datetime_kst: item.tm ?? "",
    station_id: item.stnId ?? stationId,
    station_name: item.stnNm ?? stationName,
    temperature_c: item.ta ?? "",
    precipitation_mm: item.rn ?? "",
    wind_speed_ms: item.ws ?? "",
    wind_direction_deg: item.wd ?? "",
    humidity_pct: item.hm ?? "",
    local_pressure_hpa: item.pa ?? "",
    sea_level_pressure_hpa: item.ps ?? "",
    sunshine_hr: item.ss ?? "",
    solar_radiation_mj_m2: item.icsr ?? "",
    snow_depth_cm: item.dsnw ?? "",
    cloud_total_tenths: item.dc10Tca ?? "",
    visibility_10m: item.vs ?? "",
    ground_temperature_c: item.ts ?? "",
  };
}

async function fetchMonth({ start, end, period }) {
  const params = new URLSearchParams({
    serviceKey: process.env.KMA_API_KEY,
    pageNo: "1",
    numOfRows: "999",
    dataType: "JSON",
    dataCd: "ASOS",
    dateCd: "HR",
    startDt: ymd(new Date(`${start}T00:00:00Z`)),
    startHh: "00",
    endDt: ymd(new Date(`${end}T00:00:00Z`)),
    endHh: "23",
    stnIds: stationId,
  });

  const url = `http://apis.data.go.kr/1360000/AsosHourlyInfoService/getWthrDataList?${params}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`KMA ASOS ${period} HTTP ${res.status}: ${text.slice(0, 160)}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`KMA ASOS ${period} non-JSON response: ${text.slice(0, 160)}`);
  }

  const header = json.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(`KMA ASOS ${period}: ${header.resultCode} ${header.resultMsg ?? ""}`);
  }

  const body = json.response?.body ?? {};
  const items = body.items?.item ?? [];
  return {
    period,
    raw: json,
    totalCount: Number(body.totalCount ?? items.length),
    items: Array.isArray(items) ? items : [items],
  };
}

await loadEnvFile(path.join(projectRoot, ".env.local"));
process.env.KMA_API_KEY ??=
  process.env.DATA_GO_KR_API ??
  process.env.apihub_kma_go_kr_api;

const rawDir = path.join(projectRoot, "data", "raw", "weather", "asos");
const processedDir = path.join(projectRoot, "data", "processed", "weather");
await mkdir(rawDir, { recursive: true });
await mkdir(processedDir, { recursive: true });

const status = {
  source: "KMA ASOS hourly getWthrDataList",
  source_url: "https://www.data.go.kr/data/15057210/openapi.do",
  station_id: stationId,
  station_name: stationName,
  requested_range: { start_date: startDate, end_date: endDate },
  generated_at: new Date().toISOString(),
  ok: false,
  months: [],
  error: null,
};

try {
  if (!process.env.KMA_API_KEY) throw new Error("KMA_API_KEY is not configured.");

  const rows = [];
  for (const range of monthRanges(startDate, endDate)) {
    const result = await fetchMonth(range);
    const rawPath = path.join(rawDir, `seoul_asos_hourly_${result.period}.json`);
    await writeFile(
      rawPath,
      `${JSON.stringify(
        {
          meta: {
            source: "KMA ASOS hourly",
            station: `${stationId} ${stationName}`,
            start: `${range.start} 00:00`,
            end: `${range.end} 23:00`,
            totalCount: result.totalCount,
          },
          items: result.items,
        },
        null,
        2,
      )}\n`,
    );
    rows.push(...result.items.map(selectedWeatherRow));
    status.months.push({
      period: result.period,
      row_count: result.items.length,
      total_count: result.totalCount,
      raw_path: path.relative(projectRoot, rawPath),
    });
    console.log(`KMA ASOS ${result.period}: ${result.items.length} rows`);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  rows.sort((a, b) => a.datetime_kst.localeCompare(b.datetime_kst));
  const header = Object.keys(rows[0] ?? selectedWeatherRow({}));
  const csvPath = path.join(processedDir, `seoul_asos_hourly_${startDate}_${endDate}.csv`);
  await writeFile(
    csvPath,
    [csvRow(header), ...rows.map((row) => csvRow(header.map((key) => row[key])))].join("\n") + "\n",
  );
  status.ok = true;
  status.output_csv = path.relative(projectRoot, csvPath);
  status.row_count = rows.length;
  status.min_datetime_kst = rows[0]?.datetime_kst ?? null;
  status.max_datetime_kst = rows.at(-1)?.datetime_kst ?? null;
  console.log(`Wrote ${path.relative(projectRoot, csvPath)} (${rows.length} rows)`);
} catch (error) {
  status.error = error.message ?? String(error);
  console.error(status.error);
  process.exitCode = 1;
} finally {
  const statusPath = path.join(processedDir, `seoul_asos_hourly_${startDate}_${endDate}.status.json`);
  await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`);
  console.log(`Wrote ${path.relative(projectRoot, statusPath)}`);
}
