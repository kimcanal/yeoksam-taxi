import {
  DEMAND_CHART_HEIGHT,
  DEMAND_CHART_PADDING,
  DEMAND_CHART_ROUNDING_STEP,
  DEMAND_CHART_WIDTH,
  DEMAND_CHART_X_TICK_HOURS,
  DEMAND_SLOT_MINUTES,
  DEMAND_SLOTS_PER_HOUR,
  DEMAND_VISUAL_MAX_TAXIS,
  DEMAND_VISUAL_UNIT_CALLS,
} from "@/components/map-simulator/constants/demand-constants";
import {
  type DemandChartGeometry,
  type FiveMinuteDemandPoint,
  type HourlyDemandPoint,
} from "@/components/map-simulator/demand";
import {
  format24Hour,
  normalizeDayMinutes,
} from "@/components/map-simulator/environment";

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return clampNumber(value, 0, 1);
}

function finiteNumberFromRecord(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }
  return null;
}

function finiteNumberFromValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function hourFromKey(key: string) {
  const hour = Number(key);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function demandFromDailyValue(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return finiteNumberFromRecord(value as Record<string, unknown>, [
      "demand_count",
      "demandCount",
      "demand_pred",
      "demandPred",
      "demand",
      "value",
    ]);
  }
  return finiteNumberFromValue(value);
}

function demandPointFromValue(hour: number, value: unknown) {
  const demandPred = demandFromDailyValue(value);
  if (demandPred === null) {
    return null;
  }
  return {
    hour,
    populationPred: null,
    demandPred: Math.round(demandPred),
    actualDemand: null,
    trendDemandPred: 0,
  } satisfies HourlyDemandPoint;
}

export function withDemandTrend(points: HourlyDemandPoint[]) {
  return points.map((point, index) => {
    const neighbors = points.slice(
      Math.max(0, index - 1),
      Math.min(points.length, index + 2),
    );
    const averageDemand =
      neighbors.reduce((sum, neighbor) => sum + neighbor.demandPred, 0) /
      Math.max(1, neighbors.length);
    return {
      ...point,
      trendDemandPred: Math.round(averageDemand),
    };
  });
}

export function normalizeRemoteDemandPoints(payload: unknown) {
  const pointsPayload =
    payload && typeof payload === "object" && "points" in payload
      ? (payload as { points?: unknown }).points
      : null;
  if (!Array.isArray(pointsPayload)) {
    return null;
  }

  const points = pointsPayload.flatMap((point) => {
    if (!point || typeof point !== "object") {
      return [];
    }
    const record = point as Record<string, unknown>;
    const hour = Number(record.hour);
    const rawPopulationPred = finiteNumberFromRecord(record, [
      "population_pred",
      "populationPred",
      "population",
    ]);
    const demandPred = finiteNumberFromRecord(record, [
      "demand_count",
      "demandCount",
      "demand_pred",
      "demandPred",
      "demand",
    ]);
    const actualDemand = finiteNumberFromRecord(record, [
      "actual_demand_count",
      "actualDemandCount",
      "actual_demand",
      "actualDemand",
      "real_demand_count",
      "realDemandCount",
      "observed_demand_count",
      "observedDemandCount",
    ]);
    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      demandPred === null
    ) {
      return [];
    }
    return [
      {
        hour,
        populationPred: rawPopulationPred !== null
          ? Math.round(rawPopulationPred)
          : null,
        demandPred: Math.round(demandPred),
        actualDemand: actualDemand !== null ? Math.round(actualDemand) : null,
        trendDemandPred: 0,
      } satisfies HourlyDemandPoint,
    ];
  });

  if (!points.length) {
    return null;
  }

  return withDemandTrend(
    points
      .sort((left, right) => left.hour - right.hour)
      .filter(
        (point, index, sorted) =>
          index === 0 || point.hour !== sorted[index - 1]?.hour,
      ),
  );
}

export function normalizeRemoteDailyDemandSeries(payload: unknown) {
  const demandPayload =
    payload && typeof payload === "object" && "demand" in payload
      ? (payload as { demand?: unknown }).demand
      : null;
  if (
    !demandPayload ||
    typeof demandPayload !== "object" ||
    Array.isArray(demandPayload)
  ) {
    return null;
  }

  const seriesByDong: Record<string, HourlyDemandPoint[]> = {};
  Object.entries(demandPayload as Record<string, unknown>).forEach(
    ([outerKey, outerValue]) => {
      if (
        !outerValue ||
        typeof outerValue !== "object" ||
        Array.isArray(outerValue)
      ) {
        return;
      }

      const outerHour = hourFromKey(outerKey);
      Object.entries(outerValue as Record<string, unknown>).forEach(
        ([innerKey, innerValue]) => {
          const hour = outerHour ?? hourFromKey(innerKey);
          const dongName = outerHour === null ? outerKey : innerKey;
          if (hour === null || !dongName) {
            return;
          }
          const point = demandPointFromValue(hour, innerValue);
          if (!point) {
            return;
          }
          seriesByDong[dongName] = [...(seriesByDong[dongName] ?? []), point];
        },
      );
    },
  );

  const normalizedEntries = Object.entries(seriesByDong).flatMap(
    ([dongName, points]) => {
      const uniqueSortedPoints = points
        .sort((left, right) => left.hour - right.hour)
        .filter(
          (point, index, sorted) =>
            index === 0 || point.hour !== sorted[index - 1]?.hour,
        );
      return uniqueSortedPoints.length
        ? ([[dongName, withDemandTrend(uniqueSortedPoints)]] as const)
        : [];
    },
  );

  return normalizedEntries.length
    ? (Object.fromEntries(normalizedEntries) as Record<
        string,
        HourlyDemandPoint[]
      >)
    : null;
}

export function demandVisualUnitCount(fiveMinuteDemand: number) {
  if (!Number.isFinite(fiveMinuteDemand) || fiveMinuteDemand <= 0) {
    return 0;
  }
  return clampNumber(
    Math.round(fiveMinuteDemand / DEMAND_VISUAL_UNIT_CALLS),
    1,
    DEMAND_VISUAL_MAX_TAXIS,
  );
}

export function buildFiveMinuteDemandSeries(points: HourlyDemandPoint[]) {
  if (!points.length) {
    return [];
  }

  const demandByHour = new globalThis.Map(
    points.map((point) => [point.hour, Math.max(0, point.demandPred)] as const),
  );
  const hourlyTotals = Array.from({ length: 24 }, (_, hour) =>
    demandByHour.get(hour) ?? 0,
  );
  const fiveMinutePoints: FiveMinuteDemandPoint[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const hourlyTotal = hourlyTotals[hour]!;
    const slotDemand = hourlyTotal / DEMAND_SLOTS_PER_HOUR;

    for (let slot = 0; slot < DEMAND_SLOTS_PER_HOUR; slot += 1) {
      fiveMinutePoints.push({
        minuteOfDay: hour * 60 + slot * DEMAND_SLOT_MINUTES,
        hour,
        slot,
        demand: slotDemand,
        visualUnits: demandVisualUnitCount(slotDemand),
      });
    }
  }

  return fiveMinutePoints;
}

export function demandSlotLabel(point: FiveMinuteDemandPoint | null) {
  if (!point) {
    return "-";
  }
  // 슬롯은 1시간 단위 — hour 정각부터 다음 정각까지
  const start = point.hour * 60;
  const end = normalizeDayMinutes(start + 60);
  return `${format24Hour(start)}-${format24Hour(end)}`;
}

export function buildDemandChartGeometry(points: HourlyDemandPoint[]): DemandChartGeometry {
  const paddingLeft = DEMAND_CHART_PADDING.left;
  const paddingRight = DEMAND_CHART_PADDING.right;
  const paddingTop = DEMAND_CHART_PADDING.top;
  const paddingBottom = DEMAND_CHART_PADDING.bottom;
  const graphWidth = DEMAND_CHART_WIDTH - paddingLeft - paddingRight;
  const graphHeight = DEMAND_CHART_HEIGHT - paddingTop - paddingBottom;
  const maxDemand = Math.max(
    1,
    ...points.flatMap((point) =>
      point.actualDemand === null
        ? [point.trendDemandPred]
        : [point.trendDemandPred, point.actualDemand],
    ),
  );
  const yMax =
    Math.ceil(maxDemand / DEMAND_CHART_ROUNDING_STEP) *
    DEMAND_CHART_ROUNDING_STEP;
  const xForHour = (hour: number) => paddingLeft + (hour / 23) * graphWidth;
  const yForDemand = (demand: number) =>
    paddingTop + graphHeight - (Math.max(0, demand) / yMax) * graphHeight;
  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForDemand(point.demandPred).toFixed(2)}`,
    )
    .join(" ");
  const trendPath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForDemand(point.trendDemandPred).toFixed(2)}`,
    )
    .join(" ");
  const actualDemandPoints = points.filter(
    (point) => point.actualDemand !== null,
  );
  const actualLinePath = actualDemandPoints
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForDemand(point.actualDemand ?? 0).toFixed(2)}`,
    )
    .join(" ");
  const baseY = paddingTop + graphHeight;
  const areaPath = points.length
    ? `${trendPath} L ${xForHour(points[points.length - 1]!.hour).toFixed(2)} ${baseY.toFixed(2)} L ${xForHour(points[0]!.hour).toFixed(2)} ${baseY.toFixed(2)} Z`
    : "";
  const peakPoint = points.reduce(
    (peak, point) =>
      point.trendDemandPred > peak.trendDemandPred ? point : peak,
    points[0] ?? {
      hour: 0,
      populationPred: null,
      demandPred: 0,
      actualDemand: null,
      trendDemandPred: 0,
    },
  );
  return {
    width: DEMAND_CHART_WIDTH,
    height: DEMAND_CHART_HEIGHT,
    paddingLeft,
    baseY,
    yMax,
    linePath,
    actualLinePath,
    trendPath,
    areaPath,
    hasActualDemand: actualDemandPoints.length > 0,
    peakPoint,
    peakX: xForHour(peakPoint.hour),
    peakY: yForDemand(peakPoint.trendDemandPred),
    xTicks: DEMAND_CHART_X_TICK_HOURS.map((hour) => ({
      hour,
      x: xForHour(hour),
    })),
    yTicks: [0, Math.round(yMax / 2), yMax].map((value) => ({
      value,
      y: yForDemand(value),
    })),
  };
}

export function averageDemand(points: HourlyDemandPoint[]) {
  if (!points.length) return 0;
  return Math.round(
    points.reduce((sum, point) => sum + point.demandPred, 0) / points.length,
  );
}

export function scoreDemandAtHour(points: HourlyDemandPoint[], minutes: number) {
  if (!points.length) {
    return null;
  }
  const hour = Math.floor(normalizeDayMinutes(minutes) / 60);
  const point =
    points.find((candidate) => candidate.hour === hour) ?? points[0] ?? null;
  const maxDemand = Math.max(
    0,
    ...points.map((candidate) => candidate.demandPred),
  );
  if (!point || maxDemand <= 0) {
    return null;
  }
  return clamp01(point.demandPred / maxDemand);
}
