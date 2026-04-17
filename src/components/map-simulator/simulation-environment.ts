import * as THREE from "three";

type RoadClass = "arterial" | "connector" | "local";

export type WeatherMode = "clear" | "cloudy" | "heavy-rain" | "heavy-snow";

export type WeatherOption = {
  id: WeatherMode;
  label: string;
  detail: string;
};

export type TimePreset = {
  label: string;
  minutes: number;
  detail: string;
};

export type SimulationClock = {
  dateIso: string;
  minutes: number;
};

export type EnvironmentState = {
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
  roadColors: Record<RoadClass, number>;
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
  precipitation: "none" | "rain" | "snow";
  precipitationOpacity: number;
  precipitationIntensity: number;
  vehicleSpeedMultiplier: number;
  exposure: number;
};

export const MINUTES_PER_DAY = 24 * 60;
const SIMULATION_TIME_ZONE = "Asia/Seoul";
const KST_UTC_OFFSET_MINUTES = 9 * 60;
const DEG_TO_RAD = Math.PI / 180;
const SOLAR_OBLIQUITY = 23.4397 * DEG_TO_RAD;

export const WEATHER_OPTIONS: WeatherOption[] = [
  { id: "clear", label: "맑음", detail: "기본 시야와 표준 주행 속도" },
  { id: "cloudy", label: "흐림", detail: "광량 감소, 가벼운 감속" },
  {
    id: "heavy-rain",
    label: "폭우",
    detail: "빗줄기와 젖은 도로, 시야는 보수적으로 유지",
  },
  {
    id: "heavy-snow",
    label: "폭설",
    detail: "눈발과 차가운 톤, 과한 안개 없이 표현",
  },
];

export const TIME_PRESETS: TimePreset[] = [
  { label: "06:00", minutes: 6 * 60, detail: "새벽" },
  { label: "12:00", minutes: 12 * 60, detail: "한낮" },
  { label: "18:30", minutes: 18 * 60 + 30, detail: "노을" },
  { label: "23:00", minutes: 23 * 60, detail: "심야" },
];

export const HYDRATION_SAFE_SIMULATION_CLOCK: SimulationClock = {
  dateIso: "2026-01-01",
  minutes: 12 * 60,
};

function zonedDateTimeParts(date: Date, timeZone = SIMULATION_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partMap = new Map(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(partMap.get("year") ?? 1970),
    month: Number(partMap.get("month") ?? 1),
    day: Number(partMap.get("day") ?? 1),
    hour: Number(partMap.get("hour") ?? 0),
    minute: Number(partMap.get("minute") ?? 0),
  };
}

function dateIsoFromParts(parts: { year: number; month: number; day: number }) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseDateIso(dateIso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function kstDateTimeToUtcDate(dateIso: string, minutes: number) {
  const parsed = parseDateIso(dateIso);
  if (!parsed) {
    return new Date();
  }

  const normalizedMinutes = normalizeDayMinutes(minutes);
  const utcMs =
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0) +
    normalizedMinutes * 60_000 -
    KST_UTC_OFFSET_MINUTES * 60_000;

  return new Date(utcMs);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const alpha = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return alpha * alpha * (3 - 2 * alpha);
}

function solarPositionForDateTime(
  dateIso: string,
  minutes: number,
  center: { lat: number; lon: number },
) {
  const date = kstDateTimeToUtcDate(dateIso, minutes);
  const julianDate = date.getTime() / 86400000 - 0.5 + 2440588;
  const days = julianDate - 2451545;
  const meanAnomaly = DEG_TO_RAD * (357.5291 + 0.98560028 * days);
  const equationOfCenter =
    DEG_TO_RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly));
  const perihelion = DEG_TO_RAD * 102.9372;
  const eclipticLongitude =
    meanAnomaly + equationOfCenter + perihelion + Math.PI;
  const declination = Math.asin(
    Math.sin(eclipticLongitude) * Math.sin(SOLAR_OBLIQUITY),
  );
  const rightAscension = Math.atan2(
    Math.sin(eclipticLongitude) * Math.cos(SOLAR_OBLIQUITY),
    Math.cos(eclipticLongitude),
  );
  const longitudeWest = -center.lon * DEG_TO_RAD;
  const siderealTime =
    DEG_TO_RAD * (280.16 + 360.9856235 * days) - longitudeWest;
  const hourAngle = siderealTime - rightAscension;
  const latitudeRad = center.lat * DEG_TO_RAD;
  const altitude = Math.asin(
    Math.sin(latitudeRad) * Math.sin(declination) +
    Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle),
  );
  const azimuthFromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitudeRad) -
    Math.tan(declination) * Math.cos(latitudeRad),
  );
  const azimuthFromNorth = (azimuthFromSouth + Math.PI * 3) % (Math.PI * 2);
  const cosAltitude = Math.cos(altitude);

  return {
    altitude,
    azimuth: azimuthFromNorth,
    direction: new THREE.Vector3(
      Math.sin(azimuthFromNorth) * cosAltitude,
      Math.sin(altitude),
      -Math.cos(azimuthFromNorth) * cosAltitude,
    ).normalize(),
  };
}

export function normalizeDayMinutes(minutes: number) {
  return (
    ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
    MINUTES_PER_DAY
  );
}

export function format24Hour(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function currentSimulationClock(date = new Date()) {
  const parts = zonedDateTimeParts(date);
  return {
    dateIso: dateIsoFromParts(parts),
    minutes: parts.hour * 60 + parts.minute,
  };
}

export function formatDateLabel(dateIso: string) {
  const parsed = parseDateIso(dateIso);
  if (!parsed) {
    return dateIso;
  }
  return `${parsed.year}.${String(parsed.month).padStart(2, "0")}.${String(parsed.day).padStart(2, "0")}`;
}

export function formatKstDateTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return `${partMap.get("year")}-${partMap.get("month")}-${partMap.get("day")} ${partMap.get("hour")}:${partMap.get("minute")} KST`;
}

export function formatMetricDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0초";
  }
  if (seconds < 60) {
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}초`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}분 ${String(remainingSeconds).padStart(2, "0")}초`;
}

export function timeBandLabel(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  if (normalized < 300) return "심야";
  if (normalized < 420) return "새벽";
  if (normalized < 720) return "오전";
  if (normalized < 1020) return "오후";
  if (normalized < 1260) return "저녁";
  return "야간";
}

export function daylightFactor(
  dateIso: string,
  minutes: number,
  center: { lat: number; lon: number },
) {
  const altitudeDegrees =
    solarPositionForDateTime(dateIso, minutes, center).altitude / DEG_TO_RAD;
  return smoothstep(-3, 24, altitudeDegrees);
}

export function twilightFactor(
  dateIso: string,
  minutes: number,
  center: { lat: number; lon: number },
) {
  const altitudeDegrees =
    solarPositionForDateTime(dateIso, minutes, center).altitude / DEG_TO_RAD;
  return Math.exp(-Math.pow(altitudeDegrees / 8, 2));
}

export function sunsetFactor(
  dateIso: string,
  minutes: number,
  center: { lat: number; lon: number },
) {
  const altitudeDegrees =
    solarPositionForDateTime(dateIso, minutes, center).altitude / DEG_TO_RAD;
  return THREE.MathUtils.clamp(
    Math.exp(-Math.pow(altitudeDegrees / 6.5, 2)),
    0,
    1,
  );
}

export function mixHexColor(start: number, end: number, alpha: number) {
  return new THREE.Color(start)
    .lerp(new THREE.Color(end), THREE.MathUtils.clamp(alpha, 0, 1))
    .getHex();
}

export function scaleHexColor(value: number, factor: number) {
  return new THREE.Color(value).multiplyScalar(factor).getHex();
}

export function buildEnvironmentState(
  dateIso: string,
  minutes: number,
  weatherMode: WeatherMode,
  center: { lat: number; lon: number },
): EnvironmentState {
  const normalizedMinutes = normalizeDayMinutes(minutes);
  const solarPosition = solarPositionForDateTime(
    dateIso,
    normalizedMinutes,
    center,
  );
  const altitudeDegrees = solarPosition.altitude / DEG_TO_RAD;
  const daylight = smoothstep(-3, 24, altitudeDegrees);
  const twilight = Math.exp(-Math.pow(altitudeDegrees / 8, 2));
  const sunset = THREE.MathUtils.clamp(
    Math.exp(-Math.pow(altitudeDegrees / 6.5, 2)),
    0,
    1,
  );
  const solarDirection = solarPosition.direction.clone();
  const cloudCover =
    weatherMode === "clear"
      ? 0.04
      : weatherMode === "cloudy"
        ? 0.18
        : weatherMode === "heavy-rain"
          ? 0.36
          : 0.28;
  const skyDayColor =
    weatherMode === "clear"
      ? 0x8fc2e5
      : weatherMode === "cloudy"
        ? 0x90a5b7
        : weatherMode === "heavy-rain"
          ? 0x6d8092
          : 0xc9d8e5;
  const skyNightColor =
    weatherMode === "heavy-snow"
      ? 0x263443
      : weatherMode === "heavy-rain"
        ? 0x152130
        : 0x152231;
  const fogDayColor =
    weatherMode === "clear"
      ? 0x9bc4da
      : weatherMode === "cloudy"
        ? 0x97a6b3
        : weatherMode === "heavy-rain"
          ? 0x72818d
          : 0xd3dee8;
  const fogNightColor =
    weatherMode === "heavy-snow"
      ? 0x384959
      : weatherMode === "heavy-rain"
        ? 0x1d2b38
        : 0x1d2b39;
  const weatherSpeedMultiplier =
    weatherMode === "clear"
      ? 1
      : weatherMode === "cloudy"
        ? 0.97
        : weatherMode === "heavy-rain"
          ? 0.9
          : 0.82;
  const nightSpeedMultiplier =
    daylight < 0.12 ? 0.94 : daylight < 0.3 ? 0.97 : 1;
  const sunsetSkyColor = weatherMode === "heavy-snow" ? 0xf0c5ad : 0xf0915d;
  const sunsetFogColor = weatherMode === "heavy-snow" ? 0xf4ddcf : 0xf0bb8e;
  const nightBuildingFactor = THREE.MathUtils.clamp(
    (0.3 - daylight) / 0.3,
    0,
    1,
  );
  const readabilitySkyMix = THREE.MathUtils.clamp(
    daylight * 0.72 + twilight * 0.1 + 0.12,
    0,
    1,
  );
  const readabilityFogMix = THREE.MathUtils.clamp(
    daylight * 0.68 + twilight * 0.1 + 0.18,
    0,
    1,
  );
  const readableNightLight = THREE.MathUtils.clamp(
    daylight * 0.86 + twilight * 0.24 + 0.28,
    0,
    1,
  );

  const baseSkyColor = mixHexColor(
    skyNightColor,
    skyDayColor,
    readabilitySkyMix,
  );
  const baseFogColor = mixHexColor(
    fogNightColor,
    fogDayColor,
    readabilityFogMix,
  );
  const neutralGroundColor =
    weatherMode === "heavy-snow"
      ? 0x4b5057
      : weatherMode === "heavy-rain"
        ? 0x191c20
        : 0x202327;
  const roadBaseColors =
    weatherMode === "heavy-snow"
      ? {
        arterial: 0x72797f,
        connector: 0x666c72,
        local: 0x5b6167,
      }
      : weatherMode === "heavy-rain"
        ? {
          arterial: 0x484e54,
          connector: 0x414649,
          local: 0x393d41,
        }
        : {
          arterial: 0x60676d,
          connector: 0x545a60,
          local: 0x484e54,
        };
  const lightingPreset =
    weatherMode === "clear"
      ? {
        ambientColor: 0xf4f8ff,
        ambientIntensity: 0.72,
        hemiSkyColor: 0xdce9ff,
        hemiGroundColor: 0x415468,
        hemiIntensity: 0.84,
        sunColor: 0xfffbf2,
        sunIntensity: 0.88,
        fogNear: 160,
        fogFar: 460,
        exposure: 1.04,
      }
      : weatherMode === "cloudy"
        ? {
          ambientColor: 0xe7eef7,
          ambientIntensity: 0.69,
          hemiSkyColor: 0xc8d5e3,
          hemiGroundColor: 0x3d4d60,
          hemiIntensity: 0.78,
          sunColor: 0xf8fbff,
          sunIntensity: 0.8,
          fogNear: 138,
          fogFar: 392,
          exposure: 1.01,
        }
        : weatherMode === "heavy-rain"
          ? {
            ambientColor: 0xe1e9f2,
            ambientIntensity: 0.66,
            hemiSkyColor: 0xbac9db,
            hemiGroundColor: 0x334153,
            hemiIntensity: 0.74,
            sunColor: 0xf0f4fa,
            sunIntensity: 0.72,
            fogNear: 124,
            fogFar: 350,
            exposure: 0.98,
          }
          : {
            ambientColor: 0xf0f6fb,
            ambientIntensity: 0.74,
            hemiSkyColor: 0xdbe6f1,
            hemiGroundColor: 0x47586b,
            hemiIntensity: 0.82,
            sunColor: 0xf8fbff,
            sunIntensity: 0.82,
            fogNear: 132,
            fogFar: 362,
            exposure: 1,
          };

  return {
    skyColor: mixHexColor(baseSkyColor, sunsetSkyColor, sunset * 0.72),
    fogColor: mixHexColor(baseFogColor, sunsetFogColor, sunset * 0.54),
    fogNear: lightingPreset.fogNear,
    fogFar: lightingPreset.fogFar,
    ambientColor: lightingPreset.ambientColor,
    ambientIntensity: lightingPreset.ambientIntensity + (1 - daylight) * 0.05,
    hemiSkyColor: lightingPreset.hemiSkyColor,
    hemiGroundColor: lightingPreset.hemiGroundColor,
    hemiIntensity: lightingPreset.hemiIntensity + (1 - daylight) * 0.04,
    sunColor: lightingPreset.sunColor,
    sunIntensity: THREE.MathUtils.lerp(
      lightingPreset.sunIntensity * 0.42,
      lightingPreset.sunIntensity,
      readableNightLight,
    ),
    sunPosition: solarDirection.multiplyScalar(190),
    groundColor: neutralGroundColor,
    roadColors: {
      arterial: scaleHexColor(roadBaseColors.arterial, 1 - cloudCover * 0.04),
      connector: scaleHexColor(roadBaseColors.connector, 1 - cloudCover * 0.04),
      local: scaleHexColor(roadBaseColors.local, 1 - cloudCover * 0.03),
    },
    roadRoughness:
      weatherMode === "heavy-rain"
        ? 0.84
        : weatherMode === "heavy-snow"
          ? 0.9
          : 0.97,
    roadMetalness:
      weatherMode === "heavy-rain"
        ? 0.08
        : weatherMode === "heavy-snow"
          ? 0.03
          : 0.01,
    laneMarkerColor: weatherMode === "heavy-snow" ? 0xf0f2f4 : 0xd9d1bd,
    laneMarkerEmissive:
      daylight < 0.22
        ? 0x4a4030
        : weatherMode === "heavy-rain"
          ? 0x2f2a22
          : 0x373127,
    laneMarkerIntensity:
      daylight < 0.2 ? 0.18 : weatherMode === "heavy-rain" ? 0.07 : 0.05,
    crosswalkColor: weatherMode === "heavy-snow" ? 0xe8ebee : 0xc6cbd1,
    crosswalkEmissive: daylight < 0.2 ? 0x242a31 : 0x15181c,
    crosswalkIntensity: daylight < 0.2 ? 0.05 : 0.02,
    stopLineColor: weatherMode === "heavy-snow" ? 0xf0f2f4 : 0xd5d9dd,
    stopLineEmissive: daylight < 0.2 ? 0x262d36 : 0x181c22,
    stopLineIntensity: daylight < 0.2 ? 0.08 : 0.03,
    buildingTint:
      weatherMode === "heavy-snow"
        ? 0xd7dbe0
        : weatherMode === "heavy-rain"
          ? 0xc7ccd1
          : 0xd0d4d9,
    buildingEmissive: mixHexColor(
      0x15191d,
      0x2f3a46,
      nightBuildingFactor * 0.22 + twilight * 0.08,
    ),
    buildingEmissiveIntensity:
      0.05 + twilight * 0.03 + nightBuildingFactor * 0.08,
    precipitation:
      weatherMode === "heavy-rain"
        ? "rain"
        : weatherMode === "heavy-snow"
          ? "snow"
          : "none",
    precipitationOpacity:
      weatherMode === "heavy-rain"
        ? 0.24
        : weatherMode === "heavy-snow"
          ? 0.42
          : 0,
    precipitationIntensity:
      weatherMode === "heavy-rain"
        ? 0.55
        : weatherMode === "heavy-snow"
          ? 0.4
          : 0,
    vehicleSpeedMultiplier: weatherSpeedMultiplier * nightSpeedMultiplier,
    exposure: lightingPreset.exposure + (1 - daylight) * 0.05,
  };
}
