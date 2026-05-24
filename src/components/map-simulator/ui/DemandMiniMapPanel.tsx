import type {
  DemandMiniMapData,
  MapPoiFeatureRow,
} from "@/components/map-simulator/demand-types";
import {
  demandFillForScore,
  demandStrokeForScore,
} from "@/components/map-simulator/demand-utils";
import {
  PANEL_ACCENT_CARD_CLASS,
  PANEL_SECTION_LABEL_CLASS,
} from "@/components/map-simulator/panel-classes";

type DemandMiniMapPanelProps = {
  demandMiniMap: DemandMiniMapData | null;
  selectedDongName: string;
  mapPoiFeatureRows: MapPoiFeatureRow[];
  onPoiSelect: (poiCode: string) => void;
};

export function DemandMiniMapPanel({
  demandMiniMap,
  selectedDongName,
  mapPoiFeatureRows,
  onPoiSelect,
}: DemandMiniMapPanelProps) {
  return (
    <div className={`mt-3 ${PANEL_ACCENT_CARD_CLASS} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={PANEL_SECTION_LABEL_CLASS}>미니맵</div>
        </div>
        <div className="text-right text-[11px] text-slate-500">
          선택 동
          <div className="mt-0.5 font-medium text-slate-300">
            {selectedDongName}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#08111d]">
        {demandMiniMap ? (
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label="역삼동 주변 9개 동 수요 표시 지도"
            className="block aspect-square w-full"
          >
            <defs>
              <radialGradient id="demandFocusGlow">
                <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                <stop offset="50%" stopColor="rgba(34,211,238,0.35)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="100" height="100" fill="#07111c" />
            {demandMiniMap.regions.map((region) => (
              <g key={`${region.name}-shape`}>
                <path
                  d={region.path}
                  fill={demandFillForScore(region.score, region.isSelected)}
                  stroke={demandStrokeForScore(region.score, region.isSelected)}
                  strokeWidth={
                    region.isSelected
                      ? 1.25
                      : region.score !== null && region.score >= 0.55
                        ? 0.7
                        : 0.42
                  }
                />
                <title>
                  {region.score === null
                    ? `${region.name} 수요 데이터 없음`
                    : `${region.name} 수요 ${Math.round(region.score * 100)}`}
                </title>
              </g>
            ))}
            {demandMiniMap.focus ? (
              <g>
                <circle
                  cx={demandMiniMap.focus.x}
                  cy={demandMiniMap.focus.y}
                  r="7"
                  fill="url(#demandFocusGlow)"
                />
                {demandMiniMap.focusHeading ? (
                  <line
                    x1={demandMiniMap.focusHeading.x1}
                    y1={demandMiniMap.focusHeading.y1}
                    x2={demandMiniMap.focusHeading.x2}
                    y2={demandMiniMap.focusHeading.y2}
                    stroke="#e0f2fe"
                    strokeWidth="0.62"
                    strokeLinecap="round"
                    opacity="0.78"
                  />
                ) : null}
                <circle
                  cx={demandMiniMap.focus.x}
                  cy={demandMiniMap.focus.y}
                  r="1.8"
                  fill="#e0f2fe"
                  stroke="#22d3ee"
                  strokeWidth="0.5"
                />
              </g>
            ) : null}
            {demandMiniMap.regions.map((region) => (
              <g key={`${region.name}-label`} pointerEvents="none">
                <text
                  x={region.labelX}
                  y={region.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={region.isSelected ? "#f8fafc" : "#dbeafe"}
                  fontSize={region.isSelected ? 3.6 : 3.2}
                  fontWeight={region.isSelected ? 700 : 600}
                  paintOrder="stroke"
                  stroke="rgba(7, 17, 28, 0.82)"
                  strokeWidth="0.72"
                  strokeLinejoin="round"
                >
                  {region.name}
                </text>
              </g>
            ))}
            {demandMiniMap.pois.map((poi) => (
              <g
                key={poi.code}
                role="button"
                tabIndex={0}
                aria-label={`${poi.name} POI 선택`}
                className="cursor-pointer outline-none"
                onClick={() => onPoiSelect(poi.code)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPoiSelect(poi.code);
                  }
                }}
              >
                <circle
                  cx={poi.x}
                  cy={poi.y}
                  r={poi.isSelected ? "4.2" : "2.7"}
                  fill="rgba(7, 17, 28, 0.68)"
                  stroke={poi.isSelected ? "#f8fafc" : "#67e8f9"}
                  strokeWidth={poi.isSelected ? "0.7" : "0.46"}
                >
                  <title>{poi.name} 관심 지점</title>
                </circle>
                <circle
                  cx={poi.x}
                  cy={poi.y}
                  r={poi.isSelected ? "1.95" : "1.5"}
                  fill={poi.isSelected ? "#f8fafc" : "#67e8f9"}
                  stroke="rgba(7, 17, 28, 0.82)"
                  strokeWidth="0.35"
                />
                {poi.isSelected || poi.contextScore >= 0.56 ? (
                  <text
                    x={poi.labelX}
                    y={poi.labelY}
                    textAnchor={poi.textAnchor}
                    fill={poi.isSelected ? "#f8fafc" : "#cffafe"}
                    fontSize={poi.isSelected ? "2.45" : "2.05"}
                    fontWeight={poi.isSelected ? "800" : "650"}
                    paintOrder="stroke"
                    stroke="rgba(7, 17, 28, 0.92)"
                    strokeWidth={poi.isSelected ? "0.66" : "0.5"}
                    pointerEvents="none"
                  >
                    {poi.label}
                  </text>
                ) : null}
              </g>
            ))}
            {demandMiniMap.landmarks.map((landmark) => (
              <g key={landmark.name} opacity={landmark.isPrimary ? 1 : 0.78}>
                <circle
                  cx={landmark.x}
                  cy={landmark.y}
                  r={landmark.isPrimary ? "1.45" : "1.05"}
                  fill={landmark.isPrimary ? "#67e8f9" : "#bae6fd"}
                  stroke="#082f49"
                  strokeWidth={landmark.isPrimary ? "0.45" : "0.34"}
                >
                  <title>{landmark.name}</title>
                </circle>
                <text
                  x={landmark.labelX}
                  y={landmark.labelY}
                  textAnchor={landmark.textAnchor}
                  fill={landmark.isPrimary ? "#cffafe" : "#e0f2fe"}
                  fontSize={landmark.isPrimary ? "2.55" : "2.1"}
                  fontWeight={landmark.isPrimary ? "700" : "600"}
                  paintOrder="stroke"
                  stroke="rgba(7, 17, 28, 0.9)"
                  strokeWidth={landmark.isPrimary ? "0.55" : "0.48"}
                  pointerEvents="none"
                >
                  {landmark.label}
                </text>
              </g>
            ))}
          </svg>
        ) : (
          <div className="flex aspect-square items-center justify-center text-xs text-slate-400 font-medium animate-pulse">
            수요 지도 맵 레이어 초기화 중...
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["매우 낮음", "bg-slate-400/20"],
          ["낮음", "bg-teal-300/35"],
          ["중간", "bg-yellow-300/55"],
          ["높음", "bg-orange-400/65"],
          ["매우 높음", "bg-rose-500/75"],
        ].map(([label, colorClass]) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-white/50 bg-cyan-300" />
          관심 지점
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-white bg-transparent" />
          선택 동
        </span>
        <span>POI {mapPoiFeatureRows.length}개</span>
      </div>
    </div>
  );
}
