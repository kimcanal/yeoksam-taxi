import Link from "next/link";
import { Gauge, Home } from "lucide-react";
import type { ReactNode } from "react";

type AppChromeProps = {
  children: ReactNode;
  showFooter?: boolean;
};

export function AppChrome({ children, showFooter = true }: AppChromeProps) {
  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-[#060d16]">
      <header className="hidden border-b border-white/10 bg-slate-950/80 backdrop-blur-xl shrink-0 sm:block">
        <div className="mx-auto flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/?mode=live"
              className="flex min-w-0 items-center gap-3 text-slate-100 transition hover:text-cyan-400"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#082f49,#0f766e)] text-[11px] font-bold tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(8,47,73,0.28)]">
                YT
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-tight">
                  강남·역삼 택시 디지털 트윈
                </span>
                <span className="hidden text-[9px] uppercase tracking-[0.18em] text-slate-500 sm:block">
                  Digital Twin Sandbox
                </span>
              </span>
            </Link>
            <span className="hidden rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-400 lg:inline-flex">
              OSM Spatial Layer
            </span>
          </div>

          <nav
            aria-label="주요 화면"
            className="hidden shrink-0 items-center gap-1 md:flex"
          >
            <Link
              href="/?mode=live"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/40 px-3 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              <span>홈</span>
            </Link>
            <Link
              href="/r3f-perf-test"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/40 px-3 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              <span>퍼포먼스</span>
            </Link>
          </nav>
        </div>
      </header>

      <div className="min-h-0 flex-1 relative w-full h-full">{children}</div>

      {showFooter ? (
        <footer className="hidden border-t border-white/10 bg-slate-950/80 backdrop-blur-xl shrink-0 sm:block">
          <div className="mx-auto flex min-h-12 w-full flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px] text-slate-400 sm:px-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-slate-300">
                3D 공간 시뮬레이션
              </span>
              <span className="hidden h-3 w-px bg-white/10 sm:block" />
              <span>동별 수요 예측 시각화</span>
              <span className="hidden h-3 w-px bg-white/10 lg:block" />
              <span>OSM 도로망 기반 차량 주행 모사</span>
            </div>
            <span className="text-slate-500">
              강남·역삼 9개 행정동 OSM 레이어
            </span>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
