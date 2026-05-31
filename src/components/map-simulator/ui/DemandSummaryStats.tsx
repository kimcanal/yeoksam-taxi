import { demandSlotLabel } from "@/components/map-simulator/demand";
import type {
  FiveMinuteDemandPoint,
  HourlyDemandPoint,
} from "@/components/map-simulator/demand";

export type DemandSummaryStatsProps = {
  hasDemandData: boolean;
  selectedPeakDemand: HourlyDemandPoint;
  selectedDemandIntensityLabel: string;
  currentDemandSlot: FiveMinuteDemandPoint | null;
  currentTaxiDemandBase: number;
  appliedTaxiCount: number;
};

export function DemandSummaryStats({
  hasDemandData,
  selectedPeakDemand,
  selectedDemandIntensityLabel,
  currentDemandSlot,
  currentTaxiDemandBase,
  appliedTaxiCount,
}: DemandSummaryStatsProps) {
  const roundedCurrentDemand = Math.round(currentTaxiDemandBase);

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
          <div className="text-[10px] text-slate-500">피크 시간대 호출량</div>
          <div className="mt-1 font-semibold tabular-nums text-rose-100">
            {hasDemandData
              ? selectedPeakDemand.demandPred.toLocaleString("ko-KR")
              : "-"}
          </div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">피크 대비 현재 수요량</div>
          <div className="mt-1 font-semibold tabular-nums text-cyan-100">
            {selectedDemandIntensityLabel}
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-center">
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">현재 조회 시간대</div>
          <div className="mt-1 text-[11px] font-semibold tabular-nums text-slate-100">
            {demandSlotLabel(currentDemandSlot)}
          </div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">현재 수요 예측</div>
          <div className="mt-1 font-semibold tabular-nums text-cyan-100">
            {hasDemandData
              ? roundedCurrentDemand.toLocaleString("ko-KR")
              : "-"}
          </div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-500">지도 내 택시</div>
          <div className="mt-1 font-semibold tabular-nums text-amber-100">
            {hasDemandData ? `${appliedTaxiCount}대` : "-"}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] leading-4 text-slate-400 font-normal">
        현재 수요 예측은 선택한 행정동의 시간당 예측량입니다. 지도 내 택시는
        현재 수요 예측에 위 슬라이더 비율을 곱한 값입니다.
      </div>
    </>
  );
}
