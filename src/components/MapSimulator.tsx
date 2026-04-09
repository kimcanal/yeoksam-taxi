'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from 'geojson';

const TAXI_COUNT = 12;
const TRAFFIC_COUNT = 16;
const POSITION_SCALE = 0.2;
const ROAD_WIDTH_SCALE = 0.6;
const BUILDING_HEIGHT_SCALE = 0.2;
const SIGNAL_RADIUS = 7;
const SIGNAL_CYCLE = 24;
const DEFAULT_MAP_CENTER = { lat: 37.5, lon: 127.0328 };
const HOTSPOT_SLOWDOWN_DISTANCE = 16;
const HOTSPOT_TRIGGER_DISTANCE = 1.2;
const SERVICE_STOP_DURATION = 1.6;
const INTERSECTION_OCCUPANCY_RADIUS = 3.8;
const INTERSECTION_OCCUPANCY_LOOKAHEAD = 6;
const CROSSWALK_STRIPE_COUNT = 6;
const CROSSWALK_STEP = 1.1;
const CROSSWALK_WIDTH = 6.2;
const PEDESTRIAN_SPAN = 4.2;
const CAMERA_DRIVE_SPEED = 26;
const CAMERA_STRAFE_SPEED = 22;
const CAMERA_TURN_SPEED = 1.95;
const CAMERA_BASE_MOVE_SCALE = 1.8;
const CAMERA_BASE_TURN_SCALE = 0.95;
const CAMERA_DRAG_SENSITIVITY = 0.0042;
const CAMERA_MIN_DISTANCE = 34;
const CAMERA_MAX_DISTANCE = 560;
const CAMERA_MIN_PITCH = 0.34;
const CAMERA_MAX_PITCH = 1.16;
const CAMERA_LOOK_HEIGHT = 6;
const SHOW_DONG_BOUNDARIES = false;
const DRIVE_RENDER_FPS = 60;
const FOLLOW_RENDER_FPS = 60;
const OVERVIEW_RENDER_FPS = 60;
const HIDDEN_RENDER_FPS = 12;
const DRIVE_PIXEL_RATIO = 0.9;
const FOLLOW_PIXEL_RATIO = 0.9;
const OVERVIEW_PIXEL_RATIO = 0.8;
const HIDDEN_PIXEL_RATIO = 0.65;
const ROAD_LAYER_Y = {
  local: 0.116,
  connector: 0.121,
  arterial: 0.126,
} as const;

type SignalAxis = 'ns' | 'ew';
type TurnMovement = 'straight' | 'left' | 'right';
type SignalPhase =
  | 'ns_flow'
  | 'ns_left'
  | 'ew_flow'
  | 'ew_left'
  | 'ped_walk'
  | 'ped_flash'
  | 'clearance';

type RoadProperties = {
  roadClass: 'arterial' | 'connector' | 'local';
  width: number;
  name: string | null;
  highway: string | null;
};

type BuildingProperties = {
  height: number;
  area: number;
  label: string | null;
  kind: string | null;
  address: string | null;
};

type DongProperties = {
  name: string;
  nameEn: string | null;
};

type TransitCategory = 'bus_stop' | 'subway_station';

type TransitProperties = {
  category: TransitCategory;
  name: string | null;
  operator: string | null;
  network: string | null;
  ref: string | null;
  sourceType: string | null;
  importance: number;
};

type RoadFeature = Feature<LineString | MultiLineString, RoadProperties>;
type BuildingFeature = Feature<Polygon | MultiPolygon, BuildingProperties>;
type DongFeature = Feature<Polygon | MultiPolygon, DongProperties>;
type TransitFeature = Feature<Point, TransitProperties>;
type RoadFeatureCollection = FeatureCollection<LineString | MultiLineString, RoadProperties>;
type BuildingFeatureCollection = FeatureCollection<Polygon | MultiPolygon, BuildingProperties>;
type DongFeatureCollection = FeatureCollection<Polygon | MultiPolygon, DongProperties>;
type TransitFeatureCollection = FeatureCollection<Point, TransitProperties>;

type AssetMeta = {
  path: string;
  lastModified: string | null;
  featureCount: number;
};

type SimulationMeta = {
  source: string;
  boundarySource: string;
  latestAssetUpdatedAt: string | null;
  loadedAt: string;
  assets: {
    roads: AssetMeta;
    buildings: AssetMeta;
    dongs: AssetMeta;
    transit: AssetMeta;
  };
};

type RouteNode = {
  key: string;
  point: THREE.Vector3;
};

type SignalData = {
  id: string;
  key: string;
  point: THREE.Vector3;
  offset: number;
};

type SignalFlow = {
  phase: SignalPhase;
  ns: 'green' | 'red';
  ew: 'green' | 'red';
  nsLeft: boolean;
  ewLeft: boolean;
  pedestrian: 'walk' | 'flash' | 'stop';
};

type StopMarker = {
  signalId: string;
  distance: number;
  axis: SignalAxis;
  turn: TurnMovement;
};

type RouteTemplate = {
  id: string;
  name: string | null;
  roadClass: RoadProperties['roadClass'];
  roadWidth: number;
  laneOffset: number;
  nodes: RouteNode[];
  cumulative: number[];
  totalLength: number;
  stops: StopMarker[];
  startKey: string;
  endKey: string;
  isLoop: boolean;
};

type VehiclePalette = {
  body: number;
  cabin: number;
  sign: number | null;
};

type VehicleKind = 'taxi' | 'traffic';
type VehiclePlanMode = 'traffic' | 'pickup' | 'dropoff';
type CameraMode = 'drive' | 'overview' | 'follow';
type WeatherMode = 'clear' | 'cloudy' | 'heavy-rain' | 'heavy-snow';

type Vehicle = {
  id: string;
  kind: VehicleKind;
  route: RouteTemplate;
  group: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  signMaterial: THREE.MeshStandardMaterial | null;
  baseSpeed: number;
  speed: number;
  distance: number;
  safeGap: number;
  length: number;
  currentSignalId: string | null;
  roadName: string | null;
  palette: VehiclePalette;
  isOccupied: boolean;
  pickupHotspot: Hotspot | null;
  dropoffHotspot: Hotspot | null;
  serviceTimer: number;
  planMode: VehiclePlanMode;
};

type Stats = {
  taxis: number;
  traffic: number;
  waiting: number;
  signals: number;
  activeTrips: number;
  completedTrips: number;
  pedestrians: number;
};

type FpsStats = {
  fps: number;
  cap: number;
};

type TaxiOption = {
  id: string;
  label: string;
  detail: string;
};

type WeatherOption = {
  id: WeatherMode;
  label: string;
  detail: string;
};

type SimulationData = {
  center: { lat: number; lon: number };
  roads: RoadFeatureCollection;
  buildings: BuildingFeatureCollection;
  dongs: DongFeatureCollection;
  transit: TransitFeatureCollection;
  meta: SimulationMeta;
};

type Hotspot = {
  id: string;
  nodeKey: string;
  routeId: string;
  distance: number;
  position: THREE.Vector3;
  point: THREE.Vector3;
  label: string;
  roadName: string | null;
};

type BuildingMass = {
  id: string;
  label: string | null;
  height: number;
  position: THREE.Vector3;
  width: number;
  depth: number;
  color: number;
};

type DongRegion = {
  id: string;
  name: string;
  nameEn: string | null;
  position: THREE.Vector3;
  rings: THREE.Vector3[][];
  color: number;
};

type DongBoundarySegment = {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  center: THREE.Vector3;
  angle: number;
  length: number;
  leftDong: string | null;
  rightDong: string | null;
};

type ProjectedRoadSegment = {
  roadClass: RoadProperties['roadClass'];
  width: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  name: string | null;
};

type TransitLandmark = {
  id: string;
  category: TransitCategory;
  name: string | null;
  position: THREE.Vector3;
  heading: THREE.Vector3;
  sideSign: 1 | -1;
  yaw: number;
  importance: number;
  roadClass: RoadProperties['roadClass'] | null;
  isMajor: boolean;
};

type NearestRoadContext = {
  closest: THREE.Vector3;
  heading: THREE.Vector3;
  width: number;
  roadClass: RoadProperties['roadClass'];
  name: string | null;
  distance: number;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  roadClass: RoadProperties['roadClass'];
  roadWidth: number;
  length: number;
  name: string | null;
};

type RoadGraph = {
  nodes: Map<string, RouteNode>;
  adjacency: Map<string, GraphEdge[]>;
  edgeIndex: Map<string, GraphEdge>;
};

type SignalVisual = SignalData & {
  group: THREE.Group;
  reds: THREE.Mesh[];
  greens: THREE.Mesh[];
  leftArrows: THREE.Mesh[];
  pedestrianLamps: THREE.Mesh[];
};

type PedestrianVisual = {
  signalId: string;
  axis: SignalAxis;
  group: THREE.Group;
  phaseOffset: number;
  speed: number;
  lateralOffset: number;
  direction: 1 | -1;
};

type HotspotVisual = {
  hotspot: Hotspot;
  base: THREE.Mesh;
  glow: THREE.Mesh;
  beacon: THREE.Mesh;
  ring: THREE.Mesh;
  callerGroup: THREE.Group;
  waveArmPivot: THREE.Group;
  hailCube: THREE.Mesh;
  callBadge: CSS2DObject;
};

type EnvironmentState = {
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
  groundColor: number;
  roadColors: Record<RoadProperties['roadClass'], number>;
  roadRoughness: number;
  roadMetalness: number;
  laneMarkerColor: number;
  laneMarkerEmissive: number;
  laneMarkerIntensity: number;
  crosswalkColor: number;
  crosswalkEmissive: number;
  crosswalkIntensity: number;
  stopLineColor: number;
  stopLineEmissive: number;
  stopLineIntensity: number;
  buildingTint: number;
  buildingEmissive: number;
  buildingEmissiveIntensity: number;
  precipitation: 'none' | 'rain' | 'snow';
  precipitationOpacity: number;
  precipitationIntensity: number;
  vehicleSpeedMultiplier: number;
  exposure: number;
};

const TAXI_PALETTE: VehiclePalette = {
  body: 0xffcb44,
  cabin: 0xfff1a4,
  sign: 0xfff9d8,
};

const TRAFFIC_PALETTES: VehiclePalette[] = [
  { body: 0x78c4ff, cabin: 0xdff3ff, sign: null },
  { body: 0xff8f66, cabin: 0xffdcc9, sign: null },
  { body: 0x79d58f, cabin: 0xe2fae8, sign: null },
  { body: 0x7f9aff, cabin: 0xe2e8ff, sign: null },
  { body: 0xffb15c, cabin: 0xffead1, sign: null },
];

const MINUTES_PER_DAY = 24 * 60;

const WEATHER_OPTIONS: WeatherOption[] = [
  { id: 'clear', label: '맑음', detail: '기본 시야와 표준 주행 속도' },
  { id: 'cloudy', label: '흐림', detail: '광량 감소, 가벼운 감속' },
  { id: 'heavy-rain', label: '폭우', detail: '빗줄기와 젖은 도로, 시야는 보수적으로 유지' },
  { id: 'heavy-snow', label: '폭설', detail: '눈발과 차가운 톤, 과한 안개 없이 표현' },
];

const TIME_PRESETS = [
  { label: '06:00', minutes: 6 * 60, detail: '새벽' },
  { label: '12:00', minutes: 12 * 60, detail: '한낮' },
  { label: '18:30', minutes: 18 * 60 + 30, detail: '노을' },
  { label: '23:00', minutes: 23 * 60, detail: '심야' },
];

function normalizeDayMinutes(minutes: number) {
  return ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function format24Hour(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatKstDateTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return `${partMap.get('year')}-${partMap.get('month')}-${partMap.get('day')} ${partMap.get('hour')}:${partMap.get('minute')} KST`;
}

async function fetchGeoJsonAsset<T extends FeatureCollection>(
  path: string,
): Promise<{ data: T; meta: AssetMeta }> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  const data = (await response.json()) as T;
  return {
    data,
    meta: {
      path,
      lastModified: formatKstDateTime(response.headers.get('last-modified') ?? ''),
      featureCount: Array.isArray(data.features) ? data.features.length : 0,
    },
  };
}

function timeBandLabel(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  if (normalized < 300) return '심야';
  if (normalized < 420) return '새벽';
  if (normalized < 720) return '오전';
  if (normalized < 1020) return '오후';
  if (normalized < 1260) return '저녁';
  return '야간';
}

function daylightFactor(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  const daylightAngle = ((normalized - 6 * 60) / (12 * 60)) * Math.PI;
  return THREE.MathUtils.clamp(Math.sin(daylightAngle), 0, 1);
}

function twilightFactor(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  const sunriseWindow = 1 - THREE.MathUtils.clamp(Math.abs(normalized - 6 * 60) / 110, 0, 1);
  const sunsetWindow = 1 - THREE.MathUtils.clamp(Math.abs(normalized - 18 * 60) / 130, 0, 1);
  return Math.max(sunriseWindow, sunsetWindow);
}

function sunsetFactor(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  return 1 - THREE.MathUtils.clamp(Math.abs(normalized - (18 * 60 + 30)) / 95, 0, 1);
}

function mixHexColor(start: number, end: number, alpha: number) {
  return new THREE.Color(start).lerp(new THREE.Color(end), THREE.MathUtils.clamp(alpha, 0, 1)).getHex();
}

function scaleHexColor(value: number, factor: number) {
  return new THREE.Color(value).multiplyScalar(factor).getHex();
}

function buildEnvironmentState(minutes: number, weatherMode: WeatherMode): EnvironmentState {
  const normalizedMinutes = normalizeDayMinutes(minutes);
  const daylight = daylightFactor(normalizedMinutes);
  const twilight = twilightFactor(normalizedMinutes);
  const sunset = sunsetFactor(normalizedMinutes);
  const sunAngle = (normalizedMinutes / MINUTES_PER_DAY) * Math.PI * 2 - Math.PI / 2;
  const cloudCover =
    weatherMode === 'clear' ? 0.05 : weatherMode === 'cloudy' ? 0.24 : weatherMode === 'heavy-rain' ? 0.48 : 0.38;
  const skyDayColor =
    weatherMode === 'clear'
      ? 0x7fc8ff
      : weatherMode === 'cloudy'
        ? 0x9cb2c2
        : weatherMode === 'heavy-rain'
          ? 0x738899
          : 0xe2edf8;
  const skyNightColor =
    weatherMode === 'heavy-snow' ? 0x1b2736 : weatherMode === 'heavy-rain' ? 0x0a121d : 0x08111c;
  const fogDayColor =
    weatherMode === 'clear'
      ? 0xa4d7ef
      : weatherMode === 'cloudy'
        ? 0xa6b7c3
        : weatherMode === 'heavy-rain'
          ? 0x7d8d99
          : 0xe8f0f7;
  const fogNightColor =
    weatherMode === 'heavy-snow' ? 0x243243 : weatherMode === 'heavy-rain' ? 0x0c1520 : 0x0a121c;
  const weatherSpeedMultiplier =
    weatherMode === 'clear' ? 1 : weatherMode === 'cloudy' ? 0.97 : weatherMode === 'heavy-rain' ? 0.9 : 0.82;
  const nightSpeedMultiplier = daylight < 0.12 ? 0.94 : daylight < 0.3 ? 0.97 : 1;
  const sunsetSkyColor = weatherMode === 'heavy-snow' ? 0xffd8c2 : 0xff9d5c;
  const sunsetFogColor = weatherMode === 'heavy-snow' ? 0xffe7d8 : 0xffb579;
  const nightBuildingFactor = THREE.MathUtils.clamp((0.22 - daylight) / 0.22, 0, 1);

  const baseSkyColor = mixHexColor(skyNightColor, skyDayColor, daylight + twilight * 0.1);
  const baseFogColor = mixHexColor(fogNightColor, fogDayColor, daylight * 0.88 + twilight * 0.08);
  const neutralGroundColor =
    weatherMode === 'heavy-snow' ? 0x2a3442 : weatherMode === 'heavy-rain' ? 0x101924 : 0x101b26;
  const roadBaseColors =
    weatherMode === 'heavy-snow'
      ? {
          arterial: 0x466289,
          connector: 0x3c556f,
          local: 0x334557,
        }
      : weatherMode === 'heavy-rain'
        ? {
            arterial: 0x2a466b,
            connector: 0x233b57,
            local: 0x1d2c3c,
          }
        : {
            arterial: 0x2c4d7c,
            connector: 0x27425f,
            local: 0x223243,
          };
  const lightingPreset =
    weatherMode === 'clear'
      ? {
          ambientColor: 0xf4f8ff,
          ambientIntensity: 0.76,
          hemiSkyColor: 0xdce9ff,
          hemiGroundColor: 0x415468,
          hemiIntensity: 0.88,
          sunColor: 0xfffbf2,
          sunIntensity: 0.9,
          fogNear: 144,
          fogFar: 410,
          exposure: 1.1,
        }
      : weatherMode === 'cloudy'
        ? {
            ambientColor: 0xecf2fb,
            ambientIntensity: 0.74,
            hemiSkyColor: 0xd2deed,
            hemiGroundColor: 0x3d4d60,
            hemiIntensity: 0.84,
            sunColor: 0xf8fbff,
            sunIntensity: 0.82,
            fogNear: 138,
            fogFar: 392,
            exposure: 1.08,
          }
        : weatherMode === 'heavy-rain'
          ? {
              ambientColor: 0xe5edf7,
              ambientIntensity: 0.72,
              hemiSkyColor: 0xc5d4e6,
              hemiGroundColor: 0x334153,
              hemiIntensity: 0.8,
              sunColor: 0xf0f4fa,
              sunIntensity: 0.74,
              fogNear: 124,
              fogFar: 350,
              exposure: 1.05,
            }
          : {
              ambientColor: 0xf6fbff,
              ambientIntensity: 0.8,
              hemiSkyColor: 0xe4effc,
              hemiGroundColor: 0x47586b,
              hemiIntensity: 0.88,
              sunColor: 0xf8fbff,
              sunIntensity: 0.82,
              fogNear: 132,
              fogFar: 362,
              exposure: 1.08,
            };

  return {
    skyColor: mixHexColor(baseSkyColor, sunsetSkyColor, sunset * 0.72),
    fogColor: mixHexColor(baseFogColor, sunsetFogColor, sunset * 0.54),
    fogNear: lightingPreset.fogNear,
    fogFar: lightingPreset.fogFar,
    ambientColor: lightingPreset.ambientColor,
    ambientIntensity: lightingPreset.ambientIntensity,
    hemiSkyColor: lightingPreset.hemiSkyColor,
    hemiGroundColor: lightingPreset.hemiGroundColor,
    hemiIntensity: lightingPreset.hemiIntensity,
    sunColor: lightingPreset.sunColor,
    sunIntensity: lightingPreset.sunIntensity,
    sunPosition: new THREE.Vector3(
      Math.cos(sunAngle) * 160,
      THREE.MathUtils.lerp(22, 186, Math.max(0, Math.sin(sunAngle))),
      Math.sin(sunAngle + 0.7) * 115,
    ),
    groundColor: neutralGroundColor,
    roadColors: {
      arterial: scaleHexColor(roadBaseColors.arterial, 1 - cloudCover * 0.04),
      connector: scaleHexColor(roadBaseColors.connector, 1 - cloudCover * 0.04),
      local: scaleHexColor(roadBaseColors.local, 1 - cloudCover * 0.03),
    },
    roadRoughness: weatherMode === 'heavy-rain' ? 0.78 : weatherMode === 'heavy-snow' ? 0.84 : 0.95,
    roadMetalness: weatherMode === 'heavy-rain' ? 0.14 : weatherMode === 'heavy-snow' ? 0.05 : 0.02,
    laneMarkerColor: weatherMode === 'heavy-snow' ? 0xfbfdff : 0xffefb0,
    laneMarkerEmissive: daylight < 0.22 ? 0xb98f2c : weatherMode === 'heavy-rain' ? 0x6f5720 : 0x866000,
    laneMarkerIntensity: daylight < 0.2 ? 0.34 : weatherMode === 'heavy-rain' ? 0.2 : 0.16,
    crosswalkColor: weatherMode === 'heavy-snow' ? 0xffffff : 0xf0f6ff,
    crosswalkEmissive: daylight < 0.2 ? 0x4c5664 : 0x39424f,
    crosswalkIntensity: daylight < 0.2 ? 0.18 : 0.08,
    stopLineColor: weatherMode === 'heavy-snow' ? 0xffffff : 0xf7fbff,
    stopLineEmissive: daylight < 0.2 ? 0x526579 : 0x394959,
    stopLineIntensity: daylight < 0.2 ? 0.2 : 0.12,
    buildingTint: weatherMode === 'heavy-snow' ? 0xf3f8ff : weatherMode === 'heavy-rain' ? 0xf7fafc : 0xffffff,
    buildingEmissive: mixHexColor(0x1f2c3a, 0x4a6488, nightBuildingFactor * 0.34 + twilight * 0.12),
    buildingEmissiveIntensity: 0.12 + twilight * 0.05 + nightBuildingFactor * 0.16,
    precipitation:
      weatherMode === 'heavy-rain' ? 'rain' : weatherMode === 'heavy-snow' ? 'snow' : 'none',
    precipitationOpacity:
      weatherMode === 'heavy-rain' ? 0.24 : weatherMode === 'heavy-snow' ? 0.42 : 0,
    precipitationIntensity: weatherMode === 'heavy-rain' ? 0.55 : weatherMode === 'heavy-snow' ? 0.4 : 0,
    vehicleSpeedMultiplier: weatherSpeedMultiplier * nightSpeedMultiplier,
    exposure: lightingPreset.exposure,
  };
}

function renderFpsCapFor(mode: CameraMode) {
  switch (mode) {
    case 'overview':
      return OVERVIEW_RENDER_FPS;
    case 'follow':
      return FOLLOW_RENDER_FPS;
    default:
      return DRIVE_RENDER_FPS;
  }
}

function renderPixelRatioFor(mode: CameraMode, isHidden: boolean) {
  if (isHidden) {
    return HIDDEN_PIXEL_RATIO;
  }

  switch (mode) {
    case 'overview':
      return OVERVIEW_PIXEL_RATIO;
    case 'follow':
      return FOLLOW_PIXEL_RATIO;
    default:
      return DRIVE_PIXEL_RATIO;
  }
}

function geoKey(position: Position) {
  return `${position[0].toFixed(5)}:${position[1].toFixed(5)}`;
}

function visitGeometryPositions(
  geometry: LineString | MultiLineString | Polygon | MultiPolygon,
  visit: (position: Position) => void,
) {
  if (geometry.type === 'LineString') {
    geometry.coordinates.forEach(visit);
    return;
  }

  if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') {
    geometry.coordinates.forEach((line) => line.forEach(visit));
    return;
  }

  geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => ring.forEach(visit)));
}

function featureCollectionCenter(
  featureCollection: FeatureCollection<LineString | MultiLineString | Polygon | MultiPolygon>,
) {
  let south = Number.POSITIVE_INFINITY;
  let west = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;

  featureCollection.features.forEach((feature) => {
    visitGeometryPositions(feature.geometry, ([lon, lat]) => {
      south = Math.min(south, lat);
      west = Math.min(west, lon);
      north = Math.max(north, lat);
      east = Math.max(east, lon);
    });
  });

  if (!Number.isFinite(south)) {
    return DEFAULT_MAP_CENTER;
  }

  return {
    lat: (south + north) / 2,
    lon: (west + east) / 2,
  };
}

function projectPoint(position: Position, center: { lat: number; lon: number }) {
  const latFactor = 110540 * POSITION_SCALE;
  const lonFactor = 111320 * Math.cos((center.lat * Math.PI) / 180) * POSITION_SCALE;
  return new THREE.Vector3(
    (position[0] - center.lon) * lonFactor,
    0,
    -(position[1] - center.lat) * latFactor,
  );
}

function lineStringsOfRoad(feature: RoadFeature, center: { lat: number; lon: number }) {
  if (feature.geometry.type === 'LineString') {
    return [
      feature.geometry.coordinates.map((coordinate) => ({
        key: geoKey(coordinate),
        point: projectPoint(coordinate, center),
      })),
    ];
  }

  return feature.geometry.coordinates.map((line) =>
    line.map((coordinate) => ({
      key: geoKey(coordinate),
      point: projectPoint(coordinate, center),
    })),
  );
}

function outerRingOfBuilding(feature: BuildingFeature, center: { lat: number; lon: number }) {
  const ring =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates[0]?.[0] ?? [];

  return ring.map((coordinate) => projectPoint(coordinate, center));
}

function outerRingsOfDong(feature: DongFeature, center: { lat: number; lon: number }) {
  if (feature.geometry.type === 'Polygon') {
    const ring = feature.geometry.coordinates[0] ?? [];
    return ring.length ? [ring.map((coordinate) => projectPoint(coordinate, center))] : [];
  }

  return feature.geometry.coordinates
    .map((polygon) => polygon[0] ?? [])
    .filter((ring) => ring.length)
    .map((ring) => ring.map((coordinate) => projectPoint(coordinate, center)));
}

function distanceXZ(start: THREE.Vector3, end: THREE.Vector3) {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function buildCumulative(points: THREE.Vector3[]) {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1] + distanceXZ(points[index - 1], points[index]));
  }
  return cumulative;
}

function normalizeDistance(value: number, totalLength: number) {
  if (totalLength <= 0) {
    return 0;
  }
  return ((value % totalLength) + totalLength) % totalLength;
}

function clampRouteDistance(route: RouteTemplate, value: number) {
  if (route.isLoop) {
    return normalizeDistance(value, route.totalLength);
  }
  return THREE.MathUtils.clamp(value, 0, route.totalLength);
}

function routeDistanceAhead(route: RouteTemplate, current: number, target: number) {
  if (route.isLoop) {
    const normalizedCurrent = normalizeDistance(current, route.totalLength);
    const normalizedTarget = normalizeDistance(target, route.totalLength);
    if (normalizedTarget >= normalizedCurrent) {
      return normalizedTarget - normalizedCurrent;
    }
    return route.totalLength - normalizedCurrent + normalizedTarget;
  }

  if (target < current) {
    return Number.POSITIVE_INFINITY;
  }
  return target - current;
}

function offsetToRight(position: THREE.Vector3, heading: THREE.Vector3, offset: number) {
  const right = new THREE.Vector3(heading.z, 0, -heading.x).normalize();
  return position.clone().addScaledVector(right, offset);
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function dampAngle(current: number, target: number, lambda: number, delta: number) {
  const gap = wrapAngle(target - current);
  return wrapAngle(current + gap * (1 - Math.exp(-lambda * delta)));
}

function sampleRoute(route: RouteTemplate, distance: number) {
  if (route.nodes.length < 2 || route.totalLength <= 0) {
    return {
      position: route.nodes[0]?.point.clone() ?? new THREE.Vector3(),
      heading: new THREE.Vector3(0, 0, 1),
      segmentIndex: 0,
    };
  }

  const clampedDistance = clampRouteDistance(route, distance);
  let segmentIndex = 0;
  while (
    segmentIndex < route.cumulative.length - 2 &&
    route.cumulative[segmentIndex + 1] < clampedDistance
  ) {
    segmentIndex += 1;
  }

  const start = route.nodes[segmentIndex].point;
  const end = route.nodes[segmentIndex + 1]?.point ?? start;
  const segmentStart = route.cumulative[segmentIndex];
  const segmentLength = Math.max(distanceXZ(start, end), 0.0001);
  const heading = end.clone().sub(start);
  if (heading.lengthSq() < 0.0001) {
    heading.set(0, 0, 1);
  } else {
    heading.normalize();
  }

  return {
    position: start.clone().lerp(end, (clampedDistance - segmentStart) / segmentLength),
    heading,
    segmentIndex,
  };
}

function dominantAxis(start: THREE.Vector3, end: THREE.Vector3): SignalAxis {
  return Math.abs(end.x - start.x) > Math.abs(end.z - start.z) ? 'ew' : 'ns';
}

function classifyTurn(
  previous: THREE.Vector3,
  current: THREE.Vector3,
  next: THREE.Vector3,
): TurnMovement {
  const incoming = current.clone().sub(previous).normalize();
  const outgoing = next.clone().sub(current).normalize();
  const dot = incoming.dot(outgoing);
  if (dot > 0.72) {
    return 'straight';
  }
  const cross = incoming.x * outgoing.z - incoming.z * outgoing.x;
  return cross > 0 ? 'right' : 'left';
}

function colorForBuilding(height: number) {
  if (height >= 45) return 0x6f8fce;
  if (height >= 25) return 0x4c6a9f;
  return 0x334760;
}

function buildDongRegions(dongs: DongFeatureCollection, center: { lat: number; lon: number }) {
  const colors = [0x68d4ff, 0x5fe0c4, 0xffc765, 0xff9171, 0x8cb8ff];

  return dongs.features
    .map((feature, index) => {
      const rings = outerRingsOfDong(feature, center).filter((ring) => ring.length >= 3);
      if (!rings.length) {
        return null;
      }

      const bounds = new THREE.Box3();
      rings.forEach((ring) => ring.forEach((point) => bounds.expandByPoint(point)));

      return {
        id: `dong-${index}`,
        name: feature.properties.name,
        nameEn: feature.properties.nameEn,
        position: bounds.getCenter(new THREE.Vector3()),
        rings,
        color: colors[index % colors.length],
      } satisfies DongRegion;
    })
    .filter(Boolean) as DongRegion[];
}

function pointInDongRing(point: THREE.Vector3, ring: THREE.Vector3[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index];
    const prior = ring[previous];
    const intersects =
      (current.z > point.z) !== (prior.z > point.z) &&
      point.x <
        ((prior.x - current.x) * (point.z - current.z)) /
          ((prior.z - current.z) || Number.EPSILON) +
          current.x;

    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function dongContainsPoint(dong: DongRegion, point: THREE.Vector3) {
  return dong.rings.some((ring) => ring.length >= 3 && pointInDongRing(point, ring));
}

function canonicalBoundaryPoint(point: THREE.Vector3) {
  return `${point.x.toFixed(3)}:${point.z.toFixed(3)}`;
}

function buildDongBoundarySegments(dongRegions: DongRegion[]) {
  const segmentMap = new Map<
    string,
    {
      start: THREE.Vector3;
      end: THREE.Vector3;
    }
  >();

  dongRegions.forEach((dong) => {
    dong.rings.forEach((ring) => {
      for (let index = 0; index < ring.length - 1; index += 1) {
        const start = ring[index];
        const end = ring[index + 1];
        const length = distanceXZ(start, end);
        if (length < 1.5) {
          continue;
        }

        const useOriginalOrder =
          start.x < end.x || (Math.abs(start.x - end.x) < 0.001 && start.z <= end.z);
        const canonicalStart = useOriginalOrder ? start : end;
        const canonicalEnd = useOriginalOrder ? end : start;
        const key = `${canonicalBoundaryPoint(canonicalStart)}|${canonicalBoundaryPoint(canonicalEnd)}`;

        if (!segmentMap.has(key)) {
          segmentMap.set(key, {
            start: canonicalStart.clone(),
            end: canonicalEnd.clone(),
          });
        }
      }
    });
  });

  return [...segmentMap.entries()]
    .map(([key, value]) => {
      const direction = value.end.clone().sub(value.start);
      const length = direction.length();
      const center = value.start.clone().lerp(value.end, 0.5);
      const normal = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
      const probeDistance = Math.min(Math.max(length * 0.08, 0.9), 2.2);
      const leftProbe = center.clone().addScaledVector(normal, probeDistance);
      const rightProbe = center.clone().addScaledVector(normal, -probeDistance);
      const leftDong =
        dongRegions.find((dong) => dongContainsPoint(dong, leftProbe))?.name ?? null;
      const rightDong =
        dongRegions.find((dong) => dongContainsPoint(dong, rightProbe))?.name ?? null;

      return {
        id: key,
        start: value.start,
        end: value.end,
        center,
        angle: Math.atan2(value.end.x - value.start.x, value.end.z - value.start.z),
        length,
        leftDong,
        rightDong,
      } satisfies DongBoundarySegment;
    })
    .filter(
      (segment) =>
        Boolean(segment.leftDong) &&
        Boolean(segment.rightDong) &&
        segment.leftDong !== segment.rightDong,
    );
}

function boundaryHintElement() {
  const element = document.createElement('div');
  element.style.padding = '8px 14px';
  element.style.borderRadius = '16px';
  element.style.border = '1px solid rgba(162,255,187,0.28)';
  element.style.background = 'rgba(5,28,18,0.88)';
  element.style.color = '#d9ffe5';
  element.style.fontSize = '12px';
  element.style.fontWeight = '600';
  element.style.fontFamily = 'Pretendard, SUIT Variable, sans-serif';
  element.style.letterSpacing = '0.02em';
  element.style.whiteSpace = 'nowrap';
  element.style.pointerEvents = 'none';
  element.style.boxShadow = '0 10px 28px rgba(0,0,0,0.28)';
  element.style.position = 'absolute';
  element.style.left = '0';
  element.style.top = '0';
  element.style.transform = 'translate(14px, -18px)';
  element.style.zIndex = '12';
  element.style.display = 'none';
  return element;
}

function dongShapeFromRing(ring: THREE.Vector3[]) {
  const points = ring.map((point) => new THREE.Vector2(point.x, -point.z));
  if (points.length > 1 && points[0].distanceTo(points[points.length - 1]) < 0.001) {
    points.pop();
  }
  if (points.length < 3) {
    return null;
  }
  if (THREE.ShapeUtils.isClockWise(points)) {
    points.reverse();
  }
  return new THREE.Shape(points);
}

function nearestRoadContext(
  point: THREE.Vector3,
  roadSegments: ProjectedRoadSegment[],
): NearestRoadContext | null {
  let best: NearestRoadContext | null = null;

  roadSegments.forEach((segment) => {
    const delta = segment.end.clone().sub(segment.start);
    const lengthSq = delta.lengthSq();
    if (lengthSq < 0.0001) {
      return;
    }

    const t = THREE.MathUtils.clamp(
      point.clone().sub(segment.start).dot(delta) / lengthSq,
      0,
      1,
    );
    const closest = segment.start.clone().lerp(segment.end, t);
    const distance = distanceXZ(point, closest);
    if (best && distance >= best.distance) {
      return;
    }

    best = {
      closest,
      heading: delta.normalize(),
      width: segment.width,
      roadClass: segment.roadClass,
      name: segment.name,
      distance,
    };
  });

  return best;
}

function filterTransitBySpacing(
  landmarks: TransitLandmark[],
  minimumDistance: number,
  maximumCount: number,
) {
  const kept: TransitLandmark[] = [];
  landmarks
    .sort((left, right) => {
      const importanceGap = right.importance - left.importance;
      if (importanceGap !== 0) {
        return importanceGap;
      }

      return (left.name ?? '').localeCompare(right.name ?? '', 'ko');
    })
    .forEach((landmark) => {
      if (kept.length >= maximumCount) {
        return;
      }

      if (kept.every((entry) => distanceXZ(entry.position, landmark.position) >= minimumDistance)) {
        kept.push(landmark);
      }
    });

  return kept;
}

function buildTransitLandmarks(
  transit: TransitFeatureCollection,
  center: { lat: number; lon: number },
  roadSegments: ProjectedRoadSegment[],
) {
  const raw = transit.features
    .map((feature, index) => {
      if (feature.geometry.type !== 'Point') {
        return null;
      }

      const originalPoint = projectPoint(feature.geometry.coordinates, center);
      const nearestRoad = nearestRoadContext(originalPoint, roadSegments);
      const fallbackHeading = new THREE.Vector3(0, 0, 1);

      if (feature.properties.category === 'bus_stop') {
        if (!nearestRoad || nearestRoad.distance > 12 || nearestRoad.roadClass !== 'arterial') {
          return null;
        }

        const right = new THREE.Vector3(nearestRoad.heading.z, 0, -nearestRoad.heading.x).normalize();
        const sideSign = right.dot(originalPoint.clone().sub(nearestRoad.closest)) >= 0 ? 1 : -1;
        const importance =
          feature.properties.importance +
          roadRank(nearestRoad.roadClass) * 2 +
          (nearestRoad.name ? 1 : 0);

        return {
          id: `transit-${index}`,
          category: 'bus_stop' as const,
          name: feature.properties.name,
          position: nearestRoad.closest
            .clone()
            .addScaledVector(right, sideSign * (nearestRoad.width * 0.58 + 1.35))
            .setY(0.12),
          heading: nearestRoad.heading.clone(),
          sideSign,
          yaw: Math.atan2(nearestRoad.heading.x, nearestRoad.heading.z),
          importance,
          roadClass: nearestRoad.roadClass,
          isMajor: nearestRoad.roadClass === 'arterial' || importance >= 9,
        } satisfies TransitLandmark;
      }

      const nearestHeading = nearestRoad?.heading.clone() ?? fallbackHeading;
      const nearestRight = new THREE.Vector3(nearestHeading.z, 0, -nearestHeading.x).normalize();
      const sideSign =
        nearestRoad && nearestRoad.distance < 22
          ? nearestRight.dot(originalPoint.clone().sub(nearestRoad.closest)) >= 0
            ? 1
            : -1
          : 1;
      const position =
        nearestRoad && nearestRoad.distance < 22
          ? nearestRoad.closest
              .clone()
              .addScaledVector(nearestRight, sideSign * (nearestRoad.width * 0.42 + 2.3))
              .setY(0.12)
          : originalPoint.clone().setY(0.12);

      return {
        id: `transit-${index}`,
        category: 'subway_station' as const,
        name: feature.properties.name,
        position,
        heading: nearestHeading,
        sideSign,
        yaw: Math.atan2(nearestHeading.x, nearestHeading.z),
        importance:
          feature.properties.importance + 2 + (feature.properties.name ? 4 : 0) + (nearestRoad?.name ? 1 : 0),
        roadClass: nearestRoad?.roadClass ?? null,
        isMajor: Boolean(feature.properties.name),
      } satisfies TransitLandmark;
    })
    .filter(Boolean) as TransitLandmark[];

  const subwayStations = filterTransitBySpacing(
    raw.filter((feature) => feature.category === 'subway_station'),
    62,
    8,
  );
  const busStops = filterTransitBySpacing(
    raw.filter((feature) => feature.category === 'bus_stop'),
    62,
    8,
  );

  return [...subwayStations, ...busStops];
}

function roadRank(roadClass: RoadProperties['roadClass']) {
  switch (roadClass) {
    case 'arterial':
      return 3;
    case 'connector':
      return 2;
    default:
      return 1;
  }
}

function roadTravelCost(roadClass: RoadProperties['roadClass']) {
  switch (roadClass) {
    case 'arterial':
      return 0.9;
    case 'connector':
      return 1;
    default:
      return 1.18;
  }
}

type QueueEntry = {
  key: string;
  cost: number;
};

function queuePush(queue: QueueEntry[], entry: QueueEntry) {
  queue.push(entry);
  let index = queue.length - 1;

  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2);
    if (queue[parentIndex].cost <= queue[index].cost) {
      break;
    }

    [queue[parentIndex], queue[index]] = [queue[index], queue[parentIndex]];
    index = parentIndex;
  }
}

function queuePop(queue: QueueEntry[]) {
  if (!queue.length) {
    return null;
  }

  const root = queue[0];
  const tail = queue.pop();
  if (!queue.length || !tail) {
    return root;
  }

  queue[0] = tail;
  let index = 0;

  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;

    if (left < queue.length && queue[left].cost < queue[smallest].cost) {
      smallest = left;
    }
    if (right < queue.length && queue[right].cost < queue[smallest].cost) {
      smallest = right;
    }
    if (smallest === index) {
      break;
    }

    [queue[index], queue[smallest]] = [queue[smallest], queue[index]];
    index = smallest;
  }

  return root;
}

function mostCommonLabel(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (!value) {
      return;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  let bestLabel: string | null = null;
  let bestCount = 0;
  counts.forEach((count, label) => {
    if (count > bestCount) {
      bestCount = count;
      bestLabel = label;
    }
  });
  return bestLabel;
}

function labelElement(text: string, kind: 'road' | 'building' | 'service' | 'district' | 'transit') {
  const element = document.createElement('div');
  element.textContent = text;
  element.style.padding =
    kind === 'road'
      ? '2px 8px'
      : kind === 'service'
        ? '3px 10px'
        : kind === 'transit'
          ? '4px 11px'
        : kind === 'district'
          ? '4px 12px'
          : '3px 9px';
  element.style.borderRadius = '999px';
  element.style.border = '1px solid rgba(255,255,255,0.12)';
  element.style.background =
    kind === 'road'
      ? 'rgba(8,18,34,0.72)'
      : kind === 'service'
        ? 'rgba(51,36,7,0.86)'
        : kind === 'transit'
          ? 'rgba(5,32,44,0.92)'
        : kind === 'district'
          ? 'rgba(5,48,67,0.96)'
          : 'rgba(12,20,36,0.85)';
  element.style.color =
    kind === 'road'
      ? '#cfe7ff'
      : kind === 'service'
        ? '#ffe7a8'
        : kind === 'transit'
        ? '#a8eeff'
        : kind === 'district'
          ? '#d5f6ff'
          : '#f7fbff';
  element.style.fontSize = kind === 'road' ? '11px' : kind === 'district' ? '13px' : '12px';
  element.style.fontWeight = kind === 'district' ? '700' : '500';
  element.style.fontFamily = 'Pretendard, SUIT Variable, sans-serif';
  element.style.letterSpacing = '0.02em';
  element.style.whiteSpace = 'nowrap';
  element.style.pointerEvents = 'none';
  element.style.transition =
    kind === 'district'
      ? 'background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 140ms ease'
      : 'none';
  element.style.boxShadow = '0 8px 18px rgba(0,0,0,0.25)';
  return element;
}

function hotspotCallElement() {
  const element = document.createElement('div');
  element.textContent = 'o/ CALL TAXI';
  element.style.padding = '3px 10px';
  element.style.borderRadius = '999px';
  element.style.border = '1px solid rgba(255,229,161,0.45)';
  element.style.background = 'rgba(38,29,8,0.88)';
  element.style.color = '#ffefbe';
  element.style.fontSize = '11px';
  element.style.fontWeight = '600';
  element.style.fontFamily = 'Pretendard, SUIT Variable, sans-serif';
  element.style.letterSpacing = '0.04em';
  element.style.whiteSpace = 'nowrap';
  element.style.pointerEvents = 'none';
  element.style.boxShadow = '0 8px 18px rgba(0,0,0,0.32)';
  return element;
}

function buildBuildingMasses(
  buildings: BuildingFeatureCollection,
  center: { lat: number; lon: number },
) {
  return buildings.features
    .map((feature, index) => {
      const ring = outerRingOfBuilding(feature, center);
      if (ring.length < 4) {
        return null;
      }

      const footprint = new THREE.Box3();
      ring.forEach((point) => footprint.expandByPoint(point));
      const footprintSize = footprint.getSize(new THREE.Vector3());
      const footprintCenter = footprint.getCenter(new THREE.Vector3());
      if (footprintSize.x < 0.8 || footprintSize.z < 0.8) {
        return null;
      }

      return {
        id: `building-${index}`,
        label: feature.properties.label,
        height: Math.max(2, (feature.properties.height ?? 15) * BUILDING_HEIGHT_SCALE),
        position: footprintCenter,
        width: footprintSize.x,
        depth: footprintSize.z,
        color: colorForBuilding(feature.properties.height ?? 15),
      } satisfies BuildingMass;
    })
    .filter(Boolean) as BuildingMass[];
}

function createBusStopStructure(seed: number, sideSign: 1 | -1, isMajor: boolean) {
  const roofColor = [0x27a4d8, 0x22b08c, 0x4b8cff][seed % 3];
  const group = new THREE.Group();
  const shelterLength = isMajor ? 2.28 : 1.9;
  const shelterWidth = isMajor ? 1.08 : 0.92;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(shelterWidth, 0.12, shelterLength),
    new THREE.MeshStandardMaterial({ color: 0xdce7f2, roughness: 0.92 }),
  );
  base.position.y = 0.06;
  base.receiveShadow = true;
  group.add(base);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(shelterWidth + 0.12, 0.12, shelterLength + 0.2),
    new THREE.MeshStandardMaterial({
      color: roofColor,
      emissive: roofColor,
      emissiveIntensity: isMajor ? 0.12 : 0.08,
      roughness: 0.52,
    }),
  );
  roof.position.y = 1.76;
  roof.castShadow = true;
  group.add(roof);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.26, shelterLength - 0.34),
    new THREE.MeshStandardMaterial({ color: 0xc8d8e5, roughness: 0.62, metalness: 0.04 }),
  );
  backWall.position.set(0.34 * sideSign, 0.84, 0);
  backWall.castShadow = true;
  group.add(backWall);

  [-(shelterLength * 0.38), shelterLength * 0.38].forEach((zOffset) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.62, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x6e8192, roughness: 0.72 }),
    );
    post.position.set(0.2 * sideSign, 0.84, zOffset);
    post.castShadow = true;
    group.add(post);
  });

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, isMajor ? 1.02 : 0.74),
    new THREE.MeshStandardMaterial({ color: 0x53667b, roughness: 0.82 }),
  );
  bench.position.set(0.06 * sideSign, 0.42, 0);
  bench.castShadow = true;
  group.add(bench);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.88, 8),
    new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.48 }),
  );
  pole.position.set(-0.5 * sideSign, 0.94, -0.88);
  pole.castShadow = true;
  group.add(pole);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.64, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x1f8ecb,
      emissive: 0x1f8ecb,
      emissiveIntensity: 0.16,
      roughness: 0.42,
    }),
  );
  sign.position.set(-0.5 * sideSign, 1.6, -0.88);
  group.add(sign);

  if (isMajor) {
    const routeBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.88, 0.68),
      new THREE.MeshStandardMaterial({
        color: 0xf2f8ff,
        emissive: 0x16384d,
        emissiveIntensity: 0.08,
        roughness: 0.42,
      }),
    );
    routeBoard.position.set(-0.22 * sideSign, 1.05, 0.56);
    routeBoard.castShadow = true;
    group.add(routeBoard);
  }

  return group;
}

function createSubwayStationStructure(seed: number, sideSign: 1 | -1, isMajor: boolean) {
  const accent = [0x31a8ff, 0x3bbcff, 0x5aa8ff][seed % 3];
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 2.6 : 2.1, 0.18, isMajor ? 2.1 : 1.72),
    new THREE.MeshStandardMaterial({ color: 0xe2ecf6, roughness: 0.9 }),
  );
  base.position.y = 0.09;
  base.receiveShadow = true;
  group.add(base);

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 2.15 : 1.8, 0.16, isMajor ? 1.22 : 1),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: isMajor ? 0.18 : 0.12,
      roughness: 0.34,
    }),
  );
  canopy.position.set(0.12 * sideSign, 1.58, -0.14);
  canopy.castShadow = true;
  group.add(canopy);

  const glassRoof = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 1.92 : 1.62, 0.08, isMajor ? 0.82 : 0.72),
    new THREE.MeshStandardMaterial({
      color: 0xe5f7ff,
      emissive: 0x12374a,
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.84,
      roughness: 0.18,
      metalness: 0.08,
    }),
  );
  glassRoof.position.set(0.18 * sideSign, 1.4, -0.12);
  glassRoof.castShadow = true;
  group.add(glassRoof);

  const sidePanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.08, isMajor ? 0.94 : 0.78),
    new THREE.MeshStandardMaterial({
      color: 0xd8f4ff,
      transparent: true,
      opacity: 0.72,
      roughness: 0.12,
      metalness: 0.08,
    }),
  );
  sidePanel.position.set(0.72 * sideSign, 0.86, -0.18);
  group.add(sidePanel);

  const sideRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.82, isMajor ? 1.12 : 0.92),
    new THREE.MeshStandardMaterial({ color: 0x7c93aa, roughness: 0.46 }),
  );
  sideRail.position.set(-0.52 * sideSign, 0.64, 0.38);
  sideRail.castShadow = true;
  group.add(sideRail);

  const gateWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 1.24, isMajor ? 0.92 : 0.74),
    new THREE.MeshStandardMaterial({
      color: 0xe7f1fb,
      roughness: 0.54,
      metalness: 0.04,
    }),
  );
  gateWall.position.set(0.94 * sideSign, 0.82, -0.22);
  gateWall.castShadow = true;
  group.add(gateWall);

  const totem = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, isMajor ? 2.48 : 2.18, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 0.52 }),
  );
  totem.position.set(-0.92 * sideSign, isMajor ? 1.24 : 1.08, -0.68);
  totem.castShadow = true;
  group.add(totem);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 0.96 : 0.78, 0.48, 0.14),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: isMajor ? 0.28 : 0.22,
      roughness: 0.36,
    }),
  );
  sign.position.set(-0.92 * sideSign, isMajor ? 2.0 : 1.82, -0.68);
  group.add(sign);

  Array.from({ length: isMajor ? 5 : 4 }, (_, index) => index).forEach((stepIndex) => {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.16, isMajor ? 1.14 : 0.98),
      new THREE.MeshStandardMaterial({ color: 0xb7c7d8, roughness: 0.84 }),
    );
    step.position.set(
      (0.78 - stepIndex * 0.18) * -sideSign,
      0.08 + stepIndex * 0.13,
      0.42,
    );
    step.castShadow = true;
    group.add(step);
  });

  return group;
}

function buildSignals(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
) {
  const nodeMap = new Map<
    string,
    {
      point: THREE.Vector3;
      roadIds: Set<string>;
      rank: number;
    }
  >();

  roads.features.forEach((feature, featureIndex) => {
    lineStringsOfRoad(feature, center).forEach((line) => {
      line.forEach((node, nodeIndex) => {
        const entry = nodeMap.get(node.key) ?? {
          point: node.point,
          roadIds: new Set<string>(),
          rank: 0,
        };
        entry.roadIds.add(String(feature.id ?? `road-${featureIndex}`));
        entry.rank = Math.max(entry.rank, roadRank(feature.properties.roadClass));
        if (nodeIndex > 0 && nodeIndex < line.length - 1) {
          nodeMap.set(node.key, entry);
        }
      });
    });
  });

  return [...nodeMap.entries()]
    .filter(([, entry]) => entry.roadIds.size >= 2 && entry.rank >= 2)
    .sort((left, right) => {
      const roadGap = right[1].roadIds.size - left[1].roadIds.size;
      if (roadGap !== 0) {
        return roadGap;
      }
      return right[1].rank - left[1].rank;
    })
    .slice(0, 28)
    .map(([key, entry], index) => ({
      id: `signal-${index}`,
      key,
      point: entry.point.clone(),
      offset: index * 1.8,
    })) satisfies SignalData[];
}

function buildRoadGraph(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
): RoadGraph {
  const nodes = new Map<string, RouteNode>();
  const adjacency = new Map<string, GraphEdge[]>();
  const edgeIndex = new Map<string, GraphEdge>();

  roads.features.forEach((feature, featureIndex) => {
    lineStringsOfRoad(feature, center).forEach((line, lineIndex) => {
      line.forEach((node) => {
        if (!nodes.has(node.key)) {
          nodes.set(node.key, { key: node.key, point: node.point.clone() });
        }
      });

      for (let index = 0; index < line.length - 1; index += 1) {
        const from = line[index];
        const to = line[index + 1];
        const length = distanceXZ(from.point, to.point);
        if (length < 1) {
          continue;
        }

        const roadWidth = feature.properties.width * ROAD_WIDTH_SCALE;
        const baseId = `${feature.id ?? featureIndex}-${lineIndex}-${index}`;
        const forward: GraphEdge = {
          id: `${baseId}-f`,
          from: from.key,
          to: to.key,
          roadClass: feature.properties.roadClass,
          roadWidth,
          length,
          name: feature.properties.name,
        };
        const backward: GraphEdge = {
          ...forward,
          id: `${baseId}-r`,
          from: to.key,
          to: from.key,
        };

        const forwardList = adjacency.get(forward.from) ?? [];
        forwardList.push(forward);
        adjacency.set(forward.from, forwardList);

        const backwardList = adjacency.get(backward.from) ?? [];
        backwardList.push(backward);
        adjacency.set(backward.from, backwardList);

        edgeIndex.set(`${forward.from}|${forward.to}`, forward);
        edgeIndex.set(`${backward.from}|${backward.to}`, backward);
      }
    });
  });

  return { nodes, adjacency, edgeIndex };
}

function shortestPath(graph: RoadGraph, startKey: string, endKey: string) {
  if (startKey === endKey) {
    return [startKey];
  }

  const frontier: QueueEntry[] = [];
  const visited = new Set<string>();
  const distances = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, string>();
  queuePush(frontier, { key: startKey, cost: 0 });

  while (frontier.length) {
    const current = queuePop(frontier);
    if (!current || visited.has(current.key)) {
      continue;
    }

    if (current.cost > (distances.get(current.key) ?? Number.POSITIVE_INFINITY)) {
      continue;
    }

    if (current.key === endKey) {
      break;
    }

    visited.add(current.key);

    (graph.adjacency.get(current.key) ?? []).forEach((edge) => {
      const nextCost = current.cost + edge.length * roadTravelCost(edge.roadClass);
      const knownCost = distances.get(edge.to) ?? Number.POSITIVE_INFINITY;
      if (nextCost < knownCost) {
        distances.set(edge.to, nextCost);
        previous.set(edge.to, current.key);
        queuePush(frontier, { key: edge.to, cost: nextCost });
      }
    });
  }

  if (!previous.has(endKey)) {
    return null;
  }

  const path = [endKey];
  let cursor = endKey;
  while (cursor !== startKey) {
    const prior = previous.get(cursor);
    if (!prior) {
      return null;
    }
    path.push(prior);
    cursor = prior;
  }

  return path.reverse();
}

function buildPathRoute(
  graph: RoadGraph,
  signalByKey: Map<string, SignalData>,
  nodeKeys: string[],
  id: string,
  label: string | null,
) {
  if (nodeKeys.length < 2) {
    return null;
  }

  const nodes = nodeKeys
    .map((key) => graph.nodes.get(key))
    .filter(Boolean)
    .map((node) => ({ key: node?.key ?? '', point: node?.point.clone() ?? new THREE.Vector3() }));

  if (nodes.length < 2) {
    return null;
  }

  const edgeProps = nodeKeys
    .slice(0, -1)
    .map((fromKey, index) => graph.edgeIndex.get(`${fromKey}|${nodeKeys[index + 1]}`))
    .filter(Boolean) as GraphEdge[];

  const cumulative = buildCumulative(nodes.map((node) => node.point));
  const totalLength = cumulative[cumulative.length - 1] ?? 0;
  if (totalLength < 2) {
    return null;
  }

  const roadClass = edgeProps.reduce<RoadProperties['roadClass']>((best, edge) => {
    return roadRank(edge.roadClass) > roadRank(best) ? edge.roadClass : best;
  }, edgeProps[0]?.roadClass ?? 'local');
  const roadWidth =
    edgeProps.reduce((sum, edge) => sum + edge.roadWidth, 0) / Math.max(edgeProps.length, 1);

  const stops: StopMarker[] = [];
  for (let index = 1; index < nodes.length - 1; index += 1) {
    const signal = signalByKey.get(nodes[index].key);
    if (!signal) {
      continue;
    }

    const previousStop = stops[stops.length - 1];
    if (previousStop?.signalId === signal.id) {
      continue;
    }

    stops.push({
      signalId: signal.id,
      distance: Math.max(0, cumulative[index] - 2.8),
      axis: dominantAxis(nodes[index - 1].point, nodes[index].point),
      turn: classifyTurn(nodes[index - 1].point, nodes[index].point, nodes[index + 1].point),
    });
  }

  return {
    id,
    name: label ?? mostCommonLabel(edgeProps.map((edge) => edge.name)) ?? null,
    roadClass,
    roadWidth,
    laneOffset: THREE.MathUtils.clamp(roadWidth * 0.22, 0.45, 0.95),
    nodes,
    cumulative,
    totalLength,
    stops,
    startKey: nodeKeys[0],
    endKey: nodeKeys[nodeKeys.length - 1],
    isLoop: false,
  } satisfies RouteTemplate;
}

function buildShortestRoute(
  graph: RoadGraph,
  signalByKey: Map<string, SignalData>,
  startKey: string,
  endKey: string,
  id: string,
  label: string | null,
) {
  const nodeKeys = shortestPath(graph, startKey, endKey);
  if (!nodeKeys || nodeKeys.length < 2) {
    return null;
  }
  return buildPathRoute(graph, signalByKey, nodeKeys, id, label);
}

function buildLoopRoutes(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
  signalByKey: Map<string, SignalData>,
) {
  const candidates = roads.features
    .flatMap((feature, featureIndex) =>
      lineStringsOfRoad(feature, center).map((line, lineIndex) => ({
        id: `${feature.id ?? featureIndex}-${lineIndex}`,
        name: feature.properties.name,
        roadClass: feature.properties.roadClass,
        roadWidth: feature.properties.width * ROAD_WIDTH_SCALE,
        nodes: line,
        length: buildCumulative(line.map((node) => node.point)).at(-1) ?? 0,
      })),
    )
    .filter((candidate) => candidate.nodes.length >= 2 && candidate.length >= 34);

  return candidates
    .sort((left, right) => {
      const nameGap = Number(Boolean(right.name)) - Number(Boolean(left.name));
      if (nameGap !== 0) {
        return nameGap;
      }
      const rankGap = roadRank(right.roadClass) - roadRank(left.roadClass);
      if (rankGap !== 0) {
        return rankGap;
      }
      return right.length - left.length;
    })
    .map((candidate) => {
      const roundTripNodes = [
        ...candidate.nodes,
        ...candidate.nodes.slice(0, -1).reverse().map((node) => ({
          key: node.key,
          point: node.point.clone(),
        })),
      ];
      const cumulative = buildCumulative(roundTripNodes.map((node) => node.point));
      const totalLength = cumulative[cumulative.length - 1] ?? 0;

      const stops: StopMarker[] = [];
      for (let index = 1; index < roundTripNodes.length - 1; index += 1) {
        const signal = signalByKey.get(roundTripNodes[index].key);
        if (!signal) {
          continue;
        }

        const previousStop = stops[stops.length - 1];
        if (previousStop?.signalId === signal.id) {
          continue;
        }

        stops.push({
          signalId: signal.id,
          distance: Math.max(0, cumulative[index] - 2.8),
          axis: dominantAxis(roundTripNodes[index - 1].point, roundTripNodes[index].point),
          turn: classifyTurn(
            roundTripNodes[index - 1].point,
            roundTripNodes[index].point,
            roundTripNodes[index + 1].point,
          ),
        });
      }

      return {
        id: candidate.id,
        name: candidate.name,
        roadClass: candidate.roadClass,
        roadWidth: candidate.roadWidth,
        laneOffset: THREE.MathUtils.clamp(candidate.roadWidth * 0.22, 0.45, 0.95),
        nodes: roundTripNodes,
        cumulative,
        totalLength,
        stops,
        startKey: roundTripNodes[0].key,
        endKey: roundTripNodes[roundTripNodes.length - 1].key,
        isLoop: true,
      } satisfies RouteTemplate;
    })
    .filter((route) => route.totalLength >= 40);
}

function hotspotLabelForRoute(
  route: RouteTemplate,
  position: THREE.Vector3,
  buildings: BuildingMass[],
  index: number,
) {
  const nearest = buildings
    .filter((building) => Boolean(building.label))
    .map((building) => ({
      building,
      distance: building.position.distanceTo(position),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest && nearest.distance < 34 && nearest.building.label) {
    return nearest.building.label;
  }
  if (route.name) {
    return `${route.name} 승차지`;
  }
  return `택시 포인트 ${index + 1}`;
}

function buildTaxiHotspots(routes: RouteTemplate[], buildings: BuildingMass[]) {
  return routes.flatMap((route, routeIndex) => {
    if (route.nodes.length < 4) {
      return [] as Hotspot[];
    }

    const fractions = route.totalLength > 180 ? [0.14, 0.38, 0.63, 0.86] : [0.22, 0.58, 0.84];
    return fractions.map((fraction, hotspotIndex) => {
      const targetDistance = route.totalLength * fraction + routeIndex * 4.5;
      let nodeIndex = 1;
      let bestGap = Number.POSITIVE_INFINITY;

      for (let index = 1; index < route.nodes.length - 1; index += 1) {
        const gap = Math.abs(route.cumulative[index] - targetDistance);
        if (gap < bestGap) {
          bestGap = gap;
          nodeIndex = index;
        }
      }

      const currentPoint = route.nodes[nodeIndex].point;
      const previousPoint = route.nodes[Math.max(0, nodeIndex - 1)].point;
      const nextPoint = route.nodes[Math.min(route.nodes.length - 1, nodeIndex + 1)].point;
      const heading = nextPoint.clone().sub(previousPoint);
      if (heading.lengthSq() < 0.0001) {
        heading.set(0, 0, 1);
      } else {
        heading.normalize();
      }

      const lanePosition = offsetToRight(currentPoint, heading, route.laneOffset + 0.95);
      return {
        id: `${route.id}-hotspot-${hotspotIndex}`,
        nodeKey: route.nodes[nodeIndex].key,
        routeId: route.id,
        distance: route.cumulative[nodeIndex],
        position: lanePosition.clone().setY(0.14),
        point: lanePosition.clone(),
        label: hotspotLabelForRoute(route, lanePosition, buildings, hotspotIndex),
        roadName: route.name,
      } satisfies Hotspot;
    });
  });
}

function signalState(signal: SignalData, elapsedTime: number): SignalFlow {
  const phase = (elapsedTime + signal.offset) % SIGNAL_CYCLE;
  if (phase < 5.8) {
    return { phase: 'ns_flow', ns: 'green', ew: 'red', nsLeft: false, ewLeft: false, pedestrian: 'stop' };
  }
  if (phase < 7.8) {
    return { phase: 'ns_left', ns: 'red', ew: 'red', nsLeft: true, ewLeft: false, pedestrian: 'stop' };
  }
  if (phase < 8.8) {
    return { phase: 'clearance', ns: 'red', ew: 'red', nsLeft: false, ewLeft: false, pedestrian: 'stop' };
  }
  if (phase < 14.6) {
    return { phase: 'ew_flow', ns: 'red', ew: 'green', nsLeft: false, ewLeft: false, pedestrian: 'stop' };
  }
  if (phase < 16.6) {
    return { phase: 'ew_left', ns: 'red', ew: 'red', nsLeft: false, ewLeft: true, pedestrian: 'stop' };
  }
  if (phase < 17.6) {
    return { phase: 'clearance', ns: 'red', ew: 'red', nsLeft: false, ewLeft: false, pedestrian: 'stop' };
  }
  if (phase < 21.2) {
    return { phase: 'ped_walk', ns: 'red', ew: 'red', nsLeft: false, ewLeft: false, pedestrian: 'walk' };
  }
  return { phase: 'ped_flash', ns: 'red', ew: 'red', nsLeft: false, ewLeft: false, pedestrian: 'flash' };
}

function canVehicleProceed(
  stop: StopMarker,
  state: SignalFlow,
  conflictingAxisOccupied: boolean,
) {
  if (state.phase === 'clearance' || state.phase === 'ped_walk' || state.phase === 'ped_flash') {
    return false;
  }
  if (stop.turn === 'left') {
    if (stop.axis === 'ns') {
      return state.nsLeft || (state.ns === 'green' && !conflictingAxisOccupied);
    }
    return state.ewLeft || (state.ew === 'green' && !conflictingAxisOccupied);
  }
  return stop.axis === 'ns' ? state.ns === 'green' : state.ew === 'green';
}

function createVehicleGroup(kind: VehicleKind, palette: VehiclePalette) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    roughness: 0.95,
    metalness: 0.02,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(kind === 'taxi' ? 1.8 : 1.62, 1.2, kind === 'taxi' ? 4.3 : 4.05),
    bodyMaterial,
  );
  body.position.y = 0.7;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(kind === 'taxi' ? 1.24 : 1.14, 0.95, 2.05),
    new THREE.MeshStandardMaterial({
      color: palette.cabin,
      roughness: 0.65,
      metalness: 0.02,
    }),
  );
  cabin.position.set(0, 1.5, 0.15);
  group.add(cabin);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.08, 0.18, 1.46),
    new THREE.MeshStandardMaterial({
      color: 0xdff3ff,
      emissive: 0x294a6a,
      emissiveIntensity: 0.16,
      roughness: 0.2,
      metalness: 0.05,
    }),
  );
  windshield.position.set(0, 2.05, 0.15);
  group.add(windshield);

  let signMaterial: THREE.MeshStandardMaterial | null = null;
  if (kind === 'taxi') {
    signMaterial = new THREE.MeshStandardMaterial({
      color: palette.sign ?? 0xfff9d8,
      emissive: 0x6d5800,
      emissiveIntensity: 0.14,
      roughness: 0.72,
      metalness: 0,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 0.72), signMaterial);
    sign.position.set(0, 2.42, -0.25);
    group.add(sign);
  }

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 4.9),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, bodyMaterial, signMaterial };
}

function createPedestrianGroup(seed: number) {
  const palette = [0xff8d71, 0x78c4ff, 0x79d58f, 0xffcb44, 0xc6a2ff][seed % 5];
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.82, 0.24),
    new THREE.MeshStandardMaterial({ color: palette, roughness: 0.8 }),
  );
  body.position.y = 0.74;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xf4d9c2, roughness: 0.7 }),
  );
  head.position.y = 1.34;
  group.add(head);

  const feet = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.12, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x1a2331, roughness: 0.92 }),
  );
  feet.position.y = 0.12;
  group.add(feet);

  return group;
}

function createCallerGroup(seed: number) {
  const topPalette = [0xff8d71, 0x78c4ff, 0x79d58f, 0xffcb44, 0xc6a2ff][seed % 5];
  const bottomPalette = [0x253244, 0x26394d, 0x2f3845, 0x29313f][seed % 4];
  const group = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.72),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const shoes = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.12, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x161c28, roughness: 0.94 }),
  );
  shoes.position.y = 0.06;
  group.add(shoes);

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.52, 0.22),
    new THREE.MeshStandardMaterial({ color: bottomPalette, roughness: 0.88 }),
  );
  legs.position.y = 0.38;
  group.add(legs);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.62, 0.28),
    new THREE.MeshStandardMaterial({ color: topPalette, roughness: 0.82 }),
  );
  torso.position.y = 0.94;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf2d7bd, roughness: 0.75 }),
  );
  head.position.y = 1.42;
  group.add(head);

  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.56, 0.14),
    new THREE.MeshStandardMaterial({ color: topPalette, roughness: 0.84 }),
  );
  leftArm.position.set(-0.34, 0.9, 0);
  leftArm.rotation.z = 0.18;
  group.add(leftArm);

  const waveArmPivot = new THREE.Group();
  waveArmPivot.position.set(0.32, 1.16, 0);
  group.add(waveArmPivot);

  const waveArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.6, 0.14),
    new THREE.MeshStandardMaterial({ color: topPalette, roughness: 0.84 }),
  );
  waveArm.position.set(0, -0.28, 0);
  waveArmPivot.add(waveArm);

  const hailCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.24, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xffdd63,
      emissive: 0x7b5600,
      emissiveIntensity: 0.34,
      roughness: 0.38,
    }),
  );
  hailCube.position.set(0.12, -0.62, 0.08);
  waveArmPivot.add(hailCube);

  return { group, waveArmPivot, hailCube };
}

function buildMajorRoadNames(roads: RoadFeatureCollection | null) {
  if (!roads) {
    return [];
  }
  return [
    ...new Set(
      roads.features
        .filter((feature) => feature.properties.name && feature.properties.roadClass !== 'local')
        .map((feature) => feature.properties.name as string),
    ),
  ].slice(0, 6);
}

function buildMajorBuildingNames(buildings: BuildingFeatureCollection | null) {
  if (!buildings) {
    return [];
  }
  return buildings.features
    .filter((feature) => feature.properties.label)
    .sort((left, right) => (right.properties.height ?? 0) - (left.properties.height ?? 0))
    .slice(0, 6)
    .map((feature) => feature.properties.label as string);
}

function setTaxiAppearance(vehicle: Vehicle) {
  if (vehicle.kind !== 'taxi') {
    return;
  }
  if (vehicle.isOccupied) {
    vehicle.bodyMaterial.color.setHex(0xe3a928);
    vehicle.bodyMaterial.emissive.setHex(0x3c2700);
    vehicle.bodyMaterial.emissiveIntensity = 0.22;
    vehicle.signMaterial?.color.setHex(0x9ee8ff);
    vehicle.signMaterial?.emissive.setHex(0x19586c);
    if (vehicle.signMaterial) {
      vehicle.signMaterial.emissiveIntensity = 0.36;
    }
    return;
  }

  vehicle.bodyMaterial.color.setHex(vehicle.palette.body);
  vehicle.bodyMaterial.emissive.setHex(0x221700);
  vehicle.bodyMaterial.emissiveIntensity = 0.08;
  vehicle.signMaterial?.color.setHex(vehicle.palette.sign ?? 0xfff9d8);
  vehicle.signMaterial?.emissive.setHex(0x6d5800);
  if (vehicle.signMaterial) {
    vehicle.signMaterial.emissiveIntensity = 0.16;
  }
}

function syncVehicleTransform(vehicle: Vehicle) {
  const sample = sampleRoute(vehicle.route, vehicle.distance);
  const lanePosition = offsetToRight(sample.position, sample.heading, vehicle.route.laneOffset);
  vehicle.group.position.copy(lanePosition);
  vehicle.group.rotation.y = Math.atan2(sample.heading.x, sample.heading.z);
}

function planTaxiJob(
  startKey: string,
  hotspots: Hotspot[],
  seed: number,
  vehicleId: string,
  routeBuilder: (
    start: string,
    end: string,
    id: string,
    label: string | null,
  ) => RouteTemplate | null,
  graph: RoadGraph,
) {
  const originPoint = graph.nodes.get(startKey)?.point ?? new THREE.Vector3();
  const pickups = hotspots
    .filter((hotspot) => hotspot.nodeKey !== startKey)
    .map((hotspot) => ({ hotspot, distance: hotspot.point.distanceTo(originPoint) }))
    .sort((left, right) => left.distance - right.distance);

  if (!pickups.length) {
    return null;
  }

  const pickupPool = pickups.slice(1, Math.min(pickups.length, 12));
  const orderedPickups = pickupPool.length ? pickupPool : pickups;

  for (let attempt = 0; attempt < Math.min(orderedPickups.length * 2, 18); attempt += 1) {
    const pickup = orderedPickups[(seed + attempt * 3) % orderedPickups.length].hotspot;
    const drops = hotspots
      .filter((hotspot) => hotspot.id !== pickup.id && hotspot.nodeKey !== pickup.nodeKey)
      .map((hotspot) => ({ hotspot, distance: hotspot.point.distanceTo(pickup.point) }))
      .filter((entry) => entry.distance > 26)
      .sort((left, right) => right.distance - left.distance);

    const orderedDrops = drops.length
      ? drops
      : hotspots
          .filter((hotspot) => hotspot.id !== pickup.id && hotspot.nodeKey !== pickup.nodeKey)
          .map((hotspot) => ({ hotspot, distance: hotspot.point.distanceTo(pickup.point) }));

    if (!orderedDrops.length) {
      continue;
    }

    const dropoff = orderedDrops[(seed * 2 + attempt) % orderedDrops.length].hotspot;
    const pickupRoute = routeBuilder(
      startKey,
      pickup.nodeKey,
      `${vehicleId}-pickup-${seed}-${attempt}`,
      pickup.roadName ?? pickup.label,
    );
    const dropRoute = routeBuilder(
      pickup.nodeKey,
      dropoff.nodeKey,
      `${vehicleId}-drop-validate-${seed}-${attempt}`,
      dropoff.roadName ?? dropoff.label,
    );

    if (pickupRoute && dropRoute) {
      return {
        pickupHotspot: pickup,
        dropoffHotspot: dropoff,
        pickupRoute,
      };
    }
  }

  return null;
}

export default function MapSimulator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SimulationData | null>(null);
  const [status, setStatus] = useState<'loading' | 'rendering' | 'ready' | 'error'>('loading');
  const [showLabels, setShowLabels] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [simulationTimeMinutes, setSimulationTimeMinutes] = useState(12 * 60);
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('clear');
  const [cameraMode, setCameraMode] = useState<CameraMode>('drive');
  const [followTaxiId, setFollowTaxiId] = useState('');
  const [showFps, setShowFps] = useState(false);
  const [fpsStats, setFpsStats] = useState<FpsStats>({
    fps: 0,
    cap: renderFpsCapFor('drive'),
  });
  const simulationTimeRef = useRef(12 * 60);
  const weatherModeRef = useRef<WeatherMode>('clear');
  const cameraModeRef = useRef<CameraMode>('drive');
  const followTaxiIdRef = useRef('');
  const showFpsRef = useRef(false);
  const [stats, setStats] = useState<Stats>({
    taxis: TAXI_COUNT,
    traffic: TRAFFIC_COUNT,
    waiting: 0,
    signals: 0,
    activeTrips: 0,
    completedTrips: 0,
    pedestrians: 0,
  });

  useEffect(() => {
    simulationTimeRef.current = simulationTimeMinutes;
  }, [simulationTimeMinutes]);

  useEffect(() => {
    weatherModeRef.current = weatherMode;
  }, [weatherMode]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    showFpsRef.current = showFps;
  }, [showFps]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchGeoJsonAsset<RoadFeatureCollection>('/roads.geojson'),
      fetchGeoJsonAsset<BuildingFeatureCollection>('/buildings.geojson'),
      fetchGeoJsonAsset<DongFeatureCollection>('/dongs.geojson'),
      fetchGeoJsonAsset<TransitFeatureCollection>('/transit.geojson'),
    ])
      .then(([roadsAsset, buildingsAsset, dongsAsset, transitAsset]) => {
        if (cancelled) {
          return;
        }
        const roads = roadsAsset.data;
        const buildings = buildingsAsset.data;
        const dongs = dongsAsset.data;
        const transit = transitAsset.data;
        const assetTimes = [
          roadsAsset.meta.lastModified,
          buildingsAsset.meta.lastModified,
          dongsAsset.meta.lastModified,
          transitAsset.meta.lastModified,
        ]
          .filter(Boolean)
          .sort() as string[];
        const nextData = {
          center: dongs.features.length ? featureCollectionCenter(dongs) : DEFAULT_MAP_CENTER,
          roads,
          buildings,
          dongs,
          transit,
          meta: {
            source: 'OpenStreetMap + Overpass -> public/*.geojson',
            boundarySource: 'OSM administrative relations (admin_level=8)',
            latestAssetUpdatedAt: assetTimes.at(-1) ?? null,
            loadedAt: formatKstDateTime(new Date()) ?? 'unknown',
            assets: {
              roads: roadsAsset.meta,
              buildings: buildingsAsset.meta,
              dongs: dongsAsset.meta,
              transit: transitAsset.meta,
            },
          },
        };
        setStatus('rendering');
        requestAnimationFrame(() => {
          if (!cancelled) {
            setData(nextData);
          }
        });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      setStatus('ready');
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [data]);

  useEffect(() => {
    if (!data || !containerRef.current) {
      return undefined;
    }

    const container = containerRef.current;
    let isPageHidden = document.visibilityState === 'hidden';
    const scene = new THREE.Scene();
    const sceneFog = new THREE.Fog(0x07111b, 120, 360);
    scene.background = new THREE.Color(0x07111b);
    scene.fog = sceneFog;

    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / container.clientHeight,
      0.1,
      1500,
    );
    camera.position.set(-120, 135, 150);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        renderPixelRatioFor(
          cameraModeRef.current,
          document.visibilityState === 'hidden',
        ),
      ),
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.inset = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xb6d5ff, 0x172333, 0.82);
    scene.add(hemisphereLight);

    const sun = new THREE.DirectionalLight(0xfff1d0, 1.15);
    sun.position.set(110, 180, 80);
    sun.castShadow = false;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 420;
    sun.shadow.camera.left = -180;
    sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 180;
    sun.shadow.camera.bottom = -180;
    scene.add(sun);

    const buildingFeatures = buildBuildingMasses(data.buildings, data.center);
    const dongRegions = buildDongRegions(data.dongs, data.center);
    const roadSegments: ProjectedRoadSegment[] = data.roads.features.flatMap((feature) =>
      lineStringsOfRoad(feature, data.center).flatMap((line) =>
        line.slice(1).map((node, index) => ({
          roadClass: feature.properties.roadClass,
          width: feature.properties.width * ROAD_WIDTH_SCALE,
          start: line[index].point,
          end: node.point,
          name: feature.properties.name,
        })),
      ),
    );
    const transitLandmarks = buildTransitLandmarks(data.transit, data.center, roadSegments);
    const dongBoundarySegments = SHOW_DONG_BOUNDARIES ? buildDongBoundarySegments(dongRegions) : [];
    const dongBoundaryWallHeight = THREE.MathUtils.clamp(
      buildingFeatures.reduce((sum, building) => sum + building.height, 0) /
        Math.max(buildingFeatures.length, 1) *
        1.85,
      7.2,
      10.4,
    );

    const bounds = new THREE.Box3();
    roadSegments.forEach((segment) => {
      bounds.expandByPoint(segment.start);
      bounds.expandByPoint(segment.end);
    });
    const size = bounds.getSize(new THREE.Vector3());
    const centerPoint = bounds.getCenter(new THREE.Vector3());
    const movementBounds = bounds.clone().expandByVector(new THREE.Vector3(48, 0, 48));
    const maxMapDistance = Math.max(CAMERA_MAX_DISTANCE, Math.max(size.x, size.z) * 1.28);
    const overviewMinDistance = THREE.MathUtils.clamp(
      Math.max(size.x, size.z) * 0.94,
      96,
      Math.max(140, maxMapDistance - 34),
    );
    const dummy = new THREE.Object3D();
    const initialOffset = new THREE.Vector3(-120, 135, 150);
    const cameraRig = {
      focus: centerPoint.clone(),
      yaw: Math.atan2(initialOffset.x, initialOffset.z),
      pitch: Math.atan2(initialOffset.y, Math.hypot(initialOffset.x, initialOffset.z)),
      distance: THREE.MathUtils.clamp(
        initialOffset.length(),
        CAMERA_MIN_DISTANCE,
        maxMapDistance,
      ),
      dragging: false,
      pointerId: -1,
      pointerX: 0,
      pointerY: 0,
    };
    const pressedKeys = new Set<string>();
    const followOrbit = { yawOffset: 0.22 };
    let activeCameraMode = cameraModeRef.current;
    let activeFollowTaxiId = followTaxiIdRef.current;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(2, 2);
    let pointerInside = false;
    let hoveredBoundaryIndex = -1;
    let pointerClientX = 0;
    let pointerClientY = 0;
    let cameraLookLift = CAMERA_LOOK_HEIGHT;
    let simulationTimeout = 0;

    const syncCamera = () => {
      cameraRig.pitch = THREE.MathUtils.clamp(
        cameraRig.pitch,
        CAMERA_MIN_PITCH,
        CAMERA_MAX_PITCH,
      );
      cameraRig.distance = THREE.MathUtils.clamp(
        cameraRig.distance,
        CAMERA_MIN_DISTANCE,
        maxMapDistance,
      );
      cameraRig.focus.x = THREE.MathUtils.clamp(
        cameraRig.focus.x,
        movementBounds.min.x,
        movementBounds.max.x,
      );
      cameraRig.focus.z = THREE.MathUtils.clamp(
        cameraRig.focus.z,
        movementBounds.min.z,
        movementBounds.max.z,
      );

      const offset = new THREE.Vector3(
        Math.sin(cameraRig.yaw) * Math.cos(cameraRig.pitch),
        Math.sin(cameraRig.pitch),
        Math.cos(cameraRig.yaw) * Math.cos(cameraRig.pitch),
      ).multiplyScalar(cameraRig.distance);

      camera.position.copy(cameraRig.focus).add(offset);
      camera.lookAt(cameraRig.focus.x, cameraRig.focus.y + cameraLookLift, cameraRig.focus.z);
    };

    syncCamera();

    const shadowSpan = Math.max(size.x, size.z) * 0.72;
    sun.shadow.camera.far = Math.max(420, shadowSpan * 3.2);
    sun.shadow.camera.left = -shadowSpan;
    sun.shadow.camera.right = shadowSpan;
    sun.shadow.camera.top = shadowSpan;
    sun.shadow.camera.bottom = -shadowSpan;
    sun.shadow.camera.updateProjectionMatrix();

    const createPrecipitationLayer = (
      count: number,
      material: THREE.PointsMaterial,
      minHeight: number,
      maxHeight: number,
    ) => {
      const positions = new Float32Array(count * 3);
      const seeds = new Float32Array(count);
      const spanX = size.x + 180;
      const spanZ = size.z + 180;
      const minX = centerPoint.x - spanX / 2;
      const maxX = centerPoint.x + spanX / 2;
      const minZ = centerPoint.z - spanZ / 2;
      const maxZ = centerPoint.z + spanZ / 2;

      for (let index = 0; index < count; index += 1) {
        const offset = index * 3;
        positions[offset] = THREE.MathUtils.lerp(minX, maxX, Math.random());
        positions[offset + 1] = THREE.MathUtils.lerp(minHeight, maxHeight, Math.random());
        positions[offset + 2] = THREE.MathUtils.lerp(minZ, maxZ, Math.random());
        seeds[index] = Math.random();
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(geometry, material);
      points.visible = false;
      scene.add(points);

      return {
        geometry,
        material,
        points,
        seeds,
        minHeight,
        maxHeight,
        minX,
        maxX,
        minZ,
        maxZ,
      };
    };

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x101b26,
      roughness: 0.98,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x + 120, size.z + 120),
      groundMaterial,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(centerPoint.x, 0, centerPoint.z);
    ground.receiveShadow = true;
    scene.add(ground);

    const dongFloorGroup = new THREE.Group();
    const dongFloorMaterials: THREE.MeshBasicMaterial[] = [];
    dongRegions.forEach((dong) => {
      dong.rings.forEach((ring) => {
        const shape = dongShapeFromRing(ring);
        if (!shape) {
          return;
        }

        const fillMaterial = new THREE.MeshBasicMaterial({
          color: dong.color,
          transparent: true,
          opacity: 0.09,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        dongFloorMaterials.push(fillMaterial);
        const fill = new THREE.Mesh(
          new THREE.ShapeGeometry(shape),
          fillMaterial,
        );
        fill.rotation.x = -Math.PI / 2;
        fill.position.y = 0.018;
        fill.renderOrder = 2;
        dongFloorGroup.add(fill);
      });
    });
    scene.add(dongFloorGroup);

    const celestialRadius = Math.max(size.x, size.z) + 320;
    const sunDiscMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd9a8,
      transparent: true,
      opacity: 0,
    });
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(8.5, 20, 20), sunDiscMaterial);
    scene.add(sunDisc);

    const sunHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb66c,
      transparent: true,
      opacity: 0,
    });
    const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(15.5, 20, 20), sunHaloMaterial);
    scene.add(sunHalo);

    const sunsetGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8b47,
      transparent: true,
      opacity: 0,
    });
    const sunsetGlow = new THREE.Mesh(new THREE.SphereGeometry(23, 20, 20), sunsetGlowMaterial);
    scene.add(sunsetGlow);

    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xe9f2ff,
      transparent: true,
      opacity: 0,
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(5.8, 18, 18), moonMaterial);
    scene.add(moon);

    const starPositions = new Float32Array(280 * 3);
    for (let index = 0; index < 280; index += 1) {
      const azimuth = Math.random() * Math.PI * 2;
      const elevation = THREE.MathUtils.lerp(0.24, 1.14, Math.random());
      const radius = celestialRadius + Math.random() * 120;
      const offset = index * 3;
      starPositions[offset] = centerPoint.x + Math.cos(azimuth) * Math.cos(elevation) * radius;
      starPositions[offset + 1] = Math.sin(elevation) * radius * 0.82 + 110;
      starPositions[offset + 2] = centerPoint.z + Math.sin(azimuth) * Math.cos(elevation) * radius;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xf4f8ff,
      size: 1.7,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const cloudPuffGeometry = new THREE.SphereGeometry(1, 14, 14);
    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: 0xf5f9ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const cloudClusters = Array.from({ length: 5 }, (_, index) => {
      const cluster = new THREE.Group();
      const azimuth = (index / 8) * Math.PI * 2 + (index % 2 === 0 ? 0.22 : -0.16);
      const elevation = THREE.MathUtils.lerp(0.24, 0.5, (index % 5) / 5);
      const radius = celestialRadius * THREE.MathUtils.lerp(0.56, 0.72, (index % 4) / 4);
      const anchor = new THREE.Vector3(
        centerPoint.x + Math.cos(azimuth) * Math.cos(elevation) * radius,
        Math.sin(elevation) * radius * 0.76 + 72 + (index % 3) * 10,
        centerPoint.z + Math.sin(azimuth) * Math.cos(elevation) * radius,
      );

      [
        { x: -7.5, y: 0.4, z: 0, sx: 7.2, sy: 2.8, sz: 3.6 },
        { x: -2.2, y: 1.2, z: 1.1, sx: 6.1, sy: 2.5, sz: 3.1 },
        { x: 3.8, y: 0.8, z: -0.4, sx: 7.8, sy: 3.1, sz: 3.7 },
        { x: 8.4, y: 0.1, z: 0.7, sx: 5.8, sy: 2.2, sz: 2.8 },
      ].forEach((puff) => {
        const mesh = new THREE.Mesh(cloudPuffGeometry, cloudMaterial);
        mesh.position.set(puff.x, puff.y, puff.z);
        mesh.scale.set(puff.sx, puff.sy, puff.sz);
        cluster.add(mesh);
      });

      cluster.position.copy(anchor);
      scene.add(cluster);
      return { cluster, anchor, phase: index * 0.9 };
    });

    const stormCloudMaterial = new THREE.MeshBasicMaterial({
      color: 0x73879a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const stormCloudClusters = Array.from({ length: 4 }, (_, index) => {
      const cluster = new THREE.Group();
      const azimuth = (index / 6) * Math.PI * 2 + (index % 2 === 0 ? 0.34 : -0.22);
      const elevation = THREE.MathUtils.lerp(0.16, 0.28, (index % 3) / 3);
      const radius = celestialRadius * THREE.MathUtils.lerp(0.48, 0.62, (index % 4) / 4);
      const anchor = new THREE.Vector3(
        centerPoint.x + Math.cos(azimuth) * Math.cos(elevation) * radius,
        Math.sin(elevation) * radius * 0.62 + 56 + (index % 2) * 7,
        centerPoint.z + Math.sin(azimuth) * Math.cos(elevation) * radius,
      );

      [
        { x: -10.5, y: 0.2, z: 0.5, sx: 10.8, sy: 3.8, sz: 5.2 },
        { x: -3.2, y: 1.1, z: -1.2, sx: 9.6, sy: 3.4, sz: 4.7 },
        { x: 5.4, y: 0.9, z: 0.3, sx: 11.2, sy: 4.2, sz: 5.6 },
        { x: 13.2, y: 0.1, z: -0.4, sx: 8.2, sy: 3.1, sz: 4.4 },
      ].forEach((puff) => {
        const mesh = new THREE.Mesh(cloudPuffGeometry, stormCloudMaterial);
        mesh.position.set(puff.x, puff.y, puff.z);
        mesh.scale.set(puff.sx, puff.sy, puff.sz);
        cluster.add(mesh);
      });

      cluster.position.copy(anchor);
      cluster.visible = false;
      scene.add(cluster);
      return { cluster, anchor, phase: index * 1.2 };
    });

    const rainLayer = createPrecipitationLayer(
      480,
      new THREE.PointsMaterial({
        color: 0xb8ddff,
        size: 0.28,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
      12,
      76,
    );
    const snowLayer = createPrecipitationLayer(
      360,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.68,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
      10,
      70,
    );

    const signalById = new Map<string, SignalData>();
    const signalByKey = new Map<string, SignalData>();
    const signalVisuals: SignalVisual[] = [];
    const hotspotVisuals: HotspotVisual[] = [];
    const pedestrianVisuals: PedestrianVisual[] = [];
    const vehicles: Vehicle[] = [];
    const taxiVehicles: Vehicle[] = [];
    const taxiById = new Map<string, Vehicle>();
    const routeCache = new Map<string, RouteTemplate | null>();
    let graph: RoadGraph | null = null;
    let hotspotPool: Hotspot[] = [];
    let completedTrips = 0;
    let activePedestrians = 0;
    let crosswalkMaterial: THREE.MeshStandardMaterial | null = null;
    let stopLineMaterial: THREE.MeshStandardMaterial | null = null;

    const routeBuilder = (start: string, end: string, id: string, label: string | null) => {
      if (!graph) {
        return null;
      }
      const cacheKey = `${start}|${end}`;
      if (routeCache.has(cacheKey)) {
        return routeCache.get(cacheKey) ?? null;
      }
      const route = buildShortestRoute(graph, signalByKey, start, end, id, label);
      routeCache.set(cacheKey, route);
      return route;
    };

    const dongBoundaryGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x5de08d,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const dongBoundaryGlowMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.035, 1),
      dongBoundaryGlowMaterial,
      dongBoundarySegments.length,
    );

    dongBoundarySegments.forEach((segment, index) => {
      dummy.position.set(segment.center.x, 0.26, segment.center.z);
      dummy.rotation.set(0, segment.angle, 0);
      dummy.scale.set(2.1, 1, segment.length + 1.1);
      dummy.updateMatrix();
      dongBoundaryGlowMesh.setMatrixAt(index, dummy.matrix);
      dongBoundaryGlowMesh.setColorAt(index, new THREE.Color(0x7dffb2));
    });

    dongBoundaryGlowMesh.instanceMatrix.needsUpdate = true;
    if (dongBoundaryGlowMesh.instanceColor) {
      dongBoundaryGlowMesh.instanceColor.needsUpdate = true;
    }
    dongBoundaryGlowMesh.renderOrder = 35;
    scene.add(dongBoundaryGlowMesh);

    const dongBoundaryLineMaterial = new THREE.MeshBasicMaterial({
      color: 0x6bff9c,
      transparent: true,
      opacity: 0.98,
    });
    const dongBoundaryMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.05, 1),
      dongBoundaryLineMaterial,
      dongBoundarySegments.length,
    );

    dongBoundarySegments.forEach((segment, index) => {
      dummy.position.set(segment.center.x, 0.315, segment.center.z);
      dummy.rotation.set(0, segment.angle, 0);
      dummy.scale.set(1.28, 1.4, segment.length + 0.44);
      dummy.updateMatrix();
      dongBoundaryMesh.setMatrixAt(index, dummy.matrix);
      dongBoundaryMesh.setColorAt(index, new THREE.Color(0x64ef9b));
    });

    dongBoundaryMesh.instanceMatrix.needsUpdate = true;
    if (dongBoundaryMesh.instanceColor) {
      dongBoundaryMesh.instanceColor.needsUpdate = true;
    }
    dongBoundaryMesh.renderOrder = 36;
    scene.add(dongBoundaryMesh);

    const dongWallMaterial = new THREE.MeshBasicMaterial({
      color: 0x76ffad,
      transparent: true,
      opacity: 0.001,
      depthWrite: false,
    });
    const dongWallMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      dongWallMaterial,
      dongBoundarySegments.length,
    );

    dongBoundarySegments.forEach((segment, index) => {
      dummy.position.set(segment.center.x, dongBoundaryWallHeight / 2, segment.center.z);
      dummy.rotation.set(0, segment.angle, 0);
      dummy.scale.set(0.42, dongBoundaryWallHeight, segment.length + 0.16);
      dummy.updateMatrix();
      dongWallMesh.setMatrixAt(index, dummy.matrix);
      dongWallMesh.setColorAt(index, new THREE.Color(0x8bffb7));
    });

    dongWallMesh.instanceMatrix.needsUpdate = true;
    if (dongWallMesh.instanceColor) {
      dongWallMesh.instanceColor.needsUpdate = true;
    }
    dongWallMesh.renderOrder = 24;
    scene.add(dongWallMesh);

    const roadMaterials = {
      arterial: new THREE.MeshStandardMaterial({
        color: 0x2c4d7c,
        roughness: 0.96,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      connector: new THREE.MeshStandardMaterial({
        color: 0x27425f,
        roughness: 0.96,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
      local: new THREE.MeshStandardMaterial({
        color: 0x223243,
        roughness: 0.97,
        polygonOffset: true,
        polygonOffsetFactor: 0,
        polygonOffsetUnits: 0,
      }),
    };

    const roadGeometries = {
      arterial: [] as typeof roadSegments,
      connector: [] as typeof roadSegments,
      local: [] as typeof roadSegments,
    };

    roadSegments.forEach((segment) => {
      if (distanceXZ(segment.start, segment.end) < 1) {
        return;
      }
      roadGeometries[segment.roadClass].push(segment);
    });

    (['arterial', 'connector', 'local'] as const).forEach((roadClass) => {
      const segments = roadGeometries[roadClass];
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.25, 1),
        roadMaterials[roadClass],
        segments.length,
      );

      segments.forEach((segment, index) => {
        const length = distanceXZ(segment.start, segment.end);
        const center = segment.start.clone().lerp(segment.end, 0.5);
        const angle = Math.atan2(segment.end.x - segment.start.x, segment.end.z - segment.start.z);
        dummy.position.set(center.x, ROAD_LAYER_Y[roadClass], center.z);
        dummy.rotation.set(0, angle, 0);
        dummy.scale.set(segment.width, 1, length + 1.2);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.renderOrder = roadClass === 'arterial' ? 20 : roadClass === 'connector' ? 10 : 0;
      scene.add(mesh);
    });

    const laneMarkers = roadSegments.flatMap((segment) => {
      if (segment.roadClass === 'local') {
        return [];
      }
      const length = distanceXZ(segment.start, segment.end);
      if (length < 12) {
        return [];
      }
      const dashLength = segment.roadClass === 'arterial' ? 4.8 : 3.7;
      const gapLength = segment.roadClass === 'arterial' ? 4.2 : 3.5;
      const angle = Math.atan2(segment.end.x - segment.start.x, segment.end.z - segment.start.z);
      const markerCount = Math.max(1, Math.floor((length - 4) / (dashLength + gapLength)));

      return Array.from({ length: markerCount }, (_, markerIndex) => {
        const dashCenter = Math.min(
          length - dashLength * 0.5 - 2,
          2 + markerIndex * (dashLength + gapLength) + dashLength * 0.5,
        );
        return {
          center: segment.start.clone().lerp(segment.end, dashCenter / length),
          angle,
          length: dashLength,
        };
      });
    });

    const laneMarkerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffefb0,
      emissive: 0x866000,
      emissiveIntensity: 0.16,
      roughness: 0.62,
    });
    const laneMarkerMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.03, 1),
      laneMarkerMaterial,
      laneMarkers.length,
    );

    laneMarkers.forEach((marker, index) => {
      dummy.position.set(marker.center.x, 0.16, marker.center.z);
      dummy.rotation.set(0, marker.angle, 0);
      dummy.scale.set(1, 1, marker.length);
      dummy.updateMatrix();
      laneMarkerMesh.setMatrixAt(index, dummy.matrix);
    });
    laneMarkerMesh.instanceMatrix.needsUpdate = true;
    scene.add(laneMarkerMesh);

    const buildingMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.96,
      metalness: 0.02,
      emissive: 0x16202c,
      emissiveIntensity: 0.08,
    });
    const buildingMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      buildingMaterial,
      buildingFeatures.length,
    );

    buildingFeatures.forEach((building, index) => {
      dummy.position.set(building.position.x, building.height / 2, building.position.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(building.width, building.height, building.depth);
      dummy.updateMatrix();
      buildingMesh.setMatrixAt(index, dummy.matrix);
      buildingMesh.setColorAt(index, new THREE.Color(building.color));
    });
    buildingMesh.instanceMatrix.needsUpdate = true;
    if (buildingMesh.instanceColor) {
      buildingMesh.instanceColor.needsUpdate = true;
    }
    scene.add(buildingMesh);

    const labelObjects: CSS2DObject[] = [];
    const districtLabelElements = new Map<string, HTMLDivElement>();
    const boundaryHintText = boundaryHintElement();
    container.appendChild(boundaryHintText);

    const applyDistrictPresentation = (mode: CameraMode) => {
      const isOverview = mode === 'overview';
      dongFloorMaterials.forEach((material) => {
        material.opacity = isOverview ? 0.065 : 0.03;
      });
      dongBoundaryGlowMaterial.opacity = isOverview ? 0.34 : 0.22;
      dongBoundaryLineMaterial.color.setHex(isOverview ? 0x76ffad : 0x63f09b);
      dongBoundaryLineMaterial.opacity = isOverview ? 0.98 : 0.92;
      dongWallMaterial.opacity = 0.001;
    };

    const applyRenderBudget = (mode: CameraMode) => {
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, renderPixelRatioFor(mode, isPageHidden)),
      );
      renderer.setSize(container.clientWidth, container.clientHeight, false);
    };

    const setBoundaryDongHighlight = (dongNames: string[]) => {
      const activeDongs = new Set(dongNames.filter(Boolean));
      districtLabelElements.forEach((element, dongName) => {
        const isActive = activeDongs.has(dongName);
        element.style.background = isActive ? 'rgba(18,84,45,0.97)' : 'rgba(5,48,67,0.96)';
        element.style.borderColor = isActive
          ? 'rgba(162,255,187,0.5)'
          : 'rgba(255,255,255,0.12)';
        element.style.color = isActive ? '#f2fff5' : '#d5f6ff';
        element.style.boxShadow = isActive
          ? '0 0 0 1px rgba(162,255,187,0.12), 0 10px 24px rgba(0,0,0,0.32)'
          : '0 8px 18px rgba(0,0,0,0.25)';
        element.style.transform = isActive ? 'translateY(-1px) scale(1.03)' : 'none';
      });
    };

    const resolveFollowTaxi = () =>
      taxiById.get(followTaxiIdRef.current) ?? taxiVehicles[0] ?? null;

    const taxiHeading = (vehicle: Vehicle) => {
      const sample = sampleRoute(vehicle.route, vehicle.distance);
      return Math.atan2(sample.heading.x, sample.heading.z);
    };

    const applyModePreset = (mode: CameraMode) => {
      if (mode === 'overview') {
        cameraRig.focus.copy(centerPoint);
        cameraRig.focus.y = 0;
        cameraRig.pitch = Math.max(cameraRig.pitch, 0.86);
        cameraRig.distance = Math.max(cameraRig.distance, overviewMinDistance * 1.04);
        return;
      }

      if (mode === 'follow') {
        const followedTaxi = resolveFollowTaxi();
        cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch, 0.46, 0.9);
        cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance, 20, 58);
        if (followedTaxi) {
          const baseYaw = taxiHeading(followedTaxi) + Math.PI;
          const nextOffset = wrapAngle(cameraRig.yaw - baseYaw);
          followOrbit.yawOffset = Math.abs(nextOffset) < 1.25 ? nextOffset : 0.22;
        }
        return;
      }

      cameraRig.focus.y = 0;
    };

    applyModePreset(activeCameraMode);
    applyDistrictPresentation(activeCameraMode);
    applyRenderBudget(activeCameraMode);
    syncCamera();

    dongRegions.forEach((dong) => {
      const label = new CSS2DObject(labelElement(dong.name, 'district'));
      label.position.set(dong.position.x, 2.8, dong.position.z);
      label.visible = true;
      districtLabelElements.set(dong.name, label.element as HTMLDivElement);
      labelObjects.push(label);
      scene.add(label);
    });

    buildingFeatures
      .filter((building) => building.label)
      .sort((left, right) => right.height - left.height)
      .slice(0, 7)
      .forEach((building) => {
        const label = new CSS2DObject(labelElement(building.label as string, 'building'));
        label.position.set(
          building.position.x,
          Math.min(building.height + 4, 38),
          building.position.z,
        );
        label.visible = showLabels;
        labelObjects.push(label);
        scene.add(label);
      });

    if (showTransit) {
      transitLandmarks.forEach((landmark, index) => {
        const structure =
          landmark.category === 'bus_stop'
            ? createBusStopStructure(index, landmark.sideSign, landmark.isMajor)
            : createSubwayStationStructure(index, landmark.sideSign, landmark.isMajor);
        structure.position.copy(landmark.position);
        structure.rotation.y = landmark.yaw;
        structure.scale.setScalar(
          landmark.category === 'bus_stop'
            ? landmark.isMajor
              ? 0.94
              : 0.8
            : landmark.isMajor
              ? 1.02
              : 0.8,
        );
        scene.add(structure);

        if (landmark.category === 'subway_station' && landmark.name && landmark.isMajor) {
          const label = new CSS2DObject(labelElement(landmark.name, 'transit'));
          label.position.set(landmark.position.x, 3.1, landmark.position.z);
          label.visible = showLabels;
          labelObjects.push(label);
          scene.add(label);
        }
      });
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    simulationTimeout = window.setTimeout(() => {
      graph = buildRoadGraph(data.roads, data.center);
      const currentGraph = graph;
      const signals = buildSignals(data.roads, data.center);
      signals.forEach((signal) => {
        signalById.set(signal.id, signal);
        signalByKey.set(signal.key, signal);
      });

      const loopRoutes = buildLoopRoutes(data.roads, data.center, signalByKey);
      const taxiSourceRoutes = loopRoutes
        .filter((route) => route.roadClass !== 'local')
        .slice(0, Math.max(TAXI_COUNT, 12));
      const trafficRoutes = loopRoutes.slice(0, Math.max(TRAFFIC_COUNT, 20));
      if (!taxiSourceRoutes.length || !trafficRoutes.length) {
        return;
      }

      const taxiRouteById = new Map(taxiSourceRoutes.map((route) => [route.id, route]));
      hotspotPool = buildTaxiHotspots(taxiSourceRoutes, buildingFeatures);
      if (!hotspotPool.length) {
        return;
      }

      const nextSignalVisuals = signals.map((signal) => {
        const group = new THREE.Group();
        const reds: THREE.Mesh[] = [];
        const greens: THREE.Mesh[] = [];
        const leftArrows: THREE.Mesh[] = [];
        const pedestrianLamps: THREE.Mesh[] = [];

        const mastLayout = [
          { offset: new THREE.Vector3(0, 0, -3.35), yaw: 0 },
          { offset: new THREE.Vector3(3.35, 0, 0), yaw: Math.PI / 2 },
          { offset: new THREE.Vector3(0, 0, 3.35), yaw: Math.PI },
          { offset: new THREE.Vector3(-3.35, 0, 0), yaw: -Math.PI / 2 },
        ];

        mastLayout.forEach(({ offset, yaw }) => {
          const mast = new THREE.Group();
          mast.position.copy(offset);
          mast.rotation.y = yaw;

          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 4.2, 8),
            new THREE.MeshStandardMaterial({ color: 0x9aa5b1, roughness: 0.6 }),
          );
          pole.position.set(0, 2.1, 0);
          pole.castShadow = true;
          mast.add(pole);

          const arm = new THREE.Mesh(
            new THREE.BoxGeometry(1.15, 0.12, 0.12),
            new THREE.MeshStandardMaterial({ color: 0x8d99a8, roughness: 0.55 }),
          );
          arm.position.set(0.58, 3.92, 0);
          mast.add(arm);

          const head = new THREE.Mesh(
            new THREE.BoxGeometry(1.42, 2.42, 0.68),
            new THREE.MeshStandardMaterial({ color: 0x10161f, roughness: 0.5 }),
          );
          head.position.set(1.32, 3.7, 0);
          mast.add(head);

          const red = new THREE.Mesh(
            new THREE.SphereGeometry(0.17, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0x431015, emissive: 0x230709 }),
          );
          red.position.set(1.02, 4, 0.38);
          mast.add(red);
          reds.push(red);

          const green = new THREE.Mesh(
            new THREE.SphereGeometry(0.17, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0x123f22, emissive: 0x081a0f }),
          );
          green.position.set(1.02, 3.36, 0.38);
          mast.add(green);
          greens.push(green);

          const leftArrow = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.38, 0.18),
            new THREE.MeshStandardMaterial({ color: 0x0f2218, emissive: 0x07120b }),
          );
          leftArrow.position.set(1.72, 3.7, 0.38);
          mast.add(leftArrow);
          leftArrows.push(leftArrow);

          const pedestrianLamp = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.42, 0.18),
            new THREE.MeshStandardMaterial({ color: 0x222833, emissive: 0x10151d }),
          );
          pedestrianLamp.position.set(1.72, 3.06, 0.38);
          mast.add(pedestrianLamp);
          pedestrianLamps.push(pedestrianLamp);

          group.add(mast);
        });

        group.position.copy(signal.point);
        scene.add(group);

        return {
          ...signal,
          group,
          reds,
          greens,
          leftArrows,
          pedestrianLamps,
        } satisfies SignalVisual;
      });
      signalVisuals.push(...nextSignalVisuals);

      const crosswalkStripes = signalVisuals.flatMap((signal) => {
        const nsStripes = Array.from({ length: CROSSWALK_STRIPE_COUNT }, (_, index) => ({
          center: signal.point
            .clone()
            .add(new THREE.Vector3(0, 0.03, (index - 2.5) * CROSSWALK_STEP)),
          angle: 0,
          width: CROSSWALK_WIDTH,
          depth: 0.42,
        }));
        const ewStripes = Array.from({ length: CROSSWALK_STRIPE_COUNT }, (_, index) => ({
          center: signal.point
            .clone()
            .add(new THREE.Vector3((index - 2.5) * CROSSWALK_STEP, 0.03, 0)),
          angle: Math.PI / 2,
          width: CROSSWALK_WIDTH,
          depth: 0.42,
        }));
        return [...nsStripes, ...ewStripes];
      });

      crosswalkMaterial = new THREE.MeshStandardMaterial({
        color: 0xeef4ff,
        emissive: 0x39424f,
        emissiveIntensity: 0.08,
        roughness: 0.7,
      });
      const crosswalkMesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.02, 1),
        crosswalkMaterial,
        crosswalkStripes.length,
      );

      crosswalkStripes.forEach((stripe, index) => {
        dummy.position.copy(stripe.center);
        dummy.rotation.set(0, stripe.angle, 0);
        dummy.scale.set(stripe.width, 1, stripe.depth);
        dummy.updateMatrix();
        crosswalkMesh.setMatrixAt(index, dummy.matrix);
      });
      crosswalkMesh.instanceMatrix.needsUpdate = true;
      scene.add(crosswalkMesh);

      const stopLineMarkers = loopRoutes
        .filter((route) => route.roadClass !== 'local')
        .flatMap((route) => route.stops.map((stop) => ({ route, stop })));

      stopLineMaterial = new THREE.MeshStandardMaterial({
        color: 0xf7fbff,
        emissive: 0x394959,
        emissiveIntensity: 0.12,
        roughness: 0.54,
      });
      const stopLineMesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.04, 0.32),
        stopLineMaterial,
        stopLineMarkers.length,
      );

      stopLineMarkers.forEach((marker, index) => {
        const sample = sampleRoute(marker.route, marker.stop.distance);
        const lanePosition = offsetToRight(
          sample.position,
          sample.heading,
          marker.route.laneOffset,
        );
        dummy.position.set(lanePosition.x, 0.18, lanePosition.z);
        dummy.rotation.set(0, Math.atan2(sample.heading.x, sample.heading.z), 0);
        dummy.scale.set(Math.min(marker.route.roadWidth * 0.48, 2.4), 1, 1);
        dummy.updateMatrix();
        stopLineMesh.setMatrixAt(index, dummy.matrix);
      });
      stopLineMesh.instanceMatrix.needsUpdate = true;
      scene.add(stopLineMesh);

      const nextHotspotVisuals = hotspotPool.map((hotspot, index) => {
        const group = new THREE.Group();
        const baseColor = index % 3 === 0 ? 0xffcf57 : index % 3 === 1 ? 0x71d8ff : 0xff8d71;
        const hotspotRoute = taxiRouteById.get(hotspot.routeId);
        const hotspotSample = hotspotRoute
          ? sampleRoute(hotspotRoute, hotspot.distance)
          : { position: hotspot.position.clone(), heading: new THREE.Vector3(0, 0, 1) };

        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 1.45, 0.18, 20),
          new THREE.MeshStandardMaterial({
            color: baseColor,
            emissive: baseColor,
            emissiveIntensity: 0.14,
            roughness: 0.5,
          }),
        );
        base.position.y = 0.11;
        group.add(base);

        const glow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.72, 0.94, 0.12, 18),
          new THREE.MeshStandardMaterial({
            color: 0xfff6da,
            emissive: baseColor,
            emissiveIntensity: 0.22,
            transparent: true,
            opacity: 0.74,
            roughness: 0.2,
          }),
        );
        glow.position.y = 0.25;
        group.add(glow);

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 18, 18),
          new THREE.MeshStandardMaterial({
            color: 0xfffbf1,
            emissive: baseColor,
            emissiveIntensity: 0.34,
            transparent: true,
            opacity: 0.9,
            roughness: 0.16,
          }),
        );
        beacon.position.y = 0.55;
        group.add(beacon);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.02, 0.08, 10, 28),
          new THREE.MeshStandardMaterial({
            color: 0xfff7db,
            emissive: baseColor,
            emissiveIntensity: 0.2,
            roughness: 0.38,
          }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.24;
        group.add(ring);

        const caller = createCallerGroup(index);
        const curbOffset = (hotspotRoute?.roadWidth ?? 3.8) * 0.72 + 1.55;
        const callerAnchor = offsetToRight(
          hotspotSample.position,
          hotspotSample.heading,
          curbOffset,
        ).addScaledVector(hotspotSample.heading, -0.3);
        caller.group.position.set(
          callerAnchor.x - hotspot.position.x,
          0.04,
          callerAnchor.z - hotspot.position.z,
        );
        caller.group.rotation.y = Math.atan2(
          hotspotSample.position.x - callerAnchor.x,
          hotspotSample.position.z - callerAnchor.z,
        );
        caller.group.visible = false;
        caller.waveArmPivot.rotation.z = -0.72;
        group.add(caller.group);

        const callBadge = new CSS2DObject(hotspotCallElement());
        callBadge.position.set(0, 2.18, 0);
        callBadge.visible = false;
        group.add(callBadge);

        group.position.copy(hotspot.position);
        scene.add(group);
        return {
          hotspot,
          base,
          glow,
          beacon,
          ring,
          callerGroup: caller.group,
          waveArmPivot: caller.waveArmPivot,
          hailCube: caller.hailCube,
          callBadge,
        } satisfies HotspotVisual;
      });
      hotspotVisuals.push(...nextHotspotVisuals);

      const nextPedestrianVisuals: PedestrianVisual[] = signalVisuals.flatMap(
        (signal, signalIndex) => [
        {
          signalId: signal.id,
          axis: 'ns' as const,
          group: createPedestrianGroup(signalIndex),
          phaseOffset: signalIndex * 0.17,
          speed: 0.18 + (signalIndex % 3) * 0.03,
          lateralOffset: -2.1,
          direction: 1 as const,
        },
        {
          signalId: signal.id,
          axis: 'ns' as const,
          group: createPedestrianGroup(signalIndex + 2),
          phaseOffset: signalIndex * 0.13 + 0.4,
          speed: 0.16 + (signalIndex % 2) * 0.02,
          lateralOffset: 2.1,
          direction: -1 as const,
        },
        {
          signalId: signal.id,
          axis: 'ew' as const,
          group: createPedestrianGroup(signalIndex + 4),
          phaseOffset: signalIndex * 0.11 + 0.2,
          speed: 0.19 + (signalIndex % 4) * 0.02,
          lateralOffset: -2.1,
          direction: 1 as const,
        },
        {
          signalId: signal.id,
          axis: 'ew' as const,
          group: createPedestrianGroup(signalIndex + 7),
          phaseOffset: signalIndex * 0.09 + 0.6,
          speed: 0.17 + (signalIndex % 3) * 0.02,
          lateralOffset: 2.1,
          direction: -1 as const,
        },
      ],
      );
      nextPedestrianVisuals.forEach((pedestrian) => {
        pedestrian.group.visible = false;
        scene.add(pedestrian.group);
      });
      pedestrianVisuals.push(...nextPedestrianVisuals);

      for (let index = 0; index < TAXI_COUNT; index += 1) {
        const spawnHotspot = hotspotPool[(index * 2) % hotspotPool.length];
        const job = planTaxiJob(
          spawnHotspot.nodeKey,
          hotspotPool,
          index + 1,
          `taxi-${index}`,
          routeBuilder,
          currentGraph,
        );
        if (!job) {
          continue;
        }

        const { group, bodyMaterial, signMaterial } = createVehicleGroup('taxi', TAXI_PALETTE);
        scene.add(group);

        const vehicle: Vehicle = {
          id: `taxi-${index}`,
          kind: 'taxi',
          route: job.pickupRoute,
          group,
          bodyMaterial,
          signMaterial,
          baseSpeed: 7.1 + (index % 4) * 0.55,
          speed: 0,
          distance: 0,
          safeGap: 7.8,
          length: 4.6,
          currentSignalId: null,
          roadName: job.pickupRoute.name,
          palette: TAXI_PALETTE,
          isOccupied: false,
          pickupHotspot: job.pickupHotspot,
          dropoffHotspot: job.dropoffHotspot,
          serviceTimer: 0,
          planMode: 'pickup',
        };
        setTaxiAppearance(vehicle);
        syncVehicleTransform(vehicle);
        vehicles.push(vehicle);
        taxiVehicles.push(vehicle);
        taxiById.set(vehicle.id, vehicle);
      }

      for (let index = 0; index < TRAFFIC_COUNT; index += 1) {
        const route = trafficRoutes[index % trafficRoutes.length];
        const palette = TRAFFIC_PALETTES[index % TRAFFIC_PALETTES.length];
        const { group, bodyMaterial, signMaterial } = createVehicleGroup('traffic', palette);
        scene.add(group);

        const vehicle: Vehicle = {
          id: `traffic-${index}`,
          kind: 'traffic',
          route,
          group,
          bodyMaterial,
          signMaterial,
          baseSpeed: 5.6 + (index % 5) * 0.4,
          speed: 0,
          distance: (route.totalLength / TRAFFIC_COUNT) * index,
          safeGap: 6.4,
          length: 4.2,
          currentSignalId: null,
          roadName: route.name,
          palette,
          isOccupied: false,
          pickupHotspot: null,
          dropoffHotspot: null,
          serviceTimer: 0,
          planMode: 'traffic',
        };
        syncVehicleTransform(vehicle);
        vehicles.push(vehicle);
      }

      taxiSourceRoutes
        .filter((route) => route.name)
        .slice(0, 6)
        .forEach((route) => {
          const sample = sampleRoute(route, route.totalLength * 0.4);
          const label = new CSS2DObject(labelElement(route.name as string, 'road'));
          label.position.copy(sample.position.clone().setY(1.6));
          label.visible = showLabels;
          labelObjects.push(label);
          scene.add(label);
        });

      setStats((current) => ({
        ...current,
        taxis: taxiVehicles.length,
        traffic: vehicles.length - taxiVehicles.length,
        signals: signalVisuals.length,
      }));

      applyEnvironment(simulationTimeRef.current, weatherModeRef.current);
      applyModePreset(cameraModeRef.current);
      syncCamera();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }, 0);

    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrame = 0;
    let lastRafTimestamp = 0;
    let lastVisibleRenderTimestamp = 0;
    let renderAccumulatorMs = 0;
    let statsAccumulator = 0;
    let fpsSampleElapsed = 0;
    let fpsFrameCount = 0;
    let appliedWeatherMode: WeatherMode | null = null;
    let appliedTimeMinutes = -1;
    let activeVehicleSpeedMultiplier = 1;
    let activeStarOpacity = 0;

    const applyEnvironment = (minutes: number, nextWeatherMode: WeatherMode) => {
      const environment = buildEnvironmentState(minutes, nextWeatherMode);
      const daylight = daylightFactor(minutes);
      const sunset = sunsetFactor(minutes);
      const cloudVisibility =
        nextWeatherMode === 'clear'
          ? 1
          : nextWeatherMode === 'cloudy'
            ? 0.78
            : nextWeatherMode === 'heavy-rain'
              ? 0.42
              : 0.58;
      const background = scene.background as THREE.Color | null;

      background?.setHex(environment.skyColor);
      sceneFog.color.setHex(environment.fogColor);
      sceneFog.near = environment.fogNear;
      sceneFog.far = environment.fogFar;

      ambientLight.color.setHex(environment.ambientColor);
      ambientLight.intensity = environment.ambientIntensity;
      hemisphereLight.color.setHex(environment.hemiSkyColor);
      hemisphereLight.groundColor.setHex(environment.hemiGroundColor);
      hemisphereLight.intensity = environment.hemiIntensity;

      sun.color.setHex(environment.sunColor);
      sun.intensity = environment.sunIntensity;
      sun.position.set(centerPoint.x + 112, 188, centerPoint.z + 84);

      groundMaterial.color.setHex(environment.groundColor);
      roadMaterials.arterial.color.setHex(environment.roadColors.arterial);
      roadMaterials.connector.color.setHex(environment.roadColors.connector);
      roadMaterials.local.color.setHex(environment.roadColors.local);
      (
        [roadMaterials.arterial, roadMaterials.connector, roadMaterials.local] as THREE.MeshStandardMaterial[]
      ).forEach((material) => {
        material.roughness = environment.roadRoughness;
        material.metalness = environment.roadMetalness;
      });

      laneMarkerMaterial.color.setHex(environment.laneMarkerColor);
      laneMarkerMaterial.emissive.setHex(environment.laneMarkerEmissive);
      laneMarkerMaterial.emissiveIntensity = environment.laneMarkerIntensity;
      buildingMaterial.color.setHex(environment.buildingTint);
      buildingMaterial.emissive.setHex(environment.buildingEmissive);
      buildingMaterial.emissiveIntensity = environment.buildingEmissiveIntensity;
      if (crosswalkMaterial) {
        crosswalkMaterial.color.setHex(environment.crosswalkColor);
        crosswalkMaterial.emissive.setHex(environment.crosswalkEmissive);
        crosswalkMaterial.emissiveIntensity = environment.crosswalkIntensity;
      }
      if (stopLineMaterial) {
        stopLineMaterial.color.setHex(environment.stopLineColor);
        stopLineMaterial.emissive.setHex(environment.stopLineEmissive);
        stopLineMaterial.emissiveIntensity = environment.stopLineIntensity;
      }

      const skyDirection = environment.sunPosition.clone().normalize();
      const sunAnchor = centerPoint.clone().addScaledVector(skyDirection, celestialRadius);
      sunDisc.position.copy(sunAnchor);
      sunHalo.position.copy(sunAnchor);
      sunsetGlow.position.copy(
        centerPoint
          .clone()
          .addScaledVector(
            new THREE.Vector3(skyDirection.x, Math.max(0.12, skyDirection.y * 0.48), skyDirection.z).normalize(),
            celestialRadius * 0.84,
          ),
      );

      const moonDirection = skyDirection.clone().multiplyScalar(-1);
      moonDirection.y = Math.max(0.22, moonDirection.y * 0.7 + 0.18);
      moonDirection.normalize();
      moon.position.copy(centerPoint.clone().addScaledVector(moonDirection, celestialRadius * 0.92));

      sunDiscMaterial.color.setHex(sunset > 0.18 ? 0xffc572 : 0xffefbc);
      sunDiscMaterial.opacity = THREE.MathUtils.clamp(daylight * 0.4 + sunset * 0.44, 0, 0.78) * cloudVisibility;
      sunHaloMaterial.opacity = THREE.MathUtils.clamp(daylight * 0.14 + sunset * 0.3, 0, 0.28) * cloudVisibility;
      sunsetGlowMaterial.opacity = THREE.MathUtils.clamp(sunset * 0.36, 0, 0.3) * cloudVisibility;
      moonMaterial.opacity =
        THREE.MathUtils.clamp((0.18 - daylight) / 0.18, 0, 0.82) *
        (nextWeatherMode === 'heavy-rain' ? 0.42 : 0.76);
      activeStarOpacity =
        THREE.MathUtils.clamp((0.16 - daylight) / 0.16, 0, 0.68) *
        (nextWeatherMode === 'heavy-rain' ? 0.22 : nextWeatherMode === 'cloudy' ? 0.5 : 0.78);
      const cloudOpacityBase =
        nextWeatherMode === 'clear'
          ? 0
          : nextWeatherMode === 'cloudy'
            ? 0.3
            : nextWeatherMode === 'heavy-rain'
              ? 0.42
              : 0.58;
      const cloudColor =
        nextWeatherMode === 'heavy-rain'
          ? 0xc8d2de
          : nextWeatherMode === 'heavy-snow'
            ? 0xf6fbff
            : 0xf0f5fb;
      cloudMaterial.color.setHex(cloudColor);
      cloudMaterial.opacity =
        nextWeatherMode === 'heavy-rain'
          ? 0.14
          : cloudOpacityBase * (daylight > 0.08 ? 1 : 0.86);
      cloudClusters.forEach(({ cluster }) => {
        cluster.visible = nextWeatherMode !== 'heavy-rain' && cloudOpacityBase > 0.01;
      });
      const stormCloudOpacity = nextWeatherMode === 'heavy-rain' ? 0.54 : 0;
      stormCloudMaterial.opacity = stormCloudOpacity;
      stormCloudMaterial.color.setHex(nextWeatherMode === 'heavy-rain' ? 0x6f8397 : 0x73879a);
      stormCloudClusters.forEach(({ cluster }) => {
        cluster.visible = stormCloudOpacity > 0.01;
      });

      activeVehicleSpeedMultiplier = environment.vehicleSpeedMultiplier;
      rainLayer.points.visible = environment.precipitation === 'rain';
      rainLayer.material.opacity = environment.precipitationOpacity;
      rainLayer.material.size = 0.22 + environment.precipitationIntensity * 0.1;
      snowLayer.points.visible = environment.precipitation === 'snow';
      snowLayer.material.opacity = environment.precipitationOpacity;
      snowLayer.material.size = 0.58 + environment.precipitationIntensity * 0.18;

      renderer.toneMappingExposure = environment.exposure;
    };

    const updatePrecipitation = (delta: number, elapsedTime: number) => {
      if (rainLayer.points.visible) {
        const positions = rainLayer.geometry.attributes.position.array as Float32Array;
        for (let index = 0; index < rainLayer.seeds.length; index += 1) {
          const offset = index * 3;
          positions[offset] += delta * 3.1;
          positions[offset + 1] -= delta * (36 + rainLayer.seeds[index] * 16);
          positions[offset + 2] += delta * 5.1;

          if (positions[offset] > rainLayer.maxX) positions[offset] = rainLayer.minX;
          if (positions[offset + 2] > rainLayer.maxZ) positions[offset + 2] = rainLayer.minZ;
          if (positions[offset + 1] < rainLayer.minHeight) {
            positions[offset] = THREE.MathUtils.lerp(rainLayer.minX, rainLayer.maxX, Math.random());
            positions[offset + 1] = rainLayer.maxHeight;
            positions[offset + 2] = THREE.MathUtils.lerp(rainLayer.minZ, rainLayer.maxZ, Math.random());
          }
        }
        rainLayer.geometry.attributes.position.needsUpdate = true;
      }

      if (snowLayer.points.visible) {
        const positions = snowLayer.geometry.attributes.position.array as Float32Array;
        for (let index = 0; index < snowLayer.seeds.length; index += 1) {
          const offset = index * 3;
          const sway = Math.sin(elapsedTime * 1.6 + snowLayer.seeds[index] * Math.PI * 2) * 0.52;
          positions[offset] += sway * delta;
          positions[offset + 1] -= delta * (7 + snowLayer.seeds[index] * 3.2);
          positions[offset + 2] += delta * (1.1 + snowLayer.seeds[index] * 0.8);

          if (positions[offset] > snowLayer.maxX) positions[offset] = snowLayer.minX;
          if (positions[offset] < snowLayer.minX) positions[offset] = snowLayer.maxX;
          if (positions[offset + 2] > snowLayer.maxZ) positions[offset + 2] = snowLayer.minZ;
          if (positions[offset + 1] < snowLayer.minHeight) {
            positions[offset] = THREE.MathUtils.lerp(snowLayer.minX, snowLayer.maxX, Math.random());
            positions[offset + 1] = snowLayer.maxHeight;
            positions[offset + 2] = THREE.MathUtils.lerp(snowLayer.minZ, snowLayer.maxZ, Math.random());
          }
        }
        snowLayer.geometry.attributes.position.needsUpdate = true;
      }
    };

    const updateSignalVisuals = (elapsedTime: number) => {
      signalVisuals.forEach((signal) => {
        const state = signalState(signal, elapsedTime);
        signal.reds.forEach((lamp) => {
          (lamp.material as THREE.MeshStandardMaterial).emissive.setHex(
            state.ns === 'red' && state.ew === 'red' ? 0xff2d55 : 0x240608,
          );
        });
        signal.greens.forEach((lamp) => {
          (lamp.material as THREE.MeshStandardMaterial).emissive.setHex(
            state.phase === 'ns_flow' || state.phase === 'ew_flow' ? 0x3cf07b : 0x08190d,
          );
        });
        signal.leftArrows.forEach((lamp) => {
          (lamp.material as THREE.MeshStandardMaterial).emissive.setHex(
            state.phase === 'ns_left' || state.phase === 'ew_left' ? 0x54f49d : 0x08190d,
          );
        });
        signal.pedestrianLamps.forEach((lamp) => {
          (lamp.material as THREE.MeshStandardMaterial).emissive.setHex(
            state.pedestrian === 'walk'
              ? 0xf6f7ff
              : state.pedestrian === 'flash' && Math.sin(elapsedTime * 12) > 0
                ? 0xf9c756
                : 0x111721,
          );
        });
      });
    };

    const updateHotspotVisuals = (elapsedTime: number) => {
      const activeCallsByHotspot = new Map<string, number>();
      vehicles.forEach((vehicle) => {
        if (vehicle.kind !== 'taxi' || vehicle.isOccupied || !vehicle.pickupHotspot) {
          return;
        }
        activeCallsByHotspot.set(
          vehicle.pickupHotspot.id,
          (activeCallsByHotspot.get(vehicle.pickupHotspot.id) ?? 0) + 1,
        );
      });

      hotspotVisuals.forEach((visual, index) => {
        const pulse = 0.74 + Math.sin(elapsedTime * 2.4 + index * 0.7) * 0.22;
        const activeCalls = activeCallsByHotspot.get(visual.hotspot.id) ?? 0;
        const isActive = activeCalls > 0;
        const baseMaterial = visual.base.material as THREE.MeshStandardMaterial;
        const glowMaterial = visual.glow.material as THREE.MeshStandardMaterial;
        const beaconMaterial = visual.beacon.material as THREE.MeshStandardMaterial;
        const ringMaterial = visual.ring.material as THREE.MeshStandardMaterial;
        const hailMaterial = visual.hailCube.material as THREE.MeshStandardMaterial;

        visual.base.scale.setScalar(isActive ? 0.98 + pulse * 0.05 : 0.82);
        visual.glow.scale.setScalar(isActive ? 0.96 + pulse * 0.08 : 0.72);
        visual.beacon.scale.setScalar(isActive ? 0.92 + pulse * 0.16 : 0.68);
        visual.ring.scale.setScalar(isActive ? 0.96 + pulse * 0.12 : 0.78);
        visual.ring.rotation.z = elapsedTime * 0.45 + index * 0.2;

        baseMaterial.emissiveIntensity = isActive ? 0.18 + pulse * 0.08 : 0.04;
        glowMaterial.emissiveIntensity = isActive ? 0.24 + pulse * 0.12 : 0.06;
        glowMaterial.opacity = isActive ? 0.62 + pulse * 0.14 : 0.2;
        beaconMaterial.emissiveIntensity = isActive ? 0.24 + pulse * 0.22 : 0.08;
        beaconMaterial.opacity = isActive ? 0.9 : 0.28;
        ringMaterial.emissiveIntensity = isActive ? 0.22 + pulse * 0.18 : 0.05;
        hailMaterial.emissiveIntensity = isActive ? 0.34 + pulse * 0.32 : 0.1;

        visual.callerGroup.visible = isActive;
        visual.callerGroup.position.y = 0.04 + (isActive ? Math.sin(elapsedTime * 3.1 + index) * 0.05 : 0);
        visual.waveArmPivot.rotation.z = isActive
          ? -0.8 - Math.sin(elapsedTime * 5.4 + index * 0.8) * 0.42
          : -0.72;
        visual.hailCube.scale.setScalar(isActive ? 0.94 + pulse * 0.14 : 0.86);
        visual.callBadge.visible = isActive;
        visual.callBadge.position.y = 2.1 + (isActive ? Math.sin(elapsedTime * 2.6 + index) * 0.08 : 0);
      });
    };

    const updatePedestrians = (elapsedTime: number) => {
      let visibleCount = 0;
      pedestrianVisuals.forEach((pedestrian) => {
        const signal = signalById.get(pedestrian.signalId);
        if (!signal) {
          pedestrian.group.visible = false;
          return;
        }

        const state = signalState(signal, elapsedTime);
        const isVisible =
          state.pedestrian === 'walk' ||
          (state.pedestrian === 'flash' && Math.sin(elapsedTime * 14 + pedestrian.phaseOffset) > 0);

        pedestrian.group.visible = isVisible;
        if (!isVisible) {
          return;
        }

        visibleCount += 1;
        const progressBase = (elapsedTime * pedestrian.speed + pedestrian.phaseOffset) % 1;
        const progress = pedestrian.direction === 1 ? progressBase : 1 - progressBase;
        const travel = THREE.MathUtils.lerp(-PEDESTRIAN_SPAN, PEDESTRIAN_SPAN, progress);
        const bob = Math.sin(elapsedTime * 9 + pedestrian.phaseOffset * 11) * 0.05;

        if (pedestrian.axis === 'ns') {
          pedestrian.group.position.set(
            signal.point.x + pedestrian.lateralOffset,
            bob,
            signal.point.z + travel,
          );
          pedestrian.group.rotation.y = 0;
        } else {
          pedestrian.group.position.set(
            signal.point.x + travel,
            bob,
            signal.point.z + pedestrian.lateralOffset,
          );
          pedestrian.group.rotation.y = Math.PI / 2;
        }
      });
      activePedestrians = visibleCount;
    };

    const updateVehicles = (delta: number, elapsedTime: number) => {
      const intersectionOccupancy = new Map<string, { ns: number; ew: number }>();
      const samples = vehicles.map((vehicle) => {
        const sample = sampleRoute(vehicle.route, vehicle.distance);
        const lanePosition = offsetToRight(sample.position, sample.heading, vehicle.route.laneOffset);
        const right = new THREE.Vector3(sample.heading.z, 0, -sample.heading.x).normalize();
        return { vehicle, sample, lanePosition, right };
      });

      samples.forEach(({ vehicle, sample }) => {
        vehicle.currentSignalId = null;
        signalVisuals.forEach((signal) => {
          const signalDistance = sample.position.distanceTo(signal.point);
          if (signalDistance < SIGNAL_RADIUS) {
            vehicle.currentSignalId = signal.id;
          }
          if (signalDistance >= INTERSECTION_OCCUPANCY_RADIUS) {
            return;
          }

          const nearIntersectionStop = vehicle.route.stops
            .map((stop) => ({
              stop,
              ahead: routeDistanceAhead(vehicle.route, vehicle.distance, stop.distance),
            }))
            .filter(
              (entry) =>
                entry.stop.signalId === signal.id &&
                entry.ahead >= 0 &&
                entry.ahead < INTERSECTION_OCCUPANCY_LOOKAHEAD,
            )
            .sort((left, right) => left.ahead - right.ahead)[0];

          if (!nearIntersectionStop) {
            return;
          }

          const claim = intersectionOccupancy.get(signal.id) ?? { ns: 0, ew: 0 };
          if (nearIntersectionStop.stop.axis === 'ns') {
            claim.ns += 1;
          } else {
            claim.ew += 1;
          }
          intersectionOccupancy.set(signal.id, claim);
        });
      });

      let waitingVehicles = 0;
      let activeTrips = 0;

      vehicles.forEach((vehicle, vehicleIndex) => {
        const current = samples[vehicleIndex];
        let targetSpeed = vehicle.baseSpeed * activeVehicleSpeedMultiplier;
        let holdPosition = false;

        if (vehicle.serviceTimer > 0) {
          vehicle.serviceTimer = Math.max(0, vehicle.serviceTimer - delta);
          targetSpeed = 0;
          holdPosition = true;
          waitingVehicles += 1;

          if (vehicle.serviceTimer === 0 && vehicle.kind === 'taxi') {
            if (!vehicle.isOccupied && vehicle.pickupHotspot) {
              vehicle.isOccupied = true;
              vehicle.pickupHotspot = null;
              setTaxiAppearance(vehicle);
              const dropRoute = routeBuilder(
                vehicle.route.endKey,
                vehicle.dropoffHotspot?.nodeKey ?? vehicle.route.endKey,
                `${vehicle.id}-dropoff-${completedTrips}`,
                vehicle.dropoffHotspot?.roadName ?? vehicle.dropoffHotspot?.label ?? null,
              );
              if (dropRoute) {
                vehicle.route = dropRoute;
                vehicle.distance = 0;
                vehicle.roadName = dropRoute.name;
                vehicle.planMode = 'dropoff';
              }
            } else if (vehicle.isOccupied && vehicle.dropoffHotspot) {
              completedTrips += 1;
              if (!graph || !hotspotPool.length) {
                return;
              }
              const nextJob = planTaxiJob(
                vehicle.route.endKey,
                hotspotPool,
                completedTrips + vehicleIndex + 1,
                vehicle.id,
                routeBuilder,
                graph,
              );
              if (nextJob) {
                vehicle.pickupHotspot = nextJob.pickupHotspot;
                vehicle.dropoffHotspot = nextJob.dropoffHotspot;
                vehicle.route = nextJob.pickupRoute;
                vehicle.distance = 0;
                vehicle.roadName = nextJob.pickupRoute.name;
                vehicle.planMode = 'pickup';
                vehicle.isOccupied = false;
                setTaxiAppearance(vehicle);
              }
            }
          }
        }

        if (!holdPosition) {
          for (let otherIndex = 0; otherIndex < samples.length; otherIndex += 1) {
            if (otherIndex === vehicleIndex) {
              continue;
            }
            const other = samples[otherIndex];
            const alignment = current.sample.heading.dot(other.sample.heading);
            if (alignment < 0.35) {
              continue;
            }
            const deltaVector = other.lanePosition.clone().sub(current.lanePosition);
            const longitudinal = deltaVector.dot(current.sample.heading);
            if (longitudinal <= 0 || longitudinal > vehicle.safeGap + 8) {
              continue;
            }
            const lateral = Math.abs(deltaVector.dot(current.right));
            const laneTolerance = Math.max(vehicle.route.roadWidth, other.vehicle.route.roadWidth) * 0.48;
            if (lateral > laneTolerance) {
              continue;
            }
            const gapLimit = Math.max(0, (longitudinal - other.vehicle.length * 0.65 - 0.9) * 1.1);
            targetSpeed = Math.min(targetSpeed, gapLimit);
          }
        }

        const nextStop = vehicle.route.stops
          .map((stop) => ({
            stop,
            ahead: routeDistanceAhead(vehicle.route, vehicle.distance, stop.distance),
          }))
          .filter((entry) => entry.ahead < 18)
          .sort((left, right) => left.ahead - right.ahead)[0];

        if (!holdPosition && nextStop) {
          const signal = signalById.get(nextStop.stop.signalId);
          if (signal) {
            const state = signalState(signal, elapsedTime);
            const occupancyState = intersectionOccupancy.get(signal.id);
            const conflictingAxisOccupied =
              occupancyState &&
              (nextStop.stop.axis === 'ns' ? occupancyState.ew > 0 : occupancyState.ns > 0);
            const canGo = canVehicleProceed(
              nextStop.stop,
              state,
              Boolean(conflictingAxisOccupied),
            );
            const blockedByIntersection =
              Boolean(conflictingAxisOccupied) && nextStop.ahead < INTERSECTION_OCCUPANCY_LOOKAHEAD;
            if (!canGo || blockedByIntersection) {
              const stopGap = Math.max(0, nextStop.ahead - 0.8);
              targetSpeed = Math.min(targetSpeed, Math.max(0, stopGap * 1.32));
              if (stopGap < 1.1) {
                waitingVehicles += 1;
              }
            }
          }
        }

        if (!holdPosition && !vehicle.route.isLoop) {
          const destinationGap = Math.max(0, vehicle.route.totalLength - vehicle.distance);
          if (destinationGap < HOTSPOT_SLOWDOWN_DISTANCE) {
            const curbGap = Math.max(0, destinationGap - 0.65);
            targetSpeed = Math.min(targetSpeed, Math.max(0, curbGap * 1.4));
            if (destinationGap < HOTSPOT_TRIGGER_DISTANCE) {
              vehicle.serviceTimer = SERVICE_STOP_DURATION;
              targetSpeed = 0;
              holdPosition = true;
              waitingVehicles += 1;
            }
          }
        }

        vehicle.speed = holdPosition
          ? 0
          : THREE.MathUtils.damp(vehicle.speed, targetSpeed, 3.2, delta);
        if (!holdPosition) {
          vehicle.distance = clampRouteDistance(vehicle.route, vehicle.distance + vehicle.speed * delta);
        }

        syncVehicleTransform(vehicle);
        if (vehicle.kind === 'taxi' && vehicle.isOccupied) {
          activeTrips += 1;
        }
      });

      statsAccumulator += delta;
      if (statsAccumulator > 0.18) {
        statsAccumulator = 0;
        setStats({
          taxis: vehicles.filter((vehicle) => vehicle.kind === 'taxi').length,
          traffic: vehicles.filter((vehicle) => vehicle.kind === 'traffic').length,
          waiting: waitingVehicles,
          signals: signalVisuals.length,
          activeTrips,
          completedTrips,
          pedestrians: activePedestrians,
        });
      }
    };

    const setBoundaryHover = (segment: DongBoundarySegment | null) => {
      if (!segment) {
        hoveredBoundaryIndex = -1;
        boundaryHintText.style.display = 'none';
        setBoundaryDongHighlight([]);
        if (!cameraRig.dragging) {
          renderer.domElement.style.cursor = 'grab';
        }
        return;
      }
      const boundaryDongs = [
        ...new Set(
          [segment.leftDong, segment.rightDong].filter(
            (dongName): dongName is string => Boolean(dongName),
          ),
        ),
      ];
      setBoundaryDongHighlight(boundaryDongs);
      boundaryHintText.textContent =
        boundaryDongs.length >= 2
          ? `${boundaryDongs[0]} · ${boundaryDongs[1]} 경계`
          : boundaryDongs[0]
            ? `${boundaryDongs[0]} 경계`
            : '행정동 경계';
      boundaryHintText.style.left = `${pointerClientX}px`;
      boundaryHintText.style.top = `${pointerClientY}px`;
      boundaryHintText.style.display = 'block';
      if (!cameraRig.dragging) {
        renderer.domElement.style.cursor = 'pointer';
      }
    };

    const updateBoundaryHover = () => {
      if (cameraRig.dragging || !pointerInside || !dongBoundarySegments.length) {
        setBoundaryHover(null);
        return;
      }

      raycaster.setFromCamera(pointerNdc, camera);
      const [hit] = raycaster.intersectObject(dongWallMesh, false);
      const nextIndex = hit?.instanceId ?? -1;
      if (nextIndex < 0) {
        hoveredBoundaryIndex = -1;
        setBoundaryHover(null);
        return;
      }

      hoveredBoundaryIndex = nextIndex;
      setBoundaryHover(dongBoundarySegments[nextIndex] ?? null);
    };

    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      applyRenderBudget(cameraModeRef.current);
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
    };

    const controlKeyCodes = new Set([
      'KeyW',
      'KeyA',
      'KeyQ',
      'KeyS',
      'KeyD',
      'KeyE',
      'KeyF',
      'ShiftLeft',
      'ShiftRight',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ]);

    const isInteractiveTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) {
        return false;
      }
      const tagName = element.tagName;
      return (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        tagName === 'BUTTON' ||
        element.isContentEditable
      );
    };

    const stopDragging = () => {
      cameraRig.dragging = false;
      cameraRig.pointerId = -1;
      renderer.domElement.style.cursor = 'grab';
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointerInside = true;
      pointerClientX = event.clientX - rect.left;
      pointerClientY = event.clientY - rect.top;
      pointerNdc.set(
        (pointerClientX / rect.width) * 2 - 1,
        -(pointerClientY / rect.height) * 2 + 1,
      );
      cameraRig.dragging = true;
      cameraRig.pointerId = event.pointerId;
      cameraRig.pointerX = event.clientX;
      cameraRig.pointerY = event.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const withinBounds =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      pointerInside = withinBounds;
      if (withinBounds) {
        pointerClientX = event.clientX - rect.left;
        pointerClientY = event.clientY - rect.top;
        pointerNdc.set(
          (pointerClientX / rect.width) * 2 - 1,
          -(pointerClientY / rect.height) * 2 + 1,
        );
      } else {
        pointerNdc.set(2, 2);
      }

      if (!cameraRig.dragging || event.pointerId !== cameraRig.pointerId) {
        return;
      }

      const deltaX = event.clientX - cameraRig.pointerX;
      const deltaY = event.clientY - cameraRig.pointerY;
      cameraRig.pointerX = event.clientX;
      cameraRig.pointerY = event.clientY;
      if (cameraModeRef.current === 'follow') {
        followOrbit.yawOffset = wrapAngle(
          followOrbit.yawOffset - deltaX * CAMERA_DRAG_SENSITIVITY,
        );
      } else {
        cameraRig.yaw -= deltaX * CAMERA_DRAG_SENSITIVITY;
      }
      cameraRig.pitch = THREE.MathUtils.clamp(
        cameraRig.pitch - deltaY * CAMERA_DRAG_SENSITIVITY,
        CAMERA_MIN_PITCH,
        CAMERA_MAX_PITCH,
      );
      syncCamera();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== cameraRig.pointerId) {
        return;
      }
      stopDragging();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraRig.distance = THREE.MathUtils.clamp(
        cameraRig.distance + event.deltaY * 0.08,
        CAMERA_MIN_DISTANCE,
        maxMapDistance,
      );
      syncCamera();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyF') {
        if (!isInteractiveTarget(event.target)) {
          event.preventDefault();
        }
        setShowFps((current) => !current);
        return;
      }
      if (!controlKeyCodes.has(event.code)) {
        return;
      }
      if (!isInteractiveTarget(event.target)) {
        event.preventDefault();
      }
      pressedKeys.add(event.code);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!controlKeyCodes.has(event.code)) {
        return;
      }
      pressedKeys.delete(event.code);
    };

    const onWindowBlur = () => {
      pressedKeys.clear();
      pointerInside = false;
      pointerNdc.set(2, 2);
      boundaryHintText.style.display = 'none';
      stopDragging();
    };

    const onVisibilityChange = () => {
      isPageHidden = document.visibilityState === 'hidden';
      applyRenderBudget(cameraModeRef.current);
    };

    const onPointerLeave = () => {
      pointerInside = false;
      pointerNdc.set(2, 2);
      setBoundaryHover(null);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    applyEnvironment(simulationTimeRef.current, weatherModeRef.current);

    const animate = (timestamp?: number) => {
      animationFrame = window.requestAnimationFrame(animate);
      const frameTimestamp = timestamp ?? performance.now();
      timer.update(frameTimestamp);
      const activeRenderCap = isPageHidden
        ? HIDDEN_RENDER_FPS
        : renderFpsCapFor(cameraModeRef.current);
      const targetFrameMs = 1000 / activeRenderCap;
      const rawDeltaMs =
        lastRafTimestamp === 0 ? targetFrameMs : Math.min(frameTimestamp - lastRafTimestamp, 250);
      lastRafTimestamp = frameTimestamp;
      renderAccumulatorMs = Math.min(renderAccumulatorMs + rawDeltaMs, targetFrameMs * 3);
      if (renderAccumulatorMs < targetFrameMs) {
        return;
      }

      const delta = Math.min(
        Math.max(
          lastVisibleRenderTimestamp === 0
            ? targetFrameMs
            : frameTimestamp - lastVisibleRenderTimestamp,
          targetFrameMs,
        ) / 1000,
        0.05,
      );
      lastVisibleRenderTimestamp = frameTimestamp;
      renderAccumulatorMs -= targetFrameMs;
      const elapsedTime = timer.getElapsed();
      const nextSimulationTime = simulationTimeRef.current;
      const nextWeatherMode = weatherModeRef.current;
      if (
        nextSimulationTime !== appliedTimeMinutes ||
        nextWeatherMode !== appliedWeatherMode
      ) {
        appliedTimeMinutes = nextSimulationTime;
        appliedWeatherMode = nextWeatherMode;
        applyEnvironment(nextSimulationTime, nextWeatherMode);
      }
      const currentMode = cameraModeRef.current;
      if (currentMode !== activeCameraMode) {
        activeCameraMode = currentMode;
        applyModePreset(currentMode);
        applyDistrictPresentation(currentMode);
        applyRenderBudget(currentMode);
      }

      if (currentMode === 'drive') {
        cameraLookLift = CAMERA_LOOK_HEIGHT;
        const forwardInput = Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) - Number(
          pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown'),
        );
        const strafeInput = Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) - Number(
          pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft'),
        );
        const turnInput = Number(pressedKeys.has('KeyE')) - Number(
          pressedKeys.has('KeyQ'),
        );
        const boostScale =
          pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight') ? 1.8 : 1;
        const moveSpeed = CAMERA_DRIVE_SPEED * CAMERA_BASE_MOVE_SCALE * boostScale;
        const strafeSpeed = CAMERA_STRAFE_SPEED * CAMERA_BASE_MOVE_SCALE * boostScale;
        const turnSpeed = CAMERA_TURN_SPEED * CAMERA_BASE_TURN_SCALE;

        if (turnInput !== 0) {
          cameraRig.yaw += turnInput * turnSpeed * delta;
        }
        if (forwardInput !== 0 || strafeInput !== 0) {
          const lookDirection = cameraRig.focus.clone().sub(camera.position).setY(0);
          if (lookDirection.lengthSq() < 0.0001) {
            lookDirection.set(-Math.sin(cameraRig.yaw), 0, -Math.cos(cameraRig.yaw));
          }
          lookDirection.normalize();
          const strafeDirection = new THREE.Vector3(
            -lookDirection.z,
            0,
            lookDirection.x,
          ).normalize();
          cameraRig.focus.addScaledVector(
            strafeDirection,
            strafeInput * strafeSpeed * delta,
          );
          cameraRig.focus.addScaledVector(
            lookDirection,
            forwardInput * moveSpeed * delta,
          );
        }
        cameraRig.focus.y = THREE.MathUtils.damp(cameraRig.focus.y, 0, 4.6, delta);
      } else if (currentMode === 'overview') {
        cameraLookLift = 1.8;
        cameraRig.focus.copy(centerPoint);
        cameraRig.focus.y = 0;
        cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch, 0.82, CAMERA_MAX_PITCH);
        cameraRig.distance = THREE.MathUtils.clamp(
          Math.max(cameraRig.distance, overviewMinDistance),
          overviewMinDistance,
          maxMapDistance,
        );
      } else {
        if (followTaxiIdRef.current !== activeFollowTaxiId) {
          activeFollowTaxiId = followTaxiIdRef.current;
          followOrbit.yawOffset = 0.22;
        }
        const followedTaxi = resolveFollowTaxi();
        cameraLookLift = 0.8;
        if (followedTaxi) {
          const followBlend = 1 - Math.exp(-delta * 4.8);
          const desiredFocus = followedTaxi.group.position.clone();
          desiredFocus.y = 1.8;
          cameraRig.focus.lerp(desiredFocus, followBlend);
          const desiredYaw = taxiHeading(followedTaxi) + Math.PI + followOrbit.yawOffset;
          cameraRig.yaw = dampAngle(cameraRig.yaw, desiredYaw, 5.4, delta);
          cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch, 0.46, 0.9);
          cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance, 20, 58);
        } else {
          cameraRig.focus.lerp(centerPoint, 1 - Math.exp(-delta * 2.8));
          cameraRig.focus.y = THREE.MathUtils.damp(cameraRig.focus.y, 0, 4.2, delta);
        }
      }
      syncCamera();

      updateSignalVisuals(elapsedTime);
      updateHotspotVisuals(elapsedTime);
      updatePedestrians(elapsedTime);
      updatePrecipitation(delta, elapsedTime);
      updateVehicles(delta, elapsedTime);
      cloudClusters.forEach(({ cluster, anchor, phase }) => {
        cluster.position.x = anchor.x + Math.sin(elapsedTime * 0.035 + phase) * 5.5;
        cluster.position.z = anchor.z + Math.cos(elapsedTime * 0.028 + phase) * 4.2;
        cluster.position.y = anchor.y + Math.sin(elapsedTime * 0.06 + phase) * 0.9;
      });
      stormCloudClusters.forEach(({ cluster, anchor, phase }) => {
        cluster.position.x = anchor.x + Math.sin(elapsedTime * 0.022 + phase) * 8.8;
        cluster.position.z = anchor.z + Math.cos(elapsedTime * 0.018 + phase) * 7.1;
        cluster.position.y = anchor.y + Math.sin(elapsedTime * 0.033 + phase) * 0.6;
      });
      fpsFrameCount += 1;
      fpsSampleElapsed += delta;
      if (fpsSampleElapsed >= 0.45) {
        if (showFpsRef.current) {
          setFpsStats({
            fps: Math.round(fpsFrameCount / fpsSampleElapsed),
            cap: activeRenderCap,
          });
        } else {
          setFpsStats((current) =>
            current.cap === activeRenderCap ? current : { ...current, cap: activeRenderCap },
          );
        }
        fpsFrameCount = 0;
        fpsSampleElapsed = 0;
      }
      starsMaterial.opacity = activeStarOpacity * (0.92 + Math.sin(elapsedTime * 0.7) * 0.08);
      sunHalo.scale.setScalar(1 + Math.sin(elapsedTime * 0.9) * 0.03);
      moon.scale.setScalar(1 + Math.sin(elapsedTime * 0.55 + 1.4) * 0.02);
      updateBoundaryHover();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (simulationTimeout) {
        window.clearTimeout(simulationTimeout);
      }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);
      rainLayer.geometry.dispose();
      rainLayer.material.dispose();
      snowLayer.geometry.dispose();
      snowLayer.material.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      cloudPuffGeometry.dispose();
      cloudMaterial.dispose();
      stormCloudMaterial.dispose();
      sunDiscMaterial.dispose();
      sunHaloMaterial.dispose();
      sunsetGlowMaterial.dispose();
      moonMaterial.dispose();
      timer.dispose();
      renderer.dispose();
      labelObjects.forEach((label) => label.removeFromParent());
      container.removeChild(boundaryHintText);
      container.removeChild(renderer.domElement);
      container.removeChild(labelRenderer.domElement);
    };
  }, [data, showLabels, showTransit]);

  const roadNames = useMemo(() => buildMajorRoadNames(data?.roads ?? null), [data]);
  const buildingNames = useMemo(() => buildMajorBuildingNames(data?.buildings ?? null), [data]);
  const dongNames = useMemo(
    () => data?.dongs.features.map((dong) => dong.properties.name) ?? [],
    [data],
  );
  const transitHighlights = useMemo(() => {
    if (!data) {
      return [] as TransitLandmark[];
    }

    const projectedRoadSegments: ProjectedRoadSegment[] = data.roads.features.flatMap((feature) =>
      lineStringsOfRoad(feature, data.center).flatMap((line) =>
        line.slice(1).map((node, index) => ({
          roadClass: feature.properties.roadClass,
          width: feature.properties.width * ROAD_WIDTH_SCALE,
          start: line[index].point,
          end: node.point,
          name: feature.properties.name,
        })),
      ),
    );

    return buildTransitLandmarks(data.transit, data.center, projectedRoadSegments);
  }, [data]);
  const transitCounts = useMemo(
    () => ({
      busStops: transitHighlights.filter((feature) => feature.category === 'bus_stop').length,
      subwayStations: transitHighlights.filter((feature) => feature.category === 'subway_station').length,
    }),
    [transitHighlights],
  );
  const subwayNames = useMemo(
    () =>
      Array.from(
        new Set(
          transitHighlights
            .filter((feature) => feature.category === 'subway_station' && feature.isMajor)
            .map((feature) => feature.name)
            .filter(Boolean) as string[],
        ),
      ).slice(0, 8),
    [transitHighlights],
  );
  const taxiOptions = useMemo(
    () =>
      Array.from({ length: TAXI_COUNT }, (_, index) => ({
        id: `taxi-${index}`,
        label: `Taxi ${index + 1}`,
        detail:
          dongNames[index % Math.max(dongNames.length, 1)] ??
          roadNames[index % Math.max(roadNames.length, 1)] ??
          '강남 코어 순환',
      })),
    [dongNames, roadNames],
  );
  const serviceLabels = useMemo(() => dongNames.slice(0, 6), [dongNames]);
  const selectedTaxiId =
    taxiOptions.find((taxi) => taxi.id === followTaxiId)?.id ?? taxiOptions[0]?.id ?? '';
  useEffect(() => {
    followTaxiIdRef.current = selectedTaxiId;
  }, [selectedTaxiId]);
  const selectedTaxi = useMemo(
    () => taxiOptions.find((taxi) => taxi.id === selectedTaxiId) ?? taxiOptions[0] ?? null,
    [selectedTaxiId, taxiOptions],
  );
  const cameraModeLabel =
    cameraMode === 'overview' ? 'Overview' : cameraMode === 'follow' ? 'Follow Taxi' : 'Drive';
  const statusLabel =
    status === 'loading'
      ? 'loading data'
      : status === 'rendering'
        ? 'building scene'
        : status;
  const controlHint =
    cameraMode === 'overview'
      ? '오버뷰: 좌클릭 드래그로 도시를 돌려보고 휠로 줌을 조절합니다. F로 FPS 오버레이를 켤 수 있습니다.'
      : cameraMode === 'follow'
        ? `팔로우: ${selectedTaxi?.label ?? '선택한 택시'}를 자동 추적하고, 드래그로 시점을 살짝 돌릴 수 있습니다. F로 FPS 오버레이를 켤 수 있습니다.`
        : '드라이브: 좌클릭 드래그로 시점을 돌리고 W/S 또는 ↑/↓로 전후진, A/D 또는 ←/→로 좌우 이동, Q/E로 회전합니다. Shift로 가속하고 F로 FPS 오버레이를 켤 수 있습니다.';
  const selectedWeather =
    WEATHER_OPTIONS.find((option) => option.id === weatherMode) ?? WEATHER_OPTIONS[0];
  const formattedSimulationTime = format24Hour(simulationTimeMinutes);
  const simulationTimeBand = timeBandLabel(simulationTimeMinutes);
  const daylightValue = daylightFactor(simulationTimeMinutes);
  const twilightValue = twilightFactor(simulationTimeMinutes);
  const daylightLabel =
    daylightValue > 0.18 ? '낮' : twilightValue > 0.25 ? '황혼' : '밤';

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#060d16]">
      <div ref={containerRef} className="h-full w-full" />

      {showFps ? (
        <div className="absolute right-4 top-4 z-20 rounded-2xl border border-lime-300/20 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 shadow-xl backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-[0.18em] text-lime-300/80">FPS</div>
          <div className="mt-1 flex items-end gap-3">
            <div className="text-2xl font-semibold tabular-nums text-lime-100">{fpsStats.fps}</div>
            <div className="pb-1 text-xs text-slate-400">cap {fpsStats.cap}</div>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            mode {cameraModeLabel.toLowerCase()} · `F`로 숨기기
          </div>
        </div>
      ) : null}

      <div className="absolute left-2 top-2 z-10 max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[400px] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/82 p-5 text-white shadow-2xl backdrop-blur-md sm:left-4 sm:top-4 sm:max-h-[calc(100vh-2rem)] sm:w-[400px]">
        <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-cyan-300">
          OSM + Three.js Taxi Sim
        </p>
        <h1 className="text-[28px] font-semibold leading-tight">
          강남 코어 9개 동 블록 시티 택시 시뮬레이션
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          역삼1·2동을 중심으로 논현, 삼성, 신사, 청담, 대치4동까지 이어지는 9개 동을
          OSM 경계 기준으로 불러와 3D로 다시 렌더링했습니다. 택시는 우측 차선으로
          주행하고, 교차로마다 보호 좌회전과 보행자 신호를 확인하며, 승차지에서 손님을
          태운 뒤 목적지까지 최단 경로로 이동합니다. 기본 화면은 가독성 우선으로 두고,
          버스 정류장과 지하철 구조물은 필요할 때만 켤 수 있게 정리했습니다.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Taxis</div>
            <div className="mt-1 text-lg font-semibold text-amber-200">{stats.taxis}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Traffic</div>
            <div className="mt-1 text-lg font-semibold text-sky-200">{stats.traffic}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Signals</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">{stats.signals}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Waiting</div>
            <div className="mt-1 text-lg font-semibold text-rose-200">{stats.waiting}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Active Trips</div>
            <div className="mt-1 text-lg font-semibold text-cyan-200">{stats.activeTrips}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Completed</div>
            <div className="mt-1 text-lg font-semibold text-lime-200">{stats.completedTrips}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Pedestrians</div>
            <div className="mt-1 text-lg font-semibold text-violet-200">{stats.pedestrians}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Bus Stops</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">
              {transitCounts.busStops}
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Subway</div>
            <div className="mt-1 text-lg font-semibold text-sky-200">
              {transitCounts.subwayStations}
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-slate-400">Routing</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">Shortest Path</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                Time + Weather
              </div>
              <div className="mt-2 flex items-end gap-3">
                <div className="text-[28px] font-semibold tracking-tight tabular-nums text-slate-50">
                  {formattedSimulationTime}
                </div>
                <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2 py-1 text-[11px] font-medium text-cyan-100">
                  {daylightLabel} / {simulationTimeBand}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Weather
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {selectedWeather.label}
              </div>
              <div className="text-[11px] text-slate-400">{selectedWeather.detail}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSimulationTimeMinutes(preset.minutes)}
                className={`rounded-2xl border px-2 py-2 text-xs transition ${
                  simulationTimeMinutes === preset.minutes
                    ? 'border-cyan-300/40 bg-cyan-300/18 text-cyan-50'
                    : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="font-medium tabular-nums">{preset.label}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  {preset.detail}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {WEATHER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setWeatherMode(option.id)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  weatherMode === option.id
                    ? 'border-cyan-300/40 bg-cyan-300/16 text-cyan-50'
                    : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="mt-1 text-[11px] leading-5 text-slate-400">{option.detail}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2 text-xs leading-5 text-slate-400">
            시간대 연출은 하늘, 해, 달, 별 중심으로 적용되고 도로/건물 표면은 최대한
            고정해 가독성을 유지합니다. 대중교통 구조물은 기본적으로 숨겨두었습니다.
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-400/5 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-cyan-300/80">
                Data Source
              </div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">
                {data?.meta.source ?? 'OpenStreetMap + Overpass'}
              </div>
            </div>
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 text-[11px] font-medium text-cyan-100">
              {data?.meta.boundarySource ?? 'OSM admin boundary'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">Latest Asset Update</div>
              <div className="mt-1 font-medium text-slate-100">
                {data?.meta.latestAssetUpdatedAt ?? 'Last-Modified unavailable'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">Loaded In Viewer</div>
              <div className="mt-1 font-medium text-slate-100">
                {data?.meta.loadedAt ?? 'unknown'}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-slate-100">
              dongs {data?.meta.assets.dongs.featureCount ?? 0}
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-slate-100">
              roads {data?.meta.assets.roads.featureCount ?? 0}
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-slate-100">
              buildings {data?.meta.assets.buildings.featureCount ?? 0}
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-slate-100">
              transit {data?.meta.assets.transit.featureCount ?? 0}
            </span>
          </div>

          <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2 text-xs leading-5 text-slate-400">
            동 경계는 OSM 행정동 relation 기준이고, 건물과 도로는 OSM 지오메트리에서
            가져옵니다. 다만 건물 높이와 차량·신호·보행자 동작은 시뮬레이션 목적에 맞게
            일부 단순화했습니다. 행정동 경계 시각화는 현재 비활성화되어 있고, 이후 더 안정적인
            표현 방식으로 다시 추가할 예정입니다.
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm">
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Camera</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['overview', 'Overview'],
              ['drive', 'Drive'],
              ['follow', 'Follow Taxi'],
            ] as Array<[CameraMode, string]>).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCameraMode(mode)}
                className={`rounded-2xl border px-3 py-2 text-xs font-medium transition ${
                  cameraMode === mode
                    ? 'border-cyan-300/40 bg-cyan-300/18 text-cyan-50'
                    : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              Follow Target
            </div>
            <select
              value={selectedTaxiId}
              onChange={(event) => {
                setFollowTaxiId(event.target.value);
                setCameraMode('follow');
              }}
              disabled={!taxiOptions.length}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/75 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {taxiOptions.map((taxi) => (
                <option key={taxi.id} value={taxi.id}>
                  {taxi.label} · {taxi.detail}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2 text-xs leading-5 text-slate-400">
            {controlHint}
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(event) => setShowLabels(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-400"
          />
          도로/건물/지하철 라벨 보기
        </label>

        <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showTransit}
            onChange={(event) => setShowTransit(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400"
          />
          버스 정류장/지하철 구조물 보기
        </label>

        <div className="mt-5 grid gap-3 text-sm">
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              Selected Dongs
            </div>
            <div className="flex flex-wrap gap-2">
              {dongNames.map((dong) => (
                <span
                  key={dong}
                  className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 text-cyan-100"
                >
                  {dong}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              Major Roads
            </div>
            <div className="flex flex-wrap gap-2">
              {roadNames.map((road) => (
                <span
                  key={road}
                  className="rounded-full border border-cyan-300/12 bg-cyan-300/8 px-2 py-1 text-cyan-100"
                >
                  {road}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              Named Buildings
            </div>
            <div className="flex flex-wrap gap-2">
              {buildingNames.map((building) => (
                <span
                  key={building}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-100"
                >
                  {building}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              Core Zones
            </div>
            <div className="flex flex-wrap gap-2">
              {serviceLabels.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-amber-300/15 bg-amber-200/10 px-2 py-1 text-amber-100"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              Subway Hubs
            </div>
            <div className="flex flex-wrap gap-2">
              {subwayNames.map((station) => (
                <span
                  key={station}
                  className="rounded-full border border-sky-300/15 bg-sky-300/10 px-2 py-1 text-sky-100"
                >
                  {station}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-xs leading-5 text-slate-400">
          상태: <span className="text-slate-100">{statusLabel}</span>
          <br />
          시간: <span className="text-slate-100 tabular-nums">{formattedSimulationTime}</span>
          <br />
          날씨: <span className="text-slate-100">{selectedWeather.label}</span>
          <br />
          카메라: <span className="text-slate-100">{cameraModeLabel}</span>
          <br />
          조작: {controlHint}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6f8fce]" />
            건물
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2c4d7c]" />
            주요 도로
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#eef4ff]" />
            횡단보도
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffcb44]" />
            택시
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffcf57]" />
            승차 포인트
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2bb1d8]" />
            버스 정류장
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4ca7ff]" />
            지하철역
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f6f7ff]" />
            보행자 신호
          </span>
        </div>
      </div>
    </section>
  );
}
