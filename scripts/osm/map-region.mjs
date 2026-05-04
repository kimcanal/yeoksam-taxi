import fs from "fs";

export const TARGET_DONGS = [
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

export const TARGET_DONG_SET = new Set(TARGET_DONGS);

export const DONG_GEOJSON_PATH = "public/dongs.geojson";

export const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const OVERPASS_REQUEST_TIMEOUT_MS = 45000;
const OVERPASS_MIRROR_ATTEMPTS = 2;
const OVERPASS_RETRY_DELAY_MS = 1200;

const QUERY_PADDING = 0.0022;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function roundCoord(value) {
  return Number(value.toFixed(6));
}

function visitGeometryPositions(geometry, visit) {
  if (!geometry) {
    return;
  }

  if (geometry.type === "Point") {
    visit(geometry.coordinates);
    return;
  }

  if (geometry.type === "LineString" || geometry.type === "MultiPoint") {
    geometry.coordinates.forEach(visit);
    return;
  }

  if (geometry.type === "Polygon" || geometry.type === "MultiLineString") {
    geometry.coordinates.forEach((ring) => ring.forEach(visit));
    return;
  }

  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon) =>
      polygon.forEach((ring) => ring.forEach(visit)),
    );
  }
}

export function geometryBounds(geometry) {
  const bounds = {
    south: Number.POSITIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
  };

  visitGeometryPositions(geometry, ([lon, lat]) => {
    bounds.south = Math.min(bounds.south, lat);
    bounds.west = Math.min(bounds.west, lon);
    bounds.north = Math.max(bounds.north, lat);
    bounds.east = Math.max(bounds.east, lon);
  });

  if (!Number.isFinite(bounds.south)) {
    return null;
  }

  return bounds;
}

export function featureCollectionBounds(featureCollection) {
  const bounds = {
    south: Number.POSITIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
  };

  featureCollection.features.forEach((feature) => {
    const featureBounds = geometryBounds(feature.geometry);
    if (!featureBounds) {
      return;
    }

    bounds.south = Math.min(bounds.south, featureBounds.south);
    bounds.west = Math.min(bounds.west, featureBounds.west);
    bounds.north = Math.max(bounds.north, featureBounds.north);
    bounds.east = Math.max(bounds.east, featureBounds.east);
  });

  if (!Number.isFinite(bounds.south)) {
    throw new Error("Unable to compute bounds for feature collection.");
  }

  return bounds;
}

export function centerFromBounds(bounds) {
  return {
    lat: (bounds.south + bounds.north) / 2,
    lon: (bounds.west + bounds.east) / 2,
  };
}

export function padBounds(bounds, padding = QUERY_PADDING) {
  return {
    south: bounds.south - padding,
    west: bounds.west - padding,
    north: bounds.north + padding,
    east: bounds.east + padding,
  };
}

export function loadDongCollection() {
  if (!fs.existsSync(DONG_GEOJSON_PATH)) {
    throw new Error(
      `Missing ${DONG_GEOJSON_PATH}. Run \"npm run fetch:dongs\" before fetching buildings or roads.`,
    );
  }

  return JSON.parse(fs.readFileSync(DONG_GEOJSON_PATH, "utf8"));
}

export function loadTargetRegion() {
  const dongs = loadDongCollection();
  const bounds = featureCollectionBounds(dongs);
  return {
    dongs,
    bounds,
    center: centerFromBounds(bounds),
    queryBounds: padBounds(bounds),
  };
}

function pointInRing([lon, lat], ring) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[previous];

    const intersects =
      y1 > lat !== y2 > lat &&
      lon < ((x2 - x1) * (lat - y1)) / ((y2 - y1) || Number.EPSILON) + x1;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygonGeometry(point, polygonCoordinates) {
  const [outerRing, ...holes] = polygonCoordinates;
  if (!outerRing?.length || !pointInRing(point, outerRing)) {
    return false;
  }

  return !holes.some((ring) => ring.length && pointInRing(point, ring));
}

export function geometryContainsPoint(geometry, point) {
  if (!geometry) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return pointInPolygonGeometry(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygonGeometry(point, polygon));
  }

  return false;
}

export function representativePointForGeometry(geometry) {
  const bounds = geometryBounds(geometry);
  if (!bounds) {
    return null;
  }

  return [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2];
}

export function geometryTouchesDongs(geometry, dongs) {
  if (!geometry) {
    return false;
  }

  let inside = false;
  visitGeometryPositions(geometry, (point) => {
    if (inside) {
      return;
    }

    if (dongs.some((dong) => geometryContainsPoint(dong.geometry, point))) {
      inside = true;
    }
  });

  if (inside) {
    return true;
  }

  const representativePoint = representativePointForGeometry(geometry);
  if (!representativePoint) {
    return false;
  }

  return dongs.some((dong) => geometryContainsPoint(dong.geometry, representativePoint));
}

export async function fetchOverpassJson(query, { label = "Overpass query" } = {}) {
  let lastError;

  for (const url of OVERPASS_URLS) {
    for (let attempt = 1; attempt <= OVERPASS_MIRROR_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OVERPASS_REQUEST_TIMEOUT_MS);

      try {
        console.log(
          `Trying ${url} for ${label} (${attempt}/${OVERPASS_MIRROR_ATTEMPTS})`,
        );

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "yeoksam-taxi/0.1",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        const raw = await response.text();

        if (!response.ok) {
          throw new Error(`${response.status} ${raw.slice(0, 200)}`);
        }

        return JSON.parse(raw);
      } catch (error) {
        const normalizedError =
          error?.name === "AbortError"
            ? new Error(`Timed out after ${OVERPASS_REQUEST_TIMEOUT_MS}ms`)
            : error;
        lastError = normalizedError;
        console.error(
          `Failed on ${url} for ${label} (${attempt}/${OVERPASS_MIRROR_ATTEMPTS})`,
          normalizedError,
        );

        if (attempt < OVERPASS_MIRROR_ATTEMPTS) {
          await sleep(OVERPASS_RETRY_DELAY_MS * attempt);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  throw lastError;
}

export function keepCachedGeoJson(outputPath, label, error) {
  if (!fs.existsSync(outputPath)) {
    return false;
  }

  const stats = fs.statSync(outputPath);
  console.warn(
    `Using cached ${label} at ${outputPath} (${stats.size} bytes) because refresh failed.`,
  );
  if (error) {
    console.warn(error);
  }
  return true;
}
