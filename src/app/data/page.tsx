import dataSummary from "../../../public/data-summary.json";
import dispatchPlan from "../../../public/dispatch-plan.json";
import featureSnapshot from "../../../public/feature-snapshot.json";
import forecastLatest from "../../../public/forecast/latest.json";
import modelObservability from "../../../public/model-observability.json";
import modelSummary from "../../../public/model-summary.json";
import type { Metadata } from "next";
import Link from "next/link";
import RefreshForecastControl from "./RefreshForecastControl";

export const metadata: Metadata = {
  title: "데이터 현황 | A-Eye",
};

type CitydataPlace = {
  area_name: string;
  population_min: number;
  population_max: number;
  congestion_level: string;
  traffic_index: string;
  traffic_speed_kmh: number | null;
  precipitation_type: string;
  temperature_c: number | null;
  observed_at: string | null;
};
type DataStatusSummary = {
  generated_at: string | null;
  citydata: {
    collected_at: string | null;
    place_count: number;
    places: CitydataPlace[];
    top_population: CitydataPlace | null;
  };
};
type DispatchDecision = {
  dong_name: string;
  action: string;
  action_level: string;
  predicted_demand_score?: number | null;
  supply_proxy_score?: number | null;
  coverage_units?: number | null;
  imbalance_score?: number | null;
  avg_speed_kmh?: number | null;
  link_count?: number | null;
};
type DispatchPlanStatus = {
  policy?: string;
  decisions: DispatchDecision[];
};
type FeatureRow = {
  area_code: string;
  area_name: string;
  time_band: string;
  hour: number;
  live_population_mid: number;
  congestion_level: string;
  traffic_index: string;
  traffic_speed_kmh: number | null;
  city_precipitation_type: string;
  city_weather_temp_c: number | null;
  subway_station_count: number;
  bus_stop_count: number;
  event_count: number;
  demand_proxy_score: number;
};
type FeatureStatus = {
  row_count: number;
  source: string;
  weather_status: {
    kma_ok: boolean;
    kma_status?: string | null;
  };
  features: FeatureRow[];
};
type ModelRow = {
  name: string;
  role: string;
  feature_count: number;
  live_usable: boolean;
  metrics: {
    r2: number | null;
    mape_pct: number | null;
  };
  uses?: string[];
  caveat?: string;
};
type ModelSummaryStatus = {
  models: ModelRow[];
  baseline: {
    persistence: {
      metrics: {
        r2: number | null;
        mape_pct: number | null;
      };
    };
  };
};
type ObservedValidation2026 = {
  row_count: number;
  dongs: string[];
  date_range: {
    start: string;
    end: string;
  };
  overall: {
    spearman_r: number | null;
    per_dong_spearman_mean?: number | null;
    pearson_r: number | null;
  };
  per_dong: Array<{
    dong_name: string;
    spearman_r: number | null;
    spearman_p?: number | null;
    row_count: number;
    normalized_mape_pct: number | null;
  }>;
};
type ModelObservability = {
  feature_importance: {
    feature_count: number;
    top_features: Array<{
      rank: number;
      feature: string;
      importance_mean: number;
      normalized_importance: number;
    }>;
  };
  live_validation: {
    log_count: number;
    latest_strategy?: string | null;
    latest_top_region?: string | null;
    latest_generated_at?: string | null;
    latest_target_datetime?: string | null;
    latest_dispatch_region?: string | null;
    latest_dispatch_action?: string | null;
    recent: Array<{
      generated_at: string | null;
      target_datetime: string | null;
      strategy?: string | null;
      top_region?: string | null;
      dispatch_region?: string | null;
      dispatch_action?: string | null;
    }>;
  };
  observed_validation_2026: ObservedValidation2026 | null;
};

const summary = dataSummary as unknown as DataStatusSummary;
const dispatch = dispatchPlan as unknown as DispatchPlanStatus;
const featureStatus = featureSnapshot as unknown as FeatureStatus;
const modelStatus = modelSummary as unknown as ModelSummaryStatus;
const observability = modelObservability as unknown as ModelObservability;

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

function populationLabel(place: { population_min: number; population_max: number }) {
  return `${place.population_min.toLocaleString("ko-KR")}~${place.population_max.toLocaleString("ko-KR")}`;
}

function actionTone(level: DispatchDecision["action_level"]) {
  if (level === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  if (level === "watch") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
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

function modelInterpretation(model: ModelRow) {
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
  const places = summary.citydata.places;
  const decisions = dispatch.decisions.slice(0, 5);
  const featureRows = featureStatus.features.slice(0, 5);
  const forecast = forecastLatest;
  const models = modelStatus.models;
  const persistenceBaseline = modelStatus.baseline.persistence;
  const topImportance = observability.feature_importance.top_features.slice(0, 10);
  const validation = observability.live_validation;
  const validation2026 = observability.observed_validation_2026;
  const validation2026Dongs = validation2026?.per_dong.slice(0, 9) ?? [];
  const topPopulation = summary.citydata.top_population;
  const topDecision = dispatch.decisions[0] ?? null;
  const pipelineStages = [
    {
      label: "1. 수집",
      value: `${summary.citydata.place_count}개 장소`,
      detail: "Citydata · KMA · TOPIS",
    },
    {
      label: "2. 예측",
      value: `${forecast.regions?.length ?? 0}개 동`,
      detail: `${forecast.source === "demo" ? "데모" : "모델"} · ${strategyLabel(forecast.strategy)}`,
    },
    {
      label: "3. 판단",
      value: topDecision?.dong_name ?? "-",
      detail: `${topDecision?.action ?? "-"} · 불균형 ${scoreLabel(topDecision?.imbalance_score)}`,
    },
    {
      label: "4. 반영",
      value: "Cloudflare",
      detail: "지도 JSON 자동 배포",
    },
  ];

  return (
    <main className="h-screen overflow-y-auto bg-[#f4f7fb] text-slate-950">
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-3 text-sm sm:px-7">
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
          >
            ← 맵으로
          </Link>
          <div className="font-black text-slate-900">A-Eye Data Status</div>
          <Link
            href="/presentation"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
          >
            발표 자료
          </Link>
        </div>
      </nav>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 sm:px-7">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  LIVE PIPELINE
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                  {strategyLabel(forecast.strategy)}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-normal sm:text-4xl">
                실시간 수집에서 배차 권고까지
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                서울 API와 기상, 교통, 모델 예측 결과가 실제 지도와 배차 판단으로 어떻게 이어지는지
                한 화면에서 점검합니다.
              </p>
            </div>
            <div className="min-w-[250px] rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">최근 갱신</p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatKst(summary.generated_at)}</p>
              <p className="mt-3 text-xs font-black uppercase text-slate-500">예측 대상</p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatKst(forecast.target_datetime)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">Citydata 장소</p>
            <p className="mt-3 text-3xl font-black">{summary.citydata.place_count}</p>
            <p className="mt-1 text-sm text-slate-500">실시간 장소 신호</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">최대 생활인구</p>
            <p className="mt-3 truncate text-2xl font-black">{topPopulation?.area_name ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-500">{topPopulation ? populationLabel(topPopulation) : "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">예측 소스</p>
            <p className="mt-3 text-2xl font-black">
              {forecast.source === "demo" ? "데모 예측" : "모델 예측"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {forecast.regions?.length ?? 0}개 동
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">배차 최우선</p>
            <p className="mt-3 text-2xl font-black">{topDecision?.dong_name ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-500">{topDecision?.action ?? "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">예측 로그</p>
            <p className="mt-3 text-2xl font-black">{validation.log_count}회</p>
            <p className="mt-1 text-sm text-slate-500">누적 검증 대기</p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black">API 운영 파이프라인</h2>
                <p className="mt-1 text-sm text-slate-500">
                  실시간 API 호출이 지도 색상과 배차 권고로 바뀌는 흐름입니다.
                </p>
              </div>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                운영 자동화 연결
              </span>
            </div>
            <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
              {pipelineStages.map((stage) => (
                <div key={stage.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-500">{stage.label}</p>
                  <p className="mt-3 text-xl font-black text-slate-950">{stage.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{stage.detail}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t border-slate-200 px-5 py-5 lg:grid-cols-3">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <p className="text-xs font-black uppercase text-sky-700">지도에 보이는 결과</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  동별 수요 heatmap, 예측 소스 배지, 목표 시각이 자동 갱신됩니다.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black uppercase text-amber-700">판단에 쓰는 결과</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  수요 score와 공급 proxy를 결합해 배차 우선 동을 정렬합니다.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase text-emerald-700">발표에서 말할 수 있는 것</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  수집, 예측, 권고, 배포가 하나의 자동 파이프라인으로 연결됐습니다.
                </p>
              </div>
            </div>
          </div>

          <RefreshForecastControl />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-black">모델 검증 요약</h2>
              <p className="mt-1 text-sm text-slate-500">
                발표용 수치는 재현 가능한 public/model-summary.json 기준입니다.
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm text-slate-700">
              <p className="font-black">Persistence baseline</p>
              <p className="mt-1">
                R² {formatMetric(persistenceBaseline.metrics.r2)} · MAPE{" "}
                {formatPct(persistenceBaseline.metrics.mape_pct)}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 font-black">모델</th>
                  <th className="px-5 py-3 font-black">역할</th>
                  <th className="px-5 py-3 font-black">Feature</th>
                  <th className="px-5 py-3 font-black">R²</th>
                  <th className="px-5 py-3 font-black">MAPE</th>
                  <th className="px-5 py-3 font-black">라이브</th>
                  <th className="px-5 py-3 font-black">해석</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.name} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-black text-slate-900">{modelNameLabel(model.name)}</td>
                    <td className="px-5 py-3 text-slate-600">{model.role}</td>
                    <td className="px-5 py-3 text-slate-600">{model.feature_count}개</td>
                    <td className="px-5 py-3 font-black text-sky-700">
                      {formatMetric(model.metrics.r2)}
                    </td>
                    <td className="px-5 py-3 font-black text-sky-700">
                      {formatPct(model.metrics.mape_pct)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-md border px-3 py-1 text-xs font-semibold ${
                          model.live_usable
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {model.live_usable ? "가능" : "불가"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {modelInterpretation(model)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {validation2026 ? (
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black">2026 실측 대중교통 검증</h2>
                <p className="mt-1 text-sm text-slate-500">
                  예측 proxy와 2026년 3~4월 실제 버스+지하철 승차량을 동별 z-score로 비교
                </p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>{validation2026.row_count.toLocaleString("ko-KR")} rows · {validation2026.dongs.length}개 동</p>
                <p>
                  {validation2026.date_range.start} ~ {validation2026.date_range.end}
                </p>
              </div>
            </div>
            <div className="grid gap-5 px-5 py-5 xl:grid-cols-[0.85fr_1.15fr]">
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
                    <p className="text-xs font-black uppercase text-sky-700">Overall Spearman</p>
                    <p className="mt-2 text-3xl font-black">
                      {formatMetric(validation2026.overall.spearman_r, 3)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">rank correlation</p>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-black uppercase text-emerald-700">동별 평균</p>
                    <p className="mt-2 text-3xl font-black">
                      {formatMetric(validation2026.overall.per_dong_spearman_mean, 3)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">mean Spearman</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-500">Pearson</p>
                    <p className="mt-2 text-2xl font-black">
                      {formatMetric(validation2026.overall.pearson_r, 3)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-500">비교 방식</p>
                    <p className="mt-2 text-base font-black">동별 z-score</p>
                    <p className="mt-1 text-sm text-slate-500">단위 차이 보정</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  예측값은 이동 수요 proxy이고 실측값은 raw 승차량이라 단위가 다릅니다. 그래서 절대값보다
                  같은 동 안에서 시간대 순위가 함께 움직이는지를 Spearman으로 봅니다.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 font-black">동</th>
                      <th className="px-4 py-3 font-black">Spearman</th>
                      <th className="px-4 py-3 font-black">Rows</th>
                      <th className="px-4 py-3 font-black">MAPE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation2026Dongs.map((row) => (
                      <tr key={row.dong_name} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-black text-slate-900">{row.dong_name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-12 font-black text-sky-700">
                              {formatMetric(row.spearman_r, 3)}
                            </span>
                            <div className="h-2 flex-1 rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-sky-500"
                                style={{ width: `${Math.max((row.spearman_r ?? 0) * 100, 2)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.row_count.toLocaleString("ko-KR")}</td>
                        <td className="px-4 py-3 text-slate-500">{formatPct(row.normalized_mape_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black">Live-compatible Feature Importance</h2>
                <p className="mt-1 text-sm text-slate-500">
                  permutation importance 상위 {topImportance.length}개 feature
                </p>
              </div>
              <p className="text-sm text-slate-500">
                {observability.feature_importance.feature_count} features
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              {topImportance.map((row) => (
                <div key={row.feature}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-black text-slate-900">#{row.rank} {featureLabel(row.feature)}</span>
                      <span className="ml-2 text-xs text-slate-400">{row.feature}</span>
                    </div>
                    <span className="font-black text-sky-700">
                      {row.importance_mean.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${Math.max(row.normalized_importance * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black">예측 로그 누적</h2>
              <p className="mt-1 text-sm text-slate-500">
                live_forecast_log.jsonl 기반 검증 대기 기록
              </p>
            </div>
            <div className="px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-slate-500">누적 로그</p>
                  <p className="mt-2 text-3xl font-black">{validation.log_count}</p>
                  <p className="mt-1 text-sm text-slate-500">회 적재 중</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-slate-500">최근 전략</p>
                  <p className="mt-2 text-xl font-black">{strategyLabel(validation.latest_strategy)}</p>
                  <p className="mt-1 text-sm text-slate-500">{validation.latest_top_region ?? "-"}</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-1 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">최근 예측 생성</dt>
                  <dd className="mt-1 font-black">{formatKst(validation.latest_generated_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">최근 예측 대상</dt>
                  <dd className="mt-1 font-black">{formatKst(validation.latest_target_datetime)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">최근 배차 권고</dt>
                  <dd className="mt-1 font-black">
                    {validation.latest_dispatch_region ?? "-"} · {validation.latest_dispatch_action ?? "-"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 divide-y divide-slate-100 border-t border-slate-200">
                {validation.recent.slice(0, 3).map((entry) => (
                  <div key={`${entry.generated_at}-${entry.target_datetime}`} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-slate-900">{formatKst(entry.target_datetime)}</span>
                      <span className="text-slate-500">{strategyLabel(entry.strategy)}</span>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {entry.top_region ?? "-"} 예측 · {entry.dispatch_region ?? "-"} {entry.dispatch_action ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black">주변 실시간 지표</h2>
              <p className="text-sm text-slate-500">
                수집 {formatKst(summary.citydata.collected_at)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-3 font-black">장소</th>
                    <th className="px-5 py-3 font-black">생활인구</th>
                    <th className="px-5 py-3 font-black">혼잡도</th>
                    <th className="px-5 py-3 font-black">도로</th>
                    <th className="px-5 py-3 font-black">날씨</th>
                    <th className="px-5 py-3 font-black">관측</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map((place) => (
                    <tr key={place.area_name} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3 font-black text-slate-900">{place.area_name}</td>
                      <td className="px-5 py-3 text-slate-600">{populationLabel(place)}</td>
                      <td className="px-5 py-3 text-slate-600">{place.congestion_level}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {place.traffic_index} · {place.traffic_speed_kmh}km/h
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {place.precipitation_type} · {place.temperature_c}°C
                      </td>
                      <td className="px-5 py-3 text-slate-500">{formatKst(place.observed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black">동적 배차 판단</h2>
              <p className="mt-1 text-sm text-slate-500">{dispatch.policy ?? "-"}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {decisions.map((decision, index) => (
                <div key={decision.dong_name} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-400">#{index + 1}</p>
                      <p className="mt-1 text-lg font-black">{decision.dong_name}</p>
                    </div>
                    <span className={`rounded-md border px-3 py-1 text-sm font-black ${actionTone(decision.action_level)}`}>
                      {decision.action}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">수요</dt>
                      <dd className="mt-1 font-black">{scoreLabel(decision.predicted_demand_score)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">공급 proxy</dt>
                      <dd className="mt-1 font-black">{scoreLabel(decision.supply_proxy_score)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">권고 강도</dt>
                      <dd className="mt-1 font-black">{decision.coverage_units}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">불균형</dt>
                      <dd className="mt-1 font-black">{scoreLabel(decision.imbalance_score)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">평균속도</dt>
                      <dd className="mt-1 font-black">
                        {decision.avg_speed_kmh == null ? "-" : `${decision.avg_speed_kmh}km/h`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">링크</dt>
                      <dd className="mt-1 font-black">{decision.link_count}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-black">모델 입력 Feature 스냅샷</h2>
              <p className="mt-1 text-sm text-slate-500">
                생활인구, 혼잡도, 도로, 날씨, 대중교통, 이벤트를 수요 proxy로 정리
              </p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>{featureStatus.row_count} rows · {featureStatus.source}</p>
              <p>
                KMA {featureStatus.weather_status.kma_ok ? "연결" : "대기"}
                {featureStatus.weather_status.kma_ok ? "" : ` · ${featureStatus.weather_status.kma_status ?? "-"}`}
              </p>
            </div>
          </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 font-black">장소</th>
                  <th className="px-5 py-3 font-black">시간대</th>
                  <th className="px-5 py-3 font-black">생활인구</th>
                  <th className="px-5 py-3 font-black">혼잡/도로</th>
                  <th className="px-5 py-3 font-black">날씨</th>
                  <th className="px-5 py-3 font-black">교통 노드</th>
                  <th className="px-5 py-3 font-black">이벤트</th>
                  <th className="px-5 py-3 font-black">Proxy</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row) => (
                  <tr key={row.area_code} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-black text-slate-900">{row.area_name}</td>
                    <td className="px-5 py-3 text-slate-600">{row.time_band} · {row.hour}시</td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.live_population_mid.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.congestion_level} · {row.traffic_index} {row.traffic_speed_kmh}km/h
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.city_precipitation_type} · {row.city_weather_temp_c}°C
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      지하철 {row.subway_station_count} · 버스 {row.bus_stop_count}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{row.event_count}</td>
                    <td className="px-5 py-3 font-black text-sky-700">{row.demand_proxy_score}</td>
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
