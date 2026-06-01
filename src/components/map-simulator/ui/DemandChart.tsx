import type {
  DemandChartGeometry,
  DemandWeekdayId,
} from "@/components/map-simulator/demand";
import { weekdayLabel } from "@/components/map-simulator/demand";

type DemandChartProps = {
  hasDemandData: boolean;
  selectedDongName: string;
  selectedWeekday: DemandWeekdayId;
  demandChart: DemandChartGeometry;
  selectedAverageDemand: number;
};

function formatPopLabel(value: number): string {
  if (value === 0) return "0";
  if (value >= 10000) return `${Math.round(value / 10000)}만`;
  return `${Math.round(value / 1000)}천`;
}

export function DemandChart({
  hasDemandData,
  selectedDongName,
  selectedWeekday,
  demandChart,
  selectedAverageDemand,
}: DemandChartProps) {
  const rightEdge = demandChart.width - demandChart.paddingLeft; // approx right graph area end
  // x position for right y-axis labels: just past the graph right edge
  const rightLabelX = demandChart.width - 2;

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#07111c]">
        {hasDemandData ? (
          <svg
            viewBox={`0 0 ${demandChart.width} ${demandChart.height}`}
            role="img"
            aria-label={`${selectedDongName} ${weekdayLabel(selectedWeekday)}요일 시간대별 택시 수요 및 생활인구`}
            className="block h-auto w-full"
          >
            <defs>
              <linearGradient id="demandCurveFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(34,211,238,0.28)" />
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

            {/* 수평 그리드 라인 + 좌측 Y축 (수요) */}
            {demandChart.yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={demandChart.paddingLeft}
                  y1={tick.y}
                  x2={demandChart.width - 34}
                  y2={tick.y}
                  stroke="rgba(148,163,184,0.14)"
                  strokeWidth="0.8"
                />
                <text
                  x={demandChart.paddingLeft - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                  fill="rgba(34,211,238,0.65)"
                  fontSize="7.5"
                >
                  {tick.value}
                </text>
              </g>
            ))}

            {/* 우측 Y축 - 생활인구 */}
            {demandChart.hasPopulationData &&
              demandChart.populationYTicks.map((tick) => (
                <g key={`pop-${tick.value}`}>
                  <text
                    x={rightLabelX}
                    y={tick.y + 3}
                    textAnchor="end"
                    fill="rgba(251,146,60,0.65)"
                    fontSize="7.5"
                  >
                    {formatPopLabel(tick.value)}
                  </text>
                </g>
              ))}

            {/* X축 틱 */}
            {demandChart.xTicks.map((tick) => (
              <g key={tick.hour}>
                <line
                  x1={tick.x}
                  y1={demandChart.baseY}
                  x2={tick.x}
                  y2={demandChart.baseY + 4}
                  stroke="rgba(148,163,184,0.30)"
                  strokeWidth="0.8"
                />
                <text
                  x={tick.x}
                  y={demandChart.baseY + 16}
                  textAnchor="middle"
                  fill="rgba(148,163,184,0.75)"
                  fontSize="8"
                >
                  {tick.hour}
                </text>
              </g>
            ))}

            {/* 생활인구 면적 채우기 (연한 주황, 맨 아래 레이어) */}
            {demandChart.hasPopulationData && (
              <path
                d={`${demandChart.populationPath.trim()} L ${(demandChart.width - 34).toFixed(2)} ${demandChart.baseY.toFixed(2)} L ${demandChart.paddingLeft.toFixed(2)} ${demandChart.baseY.toFixed(2)} Z`}
                fill="rgba(251,146,60,0.06)"
                className="transition-all duration-500 ease-out"
              />
            )}

            {/* 수요 예측 면적 채우기 */}
            <path
              d={demandChart.areaPath}
              fill="url(#demandCurveFill)"
              className="transition-all duration-500 ease-out"
            />

            {/* 추세선 (분홍 점선) */}
            <path
              d={demandChart.trendPath}
              fill="none"
              stroke="#fda4af"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeWidth="1.4"
              opacity="0.85"
              className="transition-all duration-500 ease-out"
            />

            {/* 생활인구 라인 (주황 실선) */}
            {demandChart.hasPopulationData && (
              <path
                d={demandChart.populationPath}
                fill="none"
                stroke="#fb923c"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                opacity="0.90"
                className="transition-all duration-500 ease-out"
              />
            )}

            {/* 수요 예측 라인 (청록 실선, 최상단) */}
            <path
              d={demandChart.linePath}
              fill="none"
              stroke="#22d3ee"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              className="transition-all duration-500 ease-out"
            />

            {/* 피크 포인트 마커 */}
            <circle
              cx={demandChart.peakX}
              cy={demandChart.peakY}
              r="3.5"
              fill="#fff7ed"
              stroke="#fb7185"
              strokeWidth="1.5"
              className="transition-all duration-500 ease-out"
            />
          </svg>
        ) : (
          <div className="flex h-[164px] items-center justify-center px-5 text-center text-xs leading-5 text-slate-500">
            수요 데이터가 수신되면 선택한 행정동의 시간대별 그래프가 표시됩니다.
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-cyan-400" />
            수요 예측
          </span>
          {demandChart.hasPopulationData && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-orange-400" />
              생활인구
            </span>
          )}
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
