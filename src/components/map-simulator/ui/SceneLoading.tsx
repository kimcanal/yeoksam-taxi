import { PANEL_TOKEN_CLASS } from "@/components/map-simulator/panel-classes";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";

type SceneLoadingProps = {
  statusLabel: string;
  loadingProgress: number;
  statusDetail: string;
  loadingHint: string;
  buildVersion: BuildVersionInfo;
};

export function SceneLoading({
  statusLabel,
  loadingProgress,
  statusDetail,
  loadingHint,
  buildVersion,
}: SceneLoadingProps) {
  return (
    <div
      data-ui-panel="scene-loading"
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/62 px-6 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-[420px] rounded-[24px] border border-white/16 bg-slate-950/95 p-5 text-white shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-white/15 border-t-cyan-400 animate-spin" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              강남·역삼 디지털 트윈
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-50">
              {statusLabel}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
            <span>초기화 진행 상태</span>
            <span className="tabular-nums text-cyan-100">
              {loadingProgress}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-cyan-400 transition-[width] duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-slate-100">{statusDetail}</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {loadingHint}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className={PANEL_TOKEN_CLASS}>
            실행 환경: {buildVersion.environmentLabel}
          </span>
          <span className={PANEL_TOKEN_CLASS}>
            버전: {buildVersion.branch}
          </span>
        </div>

        <div className="mt-4 text-xs leading-5 text-slate-500">
          초기 로딩 시 3D 맵 자산을 캐싱하는 과정이 수초 소요될 수 있습니다.
        </div>
      </div>
    </div>
  );
}
