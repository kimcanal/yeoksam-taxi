import dataSummary from "../../../public/data-summary.json";
import dispatchPlan from "../../../public/dispatch-plan.json";
import featureSnapshot from "../../../public/feature-snapshot.json";
import forecastLatest from "../../../public/forecast/latest.json";
import modelObservability from "../../../public/model-observability.json";
import modelSummary from "../../../public/model-summary.json";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "데이터 현황 | A-Eye",
};

type DataSummary = typeof dataSummary;
type DispatchPlan = typeof dispatchPlan;

function formatKst(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function populationLabel(place: DataSummary["citydata"]["places"][number]) {
  return `${place.population_min.toLocaleString("ko-KR")}~${place.population_max.toLocaleString("ko-KR")}`;
}

function actionTone(level: DispatchPlan["decisions"][number]["action_level"]) {
  if (level === "high") return "border-rose-400/50 bg-rose-500/15 text-rose-100";
  if (level === "medium") return "border-amber-300/50 bg-amber-400/15 text-amber-100";
  if (level === "watch") return "border-cyan-300/50 bg-cyan-400/15 text-cyan-100";
  return "border-slate-500/50 bg-slate-500/15 text-slate-200";
}

function scoreLabel(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(3) : "-";
}

function formatMetric(value: number | null | undefined, digits = 4) {
  return typeof value === "number" ? value.toFixed(digits) : "-";
}

function formatPct(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "-";
}

function modelNameLabel(name: string) {
  if (name === "full_observed") return "Full 모델";
  if (name === "live_compatible_calendar_weather_static") return "Live-compatible 모델";
  return name;
}

function modelInterpretation(model: (typeof modelSummary.models)[number]) {
  if ("uses" in model && Array.isArray(model.uses)) return model.uses.slice(0, 4).join(" · ");
  if ("caveat" in model) return model.caveat;
  return "-";
}

function featureLabel(feature: string) {
  const labels: Record<string, string> = {
    hour: "시간대",
    day_type: "평일/주말",
    subway_station_count: "지하철역 수",
    avg_building_height_m: "평균 건물 높이",
    building_footprint_area_m2: "건물 바닥면적",
    dong_area_m2: "동 면적",
    connector_road_length_m: "연결도로 길이",
    weekday: "요일",
    building_count: "건물 수",
    temperature_c: "기온",
  };
  return labels[feature] ?? feature;
}

function strategyLabel(strategy: string | null | undefined) {
  if (strategy === "exact") return "실측 feature";
  if (strategy === "pattern") return "패턴 추정";
  return strategy ?? "-";
}

export default function DataPage() {
  const places = dataSummary.citydata.places;
  const decisions = dispatchPlan.decisions.slice(0, 5);
  const featureRows = featureSnapshot.features.slice(0, 5);
  const forecast = forecastLatest;
  const models = modelSummary.models;
  const persistenceBaseline = modelSummary.baseline.persistence;
  const topImportance = modelObservability.feature_importance.top_features.slice(0, 10);
  const validation = modelObservability.live_validation;
  const validation2026 = modelObservability.observed_validation_2026;
  const validation2026Dongs = validation2026?.per_dong.slice(0, 9) ?? [];
  const topPopulation = dataSummary.citydata.top_population;
  const topDecision = dispatchPlan.decisions[0] ?? null;

  return (
    <main className="h-screen overflow-y-auto bg-[#0b1020] text-slate-100">
      <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0b1020]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-8 py-3 text-sm">
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 font-semibold text-slate-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/10"
          >
            ← 맵으로
          </Link>
          <div className="font-semibold text-slate-100">A-Eye Data Status</div>
          <Link
            href="/presentation"
            className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 font-semibold text-slate-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/10"
          >
            발표 자료
          </Link>
        </div>
      </nav>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-sm font-semibold text-cyan-200">A-Eye Data Status</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal">실시간 수집 · 예측 · 배차 현황</h1>
          </div>
          <div className="text-right text-sm text-slate-300">
            <p>요약 생성 {formatKst(dataSummary.generated_at)}</p>
          </div>
        </header>

        <section className="grid grid-cols-5 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Citydata 장소</p>
            <p className="mt-3 text-3xl font-bold">{dataSummary.citydata.place_count}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">최대 생활인구</p>
            <p className="mt-3 text-2xl font-bold">{topPopulation?.area_name ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-300">{topPopulation ? populationLabel(topPopulation) : "-"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">예측 소스</p>
            <p className="mt-3 text-2xl font-bold">
              {forecast.source === "demo" ? "데모 예측" : "모델 예측"}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {forecast.regions?.length ?? 0}개 동
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">배차 최우선</p>
            <p className="mt-3 text-2xl font-bold">{topDecision?.dong_name ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-300">{topDecision?.action ?? "-"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">예측 전략</p>
            <p className="mt-3 text-2xl font-bold">{strategyLabel(forecast.strategy)}</p>
            <p className="mt-1 text-sm text-slate-300">{forecast.regions?.length ?? 0}개 동</p>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">모델 검증 요약</h2>
              <p className="mt-1 text-sm text-slate-400">
                발표용 수치는 재현 가능한 public/model-summary.json 기준입니다.
              </p>
            </div>
            <div className="rounded-md border border-slate-500/50 bg-slate-500/15 px-3 py-2 text-right text-sm text-slate-200">
              <p className="font-semibold">Persistence baseline</p>
              <p className="mt-1">
                R² {formatMetric(persistenceBaseline.metrics.r2)} · MAPE{" "}
                {formatPct(persistenceBaseline.metrics.mape_pct)}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3 font-semibold">모델</th>
                  <th className="px-5 py-3 font-semibold">역할</th>
                  <th className="px-5 py-3 font-semibold">Feature</th>
                  <th className="px-5 py-3 font-semibold">R²</th>
                  <th className="px-5 py-3 font-semibold">MAPE</th>
                  <th className="px-5 py-3 font-semibold">라이브</th>
                  <th className="px-5 py-3 font-semibold">해석</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.name} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-semibold text-slate-100">{modelNameLabel(model.name)}</td>
                    <td className="px-5 py-3 text-slate-300">{model.role}</td>
                    <td className="px-5 py-3 text-slate-300">{model.feature_count}개</td>
                    <td className="px-5 py-3 font-semibold text-cyan-100">
                      {formatMetric(model.metrics.r2)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-cyan-100">
                      {formatPct(model.metrics.mape_pct)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-md border px-3 py-1 text-xs font-semibold ${
                          model.live_usable
                            ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100"
                            : "border-rose-400/50 bg-rose-500/15 text-rose-100"
                        }`}
                      >
                        {model.live_usable ? "가능" : "불가"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {modelInterpretation(model)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {validation2026 ? (
          <section className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">2026 실측 대중교통 검증</h2>
                <p className="mt-1 text-sm text-slate-400">
                  예측 proxy와 2026년 3~4월 실제 버스+지하철 승차량을 동별 z-score로 비교
                </p>
              </div>
              <div className="text-right text-sm text-slate-400">
                <p>{validation2026.row_count.toLocaleString("ko-KR")} rows · {validation2026.dongs.length}개 동</p>
                <p>
                  {validation2026.date_range.start} ~ {validation2026.date_range.end}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[0.85fr_1.15fr] gap-5 px-5 py-5">
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-cyan-300/30 bg-cyan-400/10 p-4">
                    <p className="text-xs font-semibold uppercase text-cyan-200">Overall Spearman</p>
                    <p className="mt-2 text-3xl font-bold">
                      {formatMetric(validation2026.overall.spearman_r, 3)}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">rank correlation</p>
                  </div>
                  <div className="rounded-md border border-emerald-300/30 bg-emerald-400/10 p-4">
                    <p className="text-xs font-semibold uppercase text-emerald-200">동별 평균</p>
                    <p className="mt-2 text-3xl font-bold">
                      {formatMetric(validation2026.overall.per_dong_spearman_mean, 3)}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">mean Spearman</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/15 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Pearson</p>
                    <p className="mt-2 text-2xl font-bold">
                      {formatMetric(validation2026.overall.pearson_r, 3)}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/15 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">비교 방식</p>
                    <p className="mt-2 text-base font-semibold">동별 z-score</p>
                    <p className="mt-1 text-sm text-slate-400">단위 차이 보정</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  예측값은 이동 수요 proxy이고 실측값은 raw 승차량이라 단위가 다릅니다. 그래서 절대값보다
                  같은 동 안에서 시간대 순위가 함께 움직이는지를 Spearman으로 봅니다.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 font-semibold">동</th>
                      <th className="px-4 py-3 font-semibold">Spearman</th>
                      <th className="px-4 py-3 font-semibold">Rows</th>
                      <th className="px-4 py-3 font-semibold">MAPE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation2026Dongs.map((row) => (
                      <tr key={row.dong_name} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 font-semibold text-slate-100">{row.dong_name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-12 font-semibold text-cyan-100">
                              {formatMetric(row.spearman_r, 3)}
                            </span>
                            <div className="h-2 flex-1 rounded-full bg-slate-800">
                              <div
                                className="h-2 rounded-full bg-cyan-300"
                                style={{ width: `${Math.max((row.spearman_r ?? 0) * 100, 2)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{row.row_count.toLocaleString("ko-KR")}</td>
                        <td className="px-4 py-3 text-slate-400">{formatPct(row.normalized_mape_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-[1.2fr_0.8fr] gap-5">
          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Live-compatible Feature Importance</h2>
                <p className="mt-1 text-sm text-slate-400">
                  permutation importance 상위 {topImportance.length}개 feature
                </p>
              </div>
              <p className="text-sm text-slate-400">
                {modelObservability.feature_importance.feature_count} features
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              {topImportance.map((row) => (
                <div key={row.feature}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-slate-100">#{row.rank} {featureLabel(row.feature)}</span>
                      <span className="ml-2 text-xs text-slate-500">{row.feature}</span>
                    </div>
                    <span className="font-semibold text-cyan-100">
                      {row.importance_mean.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-cyan-300"
                      style={{ width: `${Math.max(row.normalized_importance * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-semibold">예측 로그 누적</h2>
              <p className="mt-1 text-sm text-slate-400">
                live_forecast_log.jsonl 기반 검증 대기 기록
              </p>
            </div>
            <div className="px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-white/10 bg-black/15 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">누적 로그</p>
                  <p className="mt-2 text-3xl font-bold">{validation.log_count}</p>
                  <p className="mt-1 text-sm text-slate-400">회 적재 중</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/15 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">최근 전략</p>
                  <p className="mt-2 text-xl font-bold">{strategyLabel(validation.latest_strategy)}</p>
                  <p className="mt-1 text-sm text-slate-400">{validation.latest_top_region ?? "-"}</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-1 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">최근 예측 생성</dt>
                  <dd className="mt-1 font-semibold">{formatKst(validation.latest_generated_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">최근 예측 대상</dt>
                  <dd className="mt-1 font-semibold">{formatKst(validation.latest_target_datetime)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">최근 배차 권고</dt>
                  <dd className="mt-1 font-semibold">
                    {validation.latest_dispatch_region ?? "-"} · {validation.latest_dispatch_action ?? "-"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 divide-y divide-white/10 border-t border-white/10">
                {validation.recent.slice(0, 3).map((entry) => (
                  <div key={`${entry.generated_at}-${entry.target_datetime}`} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-100">{formatKst(entry.target_datetime)}</span>
                      <span className="text-slate-400">{strategyLabel(entry.strategy)}</span>
                    </div>
                    <p className="mt-1 text-slate-400">
                      {entry.top_region ?? "-"} 예측 · {entry.dispatch_region ?? "-"} {entry.dispatch_action ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-[1.35fr_1fr] gap-5">
          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-semibold">주변 실시간 지표</h2>
              <p className="text-sm text-slate-400">
                수집 {formatKst(dataSummary.citydata.collected_at)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-3 font-semibold">장소</th>
                    <th className="px-5 py-3 font-semibold">생활인구</th>
                    <th className="px-5 py-3 font-semibold">혼잡도</th>
                    <th className="px-5 py-3 font-semibold">도로</th>
                    <th className="px-5 py-3 font-semibold">날씨</th>
                    <th className="px-5 py-3 font-semibold">관측</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map((place) => (
                    <tr key={place.area_name} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-100">{place.area_name}</td>
                      <td className="px-5 py-3 text-slate-300">{populationLabel(place)}</td>
                      <td className="px-5 py-3 text-slate-300">{place.congestion_level}</td>
                      <td className="px-5 py-3 text-slate-300">
                        {place.traffic_index} · {place.traffic_speed_kmh}km/h
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {place.precipitation_type} · {place.temperature_c}°C
                      </td>
                      <td className="px-5 py-3 text-slate-400">{formatKst(place.observed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-semibold">동적 배차 판단</h2>
              <p className="mt-1 text-sm text-slate-400">{dispatchPlan.policy}</p>
            </div>
            <div className="divide-y divide-white/10">
              {decisions.map((decision, index) => (
                <div key={decision.dong_name} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">#{index + 1}</p>
                      <p className="mt-1 text-lg font-semibold">{decision.dong_name}</p>
                    </div>
                    <span className={`rounded-md border px-3 py-1 text-sm font-semibold ${actionTone(decision.action_level)}`}>
                      {decision.action}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">수요</dt>
                      <dd className="mt-1 font-semibold">{scoreLabel(decision.predicted_demand_score)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">공급 proxy</dt>
                      <dd className="mt-1 font-semibold">{scoreLabel(decision.supply_proxy_score)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">권고 강도</dt>
                      <dd className="mt-1 font-semibold">{decision.coverage_units}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">불균형</dt>
                      <dd className="mt-1 font-semibold">{scoreLabel(decision.imbalance_score)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">평균속도</dt>
                      <dd className="mt-1 font-semibold">
                        {decision.avg_speed_kmh == null ? "-" : `${decision.avg_speed_kmh}km/h`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">링크</dt>
                      <dd className="mt-1 font-semibold">{decision.link_count}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">모델 입력 Feature 스냅샷</h2>
              <p className="mt-1 text-sm text-slate-400">
                생활인구, 혼잡도, 도로, 날씨, 대중교통, 이벤트를 수요 proxy로 정리
              </p>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>{featureSnapshot.row_count} rows · {featureSnapshot.source}</p>
              <p>
                KMA {featureSnapshot.weather_status.kma_ok ? "연결" : "대기"}
                {featureSnapshot.weather_status.kma_ok ? "" : ` · ${featureSnapshot.weather_status.kma_status ?? "-"}`}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3 font-semibold">장소</th>
                  <th className="px-5 py-3 font-semibold">시간대</th>
                  <th className="px-5 py-3 font-semibold">생활인구</th>
                  <th className="px-5 py-3 font-semibold">혼잡/도로</th>
                  <th className="px-5 py-3 font-semibold">날씨</th>
                  <th className="px-5 py-3 font-semibold">교통 노드</th>
                  <th className="px-5 py-3 font-semibold">이벤트</th>
                  <th className="px-5 py-3 font-semibold">Proxy</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row) => (
                  <tr key={row.area_code} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-100">{row.area_name}</td>
                    <td className="px-5 py-3 text-slate-300">{row.time_band} · {row.hour}시</td>
                    <td className="px-5 py-3 text-slate-300">
                      {row.live_population_mid.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {row.congestion_level} · {row.traffic_index} {row.traffic_speed_kmh}km/h
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {row.city_precipitation_type} · {row.city_weather_temp_c}°C
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      지하철 {row.subway_station_count} · 버스 {row.bus_stop_count}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{row.event_count}</td>
                    <td className="px-5 py-3 font-semibold text-cyan-100">{row.demand_proxy_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
