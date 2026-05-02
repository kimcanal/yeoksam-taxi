/**
 * Contract between the map dashboard and the demand model.
 *
 * The model owner drops `latest.json` into /public/forecast/ and the
 * frontend automatically switches from sample → model mode.
 *
 * Example file:
 * {
 *   "source": "model",
 *   "target_datetime": "2026-05-02T21:00:00+09:00",
 *   "weather": "clear",
 *   "generated_at": "2026-05-02T20:45:00+09:00",
 *   "regions": [
 *     { "dong_name": "역삼1동", "score": 0.94, "confidence": 0.81 },
 *     ...
 *   ]
 * }
 */

export type ForecastSource = "sample" | "model";
export type ForecastResultSource = "demo" | "model";

export interface ForecastRegion {
  dong_name: string;   // e.g. "역삼1동"
  score: number;       // 0..1 normalised relative demand
  confidence: number;  // 0..1 model confidence
}

export interface ForecastResult {
  /** "demo" before the external model is ready; "model" for real model output */
  source?: ForecastResultSource;
  /** ISO 8601+TZ — the datetime this forecast covers */
  target_datetime: string;
  /** "clear" | "rain" | "snow" */
  weather: string;
  /** ISO 8601 — when the model produced this file */
  generated_at: string;
  regions: ForecastRegion[];
}
