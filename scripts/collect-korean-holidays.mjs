import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const rangeArg = process.argv[2] ?? "2023:2026";
const [startYearText, endYearText] = rangeArg.split(":");
const startYear = Number(startYearText);
const endYear = Number(endYearText);

if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear > endYear) {
  console.error("Usage: node scripts/collect-korean-holidays.mjs YYYY:YYYY");
  process.exit(1);
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

function yearsBetween(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function months() {
  return Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
}

function textOf(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : "";
}

function itemsFromXml(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const item = match[1];
    const locdate = textOf(item, "locdate");
    return {
      date: locdate ? `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}` : "",
      date_name: textOf(item, "dateName"),
      date_kind: textOf(item, "dateKind"),
      is_holiday: textOf(item, "isHoliday"),
      seq: textOf(item, "seq"),
    };
  });
}

function csvRow(values) {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
}

async function fetchMonth(year, month, serviceKey) {
  const params = new URLSearchParams({
    ServiceKey: serviceKey,
    pageNo: "1",
    numOfRows: "100",
    solYear: String(year),
    solMonth: month,
  });
  const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?${params}`;
  const res = await fetch(url);
  const xml = await res.text();
  if (!res.ok) throw new Error(`${year}-${month} HTTP ${res.status}: ${xml.slice(0, 160)}`);
  const resultCode = textOf(xml, "resultCode");
  const resultMsg = textOf(xml, "resultMsg");
  if (resultCode && resultCode !== "00") {
    throw new Error(`${year}-${month} ${resultCode} ${resultMsg}`);
  }
  return xml;
}

await loadEnvFile(path.join(projectRoot, ".env.local"));
const serviceKey = process.env.HOLIDAY_API_KEY ?? process.env.DATA_GO_KR_API;
if (!serviceKey) {
  console.error("HOLIDAY_API_KEY or DATA_GO_KR_API is required.");
  process.exit(1);
}

const rawDir = path.join(projectRoot, "data", "raw", "calendar");
const processedDir = path.join(projectRoot, "data", "processed", "calendar");
await mkdir(rawDir, { recursive: true });
await mkdir(processedDir, { recursive: true });

const rows = [];
const status = {
  source: "한국천문연구원_특일 정보 getRestDeInfo",
  source_url: "https://www.data.go.kr/data/15012690/openapi.do",
  requested_range: { start_year: startYear, end_year: endYear },
  generated_at: new Date().toISOString(),
  ok: false,
  months: [],
  error: null,
};

try {
  for (const year of yearsBetween(startYear, endYear)) {
    for (const month of months()) {
      const xml = await fetchMonth(year, month, serviceKey);
      const rawPath = path.join(rawDir, `korean_public_holidays_${year}-${month}.xml`);
      await writeFile(rawPath, xml, "utf8");
      const items = itemsFromXml(xml);
      rows.push(...items);
      status.months.push({
        period: `${year}-${month}`,
        row_count: items.length,
        raw_path: path.relative(projectRoot, rawPath),
      });
      console.log(`Korean holidays ${year}-${month}: ${items.length} rows`);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.seq.localeCompare(b.seq));
  const header = ["date", "date_name", "date_kind", "is_holiday", "seq"];
  const csvPath = path.join(processedDir, `korean_public_holidays_${startYear}_${endYear}.csv`);
  await writeFile(
    csvPath,
    [csvRow(header), ...rows.map((row) => csvRow(header.map((key) => row[key])))].join("\n") + "\n",
    "utf8",
  );
  status.ok = true;
  status.output_csv = path.relative(projectRoot, csvPath);
  status.row_count = rows.length;
  status.min_date = rows[0]?.date ?? null;
  status.max_date = rows.at(-1)?.date ?? null;
  console.log(`Wrote ${path.relative(projectRoot, csvPath)} (${rows.length} rows)`);
} catch (error) {
  status.error = error.message ?? String(error);
  console.error(status.error);
  process.exitCode = 1;
} finally {
  const statusPath = path.join(processedDir, `korean_public_holidays_${startYear}_${endYear}.status.json`);
  await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(projectRoot, statusPath)}`);
}
