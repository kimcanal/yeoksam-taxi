import Link from "next/link";
import type { ReactNode } from "react";

type AppChromeProps = {
  children: ReactNode;
  showFooter?: boolean;
};

export function AppChrome({ children, showFooter = true }: AppChromeProps) {
  return (
    <>
      <header className="border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3 text-slate-950 transition hover:text-cyan-700"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#082f49,#0f766e)] text-[11px] font-bold tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(8,47,73,0.28)]">
                YT
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  강남·역삼권 택시 운영 시뮬레이터
                </span>
                <span className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:block">
                  Digital Twin Demo
                </span>
              </span>
            </Link>
            <span className="hidden rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-800 lg:inline-flex">
              Digital Twin Simulation
            </span>
          </div>

          <nav
            aria-label="주요 이동"
            className="hidden items-center gap-2 sm:flex"
          >
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
            >
              홈
            </Link>
            <Link
              href="/map"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
            >
              지도
            </Link>
          </nav>
        </div>
      </header>

      <div className="min-h-0 flex-1">{children}</div>

      {showFooter ? (
        <footer className="border-t border-slate-200/70 bg-white/92 backdrop-blur-xl">
          <div className="mx-auto flex min-h-12 w-full flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px] text-slate-600 sm:px-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-slate-800">
                실시간 디지털 트윈 모니터링
              </span>
              <span className="hidden h-3 w-px bg-slate-300 sm:block" />
              <span>인공지능 수요 예측 및 배차 최적화 분석</span>
              <span className="hidden h-3 w-px bg-slate-300 lg:block" />
              <span>역삼·강남 마이크로 그리드 기반 차량 제어 시뮬레이션</span>
            </div>
            <span className="text-slate-500">
              강남·역삼권 9개 동 정적 지도 자산
            </span>
          </div>
        </footer>
      ) : null}
    </>
  );
}
