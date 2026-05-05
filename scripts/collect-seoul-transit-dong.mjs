import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const TARGET_DONGS = [
  "역삼1동",
  "역삼2동",
  "논현1동",
  "논현2동",
  "삼성1동",
  "삼성2동",
  "신사동",
  "청담동",
  "대치4동",
];

const SERVICES = [
  {
    key: "total",
    service: "tpssPassengerCnt",
    label: "서울시 행정동별 대중교통 총 승차 승객수 정보",
    source: "https://data.seoul.go.kr/dataList/OA-21223/A/1/datasetView.do",
    totalField: "PSNG_NO",
    hourlyPrefix: "PSNG_NO",
  },
  {
    key: "subway",
    service: "tpssSubwayPassenger",
    label: "서울시 행정동별 지하철 총 승차 승객수 정보",
    source: "https://data.seoul.go.kr/dataList/OA-21224/A/1/datasetView.do",
    totalField: "SBWY_PSNG",
    hourlyPrefix: "SBWY_PSNG",
  },
  {
    key: "bus",
    service: "tpssEmdBus",
    label: "서울시 행정동별 버스 총 승차 승객수 정보",
    source: "https://data.seoul.go.kr/dataList/OA-21225/A/1/datasetView.do",
    totalField: "BUS_PSNG",
    hourlyPrefix: "BUS_PSNG",
  },
];

const rangeArg = process.argv[2] ?? "2023-01-01:2025-12-31";
const [startDate, endDate] = rangeArg.split(":");
if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
  console.error("Usage: node scripts/collect-seoul-transit-dong.mjs YYYY-MM-DD:YYYY-MM-DD");
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

function yyyymmddToIso(value) {
  const text = String(value ?? "").replace(/\D/g, "");
  if (text.length !== 8) return null;
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function csvRow(values) {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
}

function numeric(value) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchJson(service, start, end) {
  const url =
    `http://openapi.seoul.go.kr:8088/${process.env.SEOUL_OPEN_API_KEY}/json/` +
    `${service}/${start}/${end}/`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${service} HTTP ${res.status}: ${text.slice(0, 160)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    if (text.includes("INFO-100")) {
      throw new Error(`${service}: Seoul OpenAPI key is invalid (INFO-100).`);
    }
    throw new Error(`${service}: non-JSON response: ${text.slice(0, 160)}`);
  }
}

async function fetchAllRows(service, { pageSize = 1000 } = {}) {
  const first = await fetchJson(service, 1, 1);
  const root = first[service] ?? first;
  const resultCode = root.RESULT?.["RESULT.CODE"] ?? root.RESULT?.CODE;
  if (resultCode && resultCode !== "INFO-000") {
    throw new Error(`${service}: ${resultCode} ${root.RESULT?.["RESULT.MESSAGE"] ?? root.RESULT?.MESSAGE ?? ""}`);
  }

  const total = Number(root.list_total_count ?? root.row?.length ?? 0);
  const rows = [];
  for (let start = 1; start <= total; start += pageSize) {
    const end = Math.min(start + pageSize - 1, total);
    const page = await fetchJson(service, start, end);
    const pageRoot = page[service] ?? page;
    rows.push(...(pageRoot.row ?? []));
    if (start === 1 || end === total || Math.floor(start / pageSize) % 50 === 0) {
      console.log(`${service}: ${end.toLocaleString()} / ${total.toLocaleString()} rows`);
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return { total, rows };
}

async function loadTargetDongMap() {
  const { rows } = await fetchAllRows("districtEmd");
  const target = new Map();
  const allGangnam = [];

  for (const row of rows) {
    const dongName = row.DONG_NM;
    const guName = row.CGG_NM;
    if (guName === "강남구") allGangnam.push(row);
    if (TARGET_DONGS.includes(dongName) && guName === "강남구") {
      target.set(String(row.DONG_ID), {
        dong_id: String(row.DONG_ID),
        dong_name: dongName,
        gu_name: guName,
        sido_name: row.CTPV_NM,
      });
    }
  }

  const missing = TARGET_DONGS.filter(
    (dong) => ![...target.values()].some((row) => row.dong_name === dong),
  );
  if (missing.length) {
    throw new Error(`Missing dong ids for: ${missing.join(", ")}`);
  }

  return { target, allGangnamCount: allGangnam.length };
}

function flattenTransitRow(row, serviceConfig, dongInfo) {
  const date = yyyymmddToIso(row.CRTR_DD);
  if (!date || date < startDate || date > endDate) return [];

  const out = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const suffix = String(hour).padStart(2, "0");
    out.push({
      service_key: serviceConfig.key,
      service_name: serviceConfig.label,
      service_date: date,
      service_hour: hour,
      dong_id: dongInfo.dong_id,
      dong_name: dongInfo.dong_name,
      gu_name: dongInfo.gu_name,
      boardings: numeric(row[`${serviceConfig.hourlyPrefix}_${suffix}`]),
      daily_total: numeric(row[serviceConfig.totalField]),
    });
  }
  return out;
}

function summarizeRows(rows) {
  const byService = new Map();
  const byDong = new Map();
  const dates = new Set();
  const keys = new Set();

  for (const row of rows) {
    byService.set(row.service_key, (byService.get(row.service_key) ?? 0) + 1);
    byDong.set(row.dong_name, (byDong.get(row.dong_name) ?? 0) + 1);
    dates.add(row.service_date);
    keys.add(`${row.service_key}:${row.service_date}:${row.service_hour}:${row.dong_id}`);
  }

  return {
    row_count: rows.length,
    unique_key_count: keys.size,
    duplicate_key_count: rows.length - keys.size,
    date_count: dates.size,
    min_date: [...dates].sort()[0] ?? null,
    max_date: [...dates].sort().at(-1) ?? null,
    rows_by_service: Object.fromEntries([...byService.entries()].sort()),
    rows_by_dong: Object.fromEntries([...byDong.entries()].sort()),
  };
}

await loadEnvFile(path.join(projectRoot, ".env.local"));

const outDir = path.join(projectRoot, "data", "processed", "transit");
await mkdir(outDir, { recursive: true });

const status = {
  source: "seoul_openapi_transit_dong_hourly",
  generated_at: new Date().toISOString(),
  requested_range: { start_date: startDate, end_date: endDate },
  target_dongs: TARGET_DONGS,
  services: SERVICES.map(({ key, service, label, source }) => ({ key, service, label, source })),
  ok: false,
  error: null,
};

try {
  if (!process.env.SEOUL_OPEN_API_KEY) {
    throw new Error("SEOUL_OPEN_API_KEY is not configured.");
  }

  const { target, allGangnamCount } = await loadTargetDongMap();
  status.gangnam_dong_master_count = allGangnamCount;
  status.target_dong_ids = Object.fromEntries(
    [...target.values()].map((row) => [row.dong_name, row.dong_id]),
  );

  const allRows = [];
  for (const serviceConfig of SERVICES) {
    const { total, rows } = await fetchAllRows(serviceConfig.service);
    status[`${serviceConfig.key}_source_row_count`] = total;

    for (const row of rows) {
      const dongInfo = target.get(String(row.DONG_ID));
      if (!dongInfo) continue;
      allRows.push(...flattenTransitRow(row, serviceConfig, dongInfo));
    }
  }

  allRows.sort(
    (a, b) =>
      a.service_date.localeCompare(b.service_date) ||
      a.service_hour - b.service_hour ||
      a.dong_name.localeCompare(b.dong_name) ||
      a.service_key.localeCompare(b.service_key),
  );

  const csvPath = path.join(outDir, `seoul_transit_dong_hourly_${startDate}_${endDate}.csv`);
  const header = [
    "service_key",
    "service_name",
    "service_date",
    "service_hour",
    "dong_id",
    "dong_name",
    "gu_name",
    "boardings",
    "daily_total",
  ];
  const lines = [csvRow(header), ...allRows.map((row) => csvRow(header.map((key) => row[key])))];
  await writeFile(csvPath, `${lines.join("\n")}\n`);

  status.ok = true;
  status.output_csv = path.relative(projectRoot, csvPath);
  status.validation = summarizeRows(allRows);
  console.log(`Wrote ${path.relative(projectRoot, csvPath)} (${allRows.length.toLocaleString()} rows)`);
} catch (error) {
  status.error = error.message ?? String(error);
  console.error(status.error);
  process.exitCode = 1;
} finally {
  const statusPath = path.join(outDir, `seoul_transit_dong_hourly_${startDate}_${endDate}.status.json`);
  await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`);
  console.log(`Wrote ${path.relative(projectRoot, statusPath)}`);
}
