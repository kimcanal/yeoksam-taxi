import { DEMAND_SCORE_THRESHOLDS } from "@/components/map-simulator/constants/demand-constants";

// 수요 높을수록 초록, 낮을수록 회색
export function demandFillForScore(score: number | null, isSelected = false) {
  if (score === null) {
    return isSelected
      ? "rgba(148, 163, 184, 0.38)"
      : "rgba(148, 163, 184, 0.14)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.veryHigh) {
    return "rgba(34, 197, 94, 0.82)";   // #22c55e 밝은 초록
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.high) {
    return "rgba(74, 222, 128, 0.68)";  // #4ade80 초록
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.moderate) {
    return "rgba(134, 239, 172, 0.52)"; // #86efac 연한 초록
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.low) {
    return "rgba(187, 247, 208, 0.34)"; // #bbf7d0 아주 연한 초록
  }
  return "rgba(148, 163, 184, 0.18)";  // 데이터 있지만 수요 거의 없음
}

export function demandStrokeForScore(score: number | null, isSelected = false) {
  if (isSelected) return "rgba(255, 255, 255, 0.95)";
  if (score === null) return "rgba(148, 163, 184, 0.38)";
  if (score >= DEMAND_SCORE_THRESHOLDS.veryHigh) {
    return "rgba(34, 197, 94, 0.95)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.high) {
    return "rgba(74, 222, 128, 0.88)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.moderate) {
    return "rgba(134, 239, 172, 0.72)";
  }
  if (score >= DEMAND_SCORE_THRESHOLDS.low) {
    return "rgba(187, 247, 208, 0.55)";
  }
  return "rgba(148, 163, 184, 0.40)";
}
