import {
  DEMAND_WEEKDAYS,
  TARGET_DONGS,
  type DemandWeekdayId,
} from "@/components/map-simulator/demand-types";

const DEFAULT_DONG = "역삼1동";
const DEFAULT_TIMEZONE = "Asia/Seoul";
const DONG_DEMAND_MULTIPLIER: Record<string, number> = {
  역삼1동: 1.2,
  역삼2동: 1.05,
  논현1동: 1.08,
  논현2동: 0.96,
  삼성1동: 1.02,
  삼성2동: 0.94,
  신사동: 1.12,
  청담동: 0.9,
  대치4동: 0.98,
};

type WeatherCondition = "clear" | "cloudy" | "rain" | "snow";

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseHour(value: string | null) {
  const hour = Number(value);
  return Number.isInteger(hour) ? clamp(hour, 0, 23) : 18;
}

function parseDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().slice(0, 10);
}

function weekdayFromDate(dateIso: string): DemandWeekdayId {
  const dayIndex = new Date(`${dateIso}T00:00:00+09:00`).getDay();
  const byDayIndex: DemandWeekdayId[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return byDayIndex[dayIndex] ?? "friday";
}

function parseWeekday(value: string | null, dateIso: string) {
  const normalized = value?.trim() as DemandWeekdayId | undefined;
  if (
    normalized &&
    DEMAND_WEEKDAYS.some((weekday) => weekday.id === normalized)
  ) {
    return normalized;
  }
  return weekdayFromDate(dateIso);
}

function circularDistance(hour: number, center: number) {
  const raw = Math.abs(hour - center);
  return Math.min(raw, 24 - raw);
}

function peak(hour: number, center: number, width: number) {
  const distance = circularDistance(hour, center);
  return Math.exp(-(distance * distance) / (2 * width * width));
}

function weatherForHour(seed: number, hour: number, month: number): WeatherCondition {
  const weatherWave =
    Math.sin((hour + (seed % 9)) * 0.52) * 0.5 +
    Math.sin((hour + (seed % 17)) * 0.19) * 0.5;
  if ((month <= 2 || month === 12) && weatherWave > 0.72) {
    return "snow";
  }
  if (weatherWave > 0.58) {
    return "rain";
  }
  if (weatherWave > 0.18) {
    return "cloudy";
  }
  return "clear";
}

function temperatureForHour(month: number, hour: number, condition: WeatherCondition) {
  const seasonalBase =
    month <= 2 || month === 12
      ? 1
      : month >= 6 && month <= 8
        ? 27
        : month >= 3 && month <= 5
          ? 17
          : 12;
  const diurnal = Math.sin(((hour - 8) / 24) * Math.PI * 2) * 4.6;
  const weatherOffset = condition === "rain" ? -2.1 : condition === "snow" ? -4.4 : 0;
  return Number((seasonalBase + diurnal + weatherOffset).toFixed(1));
}

function demandForHour({
  date,
  dong,
  hour,
  weekday,
}: {
  date: string;
  dong: string;
  hour: number;
  weekday: DemandWeekdayId;
}) {
  const seed = hashString(`${dong}:${date}:${weekday}`);
  const phase = (seed % 360) * (Math.PI / 180);
  const isWeekend = weekday === "saturday" || weekday === "sunday";
  const isFriday = weekday === "friday";
  const dongMultiplier = DONG_DEMAND_MULTIPLIER[dong] ?? 0.92;
  const commutePeak = isWeekend ? peak(hour, 15, 3.2) : peak(hour, 8, 1.8);
  const lunchPeak = peak(hour, 12.5, 2.2);
  const eveningPeak = peak(hour, isWeekend ? 20 : isFriday ? 21 : 18.5, 2.5);
  const lateNightPeak = peak(hour, isWeekend ? 0.5 : 23, 2.8);
  const smoothVariation =
    Math.sin(hour * 0.72 + phase) * 0.06 +
    Math.sin(hour * 0.31 + phase * 0.43) * 0.04;
  const weekdayFactor = isWeekend ? 0.92 : isFriday ? 1.15 : 1;
  const demand =
    66 +
    commutePeak * (isWeekend ? 34 : 74) +
    lunchPeak * 38 +
    eveningPeak * (isWeekend ? 90 : 112) +
    lateNightPeak * (isWeekend ? 62 : 38);

  return Math.max(
    12,
    Math.round(demand * dongMultiplier * weekdayFactor * (1 + smoothVariation)),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedDong = url.searchParams.get("dong")?.trim() ?? "";
  const dong = TARGET_DONGS.includes(requestedDong as (typeof TARGET_DONGS)[number])
    ? requestedDong
    : DEFAULT_DONG;
  const date = parseDate(url.searchParams.get("date"));
  const hour = parseHour(url.searchParams.get("hour"));
  const timezone = url.searchParams.get("timezone")?.trim() || DEFAULT_TIMEZONE;
  const weekday = parseWeekday(url.searchParams.get("weekday"), date);
  const seed = hashString(`${dong}:${date}:${timezone}`);
  const month = Number(date.slice(5, 7));

  const points = Array.from({ length: 24 }, (_, pointHour) => {
    const demandCount = demandForHour({
      date,
      dong,
      hour: pointHour,
      weekday,
    });
    const condition = weatherForHour(seed, pointHour, month);
    const trafficBase =
      510 +
      peak(pointHour, 8.5, 2) * 520 +
      peak(pointHour, 18.5, 2.6) * 650 +
      peak(pointHour, 13, 3.5) * 160;
    const trafficVph = Math.round(trafficBase * (0.9 + demandCount / 900));

    return {
      hour: pointHour,
      population_pred: Math.round(13_800 + demandCount * 42 + trafficVph * 3.4),
      demand_count: demandCount,
      traffic_vph: trafficVph,
      weather_condition: condition,
    };
  });

  const selectedPoint = points[hour]!;
  const selectedCondition = selectedPoint.weather_condition as WeatherCondition;
  const selectedSpeed = clamp(42 - selectedPoint.traffic_vph / 54, 12, 38);

  return Response.json({
    dong,
    date,
    hour,
    timezone,
    generated: true,
    selected: {
      hour,
      demand_count: selectedPoint.demand_count,
      weather: {
        condition: selectedCondition,
        temperature_c: temperatureForHour(month, hour, selectedCondition),
        precipitation_mm:
          selectedCondition === "rain" ? 3.2 : selectedCondition === "snow" ? 1.1 : 0,
        source: "local-deterministic-mock",
      },
      traffic: {
        vph: selectedPoint.traffic_vph,
        speed_kph: Number(selectedSpeed.toFixed(1)),
        congestion_index: Number(
          clamp(selectedPoint.traffic_vph / 1850, 0.18, 0.95).toFixed(2),
        ),
        source: "local-deterministic-mock",
      },
    },
    points,
  });
}
