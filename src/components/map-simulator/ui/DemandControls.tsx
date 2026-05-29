import { TARGET_DONGS } from "@/components/map-simulator/demand";

export type DemandControlsProps = {
  selectedDongName: string;
  setSelectedDongName: (dongName: string) => void;
};

export function DemandControls({
  selectedDongName,
  setSelectedDongName,
}: DemandControlsProps) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2">
      <label className="block text-[10px] text-slate-500">
        행정동
        <select
          value={selectedDongName}
          onChange={(event) => setSelectedDongName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/12 bg-slate-900/88 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
          aria-label="수요 예측 행정동"
        >
          {TARGET_DONGS.map((dongName) => (
            <option key={dongName} value={dongName}>
              {dongName}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
