import { useState } from "react";
import type { DemandChartGeometry, PricingChartGeometry } from "@/components/map-simulator/demand";
import { formatDateLabel } from "@/components/map-simulator/environment";

type DemandChartProps = {
  hasDemandData: boolean;
  selectedDongName: string;
  simulationDate: string;
  demandChart: DemandChartGeometry;
  selectedAverageDemand: number;
  currentHour: number;
  onHourSelect?: (hour: number) => void;
  minimapShadingMode?: "demand" | "supply" | "shortage";
  pricingChart?: PricingChartGeometry;
  selectedAverageSupply?: number;
};

export function DemandChart({
  hasDemandData,
  selectedDongName,
  simulationDate,
  demandChart,
  selectedAverageDemand,
  currentHour,
  onHourSelect,
  minimapShadingMode = "demand",
  pricingChart,
  selectedAverageSupply = 0,
}: DemandChartProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  function getHourFromEvent(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickRatio = clickX / rect.width;
    const svgX = clickRatio * 320; // 320 is the viewBox width
    const paddingLeft = 30;
    const paddingRight = 12;
    const graphWidth = 320 - paddingLeft - paddingRight; // 278
    const hourRatio = (svgX - paddingLeft) / graphWidth;
    return Math.max(0, Math.min(23, Math.round(hourRatio * 23)));
  }

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!onHourSelect) return;
    setHoveredHour(getHourFromEvent(event));
  };

  const handleMouseLeave = () => {
    setHoveredHour(null);
  };

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!onHourSelect) return;
    const hour = getHourFromEvent(event);
    onHourSelect(hour);
  };

  const activeChart = (minimapShadingMode === "shortage" && pricingChart)
    ? pricingChart
    : demandChart;

  const showData = minimapShadingMode === "shortage" ? Boolean(pricingChart) : hasDemandData;
  const hourlyGuideTicks = Array.from({ length: 24 }, (_, hour) => {
    const graphWidth = activeChart.width - activeChart.paddingLeft - 12;
    return {
      hour,
      x: activeChart.paddingLeft + (hour / 23) * graphWidth,
    };
  });
  const missingDemandHoursText = demandChart.missingDemandHours.length
    ? `${demandChart.missingDemandHours.map((hour) => `${hour}시`).join(", ")} 미수신`
    : "";

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#07111c]">
        {showData ? (
          <svg
            viewBox={`0 0 ${activeChart.width} ${activeChart.height}`}
            role="img"
            aria-label={`${selectedDongName} ${formatDateLabel(simulationDate)} 시간대별 데이터`}
            className={`block h-auto w-full ${onHourSelect ? "cursor-pointer" : ""}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          >
            <defs>
              <linearGradient id="demandCurveFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(34,211,238,0.32)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </linearGradient>
              <linearGradient id="pricingCurveFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(245,158,11,0.32)" />
                <stop offset="100%" stopColor="rgba(245,158,11,0)" />
              </linearGradient>
            </defs>
            <rect
              x="0"
              y="0"
              width={activeChart.width}
              height={activeChart.height}
              fill="#07111c"
            />
            {activeChart.yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={activeChart.paddingLeft}
                  y1={tick.y}
                  x2={activeChart.width - 12}
                  y2={tick.y}
                  stroke="rgba(148,163,184,0.16)"
                  strokeWidth="0.8"
                />
                <text
                  x={activeChart.paddingLeft - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                  fill="rgba(148,163,184,0.74)"
                  fontSize="8"
                >
                  {minimapShadingMode === "shortage" ? `${tick.value.toLocaleString("ko-KR")}원` : tick.value}
                </text>
              </g>
            ))}
            {hourlyGuideTicks.map((tick) => (
              <line
                key={`hour-guide-${tick.hour}`}
                x1={tick.x}
                y1={activeChart.baseY + 1}
                x2={tick.x}
                y2={activeChart.baseY + 3}
                stroke="rgba(148,163,184,0.18)"
                strokeWidth="0.7"
              />
            ))}
            {activeChart.xTicks.map((tick) => (
              <g key={tick.hour}>
                <line
                  x1={tick.x}
                  y1={activeChart.baseY}
                  x2={tick.x}
                  y2={activeChart.baseY + 4}
                  stroke="rgba(148,163,184,0.35)"
                  strokeWidth="0.8"
                />
                <text
                  x={tick.x}
                  y={activeChart.baseY + 16}
                  textAnchor="middle"
                  fill="rgba(148,163,184,0.78)"
                  fontSize="8"
                >
                  {tick.hour}
                </text>
              </g>
            ))}

            {/* 1. Demand mode rendering */}
            {minimapShadingMode === "demand" && (
              <>
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
                {demandChart.hasActualDemand && (
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
                )}
                {demandChart.demandPointMarkers.map((marker) => (
                  <circle
                    key={`demand-point-${marker.hour}`}
                    cx={marker.x}
                    cy={marker.y}
                    r={marker.isBackendMissing ? 2.2 : 1.8}
                    fill={marker.isBackendMissing ? "#07111c" : "#22d3ee"}
                    stroke={
                      marker.isBackendMissing
                        ? "rgba(148,163,184,0.82)"
                        : "rgba(125,211,252,0.95)"
                    }
                    strokeWidth={marker.isBackendMissing ? 1 : 0.6}
                    opacity={marker.isBackendMissing ? 0.95 : 0.9}
                  />
                ))}
              </>
            )}

            {/* 2. Supply mode rendering */}
            {minimapShadingMode === "supply" && (
              <>
                {/* Demand reference line (low opacity) */}
                <path
                  d={demandChart.linePath}
                  fill="none"
                  stroke="#22d3ee"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  opacity="0.35"
                  className="transition-all duration-500 ease-out"
                />
                {demandChart.demandPointMarkers.map((marker) => (
                  <circle
                    key={`supply-demand-point-${marker.hour}`}
                    cx={marker.x}
                    cy={marker.y}
                    r={marker.isBackendMissing ? 2 : 1.4}
                    fill={marker.isBackendMissing ? "#07111c" : "#22d3ee"}
                    stroke={
                      marker.isBackendMissing
                        ? "rgba(148,163,184,0.72)"
                        : "rgba(125,211,252,0.7)"
                    }
                    strokeWidth={marker.isBackendMissing ? 0.9 : 0.5}
                    opacity={marker.isBackendMissing ? 0.7 : 0.38}
                  />
                ))}
                {/* Supply line */}
                {demandChart.hasSupplyData && (
                  <path
                    d={demandChart.supplyLinePath}
                    fill="none"
                    stroke="#10b981"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.4"
                    className="transition-all duration-500 ease-out"
                  />
                )}
              </>
            )}

            {/* 3. Pricing/Shortage mode rendering */}
            {minimapShadingMode === "shortage" && pricingChart && (
              <>
                <path
                  d={pricingChart.areaPath}
                  fill="url(#pricingCurveFill)"
                  className="transition-all duration-500 ease-out"
                />
                <path
                  d={pricingChart.linePath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                  className="transition-all duration-500 ease-out"
                />
              </>
            )}

            {/* 현재 시간대 수직선 + 점 */}
            {(() => {
              const clampedHour = Math.max(0, Math.min(23, currentHour));
              const graphWidth = activeChart.width - activeChart.paddingLeft - 12;
              const cx = activeChart.paddingLeft + (clampedHour / 23) * graphWidth;
              const topY = activeChart.yTicks[activeChart.yTicks.length - 1]?.y ?? 0;
              return (
                <g>
                  <line
                    x1={cx} y1={topY}
                    x2={cx} y2={activeChart.baseY}
                    stroke="rgba(251,191,36,0.5)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={cx - 10} y={activeChart.baseY + 5}
                    width={20} height={12} rx={3}
                    fill="rgba(251,191,36,0.18)"
                  />
                  <text
                    x={cx} y={activeChart.baseY + 14}
                    textAnchor="middle"
                    fill="#fbbf24" fontSize="8" fontWeight="700"
                  >
                    {clampedHour}
                  </text>
                </g>
              );
            })()}
            {/* 마우스 호버 시간대 가이드 라인 */}
            {hoveredHour !== null && hoveredHour !== currentHour && (() => {
              const graphWidth = activeChart.width - activeChart.paddingLeft - 12;
              const hx = activeChart.paddingLeft + (hoveredHour / 23) * graphWidth;
              const topY = activeChart.yTicks[activeChart.yTicks.length - 1]?.y ?? 0;
              return (
                <g className="pointer-events-none">
                  <line
                    x1={hx} y1={topY}
                    x2={hx} y2={activeChart.baseY}
                    stroke="rgba(34,211,238,0.4)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={hx - 10} y={activeChart.baseY + 5}
                    width={20} height={12} rx={3}
                    fill="rgba(34,211,238,0.18)"
                  />
                  <text
                    x={hx} y={activeChart.baseY + 14}
                    textAnchor="middle"
                    fill="#22d3ee" fontSize="8" fontWeight="700"
                  >
                    {hoveredHour}
                  </text>
                </g>
              );
            })()}
          </svg>
        ) : (
          <div className="flex h-[164px] items-center justify-center px-5 text-center text-xs leading-5 text-slate-500">
            데이터가 수신되면 선택한 행정동의 시간대별 그래프가 표시됩니다.
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {minimapShadingMode === "demand" && (
            <>
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
              {demandChart.missingDemandHours.length ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full border border-slate-400 bg-[#07111c]" />
                  미수신 시간
                </span>
              ) : null}
            </>
          )}
          {minimapShadingMode === "supply" && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full bg-cyan-300 opacity-40" />
                수요 기준선
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full bg-emerald-400" />
                예측 공급량
              </span>
            </>
          )}
          {minimapShadingMode === "shortage" && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full bg-amber-500" />
                추천 기사 인센티브
              </span>
            </>
          )}
        </div>
        <span className="tabular-nums">
          {minimapShadingMode === "demand" && (
            hasDemandData
              ? `평균 ${selectedAverageDemand.toLocaleString("ko-KR")}건/h${missingDemandHoursText ? ` · ${missingDemandHoursText}` : ""}`
              : "데이터 수신 대기 중"
          )}
          {minimapShadingMode === "supply" && (
            demandChart.hasSupplyData
              ? `평균 ${selectedAverageSupply.toLocaleString("ko-KR")}대`
              : "공급 데이터 수신 대기 중"
          )}
          {minimapShadingMode === "shortage" && (
            pricingChart
              ? `최대 ${pricingChart.peakPoint.suggestedDriverIncentiveKrw.toLocaleString("ko-KR")}원`
              : "인센티브 데이터 수신 대기 중"
          )}
        </span>
      </div>
    </>
  );
}
