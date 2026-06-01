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
  DEMAND_WEEKDAYS,
  type DemandChartGeometry,
  type DemandWeekdayId,
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

export function weekdayIdFromDate(dateIso: string): DemandWeekdayId {
  const parsed = new Date(`${dateIso}T00:00:00`);
  const dayIndex = Number.isFinite(parsed.getTime()) ? parsed.getDay() : 5;
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

export function weekdayLabel(id: DemandWeekdayId) {
  return DEMAND_WEEKDAYS.find((weekday) => weekday.id === id)?.label ?? "금";
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
    const rawPopulationPred = Number(
      record.population_pred ?? record.populationPred ?? record.population,
    );
    const demandPred = Number(
      record.demand_count ??
        record.demandCount ??
        record.demand_pred ??
        record.demandPred ??
        record.demand,
    );
    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isFinite(demandPred)
    ) {
      return [];
    }
    return [
      {
        hour,
        populationPred: Number.isFinite(rawPopulationPred)
          ? Math.round(rawPopulationPred)
          : null,
        demandPred: Math.round(demandPred),
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
  const start = point.minuteOfDay;
  const end = normalizeDayMinutes(start + DEMAND_SLOT_MINUTES);
  return `${format24Hour(start)}-${format24Hour(end)}`;
}

export function buildDemandChartGeometry(
  points: HourlyDemandPoint[],
): DemandChartGeometry {
  const paddingLeft = DEMAND_CHART_PADDING.left;
  const paddingRight = DEMAND_CHART_PADDING.right;
  const paddingTop = DEMAND_CHART_PADDING.top;
  const paddingBottom = DEMAND_CHART_PADDING.bottom;
  const graphWidth = DEMAND_CHART_WIDTH - paddingLeft - paddingRight;
  const graphHeight = DEMAND_CHART_HEIGHT - paddingTop - paddingBottom;
  const maxDemand = Math.max(1, ...points.map((point) => point.demandPred));
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
  const baseY = paddingTop + graphHeight;
  const areaPath = points.length
    ? `${linePath} L ${xForHour(points[points.length - 1]!.hour).toFixed(2)} ${baseY.toFixed(2)} L ${xForHour(points[0]!.hour).toFixed(2)} ${baseY.toFixed(2)} Z`
    : "";
  const peakPoint = points.reduce(
    (peak, point) => (point.demandPred > peak.demandPred ? point : peak),
    points[0] ?? {
      hour: 0,
      populationPred: null,
      demandPred: 0,
      trendDemandPred: 0,
    },
  );

  // ── 생활인구 보조 라인 ──────────────────────────────────────────────────
  const popPoints = points.filter((p) => p.populationPred !== null);
  const hasPopulationData = popPoints.length > 0;
  const maxPopulation = hasPopulationData
    ? Math.max(1, ...popPoints.map((p) => p.populationPred!))
    : 1;
  // 1만 단위로 올림
  const populationYMax = Math.ceil(maxPopulation / 10000) * 10000;
  const yForPopulation = (pop: number) =>
    paddingTop + graphHeight - (Math.max(0, pop) / populationYMax) * graphHeight;

  // null이 있으면 M(moveto)로 끊어서 이어 그리기
  let populationPath = "";
  let needsMoveTo = true;
  for (const p of points) {
    if (p.populationPred === null) {
      needsMoveTo = true;
      continue;
    }
    const cmd = needsMoveTo ? "M" : "L";
    populationPath += `${cmd} ${xForHour(p.hour).toFixed(2)} ${yForPopulation(p.populationPred).toFixed(2)} `;
    needsMoveTo = false;
  }

  const populationYTicks = hasPopulationData
    ? [0, Math.round(populationYMax / 2), populationYMax].map((value) => ({
        value,
        y: yForPopulation(value),
      }))
    : [];

  return {
    width: DEMAND_CHART_WIDTH,
    height: DEMAND_CHART_HEIGHT,
    paddingLeft,
    baseY,
    yMax,
    linePath,
    trendPath,
    areaPath,
    peakPoint,
    peakX: xForHour(peakPoint.hour),
    peakY: yForDemand(peakPoint.demandPred),
    xTicks: DEMAND_CHART_X_TICK_HOURS.map((hour) => ({
      hour,
      x: xForHour(hour),
    })),
    yTicks: [0, Math.round(yMax / 2), yMax].map((value) => ({
      value,
      y: yForDemand(value),
    })),
    populationPath,
    populationYMax,
    populationYTicks,
    hasPopulationData,
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
