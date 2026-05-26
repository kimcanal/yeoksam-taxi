import { useId } from "react";
import {
  DEMAND_MINI_MAP_VIEWBOX_SIZE,
  DEMAND_SCORE_THRESHOLDS,
} from "@/components/map-simulator/constants/demand-constants";
import type {
  DemandMiniMapData,
  DemandMiniMapLandmark,
  DemandMiniMapPoi,
  DemandMiniMapRegion,
} from "@/components/map-simulator/demand-types";
import {
  demandFillForScore,
  demandStrokeForScore,
} from "@/components/map-simulator/demand-style";

type DemandMiniMapSvgProps = {
  demandMiniMap: DemandMiniMapData;
  onPoiSelect: (poiCode: string) => void;
};

function focusHeadingAngle(demandMiniMap: DemandMiniMapData) {
  if (!demandMiniMap.focusHeading) {
    return 0;
  }
  const { x1, y1, x2, y2 } = demandMiniMap.focusHeading;
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

function MiniMapDefs({
  fovGradientId,
  glowFilterId,
}: {
  fovGradientId: string;
  glowFilterId: string;
}) {
  return (
    <defs>
      <linearGradient id={fovGradientId} x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
        <stop offset="100%" stopColor="rgba(34,211,238,0)" />
      </linearGradient>
      <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}

function MiniMapCompass() {
  return (
    <g className="pointer-events-none select-none">
      <text
        x="50"
        y="5.5"
        textAnchor="middle"
        fill="#475569"
        fontSize="3.5"
        fontWeight="700"
        letterSpacing="0.05em"
      >
        N
      </text>
      <text
        x="50"
        y="97.5"
        textAnchor="middle"
        fill="#475569"
        fontSize="3.5"
        fontWeight="700"
        letterSpacing="0.05em"
      >
        S
      </text>
      <text
        x="97"
        y="51.2"
        textAnchor="middle"
        fill="#475569"
        fontSize="3.5"
        fontWeight="700"
        letterSpacing="0.05em"
      >
        E
      </text>
      <text
        x="3"
        y="51.2"
        textAnchor="middle"
        fill="#475569"
        fontSize="3.5"
        fontWeight="700"
        letterSpacing="0.05em"
      >
        W
      </text>

      <line x1="50" y1="8" x2="50" y2="11.5" stroke="#1e293b" strokeWidth="0.5" />
      <line x1="50" y1="88.5" x2="50" y2="92" stroke="#1e293b" strokeWidth="0.5" />
      <line x1="88.5" y1="50" x2="92" y2="50" stroke="#1e293b" strokeWidth="0.5" />
      <line x1="8" y1="50" x2="11.5" y2="50" stroke="#1e293b" strokeWidth="0.5" />
    </g>
  );
}

function regionStrokeWidth(region: DemandMiniMapRegion) {
  if (region.isSelected) {
    return 1.25;
  }
  return region.score !== null && region.score >= DEMAND_SCORE_THRESHOLDS.high
    ? 0.7
    : 0.42;
}

function MiniMapRegions({ regions }: { regions: DemandMiniMapRegion[] }) {
  return (
    <>
      {regions.map((region) => (
        <g key={`${region.name}-shape`}>
          <path
            d={region.path}
            fill={demandFillForScore(region.score, region.isSelected)}
            stroke={demandStrokeForScore(region.score, region.isSelected)}
            strokeWidth={regionStrokeWidth(region)}
          />
          <title>
            {region.score === null
              ? `${region.name} 수요 데이터 없음`
              : `${region.name} 수요 ${Math.round(region.score * 100)}`}
          </title>
        </g>
      ))}
    </>
  );
}

function MiniMapFocus({
  demandMiniMap,
  fovGradientId,
  glowFilterId,
}: {
  demandMiniMap: DemandMiniMapData;
  fovGradientId: string;
  glowFilterId: string;
}) {
  if (!demandMiniMap.focus) {
    return null;
  }

  if (!demandMiniMap.focusHeading) {
    return (
      <circle
        cx={demandMiniMap.focus.x}
        cy={demandMiniMap.focus.y}
        r="1.8"
        fill="#e0f2fe"
        stroke="#22d3ee"
        strokeWidth="0.5"
        filter={`url(#${glowFilterId})`}
      />
    );
  }

  return (
    <g
      transform={`translate(${demandMiniMap.focus.x}, ${demandMiniMap.focus.y}) rotate(${focusHeadingAngle(demandMiniMap) + 90})`}
    >
      <path
        d="M 0 0 L 14 -22 A 26 26 0 0 1 -14 -22 Z"
        fill={`url(#${fovGradientId})`}
      />
      <path
        d="M 0 -3.5 L 2.5 2.5 L 0 1 L -2.5 2.5 Z"
        fill="#ffffff"
        stroke="#06b6d4"
        strokeWidth="0.6"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
      />
    </g>
  );
}

function MiniMapRegionLabels({ regions }: { regions: DemandMiniMapRegion[] }) {
  return (
    <>
      {regions.map((region) => (
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
    </>
  );
}

function MiniMapPoiMarker({
  onPoiSelect,
  poi,
}: {
  onPoiSelect: (poiCode: string) => void;
  poi: DemandMiniMapPoi;
}) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${poi.name} 선택`}
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
      {poi.isSelected || poi.contextScore >= DEMAND_SCORE_THRESHOLDS.high ? (
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
  );
}

function MiniMapPois({
  onPoiSelect,
  pois,
}: {
  onPoiSelect: (poiCode: string) => void;
  pois: DemandMiniMapPoi[];
}) {
  return (
    <>
      {pois.map((poi) => (
        <MiniMapPoiMarker key={poi.code} poi={poi} onPoiSelect={onPoiSelect} />
      ))}
    </>
  );
}

function MiniMapLandmark({ landmark }: { landmark: DemandMiniMapLandmark }) {
  return (
    <g opacity={landmark.isPrimary ? 1 : 0.78}>
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
  );
}

function MiniMapLandmarks({
  landmarks,
}: {
  landmarks: DemandMiniMapLandmark[];
}) {
  return (
    <>
      {landmarks.map((landmark) => (
        <MiniMapLandmark key={landmark.name} landmark={landmark} />
      ))}
    </>
  );
}

export function DemandMiniMapSvg({
  demandMiniMap,
  onPoiSelect,
}: DemandMiniMapSvgProps) {
  const idPrefix = useId().replace(/:/g, "-");
  const fovGradientId = `${idPrefix}-fov`;
  const glowFilterId = `${idPrefix}-glow`;

  return (
    <svg
      viewBox={`0 0 ${DEMAND_MINI_MAP_VIEWBOX_SIZE} ${DEMAND_MINI_MAP_VIEWBOX_SIZE}`}
      role="img"
      aria-label="역삼동 주변 9개 동 수요 표시 지도"
      className="block aspect-square w-full"
    >
      <MiniMapDefs fovGradientId={fovGradientId} glowFilterId={glowFilterId} />
      <rect
        x="0"
        y="0"
        width={DEMAND_MINI_MAP_VIEWBOX_SIZE}
        height={DEMAND_MINI_MAP_VIEWBOX_SIZE}
        fill="#07111c"
      />
      <MiniMapCompass />
      <MiniMapRegions regions={demandMiniMap.regions} />
      <MiniMapFocus
        demandMiniMap={demandMiniMap}
        fovGradientId={fovGradientId}
        glowFilterId={glowFilterId}
      />
      <MiniMapRegionLabels regions={demandMiniMap.regions} />
      <MiniMapPois pois={demandMiniMap.pois} onPoiSelect={onPoiSelect} />
      <MiniMapLandmarks landmarks={demandMiniMap.landmarks} />
    </svg>
  );
}
