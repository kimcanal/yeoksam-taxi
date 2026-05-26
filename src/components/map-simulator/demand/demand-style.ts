import { DEMAND_SCORE_THRESHOLDS } from "@/components/map-simulator/constants/demand-constants";

export function demandFillForScore(score: number | null, isSelected = false) {
  if (score === null) {
    return isSelected
      ? "rgba(148, 163, 184, 0.4)"
      : "rgba(148, 163, 184, 0.16)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.veryHigh) {
    return "rgba(244, 63, 94, 0.75)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.high) {
    return "rgba(251, 146, 60, 0.65)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.moderate) {
    return "rgba(253, 224, 71, 0.55)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.low) {
    return "rgba(94, 234, 212, 0.35)";
  }
  return "rgba(148, 163, 184, 0.20)";
}

export function demandStrokeForScore(score: number | null, isSelected = false) {
  if (isSelected) return "rgba(255, 255, 255, 0.95)";
  if (score === null) return "rgba(148, 163, 184, 0.42)";
  if (score >= DEMAND_SCORE_THRESHOLDS.veryHigh) {
    return "rgba(244, 63, 94, 0.95)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.high) {
    return "rgba(251, 146, 60, 0.90)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.moderate) {
    return "rgba(253, 224, 71, 0.80)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.low) {
    return "rgba(94, 234, 212, 0.66)";
  }
  return "rgba(148, 163, 184, 0.44)";
}
