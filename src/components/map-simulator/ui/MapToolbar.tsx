import type { Dispatch, SetStateAction } from "react";
import { Minimize2, Maximize2, Gauge, Menu, X, Sparkles } from "lucide-react";
import { sceneStore, sceneSetters } from "@/components/map-simulator/simulator-stores";

export function mapToolButtonClass(active: boolean) {
  return `inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/45 ${
    active
      ? "border-cyan-300/45 bg-cyan-300/20 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.14)]"
      : "border-white/14 bg-slate-950/92 text-slate-300 hover:border-white/24 hover:bg-slate-900/95 hover:text-white"
  }`;
}

type MapToolbarProps = {
  floatingControlOffsetClass: string;
  isMapFocusMode: boolean;
  toggleMapFocusMode: () => void;
  showFps: boolean;
  setShowFps: Dispatch<SetStateAction<boolean>>;
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
};

export function MapToolbar({
  floatingControlOffsetClass,
  isMapFocusMode,
  toggleMapFocusMode,
  showFps,
  setShowFps,
  isSidebarVisible,
  toggleSidebar,
}: MapToolbarProps) {
  const graphicsQuality = sceneStore.useStore((state) => state.graphicsQuality);
  const { setGraphicsQuality } = sceneSetters;
  const isQualityMode = graphicsQuality === "quality";

  return (
    <>
      <div
        data-ui-panel="map-toolbar"
        className={`absolute bottom-4 z-20 hidden items-center gap-2 rounded-2xl border border-white/14 bg-slate-950/92 p-2 text-white shadow-2xl shadow-black/30 backdrop-blur-md transition-[right] duration-300 lg:flex ${floatingControlOffsetClass}`}
      >
        <button
          type="button"
          data-ui-control="map-focus-toggle"
          aria-label={isMapFocusMode ? "지도 집중 모드 해제" : "지도 집중 모드"}
          aria-pressed={isMapFocusMode}
          title={isMapFocusMode ? "지도 집중 모드 해제" : "지도 집중 모드"}
          onClick={toggleMapFocusMode}
          className={mapToolButtonClass(isMapFocusMode)}
        >
          {isMapFocusMode ? (
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{isMapFocusMode ? "해제" : "집중"}</span>
        </button>

        <button
          type="button"
          data-ui-control="render-diagnostics-toggle"
          aria-label={showFps ? "렌더 상태 숨기기" : "렌더 상태 보기"}
          aria-pressed={showFps}
          title={showFps ? "렌더 상태 숨기기" : "렌더 상태 보기"}
          onClick={() => setShowFps((current) => !current)}
          className={mapToolButtonClass(showFps)}
        >
          <Gauge className="h-4 w-4" aria-hidden="true" />
          <span>FPS</span>
        </button>

        <button
          type="button"
          data-ui-control="graphics-quality-toggle"
          aria-label={isQualityMode ? "고품질 모드 해제" : "고품질 모드 적용"}
          aria-pressed={isQualityMode}
          title={isQualityMode ? "성능 우선 모드로 변경" : "품질 우선 모드로 변경"}
          onClick={() => setGraphicsQuality(isQualityMode ? "performance" : "quality")}
          className={mapToolButtonClass(isQualityMode)}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>{isQualityMode ? "고품질" : "성능"}</span>
        </button>
      </div>

      <div
        data-ui-panel="mobile-map-toolbar"
        className={`absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-2xl border border-white/14 bg-slate-950/95 p-2 text-white shadow-2xl shadow-black/30 backdrop-blur-md lg:hidden ${
          isSidebarVisible ? "z-30" : "z-20"
        }`}
      >
        <button
          type="button"
          data-ui-control="mobile-map-focus-toggle"
          aria-label={isMapFocusMode ? "지도 집중 모드 해제" : "지도 집중 모드"}
          aria-pressed={isMapFocusMode}
          onClick={toggleMapFocusMode}
          className={`${mapToolButtonClass(isMapFocusMode)} flex-1 justify-center`}
        >
          {isMapFocusMode ? (
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{isMapFocusMode ? "해제" : "집중"}</span>
        </button>

        <button
          type="button"
          data-ui-control="mobile-sidebar-toggle"
          aria-label={isSidebarVisible ? "정보 패널 닫기" : "정보 패널 열기"}
          aria-expanded={isSidebarVisible}
          onClick={toggleSidebar}
          className={`${mapToolButtonClass(false)} flex-1 justify-center`}
        >
          {isSidebarVisible ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{isSidebarVisible ? "닫기" : "정보"}</span>
        </button>
      </div>
    </>
  );
}
