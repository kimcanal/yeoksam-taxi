import type { DemandChartGeometry } from "@/components/map-simulator/demand";
import { formatDateLabel } from "@/components/map-simulator/environment";

type DemandChartProps = {
  hasDemandData: boolean;
  selectedDongName: string;
  simulationDate: string;
  demandChart: DemandChartGeometry;
  selectedAverageDemand: number;
  currentHour: number;
};

export function DemandChart({
  hasDemandData,
  selectedDongName,
  simulationDate,
  demandChart,
  selectedAverageDemand,
  currentHour,
}: DemandChartProps) {
  return (
    <>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#07111c]">
        {hasDemandData ? (
          <svg
            viewBox={`0 0 ${demandChart.width} ${demandChart.height}`}
            role="img"
            aria-label={`${selectedDongName} ${formatDateLabel(simulationDate)} 시간대별 택시 수요`}
            className="block h-auto w-full"
          >
            <defs>
              <linearGradient id="demandCurveFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(34,211,238,0.32)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </linearGradient>
            </defs>
            <rect
              x="0"
              y="0"
              width={demandChart.width}
              height={demandChart.height}
              fill="#07111c"
            />
            {demandChart.yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={demandChart.paddingLeft}
                  y1={tick.y}
                  x2={demandChart.width - 12}
                  y2={tick.y}
                  stroke="rgba(148,163,184,0.16)"
                  strokeWidth="0.8"
                />
                <text
                  x={demandChart.paddingLeft - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                  fill="rgba(148,163,184,0.74)"
                  fontSize="8"
                >
                  {tick.value}
                </text>
              </g>
            ))}
            {demandChart.xTicks.map((tick) => (
              <g key={tick.hour}>
                <line
                  x1={tick.x}
                  y1={demandChart.baseY}
                  x2={tick.x}
                  y2={demandChart.baseY + 4}
                  stroke="rgba(148,163,184,0.35)"
                  strokeWidth="0.8"
                />
                <text
                  x={tick.x}
                  y={demandChart.baseY + 16}
                  textAnchor="middle"
                  fill="rgba(148,163,184,0.78)"
                  fontSize="8"
                >
                  {tick.hour}
                </text>
              </g>
            ))}
            <path
              d={demandChart.areaPath}
              fill="url(#demandCurveFill)"
              className="transition-all duration-500 ease-out"
            />
            <path
              d={demandChart.trendPath}
              fill="none"
              stroke="#fda4af"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeWidth="1.6"
              opacity="0.9"
              className="transition-all duration-500 ease-out"
            />
            <path
              d={demandChart.linePath}
              fill="none"
              stroke="#22d3ee"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
              className="transition-all duration-500 ease-out"
            />
            {demandChart.hasActualDemand ? (
              <path
                d={demandChart.actualLinePath}
                fill="none"
                stroke="#facc15"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                opacity="0.95"
                className="transition-all duration-500 ease-out"
              />
            ) : null}
            {/* 현재 시간대 수직선 + 점 */}
            {(() => {
              const clampedHour = Math.max(0, Math.min(23, currentHour));
              const graphWidth = demandChart.width - demandChart.paddingLeft - 12;
              const cx = demandChart.paddingLeft + (clampedHour / 23) * graphWidth;
              const topY = demandChart.yTicks[demandChart.yTicks.length - 1]?.y ?? 0;
              return (
                <g>
                  <line
                    x1={cx} y1={topY}
                    x2={cx} y2={demandChart.baseY}
                    stroke="rgba(251,191,36,0.5)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={cx - 10} y={demandChart.baseY + 5}
                    width={20} height={12} rx={3}
                    fill="rgba(251,191,36,0.18)"
                  />
                  <text
                    x={cx} y={demandChart.baseY + 14}
                    textAnchor="middle"
                    fill="#fbbf24" fontSize="8" fontWeight="700"
                  >
                    {clampedHour}
                  </text>
                </g>
              );
            })()}
          </svg>
        ) : (
          <div className="flex h-[164px] items-center justify-center px-5 text-center text-xs leading-5 text-slate-500">
            수요 데이터가 수신되면 선택한 행정동의 시간대별 그래프가 표시됩니다.
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-cyan-300" />
            시간당 수요
          </span>
          {demandChart.hasActualDemand ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-yellow-300" />
              실수요
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t border-dashed border-rose-300" />
            추세
          </span>
        </div>
        <span className="tabular-nums">
          {hasDemandData
            ? `평균 ${selectedAverageDemand.toLocaleString("ko-KR")}`
            : "데이터 수신 대기 중"}
        </span>
      </div>
    </>
  );
}
