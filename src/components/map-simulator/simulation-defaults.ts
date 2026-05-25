export const DEFAULT_TAXI_COUNT = 3;
export const DEFAULT_TRAFFIC_COUNT = 20;
export const DEFAULT_TRAFFIC_LOAD_PERCENT = 100;
export const MIN_TRAFFIC_LOAD_PERCENT = 30;
export const MAX_TRAFFIC_LOAD_PERCENT = 300;
export const MIN_TAXI_COUNT = 3;
export const MAX_TAXI_COUNT = 100;
export const MIN_TRAFFIC_COUNT = 0;
export const MAX_TRAFFIC_COUNT = 200;

export function trafficCountForLoadPercent(percent: number) {
  const normalizedPercent = Math.min(
    MAX_TRAFFIC_LOAD_PERCENT,
    Math.max(MIN_TRAFFIC_LOAD_PERCENT, Math.round(percent)),
  );
  const scaledCount = Math.round(
    DEFAULT_TRAFFIC_COUNT * (normalizedPercent / 100),
  );
  return Math.min(MAX_TRAFFIC_COUNT, Math.max(MIN_TRAFFIC_COUNT, scaledCount));
}
