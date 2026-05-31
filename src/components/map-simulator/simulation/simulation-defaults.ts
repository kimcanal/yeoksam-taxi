export const DEFAULT_TAXI_COUNT = 3;
export const DEFAULT_TRAFFIC_COUNT = 56;
export const DEFAULT_TRAFFIC_LOAD_PERCENT = 20; // MAX_TRAFFIC_COUNT의 20% ≈ 52대
export const MIN_TRAFFIC_LOAD_PERCENT = 5;      // MAX_TRAFFIC_COUNT의 5% ≈ 13대
export const MAX_TRAFFIC_LOAD_PERCENT = 100;    // MAX_TRAFFIC_COUNT 전체
export const MIN_TAXI_COUNT = 3;
export const MAX_TAXI_COUNT = 260;
export const MIN_TRAFFIC_COUNT = 0;
export const MAX_TRAFFIC_COUNT = 260;

export function trafficCountForLoadPercent(percent: number) {
  const normalizedPercent = Math.min(
    MAX_TRAFFIC_LOAD_PERCENT,
    Math.max(MIN_TRAFFIC_LOAD_PERCENT, Math.round(percent)),
  );
  // trafficLoadPercent = MAX_TRAFFIC_COUNT 대비 표시 비율(%)
  const scaledCount = Math.round(MAX_TRAFFIC_COUNT * (normalizedPercent / 100));
  return Math.min(MAX_TRAFFIC_COUNT, Math.max(MIN_TRAFFIC_COUNT, scaledCount));
}
