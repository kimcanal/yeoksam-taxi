import { Search, X, Menu } from "lucide-react";
import { WEATHER_OPTIONS, type WeatherMode } from "@/components/map-simulator/simulation-environment";

const MAP_SCOPE_LABEL = "역삼동 주변 9개 동";

function parseTimeInput(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

type MapSearchControlProps = {
  isSidebarVisible: boolean;
  isScenarioControlsExpanded: boolean;
  toggleScenarioControls: () => void;
  formattedSimulationTime: string;
  formattedSimulationDate: string;
  hasDemandData: boolean;
  appliedTaxiCount: number;
  selectedWeather: { label: string; id: string };
  toggleSidebar: () => void;
  simulationDate: string;
  setCircumstanceMode: (mode: "live" | "specific") => void;
  setSimulationDate: (date: string) => void;
  setSimulationTimeMinutes: (minutes: number) => void;
  weatherMode: WeatherMode;
  setWeatherMode: (mode: WeatherMode) => void;
};

export function MapSearchControl({
  isSidebarVisible,
  isScenarioControlsExpanded,
  toggleScenarioControls,
  formattedSimulationTime,
  formattedSimulationDate,
  hasDemandData,
  appliedTaxiCount,
  selectedWeather,
  toggleSidebar,
  simulationDate,
  setCircumstanceMode,
  setSimulationDate,
  setSimulationTimeMinutes,
  weatherMode,
  setWeatherMode,
}: MapSearchControlProps) {
  return (
    <div
      data-ui-panel="map-search-control"
      className={`absolute left-3 right-3 top-3 z-30 max-w-[430px] lg:left-4 lg:right-auto ${
        isSidebarVisible ? "lg:max-w-[calc(62vw-2rem)]" : ""
      }`}
    >
      <div className="flex h-14 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.20)]">
        <button
          type="button"
          aria-label="지도 조건 열기"
          aria-expanded={isScenarioControlsExpanded}
          onClick={toggleScenarioControls}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
        >
          <Search className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-950">
              강남·역삼 디지털 트윈
            </span>
            <span className="block truncate text-[11px] text-slate-500">
              {MAP_SCOPE_LABEL} · {formattedSimulationTime} ·{" "}
              {hasDemandData
                ? `시뮬레이션 ${appliedTaxiCount}대`
                : selectedWeather.label}
            </span>
          </span>
        </button>



        <button
          type="button"
          data-ui-control="map-sidebar-toggle"
          aria-label={isSidebarVisible ? "정보 패널 닫기" : "정보 패널 열기"}
          aria-expanded={isSidebarVisible}
          onClick={toggleSidebar}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
        >
          {isSidebarVisible ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {isScenarioControlsExpanded ? (
        <div
          data-ui-panel="map-condition-drawer"
          className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-[0_12px_34px_rgba(15,23,42,0.18)]"
        >
          <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <div className="text-slate-500">날짜</div>
              <div className="mt-0.5 font-semibold text-slate-900">
                {formattedSimulationDate}
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <div className="text-slate-500">시간</div>
              <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
                {formattedSimulationTime}
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <div className="text-slate-500">날씨</div>
              <div className="mt-0.5 font-semibold text-slate-900">
                {selectedWeather.label}
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <div className="text-slate-500">데이터 소스</div>
              <div className="mt-0.5 font-semibold text-slate-900">
                시나리오 프리셋
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              날짜
              <input
                type="date"
                value={simulationDate}
                onChange={(event) => {
                  setCircumstanceMode("specific");
                  setSimulationDate(event.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-cyan-400"
                aria-label="지도 기준 날짜"
              />
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              시간
              <input
                type="time"
                step={300}
                value={formattedSimulationTime}
                onChange={(event) => {
                  const nextMinutes = parseTimeInput(event.target.value);
                  if (nextMinutes === null) {
                    return;
                  }
                  setCircumstanceMode("specific");
                  setSimulationTimeMinutes(nextMinutes);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-cyan-400"
                aria-label="지도 기준 시간"
              />
            </label>
          </div>

          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            날씨
            <select
              value={weatherMode}
              onChange={(event) => {
                setCircumstanceMode("specific");
                setWeatherMode(event.target.value as WeatherMode);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-cyan-400"
              aria-label="지도 날씨 조건"
            >
              {WEATHER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
