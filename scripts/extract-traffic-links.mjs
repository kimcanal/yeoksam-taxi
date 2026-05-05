import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  geometryContainsPoint,
  representativePointForGeometry,
  loadDongCollection,
} from "./osm/map-region.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function latestRawPath(relativeDir) {
  const root = path.join(projectRoot, relativeDir);
  const days = (await readdir(root, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const day = days.at(-1);
  if (!day) return null;
  const dayRoot = path.join(root, day);
  const files = (await readdir(dayRoot)).filter((f) => f.endsWith(".json"));
  const infos = await Promise.all(
    files.map(async (f) => ({
      file: f,
      mtimeMs: (await stat(path.join(dayRoot, f))).mtimeMs,
    })),
  );
  const latest = infos.sort((a, b) => a.mtimeMs - b.mtimeMs).at(-1);
  return latest ? path.join(dayRoot, latest.file) : null;
}

function kstParts(date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (v) => String(v).padStart(2, "0");
  return {
    date: `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`,
    time: `${pad(kst.getUTCHours())}${pad(kst.getUTCMinutes())}`,
  };
}

// "lon_lat|lon_lat|..." → [[lon, lat], ...]
function parseXylist(xylist) {
  if (!xylist) return [];
  return xylist
    .split("|")
    .map((pair) => {
      const [lon, lat] = pair.split("_").map(Number);
      return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
    })
    .filter(Boolean);
}

function linkTouchesDongs(link, dongFeatures) {
  const points = pointsForLink(link);
  return points.some((pt) =>
    dongFeatures.some((dong) => geometryContainsPoint(dong.geometry, pt)),
  );
}

function pointsForLink(link) {
  const points = parseXylist(link.XYLIST);
  if (points.length === 0) {
    for (const field of ["START_ND_XY", "END_ND_XY"]) {
      const xy = link[field];
      if (xy) {
        const [lon, lat] = xy.split("_").map(Number);
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          points.push([lon, lat]);
        }
      }
    }
  }
  return points;
}

function dongNameFor(feature) {
  return feature.properties?.name ?? feature.properties?.dong_name ?? null;
}

function centroidForDong(feature) {
  return representativePointForGeometry(feature.geometry);
}

function distanceSq(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function representativePointForPoints(points) {
  if (!points.length) return null;
  const lon = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return [lon, lat];
}

function assignLinkToDong(link, dongFeatures) {
  const points = pointsForLink(link);
  const hitCounts = new Map();

  for (const point of points) {
    for (const dong of dongFeatures) {
      if (geometryContainsPoint(dong.geometry, point)) {
        const name = dongNameFor(dong);
        if (name) hitCounts.set(name, (hitCounts.get(name) ?? 0) + 1);
      }
    }
  }

  if (hitCounts.size > 0) {
    const sorted = [...hitCounts.entries()].sort((left, right) => right[1] - left[1]);
    return {
      primary_dong: sorted[0][0],
      dong_names: sorted.map(([name]) => name),
      assignment_type: sorted.length > 1 ? "polygon_multi" : "polygon",
    };
  }

  const representativePoint = representativePointForPoints(points);
  if (!representativePoint) {
    return {
      primary_dong: null,
      dong_names: [],
      assignment_type: "unassigned",
    };
  }

  const nearest = dongFeatures
    .map((dong) => ({
      dong,
      point: centroidForDong(dong),
    }))
    .filter((entry) => entry.point)
    .map((entry) => ({
      name: dongNameFor(entry.dong),
      distance: distanceSq(representativePoint, entry.point),
    }))
    .filter((entry) => entry.name)
    .sort((left, right) => left.distance - right.distance)[0];

  return {
    primary_dong: nearest?.name ?? null,
    dong_names: nearest?.name ? [nearest.name] : [],
    assignment_type: nearest?.name ? "nearest" : "unassigned",
  };
}

function congestionScore(value) {
  switch (value) {
    case "정체":
      return 0.9;
    case "서행":
      return 0.6;
    case "원활":
      return 0.2;
    default:
      return 0.35;
  }
}

function csvRow(values) {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
}

function buildDongSummary(links, dongFeatures) {
  const byDong = new Map(
    dongFeatures.map((dong) => [
      dongNameFor(dong),
      {
        dong_name: dongNameFor(dong),
        link_count: 0,
        total_distance_m: 0,
        speed_distance_sum: 0,
        congestion_distance_sum: 0,
        clear_link_count: 0,
        slow_link_count: 0,
        congested_link_count: 0,
        road_names: new Set(),
      },
    ]),
  );

  for (const link of links) {
    const summary = byDong.get(link.primary_dong);
    if (!summary) continue;
    const distance = link.distance_m > 0 ? link.distance_m : 1;
    summary.link_count += 1;
    summary.total_distance_m += distance;
    summary.speed_distance_sum += link.speed_kmh * distance;
    summary.congestion_distance_sum += congestionScore(link.congestion) * distance;
    if (link.congestion === "정체") summary.congested_link_count += 1;
    if (link.congestion === "서행") summary.slow_link_count += 1;
    if (link.congestion === "원활") summary.clear_link_count += 1;
    if (link.road_name) summary.road_names.add(link.road_name);
  }

  return [...byDong.values()]
    .filter((summary) => summary.dong_name)
    .map((summary) => ({
      dong_name: summary.dong_name,
      link_count: summary.link_count,
      avg_speed_kmh: summary.total_distance_m
        ? Number((summary.speed_distance_sum / summary.total_distance_m).toFixed(1))
        : null,
      congestion_score: summary.total_distance_m
        ? Number((summary.congestion_distance_sum / summary.total_distance_m).toFixed(3))
        : null,
      congested_link_count: summary.congested_link_count,
      slow_link_count: summary.slow_link_count,
      clear_link_count: summary.clear_link_count,
      total_distance_m: Number(summary.total_distance_m.toFixed(1)),
      road_names: [...summary.road_names].sort().join("|"),
    }))
    .sort((left, right) => left.dong_name.localeCompare(right.dong_name, "ko"));
}

// ── main ────────────────────────────────────────────────────────────────────

const citydataPath = await latestRawPath("data/raw/citydata");
if (!citydataPath) {
  console.error("No raw citydata found. Run npm run data:collect:citydata first.");
  process.exit(1);
}

const raw = JSON.parse(await readFile(citydataPath, "utf8"));
const collectedAt = new Date(raw?.meta?.collected_at ?? Date.now());

const dongs = loadDongCollection();
const dongFeatures = dongs.features;

// Collect all links across all POI results; deduplicate by LINK_ID (last writer wins)
const byLinkId = new Map();
for (const result of raw.results ?? []) {
  if (!result.ok) continue;
  const citydata =
    result.data?.["SeoulRtd.citydata"]?.CITYDATA ??
    result.data?.CITYDATA_ALL?.CITYDATA ??
    result.data?.CITYDATA ??
    result.data;
  const trafficStts = citydata?.ROAD_TRAFFIC_STTS;
  if (!trafficStts) continue;
  const links = Array.isArray(trafficStts.ROAD_TRAFFIC_STTS)
    ? trafficStts.ROAD_TRAFFIC_STTS
    : [];
  for (const link of links) {
    if (link.LINK_ID) byLinkId.set(link.LINK_ID, link);
  }
}

// Spatial filter: keep only links that touch the 9 target dongs
const filtered = [...byLinkId.values()].filter((link) =>
  linkTouchesDongs(link, dongFeatures),
);

const congestionOrder = { 원활: 0, 서행: 1, 정체: 2 };

const links = filtered
  .map((link) => {
    const assignment = assignLinkToDong(link, dongFeatures);
    return {
      link_id: link.LINK_ID,
      primary_dong: assignment.primary_dong,
      dong_names: assignment.dong_names,
      assignment_type: assignment.assignment_type,
      road_name: link.ROAD_NM ?? null,
      start_node: link.START_ND_NM ?? null,
      end_node: link.END_ND_NM ?? null,
      distance_m: Number(link.DIST ?? 0),
      speed_kmh: Number(link.SPD ?? 0),
      congestion: link.IDX ?? null,
      xylist: link.XYLIST ?? null,
      traffic_time: link.ROAD_TRAFFIC_TIME ?? null,
    };
  })
  .sort(
    (a, b) =>
      (congestionOrder[b.congestion] ?? -1) -
      (congestionOrder[a.congestion] ?? -1),
  );

const dongSummary = buildDongSummary(links, dongFeatures);

const payload = {
  meta: {
    source: "citydata_road_traffic_dong_filtered",
    collected_at: collectedAt.toISOString(),
    extracted_at: new Date().toISOString(),
    citydata_path: path.relative(projectRoot, citydataPath),
    total_links_scanned: byLinkId.size,
    dong_filtered_count: links.length,
    dong_summary_count: dongSummary.length,
    target_dongs: dongFeatures.map(dongNameFor).filter(Boolean),
  },
  dong_summary: dongSummary,
  links,
};

const kst = kstParts(collectedAt);
const outDir = path.join(projectRoot, "data", "raw", "traffic", kst.date);
await mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `${kst.time}.json`);
await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);

const processedDir = path.join(projectRoot, "data", "processed", "traffic");
await mkdir(processedDir, { recursive: true });
const summaryCsvPath = path.join(processedDir, "citydata_dong_traffic_latest.csv");
const summaryJsonPath = path.join(processedDir, "citydata_dong_traffic_latest.json");
const summaryHeader = [
  "collected_at",
  "dong_name",
  "link_count",
  "avg_speed_kmh",
  "congestion_score",
  "congested_link_count",
  "slow_link_count",
  "clear_link_count",
  "total_distance_m",
  "road_names",
];
await writeFile(
  summaryCsvPath,
  [
    csvRow(summaryHeader),
    ...dongSummary.map((row) =>
      csvRow([
        collectedAt.toISOString(),
        row.dong_name,
        row.link_count,
        row.avg_speed_kmh,
        row.congestion_score,
        row.congested_link_count,
        row.slow_link_count,
        row.clear_link_count,
        row.total_distance_m,
        row.road_names,
      ]),
    ),
  ].join("\n") + "\n",
);
await writeFile(
  summaryJsonPath,
  `${JSON.stringify(
    {
      meta: payload.meta,
      dong_summary: dongSummary,
    },
    null,
    2,
  )}\n`,
);

// Also write a "latest" snapshot for the dashboard
const publicOutPath = path.join(projectRoot, "public", "traffic-snapshot.json");
await writeFile(publicOutPath, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `Filtered ${links.length} / ${byLinkId.size} links → ${path.relative(projectRoot, outPath)}`,
);
console.log(`Wrote ${path.relative(projectRoot, summaryCsvPath)}`);
