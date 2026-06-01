/* scripts/osm/generate-auto-hotspots.js */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 경로
const BUILDINGS_PATH       = path.join(__dirname, '../../public/buildings.geojson');
const TRAFFIC_SIGNALS_PATH = path.join(__dirname, '../../public/traffic-signals.geojson');
const OUTPUT_PATH          = path.join(__dirname, '../../src/components/map-simulator/config/gangnam-pois.json');

// 동별 목표 스팟 수
/** @type {Record<string, number>} */
const DONG_QUOTA = {
  역삼1동: 5, 역삼2동: 5, 삼성1동: 5,
  신사동:  3, 논현1동: 3, 청담동:  3, 삼성2동: 3,
  논현2동: 2, 대치4동: 2,
};

const VALID_DONGS = new Set(Object.keys(DONG_QUOTA));
const MAX_STATION_PER_DONG = 2;

function readGeoJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.features)) {
      console.warn(`[경고] features 배열 없음: ${filePath}`);
      return null;
    }
    return parsed;
  } catch (err) {
    console.error(`[오류] GeoJSON 읽기 실패: ${filePath}\n  → ${err.message}`);
    return null;
  }
}

function polygonCentroid(ring) {
  const pts = (
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  ) ? ring.slice(0, -1) : ring;

  if (pts.length === 0) return null;

  let sumLon = 0;
  let sumLat = 0;
  for (const [lo, la] of pts) {
    sumLon += lo;
    sumLat += la;
  }
  return { lon: sumLon / pts.length, lat: sumLat / pts.length };
}

function extractCoords(feature) {
  const geo = feature?.geometry;
  if (!geo) return null;

  if (geo.type === 'Point') {
    const [lon, lat] = geo.coordinates ?? [];
    return lon != null && lat != null ? { lon, lat } : null;
  }

  if (geo.type === 'Polygon') {
    const ring = geo.coordinates?.[0];
    return ring ? polygonCentroid(ring) : null;
  }

  if (geo.type === 'MultiPolygon') {
    const ring = geo.coordinates?.[0]?.[0];
    return ring ? polygonCentroid(ring) : null;
  }

  return null;
}

function isSubwayEntrance(props) {
  return (
    props.type      === 'subway_entrance' ||
    props.highway   === 'subway_entrance' ||
    props.category  === 'station_entrance' ||
    String(props.name).endsWith('역')
  );
}

// 9개 타겟 행정동 전체를 구제하기 위한 정밀 위경도 경계면(Bounding Box) 연산 매핑
function estimateDongByCoords(lon, lat) {
  if (lon >= 127.015 && lon < 127.030 && lat >= 37.513 && lat <= 37.525) return '신사동';
  if (lon >= 127.018 && lon < 127.033 && lat >= 37.502 && lat < 37.513) return '논현1동';
  if (lon >= 127.033 && lon <= 127.045 && lat >= 37.508 && lat <= 37.518) return '논현2동';
  if (lon >= 127.022 && lon < 127.038 && lat >= 37.490 && lat <= 37.505) return '역삼1동';
  if (lon >= 127.038 && lon <= 127.049 && lat >= 37.495 && lat < 37.508) return '역삼2동';
  if (lon >= 127.035 && lon < 127.048 && lat >= 37.518 && lat <= 37.530) return '청담동';
  if (lon >= 127.043 && lon <= 127.058 && lat >= 37.506 && lat < 37.518) return '삼성2동';
  if (lon >= 127.048 && lon <= 127.068 && lat >= 37.505 && lat <= 37.518) return '삼성1동';
  if (lon >= 127.045 && lon <= 127.065 && lat >= 37.490 && lat < 37.506) return '대치4동';
  return null;
}

function poiCode(n) {
  return `AUTO_POI_${String(n).padStart(3, '0')}`;
}

console.log('▶ 정적 행정동 쿼터 기반 고정 핫스팟 추출 시작\n');

const buildingsData = readGeoJSON(BUILDINGS_PATH);
const signalsData   = readGeoJSON(TRAFFIC_SIGNALS_PATH);

const totalCount   = Object.fromEntries(Object.keys(DONG_QUOTA).map(d => [d, 0]));
const stationCount = Object.fromEntries(Object.keys(DONG_QUOTA).map(d => [d, 0]));

const pois = [];
let counter = 1;

// 1단계: 지하철 출구 우선 선점 (노드 자체 속성 검사 위주로 완화)
if (signalsData) {
  for (const feature of signalsData.features) {
    const props = feature.properties ?? {};
    const coords = extractCoords(feature);
    if (!coords) continue;

    let dong = props.dong;
    if (!dong || !VALID_DONGS.has(dong)) {
      dong = estimateDongByCoords(coords.lon, coords.lat);
    }

    if (!VALID_DONGS.has(dong))          continue;
    if (totalCount[dong]   >= DONG_QUOTA[dong]) continue;
    if (stationCount[dong] >= MAX_STATION_PER_DONG) continue;
    if (!isSubwayEntrance(props))        continue;

    pois.push({
      code:          poiCode(counter),
      name:          props.name ? `${props.name}` : `${dong} 역출구 스팟`,
      coverage_dong: dong,
      category:      'station_context',
      lon:           coords.lon,
      lat:           coords.lat,
      note:          `${dong} 인프라 연동 지하철역 출구 핫스팟`,
    });

    stationCount[dong] += 1;
    totalCount[dong]   += 1;
    counter            += 1;
  }
}

// 2단계: 잔여 쿼터 건물 보충
if (buildingsData) {
  for (const feature of buildingsData.features) {
    const props = feature.properties ?? {};
    const coords = extractCoords(feature);
    if (!coords) continue;

    let dong = props.dong;
    if (!dong || !VALID_DONGS.has(dong)) {
      dong = estimateDongByCoords(coords.lon, coords.lat);
    }

    if (!VALID_DONGS.has(dong))          continue;
    if (totalCount[dong] >= DONG_QUOTA[dong]) continue;

    pois.push({
      code:          poiCode(counter),
      name:          props.name ? `${props.name} 앞` : `${dong} 도로변 건물`,
      coverage_dong: dong,
      category:      'road_corridor_context',
      lon:           coords.lon,
      lat:           coords.lat,
      note:          `${dong} 도로 인접 건물 기반 승하차 스팟`,
    });

    totalCount[dong] += 1;
    counter          += 1;
  }
}

// 3단계: 저장
const output = {
  version:      5,
  generated_at: new Date().toISOString().split('T')[0],
  description:  '동별 정적 쿼터 및 대로변 역출구 최대 2개 필터 적용 핫스팟 셋',
  context_pois: pois,
};

try {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`저장 완료: ${OUTPUT_PATH}\n`);
} catch (err) {
  console.error(`[오류] 파일 저장 실패: ${err.message}`);
  process.exit(1);
}

// 결과 출력 요약
const COL = { dong: 10, station: 14, building: 10, total: 12, quota: 10 };
const pad = (str, n) => String(str).padEnd(n);
const lpad = (str, n) => String(str).padStart(n);

const header = [
  pad('행정동',      COL.dong),
  pad('역출구 수',   COL.station),
  pad('건물 수',     COL.building),
  lpad('배정',       COL.total),
  lpad('목표',       COL.quota),
].join('  ');

console.log(header);
console.log('─'.repeat(header.length));

let grandTotal = 0;
for (const dong of VALID_DONGS) {
  const station  = stationCount[dong];
  const building = totalCount[dong] - station;
  const total    = totalCount[dong];
  const quota    = DONG_QUOTA[dong];
  const flag     = total < quota ? ' 미달' : '';

  console.log([
    pad(dong,          COL.dong),
    pad(station,       COL.station),
    pad(building,      COL.building),
    lpad(total,        COL.total),
    lpad(`${quota}${flag}`, COL.quota),
  ].join('  '));

  grandTotal += total;
}

console.log('─'.repeat(header.length));
console.log(`${'합계'.padEnd(COL.dong + COL.station + COL.building + 4)}  ${lpad(grandTotal, COL.total)}`);
console.log(`\n총 POI: ${pois.length}개`);