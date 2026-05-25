import {
  DEMAND_WEEKDAYS,
  TARGET_DONGS,
  type DemandWeekdayId,
} from "@/components/map-simulator/demand-types";

export type DemandControlsProps = {
  selectedDongName: string;
  setSelectedDongName: (dongName: string) => void;
  selectedWeekday: DemandWeekdayId;
  setSelectedWeekday: (weekday: DemandWeekdayId) => void;
};

export function DemandControls({
  selectedDongName,
  setSelectedDongName,
  selectedWeekday,
  setSelectedWeekday,
}: DemandControlsProps) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
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
      <label className="block text-[10px] text-slate-500">
        요일
        <select
          value={selectedWeekday}
          onChange={(event) =>
            setSelectedWeekday(event.target.value as DemandWeekdayId)
          }
          className="mt-1 w-full rounded-xl border border-white/12 bg-slate-900/88 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
          aria-label="수요 예측 요일"
        >
          {DEMAND_WEEKDAYS.map((weekday) => (
            <option key={weekday.id} value={weekday.id}>
              {weekday.label}요일
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
