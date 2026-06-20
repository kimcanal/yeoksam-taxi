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
  type HourlySupplyPoint,
  type HourlyPricingPoint,
  type PricingChartGeometry,
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
    if (point.isBackendMissing) {
      return {
        ...point,
        trendDemandPred: 0,
      };
    }
    const neighbors = points.slice(
      Math.max(0, index - 1),
      Math.min(points.length, index + 2),
    ).filter((neighbor) => !neighbor.isBackendMissing);
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

export function normalizeRemoteDailySupplySeries(payload: unknown) {
  const supplyPayload =
    payload && typeof payload === "object" && "supply" in payload
      ? (payload as { supply?: unknown }).supply
      : null;
  if (
    !supplyPayload ||
    typeof supplyPayload !== "object" ||
    Array.isArray(supplyPayload)
  ) {
    return null;
  }

  const seriesByDong: Record<string, HourlySupplyPoint[]> = {};
  Object.entries(supplyPayload as Record<string, unknown>).forEach(
    ([dongName, hoursObj]) => {
      if (
        !hoursObj ||
        typeof hoursObj !== "object" ||
        Array.isArray(hoursObj)
      ) {
        return;
      }
      const points: HourlySupplyPoint[] = [];
      Object.entries(hoursObj as Record<string, unknown>).forEach(
        ([hourStr, value]) => {
          const hour = Number(hourStr);
          if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
            points.push({
              hour,
              supplyPred: Number(value) || 0,
            });
          }
        },
      );
      seriesByDong[dongName] = points.sort((left, right) => left.hour - right.hour);
    },
  );

  return seriesByDong;
}

export function normalizeRemotePricingSeries(payload: unknown) {
  const rows =
    payload && typeof payload === "object" && "rows" in payload
      ? (payload as { rows?: unknown }).rows
      : null;
  if (!Array.isArray(rows)) {
    return null;
  }

  const seriesByDong: Record<string, HourlyPricingPoint[]> = {};
  rows.forEach((row: unknown) => {
    if (!row || typeof row !== "object") {
      return;
    }
    const record = row as Record<string, unknown>;
    const dongName = String(record.dong || "");
    const hour = Number(record.hour);
    if (!dongName || !Number.isInteger(hour) || hour < 0 || hour > 23) {
      return;
    }
    const point: HourlyPricingPoint = {
      hour,
      demand: Number(record.demand) || 0,
      supplyProxy: Number(record.supply_proxy) || 0,
      shortage: Number(record.shortage) || 0,
      shortageRatio: Number(record.shortage_ratio) || 0,
      pricingTier: String(record.pricing_tier || "normal"),
      surgeMultiplier: Number(record.surge_multiplier) || 1.0,
      suggestedDriverIncentiveKrw: Number(record.suggested_driver_incentive_krw) || 0,
      expectedSupplyIncrease: Number(record.expected_supply_increase) || 0,
      postIncentiveSupplyProxy: Number(record.post_incentive_supply_proxy) || 0,
      postIncentiveShortage: Number(record.post_incentive_shortage) || 0,
    };
    if (!seriesByDong[dongName]) {
      seriesByDong[dongName] = [];
    }
    seriesByDong[dongName].push(point);
  });

  Object.keys(seriesByDong).forEach((dongName) => {
    seriesByDong[dongName].sort((left, right) => left.hour - right.hour);
  });

  return seriesByDong;
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

export function buildDemandChartGeometry(
  points: HourlyDemandPoint[],
  supplyPoints?: HourlySupplyPoint[],
): DemandChartGeometry {
  const paddingLeft = DEMAND_CHART_PADDING.left;
  const paddingRight = DEMAND_CHART_PADDING.right;
  const paddingTop = DEMAND_CHART_PADDING.top;
  const paddingBottom = DEMAND_CHART_PADDING.bottom;
  const graphWidth = DEMAND_CHART_WIDTH - paddingLeft - paddingRight;
  const graphHeight = DEMAND_CHART_HEIGHT - paddingTop - paddingBottom;

  const hasSupplyData = Boolean(supplyPoints && supplyPoints.length > 0);
  const rawDemandMax = Math.max(
    1,
    ...points.flatMap((point) =>
      point.actualDemand === null
        ? [point.demandPred]
        : [point.demandPred, point.actualDemand],
    ),
  );
  const rawSupplyMax = hasSupplyData
    ? Math.max(1, ...(supplyPoints || []).map((p) => p.supplyPred))
    : rawDemandMax;
  const yMax = Math.ceil(
    Math.max(rawDemandMax, hasSupplyData ? rawSupplyMax : rawDemandMax) /
      DEMAND_CHART_ROUNDING_STEP,
  ) * DEMAND_CHART_ROUNDING_STEP;

  const xForHour = (hour: number) => paddingLeft + (hour / 23) * graphWidth;
  const yForValue = (value: number) =>
    paddingTop + graphHeight - (Math.max(0, value) / yMax) * graphHeight;
  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForValue(point.demandPred).toFixed(2)}`,
    )
    .join(" ");
  const trendPath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForValue(point.trendDemandPred).toFixed(2)}`,
    )
    .join(" ");
  const actualDemandPoints = points.filter(
    (point) => point.actualDemand !== null,
  );
  const actualLinePath = actualDemandPoints
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForValue(point.actualDemand ?? 0).toFixed(2)}`,
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
      actualDemand: null,
      trendDemandPred: 0,
    },
  );
  const demandPointMarkers = points.map((point) => ({
    hour: point.hour,
    x: xForHour(point.hour),
    y: yForValue(point.demandPred),
    value: point.demandPred,
    isBackendMissing: point.isBackendMissing,
  }));
  const availableDemandHours = new Set(points.map((point) => point.hour));
  const missingDemandHours = Array.from({ length: 24 }, (_, hour) => hour)
    .filter((hour) => !availableDemandHours.has(hour));

  // 공급 추정 통합 라인 패스 생성
  let supplyLinePath = "";
  let peakSupplyPoint: HourlySupplyPoint | null = null;
  let peakSupplyX = 0;
  let peakSupplyY = 0;

  if (hasSupplyData && supplyPoints) {
    supplyLinePath = supplyPoints
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForValue(point.supplyPred).toFixed(2)}`,
      )
      .join(" ");

    peakSupplyPoint = supplyPoints.reduce(
      (peak, point) => (point.supplyPred > peak.supplyPred ? point : peak),
      supplyPoints[0] ?? { hour: 0, supplyPred: 0 },
    );
    peakSupplyX = xForHour(peakSupplyPoint.hour);
    peakSupplyY = yForValue(peakSupplyPoint.supplyPred);
  }

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
    peakY: yForValue(peakPoint.demandPred),
    xTicks: DEMAND_CHART_X_TICK_HOURS.map((hour) => ({
      hour,
      x: xForHour(hour),
    })),
    yTicks: [0, Math.round(yMax / 2), yMax].map((value) => ({
      value,
      y: yForValue(value),
    })),
    demandPointMarkers,
    missingDemandHours,
    // 공급 필드 반환
    supplyLinePath,
    hasSupplyData,
    peakSupplyPoint,
    peakSupplyX,
    peakSupplyY,
  };
}

export function buildPricingChartGeometry(
  points: HourlyPricingPoint[],
): PricingChartGeometry {
  const paddingLeft = DEMAND_CHART_PADDING.left;
  const paddingRight = DEMAND_CHART_PADDING.right;
  const paddingTop = DEMAND_CHART_PADDING.top;
  const paddingBottom = DEMAND_CHART_PADDING.bottom;
  const graphWidth = DEMAND_CHART_WIDTH - paddingLeft - paddingRight;
  const graphHeight = DEMAND_CHART_HEIGHT - paddingTop - paddingBottom;

  // 인센티브 요금 차트 기하 구조 계산 (500원 ~ 4800원 스케일)
  // 또는 서지 요금 배율 (1.0x ~ 1.35x 스케일)
  const maxIncentive = Math.max(
    4800,
    ...points.map((p) => p.suggestedDriverIncentiveKrw),
  );

  const yMax = maxIncentive;
  const yMin = 0;
  const xForHour = (hour: number) => paddingLeft + (hour / 23) * graphWidth;
  const yForVal = (val: number) =>
    paddingTop + graphHeight - ((val - yMin) / (yMax - yMin)) * graphHeight;

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForVal(point.suggestedDriverIncentiveKrw).toFixed(2)}`,
    )
    .join(" ");

  const baseY = paddingTop + graphHeight;
  const areaPath = points.length
    ? `${linePath} L ${xForHour(points[points.length - 1]!.hour).toFixed(2)} ${baseY.toFixed(2)} L ${xForHour(points[0]!.hour).toFixed(2)} ${baseY.toFixed(2)} Z`
    : "";

  const peakPoint = points.reduce(
    (peak, point) => (point.suggestedDriverIncentiveKrw > peak.suggestedDriverIncentiveKrw ? point : peak),
    points[0] ?? { hour: 0, suggestedDriverIncentiveKrw: 0 },
  ) as HourlyPricingPoint;

  return {
    width: DEMAND_CHART_WIDTH,
    height: DEMAND_CHART_HEIGHT,
    paddingLeft,
    baseY,
    yMax,
    yMin,
    linePath,
    areaPath,
    peakPoint,
    peakX: xForHour(peakPoint.hour),
    peakY: yForVal(peakPoint.suggestedDriverIncentiveKrw),
    xTicks: DEMAND_CHART_X_TICK_HOURS.map((hour) => ({
      hour,
      x: xForHour(hour),
    })),
    yTicks: [0, Math.round(yMax / 2), yMax].map((value) => ({
      value,
      y: yForVal(value),
    })),
  };
}

export function averageDemand(points: HourlyDemandPoint[]) {
  const measuredPoints = points.filter((point) => !point.isBackendMissing);
  if (!measuredPoints.length) return 0;
  return Math.round(
    measuredPoints.reduce((sum, point) => sum + point.demandPred, 0) /
      measuredPoints.length,
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

export function buildDongDemandScores(
  heatmapDemandByDong: Record<string, number>,
  dongDailyMaxDemands: Record<string, number>,
) {
  const scores: Record<string, number> = {};
  Object.entries(heatmapDemandByDong).forEach(([dongName, demand]) => {
    const maxDemand = Math.max(0, dongDailyMaxDemands[dongName] ?? 0);
    scores[dongName] = maxDemand > 0 ? Math.max(0, demand) / maxDemand : 0;
  });
  return scores;
}
