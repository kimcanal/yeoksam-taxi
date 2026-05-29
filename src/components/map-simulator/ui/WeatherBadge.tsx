import { Cloud, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react";
import { formatDateLabel } from "@/components/map-simulator/environment/environment-state";
import type {
  WeatherFetchStatus,
  WeatherObservation,
} from "@/components/map-simulator/environment/use-weather-forecast";

type WeatherBadgeProps = {
  weatherFetchStatus: WeatherFetchStatus;
  weatherObservation: WeatherObservation | null;
  simulationDate: string;
};

function formatDateSlash(dateIso: string) {
  return formatDateLabel(dateIso).replaceAll(".", "/");
}

function formatTemperature(value: number | null) {
  return value === null ? "-" : `${value.toFixed(1)}°C`;
}

function formatPrecipitation(value: number | null) {
  return value === null ? "-" : `${value.toFixed(1)}mm`;
}

function WeatherModeIcon({
  mode,
}: {
  mode: WeatherObservation["weatherMode"] | null;
}) {
  const className = "h-3.5 w-3.5 text-cyan-200";
  if (mode === "heavy-rain") {
    return <CloudRain className={className} aria-hidden="true" />;
  }
  if (mode === "heavy-snow") {
    return <CloudSnow className={className} aria-hidden="true" />;
  }
  if (mode === "cloudy") {
    return <Cloud className={className} aria-hidden="true" />;
  }
  if (mode === "clear") {
    return <Sun className={className} aria-hidden="true" />;
  }
  return <CloudSun className={className} aria-hidden="true" />;
}

export function WeatherBadge({
  weatherFetchStatus,
  weatherObservation,
  simulationDate,
}: WeatherBadgeProps) {
  const dateLabel = formatDateSlash(weatherObservation?.date ?? simulationDate);
  const hourLabel =
    weatherObservation && Number.isInteger(weatherObservation.hour)
      ? `${String(weatherObservation.hour).padStart(2, "0")}시`
      : "기준";
  const statusLabel =
    weatherFetchStatus === "ready"
      ? hourLabel
      : weatherFetchStatus === "loading"
        ? "동기화 중"
        : weatherFetchStatus === "idle"
          ? "대기"
          : "API 오류";

  return (
    <aside
      data-ui-panel="weather-badge"
      className="pointer-events-none absolute bottom-3 right-3 z-20 hidden min-w-[148px] rounded-2xl border border-white/14 bg-slate-950/90 px-3 py-2 text-[10px] font-medium text-slate-300 shadow-2xl shadow-black/25 backdrop-blur-md sm:block"
      aria-label="현재 지도 정보"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-100">
          <WeatherModeIcon mode={weatherObservation?.weatherMode ?? null} />
          지도 정보
        </span>
        <span className="text-[9px] text-slate-500">{statusLabel}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-[auto_auto] gap-x-3 gap-y-1 tabular-nums">
        <span className="text-slate-500">날짜</span>
        <span className="text-right text-slate-100">{dateLabel}</span>
        <span className="text-slate-500">날씨</span>
        <span className="flex justify-end">
          <WeatherModeIcon mode={weatherObservation?.weatherMode ?? null} />
        </span>
        <span className="text-slate-500">기온</span>
        <span className="text-right text-slate-100">
          {formatTemperature(weatherObservation?.temperatureC ?? null)}
        </span>
        <span className="text-slate-500">강수량</span>
        <span className="text-right text-slate-100">
          {formatPrecipitation(weatherObservation?.precipitationMm ?? null)}
        </span>
      </div>
    </aside>
  );
}
