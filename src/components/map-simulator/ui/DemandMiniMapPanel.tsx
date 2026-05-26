import type {
  DemandMiniMapData,
  MapPoiFeatureRow,
} from "@/components/map-simulator/demand-types";
import {
  PANEL_ACCENT_CARD_CLASS,
  PANEL_SECTION_LABEL_CLASS,
} from "@/components/map-simulator/panel-classes";
import { DemandMiniMapSvg } from "@/components/map-simulator/ui/DemandMiniMapSvg";

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
          <div className={PANEL_SECTION_LABEL_CLASS}>수요 현황 지도</div>
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
          <DemandMiniMapSvg
            demandMiniMap={demandMiniMap}
            onPoiSelect={onPoiSelect}
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
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>매우 낮음</span>
          <span>낮음</span>
          <span>중간</span>
          <span>높음</span>
          <span>매우 높음</span>
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
