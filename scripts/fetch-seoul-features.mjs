#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const envPath = path.join(projectRoot, ".env.local");

const SEOUL_GU_CODE = "11230";
const SEOUL_GU_NAME = "강남구";
const SEOUL_PAGE_SIZE = 1000;
const LIVING_POP_DAYS = 7;
const POI_SCAN_START = 1;
const POI_SCAN_END = 121;
const POI_FETCH_CONCURRENCY = 6;
const KMA_GRID = { nx: 61, ny: 125 };
const KMA_BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
const KMA_REQUEST_TIMEOUT_MS = 8000;
const GANGNAM_AREA_PATTERN = /(강남|역삼|논현|삼성|청담|압구정|신사|대치|선릉)/;
const KMA_NOWCAST_CATEGORIES = new Set(["T1H", "RN1", "PTY", "REH"]);
const KMA_FORECAST_CATEGORIES = new Set(["TMP", "PCP", "SKY", "PTY", "REH", "POP"]);
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
let seoulApiKey = "";
let kmaApiKey = "";
let seoulBaseUrl = null;

async function loadEnvFile(filePath) {
  try {
    const contents = await readFile(filePath, "utf8");

    for (const rawLine of contents.split(/\r?\n/u)) {
      const line = rawLine.trim().replace(/^\uFEFF/u, "");
      if (!line || line.startsWith("#")) {
        continue;
      }

      const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
      const separatorIndex = normalized.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = normalized.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) {
        continue;
      }

      let value = normalized.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    return;
  }
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractSeoulResult(payload, serviceName) {
  const serviceResult = payload?.[serviceName]?.RESULT ?? null;
  const rootResult = payload?.RESULT ?? null;
  const result = serviceResult ?? rootResult;

  if (!result) {
    return null;
  }

  return {
    code: result.CODE ?? result["RESULT.CODE"] ?? null,
    message: result.MESSAGE ?? result["RESULT.MESSAGE"] ?? null,
  };
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KMA_REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${KMA_REQUEST_TIMEOUT_MS}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Invalid JSON from ${url}: ${error.message}`);
  }

  if (!response.ok) {
    const detail =
      payload?.message ??
      payload?.result?.message ??
      payload?.RESULT?.MESSAGE ??
      payload?.RESULT?.["RESULT.MESSAGE"] ??
      text.slice(0, 200);
    throw new Error(`HTTP ${response.status} for ${url}: ${detail}`);
  }

  return payload;
}

async function fetchSeoulService(serviceName, start, end, trailingPath = "") {
  if (!seoulBaseUrl) {
    throw new Error("Missing SEOUL_OPEN_API_KEY");
  }

  const suffix = trailingPath ? `/${encodeURIComponent(trailingPath)}` : "";
  const url = `${seoulBaseUrl}/${serviceName}/${start}/${end}${suffix}/`;
  const payload = await fetchJson(url);
  const result = extractSeoulResult(payload, serviceName);

  if (result?.code && result.code !== "INFO-000") {
    throw new Error(`${serviceName} returned ${result.code}: ${result.message ?? "unknown error"}`);
  }

  return payload;
}

function formatPoiCode(index) {
  return `POI${String(index).padStart(3, "0")}`;
}

function normalizeCityData(cityData, requestedVia) {
  const live = Array.isArray(cityData?.LIVE_PPLTN_STTS) ? cityData.LIVE_PPLTN_STTS[0] ?? null : null;
  const roadContainer =
    cityData?.ROAD_TRAFFIC_STTS && typeof cityData.ROAD_TRAFFIC_STTS === "object"
      ? cityData.ROAD_TRAFFIC_STTS
      : null;
  const roadSummary = roadContainer?.AVG_ROAD_DATA ?? null;
  const roadSegments = Array.isArray(roadContainer?.ROAD_TRAFFIC_STTS)
    ? roadContainer.ROAD_TRAFFIC_STTS
    : [];
  const weather = Array.isArray(cityData?.WEATHER_STTS) ? cityData.WEATHER_STTS[0] ?? null : null;

  return {
    area_name: cityData?.AREA_NM ?? null,
    area_code: cityData?.AREA_CD ?? null,
    requested_via: requestedVia,
    fetched_at: new Date().toISOString(),
    live_population: {
      observed_at: live?.PPLTN_TIME ?? null,
      congestion_level: live?.AREA_CONGEST_LVL ?? null,
      congestion_message: live?.AREA_CONGEST_MSG ?? null,
      population_min: parseNumber(live?.AREA_PPLTN_MIN),
      population_max: parseNumber(live?.AREA_PPLTN_MAX),
      male_rate: parseNumber(live?.MALE_PPLTN_RATE),
      female_rate: parseNumber(live?.FEMALE_PPLTN_RATE),
      resident_rate: parseNumber(live?.RESNT_PPLTN_RATE),
      non_resident_rate: parseNumber(live?.NON_RESNT_PPLTN_RATE),
    },
    road_traffic: {
      observed_at: roadSummary?.ROAD_TRAFFIC_TIME ?? null,
      index: roadSummary?.ROAD_TRAFFIC_IDX ?? null,
      message: roadSummary?.ROAD_MSG ?? null,
      speed_kmh: parseNumber(roadSummary?.ROAD_TRAFFIC_SPD),
      segment_count: roadSegments.length,
    },
    weather: {
      observed_at: weather?.WEATHER_TIME ?? null,
      temp_c: parseNumber(weather?.TEMP),
      precipitation: weather?.PRECIPITATION ?? null,
      precipitation_type: weather?.PRECPT_TYPE ?? null,
      sky_status: weather?.SKY_STTS ?? null,
      humidity_pct: parseNumber(weather?.HUMIDITY),
    },
  };
}

async function fetchCityData(identifier) {
  const payload = await fetchSeoulService("citydata", 1, 1, identifier);
  if (!payload?.CITYDATA?.AREA_CD) {
    throw new Error(`citydata returned no AREA_CD for ${identifier}`);
  }
  return payload.CITYDATA;
}

async function mapLimit(items, limit, iteratee) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const itemIndex = currentIndex;
      currentIndex += 1;
      results[itemIndex] = await iteratee(items[itemIndex], itemIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function fetchLivingPopulation(days = LIVING_POP_DAYS) {
  console.log(`Fetching living population for ${SEOUL_GU_NAME} (last ${days} days)...`);

  const probe = await fetchSeoulService("SPOP_LOCAL_RESD_JACHI", 1, 1);
  const totalRows = parseNumber(probe?.SPOP_LOCAL_RESD_JACHI?.list_total_count);

  if (!totalRows) {
    throw new Error("Could not determine total living population row count.");
  }

  const rowsNeeded = days * 24 * 25;
  const startRow = Math.max(1, totalRows - rowsNeeded + 1);
  const rows = [];

  for (let start = startRow; start <= totalRows; start += SEOUL_PAGE_SIZE) {
    const end = Math.min(start + SEOUL_PAGE_SIZE - 1, totalRows);
    const payload = await fetchSeoulService("SPOP_LOCAL_RESD_JACHI", start, end);
    const pageRows = payload?.SPOP_LOCAL_RESD_JACHI?.row ?? [];

    for (const row of pageRows) {
      if (row.ADSTRD_CODE_SE !== SEOUL_GU_CODE) {
        continue;
      }

      rows.push({
        date: row.STDR_DE_ID,
        hour: Number.parseInt(row.TMZON_PD_SE, 10),
        gu_code: row.ADSTRD_CODE_SE,
        living_pop: parseNumber(row.TOT_LVPOP_CO),
      });
    }

    console.log(`  rows ${start}-${end}: ${rows.length} ${SEOUL_GU_NAME} rows collected`);
  }

  rows.sort((left, right) => left.date.localeCompare(right.date) || left.hour - right.hour);

  return {
    meta: {
      source: "SPOP_LOCAL_RESD_JACHI",
      gu_code: SEOUL_GU_CODE,
      gu_name: SEOUL_GU_NAME,
      days_requested: days,
      total_rows_available: totalRows,
      fetched_range: { start_row: startRow, end_row: totalRows },
      target_dongs: TARGET_DONGS,
      fetched_at: new Date().toISOString(),
      note: "SPOP_LOCAL_RESD_JACHI is gu-level. Target dongs are included for downstream joining and UI context.",
    },
    rows,
  };
}

async function scanPoiCodes() {
  console.log(`Scanning Seoul citydata POIs (${formatPoiCode(POI_SCAN_START)}-${formatPoiCode(POI_SCAN_END)})...`);

  const poiCodes = Array.from(
    { length: POI_SCAN_END - POI_SCAN_START + 1 },
    (_, index) => formatPoiCode(POI_SCAN_START + index),
  );

  const scanResults = await mapLimit(poiCodes, POI_FETCH_CONCURRENCY, async (poiCode) => {
    try {
      const cityData = await fetchCityData(poiCode);
      return { poiCode, areaName: cityData.AREA_NM ?? null };
    } catch (error) {
      console.warn(`  Warning: failed to scan ${poiCode}: ${error.message}`);
      return { poiCode, areaName: null, error: error.message };
    }
  });

  const poiMap = Object.fromEntries(
    scanResults
      .filter((entry) => entry.areaName)
      .sort((left, right) => left.poiCode.localeCompare(right.poiCode))
      .map((entry) => [entry.poiCode, entry.areaName]),
  );

  const matchedPois = scanResults
    .filter((entry) => entry.areaName && GANGNAM_AREA_PATTERN.test(entry.areaName))
    .sort((left, right) => left.areaName.localeCompare(right.areaName, "ko"));

  console.log(`  scanned ${Object.keys(poiMap).length} POIs, matched ${matchedPois.length} Gangnam-area POIs`);

  return {
    poiMap,
    matchedPois,
    errors: scanResults.filter((entry) => entry.error),
  };
}

async function fetchRealtimePlaces(matchedPois) {
  console.log(`Fetching realtime citydata for ${matchedPois.length} matched POIs...`);

  const places = await mapLimit(matchedPois, POI_FETCH_CONCURRENCY, async ({ poiCode, areaName }) => {
    try {
      const cityData = await fetchCityData(poiCode);
      return normalizeCityData(cityData, { poi_code: poiCode, discovered_area_name: areaName });
    } catch (error) {
      console.warn(`  Warning: failed to fetch realtime citydata for ${poiCode} (${areaName}): ${error.message}`);
      return null;
    }
  });

  const filteredPlaces = places
    .filter(Boolean)
    .sort((left, right) => left.area_name.localeCompare(right.area_name, "ko"));

  return {
    meta: {
      source: "citydata (OA-21285)",
      poi_scan_range: `${formatPoiCode(POI_SCAN_START)}-${formatPoiCode(POI_SCAN_END)}`,
      area_name_filter: GANGNAM_AREA_PATTERN.source,
      target_dongs: TARGET_DONGS,
      fetched_at: new Date().toISOString(),
      matched_poi_codes: matchedPois.map(({ poiCode }) => poiCode),
    },
    places: filteredPlaces,
  };
}

function getPreviousDateString(dateString) {
  const year = Number.parseInt(dateString.slice(0, 4), 10);
  const month = Number.parseInt(dateString.slice(4, 6), 10) - 1;
  const day = Number.parseInt(dateString.slice(6, 8), 10);
  const date = new Date(year, month, day);
  date.setDate(date.getDate() - 1);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

function getRecentKmaBaseCandidates(now = new Date(), count = 8) {
  const dateString = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const hhmm = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const candidates = [];
  let baseDate = dateString;
  let baseIndex = KMA_BASE_TIMES.findLastIndex((baseTime) => baseTime <= hhmm);

  if (baseIndex === -1) {
    baseDate = getPreviousDateString(baseDate);
    baseIndex = KMA_BASE_TIMES.length - 1;
  }

  while (candidates.length < count) {
    candidates.push({ base_date: baseDate, base_time: KMA_BASE_TIMES[baseIndex] });
    baseIndex -= 1;

    if (baseIndex < 0) {
      baseDate = getPreviousDateString(baseDate);
      baseIndex = KMA_BASE_TIMES.length - 1;
    }
  }

  return candidates;
}

function getRecentKmaNowcastCandidates(now = new Date(), count = 4) {
  const rounded = new Date(now);
  rounded.setMinutes(0, 0, 0);
  const candidates = [];

  for (let index = 0; index < count; index += 1) {
    const candidate = new Date(rounded);
    candidate.setHours(candidate.getHours() - index);
    candidates.push({
      base_date: [
        candidate.getFullYear(),
        String(candidate.getMonth() + 1).padStart(2, "0"),
        String(candidate.getDate()).padStart(2, "0"),
      ].join(""),
      base_time: `${String(candidate.getHours()).padStart(2, "0")}00`,
    });
  }

  return candidates;
}

async function fetchKmaEndpoint(endpoint, candidate) {
  const url = new URL(`https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/${endpoint}`);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "200");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", candidate.base_date);
  url.searchParams.set("base_time", candidate.base_time);
  url.searchParams.set("nx", String(KMA_GRID.nx));
  url.searchParams.set("ny", String(KMA_GRID.ny));
  url.searchParams.set("authKey", kmaApiKey);

  const payload = await fetchJson(url);
  const resultCode = payload?.response?.header?.resultCode ?? null;

  if (resultCode && resultCode !== "00") {
    throw new Error(
      `${endpoint} returned ${resultCode}: ${payload?.response?.header?.resultMsg ?? "unknown error"}`,
    );
  }

  return payload;
}

function normalizeKmaItems(items, categories, valueField) {
  return (items ?? [])
    .filter((item) => categories.has(item.category))
    .map((item) => ({
      category: item.category,
      forecast_date: item.fcstDate ?? null,
      forecast_time: item.fcstTime ?? null,
      value: item[valueField] ?? null,
      base_date: item.baseDate ?? null,
      base_time: item.baseTime ?? null,
      nx: parseNumber(item.nx),
      ny: parseNumber(item.ny),
    }));
}

async function fetchKmaWeather() {
  if (!kmaApiKey) {
    return {
      error: {
        message: "Missing KMA_API_KEY",
        fetched_at: new Date().toISOString(),
      },
    };
  }

  console.log("Fetching KMA weather forecast for Gangnam grid...");
  const forecastCandidates = getRecentKmaBaseCandidates();
  const nowcastCandidates = getRecentKmaNowcastCandidates();
  let nowcast = null;
  let forecast = null;

  for (const candidate of nowcastCandidates) {
    try {
      const payload = await fetchKmaEndpoint("getUltraSrtNcst", candidate);
      const items = normalizeKmaItems(
        payload?.response?.body?.items?.item,
        KMA_NOWCAST_CATEGORIES,
        "obsrValue",
      );

      if (items.length === 0) {
        console.warn(`  Warning: KMA nowcast returned no target categories for ${candidate.base_date} ${candidate.base_time}`);
        continue;
      }

      nowcast = {
        base_date: candidate.base_date,
        base_time: candidate.base_time,
        categories: Array.from(KMA_NOWCAST_CATEGORIES),
        items,
      };
      break;
    } catch (error) {
      console.warn(`  Warning: KMA nowcast failed for ${candidate.base_date} ${candidate.base_time}: ${error.message}`);
    }
  }

  for (const candidate of forecastCandidates) {
    try {
      const payload = await fetchKmaEndpoint("getVilageFcst", candidate);
      const items = normalizeKmaItems(
        payload?.response?.body?.items?.item,
        KMA_FORECAST_CATEGORIES,
        "fcstValue",
      );

      if (items.length === 0) {
        console.warn(`  Warning: KMA forecast returned no target categories for ${candidate.base_date} ${candidate.base_time}`);
        continue;
      }

      forecast = {
        base_date: candidate.base_date,
        base_time: candidate.base_time,
        categories: Array.from(KMA_FORECAST_CATEGORIES),
        items,
      };
      break;
    } catch (error) {
      console.warn(`  Warning: KMA forecast failed for ${candidate.base_date} ${candidate.base_time}: ${error.message}`);
    }
  }

  if (!nowcast && !forecast) {
    return {
      error: {
        message: "No recent KMA weather data was available.",
        tried_nowcast_times: nowcastCandidates,
        tried_forecast_times: forecastCandidates,
        fetched_at: new Date().toISOString(),
      },
    };
  }

  return {
    meta: {
      source: "KMA VilageFcstInfoService_2.0",
      grid: KMA_GRID,
      fetched_at: new Date().toISOString(),
    },
    nowcast,
    forecast,
  };
}

async function writeJson(fileName, payload) {
  await mkdir(publicDir, { recursive: true });
  const outputPath = path.join(publicDir, fileName);
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return outputPath;
}

function createErrorPayload(message) {
  return {
    error: {
      message,
      fetched_at: new Date().toISOString(),
    },
  };
}

async function main() {
  await loadEnvFile(envPath);
  seoulApiKey = process.env.SEOUL_OPEN_API_KEY ?? "";
  kmaApiKey = process.env.KMA_API_KEY ?? "";
  seoulBaseUrl = seoulApiKey ? `http://openapi.seoul.go.kr:8088/${seoulApiKey}/json` : null;

  console.log("=== fetch-seoul-features ===");
  console.log(`Target dongs: ${Object.keys(TARGET_DONGS).length}`);

  const livingPopulation = seoulApiKey
    ? await fetchLivingPopulation().catch((error) => {
        console.warn(`Warning: living population fetch failed: ${error.message}`);
        return {
          meta: {
            source: "SPOP_LOCAL_RESD_JACHI",
            gu_code: SEOUL_GU_CODE,
            gu_name: SEOUL_GU_NAME,
            target_dongs: TARGET_DONGS,
            fetched_at: new Date().toISOString(),
          },
          rows: [],
          error: {
            message: error.message,
          },
        };
      })
    : {
        meta: {
          source: "SPOP_LOCAL_RESD_JACHI",
          gu_code: SEOUL_GU_CODE,
          gu_name: SEOUL_GU_NAME,
          target_dongs: TARGET_DONGS,
          fetched_at: new Date().toISOString(),
        },
        rows: [],
        error: {
          message: "Missing SEOUL_OPEN_API_KEY",
        },
      };

  const poiScan = seoulApiKey
    ? await scanPoiCodes().catch((error) => {
        console.warn(`Warning: POI scan failed: ${error.message}`);
        return null;
      })
    : null;

  const realtime =
    poiScan && poiScan.matchedPois.length > 0
      ? await fetchRealtimePlaces(poiScan.matchedPois).catch((error) => {
          console.warn(`Warning: realtime citydata fetch failed: ${error.message}`);
          return {
            meta: {
              source: "citydata (OA-21285)",
              target_dongs: TARGET_DONGS,
              fetched_at: new Date().toISOString(),
              matched_poi_codes: [],
            },
            places: [],
            error: {
              message: error.message,
            },
          };
        })
      : {
          meta: {
            source: "citydata (OA-21285)",
            target_dongs: TARGET_DONGS,
            fetched_at: new Date().toISOString(),
            matched_poi_codes: poiScan?.matchedPois?.map(({ poiCode }) => poiCode) ?? [],
          },
          places: [],
          error: {
            message: poiScan ? "No Gangnam-area POIs matched the configured filter." : "POI scan did not complete.",
          },
        };

  const weather = await fetchKmaWeather().catch((error) => {
    console.warn(`Warning: KMA weather fetch failed: ${error.message}`);
    return createErrorPayload(error.message);
  });

  const poiMap = poiScan?.poiMap ?? {};
  const outputs = await Promise.all([
    writeJson("seoul-living-pop.json", livingPopulation),
    writeJson("seoul-realtime.json", realtime),
    writeJson("seoul-weather.json", weather),
    writeJson("gangnam-poi-map.json", poiMap),
  ]);

  for (const outputPath of outputs) {
    console.log(`Saved ${outputPath}`);
  }

  console.log("Done.");
}

await main();
