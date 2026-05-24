import { ChangeEvent } from "react";
import { SlidersVertical, RotateCw } from "lucide-react";

type CameraOrbitControlsProps = {
  isSidebarVisible: boolean;
  floatingControlOffsetClass: string;
  pitchControlValue: number;
  handlePitchControlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  yawControlValue: number;
  handleYawControlChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function CameraOrbitControls({
  isSidebarVisible,
  floatingControlOffsetClass,
  pitchControlValue,
  handlePitchControlChange,
  yawControlValue,
  handleYawControlChange,
}: CameraOrbitControlsProps) {
  return (
    <div
      data-ui-control="camera-orbit-controls"
      className={`absolute right-3 top-24 z-20 flex w-[156px] items-center gap-3 rounded-2xl border border-white/14 bg-slate-950/92 px-3 py-3 text-cyan-100 shadow-2xl shadow-black/30 backdrop-blur-md transition-[right] duration-300 ${
        isSidebarVisible ? "hidden lg:flex" : "flex"
      } ${floatingControlOffsetClass}`}
    >
      <div className="flex h-36 w-8 flex-col items-center justify-between">
        <SlidersVertical className="h-4 w-4" aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pitchControlValue}
          onChange={handlePitchControlChange}
          aria-label="3D 지도 상하 기울기"
          className="h-24 w-5 cursor-pointer accent-cyan-300"
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <RotateCw className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-semibold tabular-nums text-slate-300">
            {yawControlValue}°
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={359}
          step={1}
          value={yawControlValue}
          onChange={handleYawControlChange}
          aria-label="3D 지도 좌우 회전"
          className="w-full cursor-pointer accent-cyan-300"
        />
        <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500">
          <span>좌</span>
          <span>우</span>
        </div>
      </div>
    </div>
  );
}
