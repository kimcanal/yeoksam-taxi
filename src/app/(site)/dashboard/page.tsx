import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CloudSun,
  MapPinned,
  RadioTower,
  ShieldCheck,
  TimerReset,
  WalletCards,
} from "lucide-react";

export const metadata: Metadata = {
  title: "수요·공급 검증 대시보드",
};

const hourlyDemand = [
  420, 260, 180, 140, 190, 360, 920, 2340, 4860, 6120, 4380, 4520,
  5120, 5740, 6320, 7060, 8580, 12840, 18420, 16520, 11280, 7420, 5160, 3120,
];

const hourlySupply = [
  380, 240, 160, 130, 170, 310, 760, 1840, 3940, 5220, 4210, 4360,
  4620, 5040, 5480, 5860, 6420, 8120, 10260, 10540, 9320, 7060, 4880, 2960,
];

const dongRows = [
  { dong: "역삼1동", demand: 6617, supply: 1045, gap: 5572, tier: "HIGH" },
  { dong: "삼성2동", demand: 5380, supply: 2210, gap: 3170, tier: "HIGH" },
  { dong: "논현2동", demand: 4860, supply: 2490, gap: 2370, tier: "MID" },
  { dong: "대치4동", demand: 3510, supply: 1880, gap: 1630, tier: "MID" },
  { dong: "신사동", demand: 3180, supply: 2420, gap: 760, tier: "LOW" },
];

const endpoints = [
  { name: "/api/demand/dong-daily", latency: "0.004s", status: "200" },
  { name: "/api/supply/daily", latency: "0.11s", status: "200" },
  { name: "/api/gap/dong-hourly", latency: "0.10s", status: "200" },
  { name: "/api/pricing/dong-hourly", latency: "0.11s", status: "200" },
];

function maxValue(values: number[]) {
  return Math.max(...values);
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "cyan" | "emerald" | "amber" | "rose";
}) {
  const toneMap = {
    cyan: "border-cyan-300/25 bg-cyan-400/[0.07] text-cyan-200",
    emerald: "border-emerald-300/25 bg-emerald-400/[0.07] text-emerald-200",
    amber: "border-amber-300/25 bg-amber-400/[0.08] text-amber-200",
    rose: "border-rose-300/25 bg-rose-400/[0.08] text-rose-200",
  };

  return (
    <section className={`rounded-lg border p-4 ${toneMap[tone]}`}>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <strong className="mt-2 block text-2xl font-semibold text-slate-50">
        {value}
      </strong>
      <span className="mt-2 block text-xs text-slate-400">{sub}</span>
    </section>
  );
}

function LineChart() {
  const max = maxValue([...hourlyDemand, ...hourlySupply]);
  const points = hourlyDemand
    .map((value, index) => {
      const x = (index / 23) * 100;
      const y = 100 - (value / max) * 92;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const supplyPoints = hourlySupply
    .map((value, index) => {
      const x = (index / 23) * 100;
      const y = 100 - (value / max) * 92;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            24시간 수요·공급 비교
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            정적 데모 데이터 · 역삼1동 기준
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-5 rounded-full bg-cyan-300" />
            수요
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-5 rounded-full bg-emerald-300" />
            공급
          </span>
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="h-56 w-full overflow-hidden">
        {[16, 32, 48, 64, 80].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="rgba(148,163,184,0.16)"
            strokeWidth="0.35"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#67e8f9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={supplyPoints}
          fill="none"
          stroke="#6ee7b7"
          strokeDasharray="3 2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-3 grid grid-cols-6 text-center text-[11px] text-slate-500">
        <span>0시</span>
        <span>4시</span>
        <span>8시</span>
        <span>12시</span>
        <span>16시</span>
        <span>20시</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="h-full overflow-y-auto bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-7xl px-5 py-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Static Validation Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              수요·공급 API 검증 대시보드
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              실제 서버 대시보드 대신 프론트에서 재현한 정적 검증 화면입니다.
              API 호출 없이 모델 출력 형태, gap, pricing 결과를 확인합니다.
            </p>
          </div>
          <Link
            href="/?mode=live"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            3D 지도 보기
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            label="피크 수요"
            value="18,420/h"
            sub="18시 · 역삼1동"
            tone="cyan"
          />
          <StatCard
            label="공급 부족"
            value="8,160"
            sub="peak demand - supply"
            tone="rose"
          />
          <StatCard
            label="추천 인센티브"
            value="1.12x"
            sub="HIGH tier 적용"
            tone="amber"
          />
          <StatCard
            label="API 상태"
            value="4/4 OK"
            sub="정적 응답 스냅샷 기준"
            tone="emerald"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <LineChart />

          <section className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  행정동별 Gap 순위
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  수요 proxy - 공급 proxy
                </p>
              </div>
              <MapPinned className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="mt-4 space-y-2">
              {dongRows.map((row) => (
                <div
                  key={row.dong}
                  className="grid grid-cols-[72px_1fr_52px] items-center gap-3 rounded-md border border-white/8 bg-white/[0.035] px-3 py-2"
                >
                  <span className="text-xs font-semibold text-slate-200">
                    {row.dong}
                  </span>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-cyan-300"
                      style={{ width: `${Math.max(10, row.gap / 60)}%` }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold text-amber-200">
                    {row.tier}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <RadioTower className="h-4 w-4 text-cyan-300" />
              API 응답 스냅샷
            </h2>
            <div className="mt-4 space-y-2">
              {endpoints.map((endpoint) => (
                <div
                  key={endpoint.name}
                  className="flex items-center justify-between rounded-md bg-white/[0.035] px-3 py-2"
                >
                  <span className="text-xs text-slate-300">{endpoint.name}</span>
                  <span className="text-xs text-emerald-200">
                    {endpoint.status} · {endpoint.latency}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <WalletCards className="h-4 w-4 text-amber-300" />
              인센티브 해석
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p className="flex items-center justify-between">
                적용 전 부족량
                <span className="font-semibold text-rose-200">8,160</span>
              </p>
              <p className="flex items-center justify-between">
                예상 공급 증가
                <span className="font-semibold text-emerald-200">+183대</span>
              </p>
              <p className="flex items-center justify-between">
                잔여 부족량
                <span className="font-semibold text-amber-200">7,977</span>
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              검증 메모
            </h2>
            <div className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
              <p className="flex gap-2">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                수요·공급 수치는 실데이터 원천 호출이 아닌 proxy 기반 분석값입니다.
              </p>
              <p className="flex gap-2">
                <CloudSun className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                시간, 요일, 날씨 조건 변화에 따른 시나리오 검증 화면입니다.
              </p>
              <p className="flex gap-2">
                <TimerReset className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                startup warmup 이후 반복 조회 지연을 줄이는 구조를 전제로 합니다.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ArrowUpRight className="h-4 w-4 text-emerald-300" />
              높은 수요 신호
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              18-21시 구간에서 수요 곡선이 급증하며 역삼1동과 삼성2동의
              gap이 크게 확대됩니다. 운영자는 이 구간을 인센티브 발동 후보로
              해석할 수 있습니다.
            </p>
          </section>
          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ArrowDownRight className="h-4 w-4 text-rose-300" />
              한계와 범위
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              이 페이지는 제출용 정적 대시보드입니다. 실제 플랫폼 호출 로그,
              택시 GPS, 운영 배차 결과를 포함하지 않고 프론트 시연과 보고서
              설명을 보조합니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
