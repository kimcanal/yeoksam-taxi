#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const rawDir = path.join(projectRoot, "data", "seoul-raw");
const outputDir = path.join(projectRoot, "data", "processed", "seoul-dong-hour");

const TARGET_DONGS = {
  "11230510": "신사동",
  "11230520": "논현1동",
  "11230530": "논현2동",
  "11230580": "삼성1동",
  "11230590": "삼성2동",
  "11230630": "대치4동",
  "11230640": "역삼1동",
  "11230650": "역삼2동",
  "11230770": "압구정동",
  "11230780": "청담동",
};

const TARGET_DONG_NAMES = Object.fromEntries(
  Object.entries(TARGET_DONGS).map(([code, name]) => [name, code]),
);

const ADMIN_DONG_TO_TARGET = {
  "11680510": "11230510",
  "11680521": "11230520",
  "11680531": "11230530",
  "11680545": "11230770",
  "11680565": "11230780",
  "11680580": "11230580",
  "11680590": "11230590",
  "11680600": "11230630",
  "11680640": "11230640",
  "11680650": "11230650",
};

const SOURCE_KEYS = {
  living: "living-pop-dong",
  inner: "inner-moving-pop-dong",
  hourlyOd: "transit-od-hourly-dong",
  modeOd: "transit-od-mode-dong",
  purposeOd: "transit-od-purpose-dong",
  subwayTime: "subway-time-station",
};

const SUBWAY_STATION_TO_TARGET_DONG = {
  강남: "11230640",
  신사: "11230510",
  역삼: "11230650",
  선릉: "11230580",
  삼성: "11230580",
  신논현: "11230520",
  논현: "11230530",
  학동: "11230530",
  청담: "11230780",
  압구정: "11230770",
  압구정로데오: "11230770",
  봉은사: "11230580",
  선정릉: "11230590",
  언주: "11230640",
  매봉: "11230630",
  한티: "11230630",
  대치: "11230630",
  강남구청: "11230530",
};

function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized === "*") {
    return null;
  }

  const parsed = Number(normalized.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseHour(value) {
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCode(value) {
  return String(value ?? "").trim();
}

function isDateString(value) {
  return /^\d{8}$/u.test(String(value ?? "").trim());
}

function makeRowKey(date, hour, dongCode) {
  return `${date}|${String(hour).padStart(2, "0")}|${dongCode}`;
}

function makeDayKey(date, dongCode) {
  return `${date}|${dongCode}`;
}

function daysInMonth(yyyymm) {
  const year = Number.parseInt(yyyymm.slice(0, 4), 10);
  const month = Number.parseInt(yyyymm.slice(4, 6), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return 30;
  }

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

async function readLatestMeta(sourceKey) {
  const metaPath = path.join(rawDir, sourceKey, "latest.json");
  const meta = JSON.parse(await readFile(metaPath, "utf8"));
  return {
    ...meta,
    zip_path: path.join(rawDir, sourceKey, meta.file_name),
  };
}

function ensureRow(rowMap, date, hour, dongCode) {
  const key = makeRowKey(date, hour, dongCode);

  if (!rowMap.has(key)) {
    rowMap.set(key, {
      timestamp_kst: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${String(hour).padStart(2, "0")}:00:00`,
      service_date: date,
      service_hour: hour,
      dong_code: dongCode,
      dong_name: TARGET_DONGS[dongCode],
      gu_name: "강남구",
      living_population: null,
      inner_moving_population: null,
      transit_inbound_hourly: null,
      transit_outbound_hourly: null,
      transit_inbound_daily_mode_total: null,
      transit_outbound_daily_mode_total: null,
      transit_inbound_daily_subway_total: null,
      transit_outbound_daily_subway_total: null,
      transit_inbound_daily_bus_total: null,
      transit_outbound_daily_bus_total: null,
      transit_inbound_daily_purpose_total: null,
      transit_outbound_daily_purpose_total: null,
      subway_station_get_on_daily_avg: null,
      subway_station_get_off_daily_avg: null,
      subway_station_total_daily_avg: null,
      subway_station_names: null,
    });
  }

  return rowMap.get(key);
}

function addNullable(target, key, value) {
  if (value === null) {
    return;
  }

  target[key] = (target[key] ?? 0) + value;
}

function appendPipeUnique(value, nextValue) {
  const values = new Set(
    String(value ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  values.add(nextValue);
  return Array.from(values).join("|");
}

async function unzipCsvRecords(zipPath, recordFilter = () => true, encoding = "euc-kr") {
  const records = [];
  let decoder = new TextDecoder(encoding);
  let header = null;
  let bufferedText = "";
  let stderr = "";
  let firstChunk = true;

  function processLine(rawLine) {
    const line = rawLine.replace(/^\uFEFF/u, "").replace(/\r$/u, "");
    if (!line) {
      return;
    }

    const cells = splitCsvLine(line);
    if (!header) {
      header = cells;
      return;
    }

    const isRepeatedHeader = cells.length === header.length && cells.every((cell, index) => cell === header[index]);
    if (isRepeatedHeader) {
      return;
    }

    const record = Object.fromEntries(header.map((column, index) => [column, cells[index] ?? ""]));
    if (recordFilter(record)) {
      records.push(record);
    }
  }

  await new Promise((resolve, reject) => {
    const child = spawn("unzip", ["-p", zipPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      if (firstChunk) {
        firstChunk = false;
        if (chunk.length >= 3 && chunk[0] === 0xef && chunk[1] === 0xbb && chunk[2] === 0xbf) {
          decoder = new TextDecoder("utf-8");
        }
      }
      bufferedText += decoder.decode(chunk, { stream: true });

      let newlineIndex = bufferedText.indexOf("\n");
      while (newlineIndex !== -1) {
        processLine(bufferedText.slice(0, newlineIndex));
        bufferedText = bufferedText.slice(newlineIndex + 1);
        newlineIndex = bufferedText.indexOf("\n");
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      bufferedText += decoder.decode();
      if (bufferedText) {
        processLine(bufferedText);
      }

      if (code !== 0) {
        reject(new Error(`unzip failed for ${zipPath}: ${stderr.trim() || `exit ${code}`}`));
        return;
      }

      resolve();
    });
  });

  return records;
}

function isLivingRecordInTarget(record) {
  return Boolean(ADMIN_DONG_TO_TARGET[normalizeCode(record["행정동코드"])]);
}

function isInnerRecordInTarget(record) {
  return Boolean(ADMIN_DONG_TO_TARGET[normalizeCode(record["행정동코드"])]);
}

function isHourlyOdRecordInTarget(record) {
  return normalizeCode(record["시작_행정동_ID"]) in TARGET_DONGS || normalizeCode(record["종료_행정동_ID"]) in TARGET_DONGS;
}

function isModeOdRecordInTarget(record) {
  return normalizeCode(record["시작_행정동_ID"]) in TARGET_DONGS || normalizeCode(record["종료_행정동_ID"]) in TARGET_DONGS;
}

function isPurposeOdRecordInTarget(record) {
  return (
    normalizeCode(record["시작_행정동_명칭"]) in TARGET_DONG_NAMES ||
    normalizeCode(record["종료_행정동_명칭"]) in TARGET_DONG_NAMES
  );
}

async function loadSourceRecords(sourceKey, recordFilter, options = {}) {
  const sourceDir = path.join(rawDir, sourceKey);
  const allFiles = await readdir(sourceDir);
  const zipFiles = allFiles.filter((f) => f.endsWith(".zip")).sort();

  if (zipFiles.length === 0) {
    throw new Error(`No zip files found in ${sourceDir}`);
  }

  const allRecords = [];
  for (const zipFile of zipFiles) {
    const zipPath = path.join(sourceDir, zipFile);
    const records = await unzipCsvRecords(zipPath, recordFilter, options.encoding);
    for (const record of records) allRecords.push(record);
  }

  const meta = await readLatestMeta(sourceKey).catch(() => ({
    file_name: zipFiles.join("+"),
    page_url: "",
  }));

  return { meta: { ...meta, file_name: zipFiles.join("+") }, records: allRecords };
}

async function loadJsonSourceRecords(sourceKey) {
  const sourceDir = path.join(rawDir, sourceKey);
  const allFiles = await readdir(sourceDir);
  const jsonFiles = allFiles.filter((f) => f.endsWith(".json") && f !== "latest.json").sort();

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON files found in ${sourceDir}`);
  }

  const allRecords = [];
  let lastPayload = null;
  for (const jsonFile of jsonFiles) {
    const payload = JSON.parse(await readFile(path.join(sourceDir, jsonFile), "utf8"));
    for (const row of payload.rows ?? []) allRecords.push(row);
    lastPayload = payload;
  }

  const meta = await readLatestMeta(sourceKey).catch(() => ({
    file_name: jsonFiles.join("+"),
    page_url: "",
    month: null,
  }));

  return {
    meta: { ...meta, file_name: jsonFiles.join("+") },
    records: allRecords,
    payload: lastPayload,
  };
}

function buildRowsBySource(sourcePayloads) {
  const rowMap = new Map();
  const coverage = {
    living_dates: new Set(),
    inner_dates: new Set(),
    hourly_od_dates: new Set(),
    mode_od_dates: new Set(),
    purpose_od_dates: new Set(),
    subway_time_months: new Set(),
  };
  const dailyModeMap = new Map();
  const dailyPurposeMap = new Map();

  for (const record of sourcePayloads.living.records) {
    const rawDongCode = normalizeCode(record["행정동코드"]);
    const dongCode = ADMIN_DONG_TO_TARGET[rawDongCode] ?? null;
    if (!dongCode) {
      continue;
    }

    const date = normalizeCode(record["기준일ID"]);
    const hour = parseHour(record["시간대구분"]);
    if (!isDateString(date) || hour === null) {
      continue;
    }

    const row = ensureRow(rowMap, date, hour, dongCode);
    row.living_population = parseNumber(record["총생활인구수"]);
    coverage.living_dates.add(date);
  }

  for (const record of sourcePayloads.inner.records) {
    const rawDongCode = normalizeCode(record["행정동코드"]);
    const dongCode = ADMIN_DONG_TO_TARGET[rawDongCode] ?? null;
    if (!dongCode) {
      continue;
    }

    const date = normalizeCode(record["일자"]);
    const hour = parseHour(record["시각"]);
    if (!isDateString(date) || hour === null) {
      continue;
    }

    const row = ensureRow(rowMap, date, hour, dongCode);
    addNullable(row, "inner_moving_population", parseNumber(record["생활인구합계"]));
    coverage.inner_dates.add(date);
  }

  for (const record of sourcePayloads.hourlyOd.records) {
    const date = normalizeCode(record["기준_날짜"]);
    const startCode = normalizeCode(record["시작_행정동_ID"]);
    const endCode = normalizeCode(record["종료_행정동_ID"]);
    if (!isDateString(date)) {
      continue;
    }

    for (let hour = 0; hour < 24; hour += 1) {
      const value = parseNumber(record[`승객_수_${String(hour).padStart(2, "0")}`]);
      if (value === null) {
        continue;
      }

      if (startCode in TARGET_DONGS) {
        const row = ensureRow(rowMap, date, hour, startCode);
        addNullable(row, "transit_outbound_hourly", value);
      }

      if (endCode in TARGET_DONGS) {
        const row = ensureRow(rowMap, date, hour, endCode);
        addNullable(row, "transit_inbound_hourly", value);
      }
    }

    coverage.hourly_od_dates.add(date);
  }

  for (const record of sourcePayloads.modeOd.records) {
    const date = normalizeCode(record["기준_날짜"]);
    const startCode = normalizeCode(record["시작_행정동_ID"]);
    const endCode = normalizeCode(record["종료_행정동_ID"]);
    if (!isDateString(date)) {
      continue;
    }

    if (startCode in TARGET_DONGS) {
      const key = makeDayKey(date, startCode);
      const entry = dailyModeMap.get(key) ?? {};
      addNullable(entry, "transit_outbound_daily_mode_total", parseNumber(record["전체_승객_수 (명)"]));
      addNullable(entry, "transit_outbound_daily_subway_total", parseNumber(record["지하철_승객_수 (명)"]));
      addNullable(entry, "transit_outbound_daily_bus_total", parseNumber(record["버스_승객_수 (명)"]));
      dailyModeMap.set(key, entry);
    }

    if (endCode in TARGET_DONGS) {
      const key = makeDayKey(date, endCode);
      const entry = dailyModeMap.get(key) ?? {};
      addNullable(entry, "transit_inbound_daily_mode_total", parseNumber(record["전체_승객_수 (명)"]));
      addNullable(entry, "transit_inbound_daily_subway_total", parseNumber(record["지하철_승객_수 (명)"]));
      addNullable(entry, "transit_inbound_daily_bus_total", parseNumber(record["버스_승객_수 (명)"]));
      dailyModeMap.set(key, entry);
    }

    coverage.mode_od_dates.add(date);
  }

  for (const record of sourcePayloads.purposeOd.records) {
    const date = normalizeCode(record["기준_날짜"]);
    const startName = normalizeCode(record["시작_행정동_명칭"]);
    const endName = normalizeCode(record["종료_행정동_명칭"]);
    const startCode = TARGET_DONG_NAMES[startName] ?? null;
    const endCode = TARGET_DONG_NAMES[endName] ?? null;
    if (!isDateString(date)) {
      continue;
    }

    if (startCode) {
      const key = makeDayKey(date, startCode);
      const entry = dailyPurposeMap.get(key) ?? {};
      addNullable(entry, "transit_outbound_daily_purpose_total", parseNumber(record["전체_승객_수"]));
      dailyPurposeMap.set(key, entry);
    }

    if (endCode) {
      const key = makeDayKey(date, endCode);
      const entry = dailyPurposeMap.get(key) ?? {};
      addNullable(entry, "transit_inbound_daily_purpose_total", parseNumber(record["전체_승객_수"]));
      dailyPurposeMap.set(key, entry);
    }

    coverage.purpose_od_dates.add(date);
  }

  if (sourcePayloads.subwayTime) {
    for (const record of sourcePayloads.subwayTime.records) {
      const stationName = normalizeCode(record["STTN"]);
      const dongCode = SUBWAY_STATION_TO_TARGET_DONG[stationName] ?? null;
      const month = normalizeCode(record["USE_MM"]);
      if (!dongCode || !/^\d{6}$/u.test(month)) {
        continue;
      }

      const dayCount = daysInMonth(month);
      const datePrefix = month;
      for (const row of rowMap.values()) {
        if (row.dong_code !== dongCode || !row.service_date.startsWith(datePrefix)) {
          continue;
        }

        const hour = Number(row.service_hour);
        const getOn = parseNumber(record[`HR_${hour}_GET_ON_NOPE`]);
        const getOff = parseNumber(record[`HR_${hour}_GET_OFF_NOPE`]);
        addNullable(row, "subway_station_get_on_daily_avg", getOn === null ? null : getOn / dayCount);
        addNullable(row, "subway_station_get_off_daily_avg", getOff === null ? null : getOff / dayCount);
        row.subway_station_names = appendPipeUnique(row.subway_station_names, stationName);
      }

      coverage.subway_time_months.add(month);
    }
  }

  const dayDongKeys = new Set([...dailyModeMap.keys(), ...dailyPurposeMap.keys()]);
  for (const key of dayDongKeys) {
    const [date, dongCode] = key.split("|");
    for (let hour = 0; hour < 24; hour += 1) {
      ensureRow(rowMap, date, hour, dongCode);
    }
  }

  for (const row of rowMap.values()) {
    const dayKey = makeDayKey(row.service_date, row.dong_code);
    const modeEntry = dailyModeMap.get(dayKey);
    const purposeEntry = dailyPurposeMap.get(dayKey);

    if (modeEntry) {
      Object.assign(row, modeEntry);
    }

    if (purposeEntry) {
      Object.assign(row, purposeEntry);
    }

    if (coverage.hourly_od_dates.has(row.service_date)) {
      row.transit_inbound_hourly ??= 0;
      row.transit_outbound_hourly ??= 0;
    }

    const subwayGetOn = row.subway_station_get_on_daily_avg ?? null;
    const subwayGetOff = row.subway_station_get_off_daily_avg ?? null;
    row.subway_station_total_daily_avg =
      subwayGetOn === null && subwayGetOff === null
        ? null
        : (subwayGetOn ?? 0) + (subwayGetOff ?? 0);
  }

  return {
    rows: Array.from(rowMap.values()).sort(
      (left, right) =>
        left.service_date.localeCompare(right.service_date) ||
        left.service_hour - right.service_hour ||
        left.dong_code.localeCompare(right.dong_code),
    ),
    coverage: Object.fromEntries(
      Object.entries(coverage).map(([key, value]) => [key, Array.from(value).sort()]),
    ),
  };
}

function toCsv(rows) {
  if (rows.length === 0) {
    return "";
  }

  const columns = Object.keys(rows[0]);
  const lines = [columns.join(",")];

  for (const row of rows) {
    lines.push(
      columns
        .map((column) => {
          const value = row[column];
          if (value === null || value === undefined) {
            return "";
          }
          const text = String(value).replaceAll('"', '""');
          return /[",\n]/u.test(text) ? `"${text}"` : text;
        })
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  console.log("=== build-seoul-dong-hour-table ===");

  const sourcePayloads = {
    living: await loadSourceRecords(SOURCE_KEYS.living, isLivingRecordInTarget, { encoding: "utf-8" }),
    inner: await loadSourceRecords(SOURCE_KEYS.inner, isInnerRecordInTarget),
    hourlyOd: await loadSourceRecords(SOURCE_KEYS.hourlyOd, isHourlyOdRecordInTarget),
    modeOd: await loadSourceRecords(SOURCE_KEYS.modeOd, isModeOdRecordInTarget),
    purposeOd: await loadSourceRecords(SOURCE_KEYS.purposeOd, isPurposeOdRecordInTarget),
  };
  try {
    sourcePayloads.subwayTime = await loadJsonSourceRecords(SOURCE_KEYS.subwayTime);
  } catch (error) {
    console.warn(`Warning: subway time source was skipped: ${error.message}`);
  }

  const { rows, coverage } = buildRowsBySource(sourcePayloads);
  await mkdir(outputDir, { recursive: true });

  const csvPath = path.join(outputDir, "seoul-dong-hour-features.csv");
  const metaPath = path.join(outputDir, "seoul-dong-hour-features.meta.json");

  await writeFile(csvPath, toCsv(rows), "utf8");
  await writeFile(
    metaPath,
    `${JSON.stringify(
      {
        built_at: new Date().toISOString(),
        target_dongs: TARGET_DONGS,
        row_count: rows.length,
        source_files: Object.fromEntries(
          Object.entries(sourcePayloads).map(([key, payload]) => [
            key,
            {
              file_name: payload.meta.file_name,
              page_url: payload.meta.page_url,
              record_count: payload.records.length,
              month: payload.meta.month ?? null,
            },
          ]),
        ),
        coverage,
        notes: [
          "Rows are keyed by dong-hour.",
          "Daily-only sources are repeated across 24 hours of the same date.",
          "If source cadences do not overlap, missing values are left blank.",
          "The current public taxi source was not strong enough to replace the project taxi target label.",
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Saved ${csvPath}`);
  console.log(`Saved ${metaPath}`);
  console.log(`Rows: ${rows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
