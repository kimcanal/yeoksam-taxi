#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "data", "seoul-raw");
const envPath = path.join(projectRoot, ".env.local");
const DATASET_PAGE_BASE = "https://data.seoul.go.kr/dataList";
const DOWNLOAD_URL = "https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?useCache=false";
const SEOUL_OPEN_API_BASE = "http://openapi.seoul.go.kr:8088";
const DONG_DATA_MONTH = process.env.SEOUL_DONG_MONTH ?? process.env.SEOUL_SUBWAY_MONTH ?? previousMonthKst();

const DATASETS = [
  {
    key: "living-pop-dong",
    infId: "OA-14991",
    pagePath: "OA-14991/S/1/datasetView.do",
    targetMonth: DONG_DATA_MONTH,
  },
  {
    key: "inner-moving-pop-dong",
    infId: "OA-22851",
    pagePath: "OA-22851/S/1/datasetView.do",
    targetMonth: DONG_DATA_MONTH,
  },
  {
    key: "transit-od-hourly-dong",
    infId: "OA-21226",
    pagePath: "OA-21226/F/1/datasetView.do",
    targetMonth: DONG_DATA_MONTH,
  },
  {
    key: "transit-od-mode-dong",
    infId: "OA-21227",
    pagePath: "OA-21227/F/1/datasetView.do",
    targetMonth: DONG_DATA_MONTH,
  },
  {
    key: "transit-od-purpose-dong",
    infId: "OA-21228",
    pagePath: "OA-21228/F/1/datasetView.do",
    targetMonth: DONG_DATA_MONTH,
  },
  {
    key: "taxi-stand",
    infId: "OA-22228",
    pagePath: "OA-22228/S/1/datasetView.do",
  },
  {
    key: "capital-region-mobility-mode-dong",
    infId: "OA-22655",
    pagePath: "OA-22655/F/1/datasetView.do",
    targetMonth: DONG_DATA_MONTH,
  },
  {
    key: "sdot-footfall",
    infId: "OA-22832",
    pagePath: "OA-22832/S/1/datasetView.do",
  },
  {
    key: "bus-route-stop-hourly",
    infId: "OA-21219",
    pagePath: "OA-21219/S/1/datasetView.do",
  },
];

const OPEN_API_DATASETS = [
  {
    key: "subway-time-station",
    serviceName: "CardSubwayTime",
    pageUrl: "https://data.seoul.go.kr/dataList/OA-12252/S/1/datasetView.do",
    month: process.env.SEOUL_SUBWAY_MONTH ?? previousMonthKst(),
  },
];

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

function previousMonthKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const monthIndex = kst.getUTCMonth();
  const previous = new Date(Date.UTC(year, monthIndex - 1, 1));
  return `${previous.getUTCFullYear()}${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shouldForceDownload() {
  return process.env.SEOUL_FORCE_DOWNLOAD === "1" || process.env.SEOUL_FORCE_DOWNLOAD === "true";
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${text.slice(0, 200)}`);
  }

  return text;
}

async function fetchBuffer(url, init = {}) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} for ${url}: ${text.slice(0, 200)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function fetchJson(url) {
  const text = await fetchText(url);

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON from ${url}: ${error.message}`);
  }
}

function extractInfSeq(html, infId) {
  const formPattern = new RegExp(
    `<form name="frmFile"[\\s\\S]*?<input type="hidden" name="infId" value="${infId}"[\\s\\S]*?<input type="hidden" name="infSeq" value="(\\d+)"`,
    "u",
  );
  const match = html.match(formPattern);
  return match?.[1] ?? null;
}

function extractDownloads(html) {
  return [...html.matchAll(/title="([^"]+\.(?:zip|csv|xlsx))" onclick="javascript:downloadFile\('([^']+)'\);"/gu)].map(
    (match) => ({
      fileName: match[1],
      seq: match[2],
    }),
  );
}

function selectDownload(downloads, dataset) {
  if (dataset.targetMonth) {
    const month = String(dataset.targetMonth);
    const compactMonth = month.length === 6 ? month.slice(2) : month;
    const matched = downloads.find(
      (download) => download.fileName.includes(month) || download.seq === month || download.seq === compactMonth,
    );

    if (matched) {
      return matched;
    }
  }

  return downloads[0] ?? null;
}

function describeDownloadTarget(dataset) {
  return dataset.targetMonth ? `target month ${dataset.targetMonth}` : "latest file";
}

function assertMonthlySource(dataset, download) {
  if (!dataset.targetMonth) {
    return;
  }

  const month = String(dataset.targetMonth);
  const compactMonth = month.length === 6 ? month.slice(2) : month;
  const matched = download.fileName.includes(month) || download.seq === month || download.seq === compactMonth;

  if (!matched) {
    throw new Error(`selected ${download.fileName}, but expected ${month}`);
  }
}

async function resolveDatasetDownload(dataset) {
  const pageUrl = `${DATASET_PAGE_BASE}/${dataset.pagePath}`;
  const html = await fetchText(pageUrl);
  const infSeq = extractInfSeq(html, dataset.infId);
  const downloads = extractDownloads(html);
  const download = selectDownload(downloads, dataset);

  if (!infSeq) {
    throw new Error(`Could not find infSeq on ${pageUrl}`);
  }

  if (!download) {
    throw new Error(`Could not find a downloadable file entry on ${pageUrl}`);
  }
  assertMonthlySource(dataset, download);

  return {
    ...dataset,
    pageUrl,
    infSeq,
    ...download,
  };
}

async function downloadDataset(dataset) {
  const datasetDir = path.join(outputDir, dataset.key);
  const filePath = path.join(datasetDir, dataset.fileName);
  const metaPath = path.join(datasetDir, "latest.json");

  await mkdir(datasetDir, { recursive: true });
  if (!shouldForceDownload() && (await fileExists(filePath))) {
    return {
      datasetKey: dataset.key,
      fileName: dataset.fileName,
      filePath,
      metaPath,
      skipped: true,
    };
  }

  const body = new URLSearchParams({
    infId: dataset.infId,
    infSeq: dataset.infSeq,
    seq: dataset.seq,
    seqNo: "",
  });
  const fileBuffer = await fetchBuffer(DOWNLOAD_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  await writeFile(filePath, fileBuffer);
  await writeFile(
    metaPath,
    `${JSON.stringify(
      {
        dataset_key: dataset.key,
        inf_id: dataset.infId,
        inf_seq: dataset.infSeq,
        seq: dataset.seq,
        file_name: dataset.fileName,
        page_url: dataset.pageUrl,
        downloaded_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    datasetKey: dataset.key,
    fileName: dataset.fileName,
    filePath,
    metaPath,
    sizeBytes: fileBuffer.length,
  };
}

async function fetchOpenApiDataset(dataset) {
  const datasetDir = path.join(outputDir, dataset.key);
  const fileName = `${dataset.serviceName}_${dataset.month}.json`;
  const jsonPath = path.join(datasetDir, fileName);
  const metaPath = path.join(datasetDir, "latest.json");

  await mkdir(datasetDir, { recursive: true });
  if (!shouldForceDownload() && (await fileExists(jsonPath))) {
    return {
      datasetKey: dataset.key,
      fileName,
      jsonPath,
      metaPath,
      skipped: true,
    };
  }

  const apiKey = process.env.SEOUL_OPEN_API_KEY;
  if (!apiKey) {
    throw new Error(`Missing SEOUL_OPEN_API_KEY for ${dataset.key}`);
  }

  const firstUrl = `${SEOUL_OPEN_API_BASE}/${apiKey}/json/${dataset.serviceName}/1/1/${dataset.month}`;
  const firstPayload = await fetchJson(firstUrl);
  const root = firstPayload?.[dataset.serviceName];
  const result = root?.RESULT ?? firstPayload?.RESULT ?? null;
  if (result?.CODE && result.CODE !== "INFO-000") {
    throw new Error(`${dataset.serviceName} returned ${result.CODE}: ${result.MESSAGE ?? "unknown error"}`);
  }

  const totalCount = Number(root?.list_total_count ?? 0);
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    throw new Error(`${dataset.serviceName} returned no rows for ${dataset.month}`);
  }

  const rows = [];
  const pageSize = 1000;
  for (let start = 1; start <= totalCount; start += pageSize) {
    const end = Math.min(start + pageSize - 1, totalCount);
    const url = `${SEOUL_OPEN_API_BASE}/${apiKey}/json/${dataset.serviceName}/${start}/${end}/${dataset.month}`;
    const payload = await fetchJson(url);
    const pageRoot = payload?.[dataset.serviceName];
    const pageResult = pageRoot?.RESULT ?? payload?.RESULT ?? null;
    if (pageResult?.CODE && pageResult.CODE !== "INFO-000") {
      throw new Error(`${dataset.serviceName} page ${start}-${end} returned ${pageResult.CODE}: ${pageResult.MESSAGE ?? "unknown error"}`);
    }
    rows.push(...(pageRoot?.row ?? []));
  }

  await writeFile(
    jsonPath,
    `${JSON.stringify(
      {
        service_name: dataset.serviceName,
        month: dataset.month,
        row_count: rows.length,
        rows,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    metaPath,
    `${JSON.stringify(
      {
        dataset_key: dataset.key,
        service_name: dataset.serviceName,
        month: dataset.month,
        file_name: fileName,
        page_url: dataset.pageUrl,
        downloaded_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    datasetKey: dataset.key,
    fileName,
    jsonPath,
    metaPath,
    rowCount: rows.length,
  };
}

async function main() {
  await loadEnvFile(envPath);
  console.log("=== fetch-seoul-dong-files ===");
  const resolved = [];

  for (const dataset of DATASETS) {
    try {
      const download = await resolveDatasetDownload(dataset);
      console.log(
        `Resolved ${dataset.key}: ${download.fileName} (seq=${download.seq}, infSeq=${download.infSeq}, ${describeDownloadTarget(dataset)})`,
      );
      resolved.push(download);
    } catch (error) {
      console.warn(`Warning: failed to resolve ${dataset.key}: ${error.message}`);
    }
  }

  for (const dataset of resolved) {
    try {
      const result = await downloadDataset(dataset);
      if (result.skipped) {
        console.log(`Skipped ${result.filePath} (already exists)`);
      } else {
        console.log(`Saved ${result.filePath} (${result.sizeBytes} bytes)`);
      }
    } catch (error) {
      console.warn(`Warning: failed to download ${dataset.key}: ${error.message}`);
    }
  }

  for (const dataset of OPEN_API_DATASETS) {
    try {
      const result = await fetchOpenApiDataset(dataset);
      if (result.skipped) {
        console.log(`Skipped ${result.jsonPath} (already exists)`);
      } else {
        console.log(`Saved ${result.jsonPath} (${result.rowCount} rows)`);
      }
    } catch (error) {
      console.warn(`Warning: failed to fetch ${dataset.key}: ${error.message}`);
    }
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
