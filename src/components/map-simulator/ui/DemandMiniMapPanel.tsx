import type { CircumstanceMode } from "@/components/map-simulator/types";
import type {
  DemandFetchStatus,
  DemandMiniMapData,
  MapPoiFeatureRow,
} from "@/components/map-simulator/demand";
import {
  PANEL_ACCENT_CARD_CLASS,
  PANEL_SECTION_LABEL_CLASS,
} from "@/components/map-simulator/panel-classes";
import { DemandMiniMapSvg } from "@/components/map-simulator/ui/DemandMiniMapSvg";

type DemandMiniMapPanelProps = {
  demandMiniMap: DemandMiniMapData | null;
  heatmapFetchStatus: DemandFetchStatus;
  heatmapHour: number;
  heatmapMaxDemand: number;
  selectedDongName: string;
  setHeatmapHour: (hour: number) => void;
  mapPoiFeatureRows: MapPoiFeatureRow[];
  onPoiSelect: (poiCode: string) => void;
  onDongSelect?: (dongName: string) => void;
  circumstanceMode: CircumstanceMode;
  minimapShadingMode: "demand" | "supply" | "shortage";
  setMinimapShadingMode: (mode: "demand" | "supply" | "shortage") => void;
};

function formatMiniMapMetricValue(
  value: number,
  mode: DemandMiniMapPanelProps["minimapShadingMode"],
) {
  const formattedValue = Math.round(value).toLocaleString("ko-KR");
  if (mode === "demand") {
    return `${formattedValue}건/h`;
  }
  if (mode === "shortage") {
    return `${formattedValue}대 부족`;
  }
  return `${formattedValue}대`;
}

export function DemandMiniMapPanel({
  demandMiniMap,
  heatmapFetchStatus,
  heatmapHour,
  heatmapMaxDemand,
  selectedDongName,
  setHeatmapHour,
  mapPoiFeatureRows,
  onPoiSelect,
  onDongSelect,
  circumstanceMode,
  minimapShadingMode,
  setMinimapShadingMode,
}: DemandMiniMapPanelProps) {
  const activeHeatmapMaxValue = demandMiniMap
    ? Math.max(
        0,
        ...demandMiniMap.regions.flatMap((region) =>
          region.demandCount === null ? [] : [region.demandCount],
        ),
      )
    : heatmapMaxDemand;
  const heatmapStatusText =
    heatmapFetchStatus === "ready"
      ? `최대 ${formatMiniMapMetricValue(
          activeHeatmapMaxValue,
          minimapShadingMode,
        )}`
      : heatmapFetchStatus === "loading"
        ? "API 요청 중"
        : "API 오류";

  return (
    <div className={`mt-3 ${PANEL_ACCENT_CARD_CLASS} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={PANEL_SECTION_LABEL_CLASS}>수요·공급 현황 지도</div>
        </div>
        <div className="text-right text-[11px] text-slate-500">
          선택 동
          <div className="mt-0.5 font-medium text-slate-300">
            {selectedDongName}
          </div>
        </div>
      </div>

      {/* 쉐이딩 모드 토글러 */}
      <div className="mt-3 flex rounded-lg bg-slate-950/40 p-1 border border-white/5">
        {(["demand", "supply", "shortage"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setMinimapShadingMode(mode)}
            className={`flex-1 text-[10.5px] font-bold py-1.5 px-2 rounded-md transition-all duration-200 ${
              minimapShadingMode === mode
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm shadow-cyan-900/40"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            {mode === "demand" ? "수요" : mode === "supply" ? "공급" : "부족"}
          </button>
        ))}
      </div>

      {circumstanceMode === "live" ? (
        <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-3 py-3 shadow-inner shadow-cyan-950/40">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              실시간 동기화 상태
            </span>
            <span className="tabular-nums text-xs font-bold text-cyan-100 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/10">
              {String(heatmapHour).padStart(2, "0")}:00
            </span>
          </div>
          <div className="mt-2 text-[10.5px] leading-relaxed text-slate-400 font-medium">
            오늘 00시부터 현재 시각까지 실시간 데이터를 연동하여 지도를 자동으로 갱신하고 있습니다.
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-medium text-slate-500">
              히트맵 기준 시간
            </span>
            <span className="tabular-nums text-xs font-semibold text-cyan-100">
              {String(heatmapHour).padStart(2, "0")}:00
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={23}
            step={1}
            value={heatmapHour}
            onChange={(event) => setHeatmapHour(Number(event.target.value))}
            className="mt-2 h-1.5 w-full accent-cyan-400 cursor-pointer"
            aria-label="수요 히트맵 기준 시간"
          />
          <div className="mt-1 flex justify-between text-[9px] text-slate-500">
            <span>00시</span>
            <span>{heatmapStatusText}</span>
            <span>23시</span>
          </div>
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#08111d]">
        {demandMiniMap ? (
          <DemandMiniMapSvg
            demandMiniMap={demandMiniMap}
            onPoiSelect={onPoiSelect}
            onDongSelect={onDongSelect}
            minimapShadingMode={minimapShadingMode}
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-xs text-slate-400 font-medium animate-pulse">
            수요 지도 초기화 중…
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <div
          className="h-2 w-full rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgba(148,163,184,0.25), rgba(45,212,191,0.55), rgba(250,204,21,0.65), rgba(251,146,60,0.75), rgba(244,63,94,0.85))",
          }}
        />
        <div className="flex justify-between text-[9px] text-slate-500 font-semibold tracking-tight">
          <span>매우 낮음 (&lt;4%)</span>
          <span>낮음</span>
          <span>중간 (25%)</span>
          <span>높음</span>
          <span>매우 높음 (&gt;85%)</span>
        </div>
        <div className="text-[9px] text-slate-500 mt-1 font-medium text-right leading-none select-none">
          {minimapShadingMode === "demand" && "※ 구역별 일일 최대 예측 수요 대비 비율 기준"}
          {minimapShadingMode === "supply" && "※ 구역별 일일 최대 예측 공급 대비 비율 기준"}
          {minimapShadingMode === "shortage" && "※ 구역별 예측 수요 대비 부족분 비율 기준"}
        </div>
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
