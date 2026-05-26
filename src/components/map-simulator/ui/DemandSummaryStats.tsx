import { DEMAND_VISUAL_UNIT_CALLS } from "@/components/map-simulator/constants/demand-constants";
import { demandSlotLabel } from "@/components/map-simulator/demand-math";
import type {
  FiveMinuteDemandPoint,
  HourlyDemandPoint,
} from "@/components/map-simulator/demand-types";

export type DemandSummaryStatsProps = {
  hasDemandData: boolean;
  selectedPeakDemand: HourlyDemandPoint;
  selectedDemandIntensityLabel: string;
  currentDemandSlot: FiveMinuteDemandPoint | null;
  currentFiveMinuteDemand: number;
  appliedTaxiCount: number;
};

export function DemandSummaryStats({
  hasDemandData,
  selectedPeakDemand,
  selectedDemandIntensityLabel,
  currentDemandSlot,
  currentFiveMinuteDemand,
  appliedTaxiCount,
}: DemandSummaryStatsProps) {
  return (
    <>
      <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/12 bg-white/[0.08] text-center">
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">피크 시간대</div>
          <div className="mt-1 font-semibold tabular-nums text-slate-100">
            {hasDemandData ? `${selectedPeakDemand.hour}시` : "-"}
          </div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">시간당 최대 호출</div>
          <div className="mt-1 font-semibold tabular-nums text-rose-100">
            {hasDemandData
              ? selectedPeakDemand.demandPred.toLocaleString("ko-KR")
              : "-"}
          </div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">현재 수요 혼잡도</div>
          <div className="mt-1 font-semibold tabular-nums text-cyan-100">
            {selectedDemandIntensityLabel}
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-center">
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">현재 시뮬레이션 구간</div>
          <div className="mt-1 text-[11px] font-semibold tabular-nums text-slate-100">
            {demandSlotLabel(currentDemandSlot)}
          </div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">5분 구간 예측</div>
          <div className="mt-1 font-semibold tabular-nums text-cyan-100">
            {hasDemandData
              ? Math.round(currentFiveMinuteDemand).toLocaleString("ko-KR")
              : "-"}
          </div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">시뮬레이션 배차 수</div>
          <div className="mt-1 font-semibold tabular-nums text-amber-100">
            {hasDemandData ? `${appliedTaxiCount}대` : "-"}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] leading-4 text-slate-400 font-normal">
        5분 구간 수요는 시간당 예측 총량을 균등 분배한 수치입니다.
        시뮬레이션 차량 1대는 실제 호출 약{" "}
        {DEMAND_VISUAL_UNIT_CALLS.toLocaleString("ko-KR")}건에 해당하며,
        지도는 선택된 행정동의 주요 도로와 수요 집중 구역을 표시합니다.
      </div>
    </>
  );
}
