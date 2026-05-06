import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Database,
  FileJson,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import dataSummaryJson from "../../../public/data-summary.json";
import demandGuardrailJson from "../../../public/demand-guardrail-summary.json";
import forecastJson from "../../../public/forecast/latest.json";
import liveForecastComparisonJson from "../../../public/live-forecast-comparison.json";
import modelObservabilityJson from "../../../public/model-observability.json";
import modelSummaryJson from "../../../public/model-summary.json";
import poiFeaturesJson from "../../../public/poi-features.json";
import poiForecastComparisonJson from "../../../public/poi-forecast-comparison.json";
import populationPressureJson from "../../../public/population-pressure-summary.json";
import publicPressureBaselineJson from "../../../public/public-pressure-baseline-comparison.json";
import trafficForecastJson from "../../../public/traffic-forecast/latest.json";
import trafficForecastComparisonJson from "../../../public/traffic-forecast-comparison.json";

export const metadata: Metadata = {
  title: "예측 상태 점검 | 역삼권 교통 운영",
};

type ModelInfo = {
  name: string;
  role: string;
  algorithm?: string;
  feature_count: number;
  live_usable: boolean;
  metrics: {
    r2: number | null;
    mae: number | null;
    rmse?: number | null;
    mape_pct?: number | null;
  };
  caveat?: string;
  uses?: string[];
  excludes?: string[];
};

type ModelSummary = {
  generated_at: string | null;
  target_area: {
    dong_count: number;
  };
  feature_table: {
    rows: number;
    size_mb: number;
    period: {
      start: string;
      end: string;
      granularity: string;
    };
  };
  prediction_target: {
    interpretation: string;
    horizon_hours: number;
  };
  models: ModelInfo[];
};

type ForecastRegion = {
  dong_name: string;
  score: number | null;
  confidence?: number | null;
  raw_prediction?: number | null;
};

type DemandForecast = {
  generated_at: string | null;
  feature_datetime: string | null;
  target_datetime: string | null;
  strategy: string | null;
  weather: string | null;
  regions: ForecastRegion[];
};

type TrafficRegion = {
  dong_name: string;
  predicted_traffic_volume_score?: number | null;
  predicted_congestion_score: number | null;
  predicted_avg_speed_kmh: number | null;
  current_congestion_score?: number | null;
  current_avg_speed_kmh?: number | null;
};

type TrafficForecast = {
  generated_at: string | null;
  feature_datetime: string | null;
  target_datetime: string | null;
  regions: TrafficRegion[];
};

type PoiFeatureRow = {
  source_status: string;
  poi_name: string;
  coverage_dong: string | null;
  current_population_mid: number | null;
  current_congestion_level: string | null;
  current_traffic_speed_kmh: number | null;
  poi_pressure_score: number | null;
  forecast_population_delta: number | null;
};

type PoiFeatures = {
  generated_at: string | null;
  live_poi_count: number;
  supplemental_poi_count: number;
  direct_citydata_rows: PoiFeatureRow[];
};

type PopulationDong = {
  dong_name: string;
  poi_count: number;
  target_datetime: string | null;
  current_population_mid_sum: number | null;
  forecast_population_mid_sum: number | null;
  forecast_population_delta: number | null;
  avg_forecast_congestion_score: number | null;
  avg_poi_pressure_score: number | null;
  top_poi?: {
    poi_name: string | null;
    current_population_mid: number | null;
    forecast_population_mid: number | null;
    poi_pressure_score: number | null;
  } | null;
};

type PopulationPressureSummary = {
  generated_at: string | null;
  target_datetime: string | null;
  coverage: {
    live_poi_count: number;
    covered_dong_count: number;
    supplemental_poi_count: number;
  };
  validation: {
    completed_count: number;
    waiting_count: number;
    latest_kind: string | null;
    population_mae: number | null;
    congestion_level_accuracy_pct: number | null;
    status: string;
  };
  overall: {
    current_population_mid_sum: number | null;
    forecast_population_mid_sum: number | null;
    avg_current_congestion_score: number | null;
    avg_forecast_congestion_score: number | null;
    avg_poi_pressure_score: number | null;
  };
  dongs: PopulationDong[];
};

type GuardrailDong = {
  dong_name: string;
  composite_pressure_score: number | null;
  confidence_score: number | null;
  monitoring_priority_score: number | null;
  confidence_level: string;
  recommended_use: string;
  demand: {
    score: number | null;
    rank: number | null;
  };
  traffic: {
    predicted_congestion_score: number | null;
    rank: number | null;
  };
  population: {
    avg_poi_pressure_score: number | null;
    rank: number | null;
    live_poi_count: number;
  };
  guardrails: {
    risk_flags: string[];
  };
};

type DemandGuardrail = {
  generated_at: string | null;
  target_datetime: string | null;
  forecast_strategy: string | null;
  global_baseline_readiness: {
    model_vs_persistence_mae_improvement_pct: number | null;
    model_vs_pattern_mae_improvement_pct: number | null;
    baseline_strength_score: number | null;
  };
  coverage: {
    dong_count: number;
    population_covered_dong_count: number;
    live_poi_count: number;
    traffic_dong_count: number;
  };
  top_monitoring_dongs: GuardrailDong[];
  dongs: GuardrailDong[];
};

type BaselineReadiness = {
  verdict: string;
  decision: string;
  supervised_2025_holdout: {
    live_model_r2: number | null;
    live_model_mae: number | null;
    persistence_mae: number | null;
    pattern_mean_loo_mae: number | null;
    pattern_mean_loo_mape_pct: number | null;
    model_vs_persistence_mae_improvement_pct: number | null;
    model_vs_pattern_mae_improvement_pct: number | null;
  };
  observed_2026_proxy_check: {
    row_count: number | null;
    spearman_r: number | null;
    per_dong_spearman_mean: number | null;
    strongest_dongs: Array<{
      dong_name: string;
      spearman_r: number | null;
      row_count: number;
    }>;
    weakest_dongs: Array<{
      dong_name: string;
      spearman_r: number | null;
      row_count: number;
    }>;
  };
};

type ModelObservability = {
  baseline_readiness: BaselineReadiness;
};

type DataSummary = {
  generated_at: string | null;
  raw_citydata_attempt_meta?: {
    ok?: boolean;
    status?: number | null;
    collected_at?: string | null;
    poi_codes?: string[];
  };
  raw_weather_attempt_meta?: {
    ok?: boolean;
    status?: number | null;
    collected_at?: string | null;
  };
  citydata?: {
    collected_at?: string | null;
    place_count?: number | null;
    top_population?: {
      area_name?: string | null;
      congestion_level?: string | null;
      population_min?: number | null;
      population_max?: number | null;
      traffic_speed_kmh?: number | null;
      temperature_c?: number | null;
      precipitation_type?: string | null;
    } | null;
  };
};

type CompletedComparison<TOverall> = {
  kind: "completed";
  target_datetime?: string | null;
  actual_observed_at?: string | null;
  source_observed_at?: string | null;
  overall: TOverall;
  rows?: unknown[];
};

type WaitingComparison = {
  kind: string;
  target_datetime?: string | null;
  status?: string | null;
};

type Comparison<TOverall> = {
  generated_at?: string | null;
  completed_count: number;
  waiting_count: number;
  latest: CompletedComparison<TOverall> | WaitingComparison | null;
};

type RoadOverall = {
  row_count: number;
  congestion_mae: number | null;
  speed_mae_kmh: number | null;
  congestion_rank_spearman: number | null;
  top_predicted_congestion_dong: string | null;
  top_actual_congestion_dong: string | null;
  same_top_congestion_dong: boolean | null;
};

type DemandOverall = {
  row_count: number;
  spearman_r: number | null;
  mean_abs_score_gap: number | null;
  top_forecast_dong: string | null;
  top_observed_congestion_dong: string | null;
  same_top_dong: boolean | null;
};

type PoiOverall = {
  row_count: number;
  row_coverage_pct: number | null;
  population_mae: number | null;
  population_mape_pct: number | null;
  congestion_score_mae: number | null;
  congestion_level_accuracy_pct: number | null;
  population_rank_spearman: number | null;
  top_predicted_population_poi: string | null;
  top_observed_population_poi: string | null;
  same_top_poi: boolean | null;
};

type PublicPressureOverall = {
  row_count: number;
  priority_vs_public_pressure_spearman: number | null;
  top_predicted_priority_dong: string | null;
  top_observed_public_pressure_dong: string | null;
  same_top_dong: boolean | null;
};

const modelSummary = modelSummaryJson as ModelSummary;
const modelObservability = modelObservabilityJson as ModelObservability;
const demandGuardrail = demandGuardrailJson as DemandGuardrail;
const forecast = forecastJson as DemandForecast;
const trafficForecast = trafficForecastJson as TrafficForecast;
const poiFeatures = poiFeaturesJson as PoiFeatures;
const populationPressure = populationPressureJson as PopulationPressureSummary;
const dataSummary = dataSummaryJson as DataSummary;
const roadComparison = trafficForecastComparisonJson as Comparison<RoadOverall>;
const demandComparison = liveForecastComparisonJson as Comparison<DemandOverall>;
const poiComparison = poiForecastComparisonJson as Comparison<PoiOverall>;
const publicPressureComparison =
  publicPressureBaselineJson as Comparison<PublicPressureOverall>;
const baselineReadiness = modelObservability.baseline_readiness;

const officialSources = [
  {
    name: "서울 실시간 도시데이터",
    provider: "서울특별시 열린데이터광장",
    use: "POI별 실시간 인구, 혼잡도, 도로 속도, 현장 날씨",
    href: "https://data.seoul.go.kr/SeoulRtd/",
  },
  {
    name: "TOPIS 교통정보",
    provider: "서울시 교통정보 시스템",
    use: "도로 링크 속도와 교통량 proxy 학습·보정",
    href: "https://topis.seoul.go.kr/refRoom/openRefRoom_4.do",
  },
  {
    name: "서울시 행정동 대중교통 OD",
    provider: "서울특별시 열린데이터광장",
    use: "이동수요 대리 지표(proxy)의 사후 학습 기준",
    href: "https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do",
  },
  {
    name: "기상청 초단기·ASOS 관측",
    provider: "공공데이터포털",
    use: "기온, 강수, 공휴일·날씨 맥락 feature",
    href: "https://www.data.go.kr/data/15057210/openapi.do",
  },
  {
    name: "OpenStreetMap",
    provider: "OpenStreetMap contributors",
    use: "도로, 역, 건물, 상권 등 정적 공간 feature",
    href: "https://www.openstreetmap.org/copyright",
  },
];

const artifactLinks = [
  { label: "모델 요약", href: "/model-summary.json" },
  { label: "데이터 카탈로그", href: "/data-catalog.json" },
  { label: "동별 수요 전망", href: "/forecast/latest.json" },
  { label: "도로 전망", href: "/traffic-forecast/latest.json" },
  { label: "POI 스냅샷", href: "/poi-features.json" },
  { label: "생활·유동인구 요약", href: "/population-pressure-summary.json" },
  { label: "수요 confidence", href: "/demand-guardrail-summary.json" },
  { label: "POI 검증", href: "/poi-forecast-comparison.json" },
];

function isCompleted<TOverall>(
  latest: Comparison<TOverall>["latest"],
): latest is CompletedComparison<TOverall> {
  return latest?.kind === "completed" && "overall" in latest;
}

function formatKst(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value.slice(0, 16).replace("T", " ");
  }
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatScore(value: number | null | undefined, digits = 3) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(digits);
}

function formatPercent(value: number | null | undefined, digits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toFixed(digits)}%`;
}

function pressureTone(score: number | null | undefined) {
  if (typeof score !== "number") return "border-slate-200 bg-slate-50 text-slate-600";
  if (score >= 0.75) return "border-rose-200 bg-rose-50 text-rose-800";
  if (score >= 0.55) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function trendLabel(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "변화 없음";
  if (value > 0) return `+${formatNumber(value)}명`;
  if (value < 0) return `${formatNumber(value)}명`;
  return "변화 없음";
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-normal text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">
            {value}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-600">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black tracking-normal text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MiniStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums text-slate-950">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

function BriefingList({
  rows,
  type,
}: {
  rows: Array<ForecastRegion | TrafficRegion | PoiFeatureRow>;
  type: "demand" | "traffic" | "poi";
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const name =
          "dong_name" in row
            ? row.dong_name
            : `${row.poi_name}${row.coverage_dong ? ` · ${row.coverage_dong}` : ""}`;
        const primary =
          type === "demand"
            ? formatScore((row as ForecastRegion).score)
            : type === "traffic"
              ? formatScore((row as TrafficRegion).predicted_congestion_score)
              : formatScore((row as PoiFeatureRow).poi_pressure_score);
        const secondary =
          type === "demand"
            ? `신뢰도 ${formatPercent(((row as ForecastRegion).confidence ?? 0) * 100)}`
            : type === "traffic"
              ? `예상 속도 ${formatNumber((row as TrafficRegion).predicted_avg_speed_kmh, 1)}km/h`
              : `${(row as PoiFeatureRow).current_congestion_level ?? "-"} · ${trendLabel(
                  (row as PoiFeatureRow).forecast_population_delta,
                )}`;

        return (
          <div
            key={`${type}-${name}`}
            className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
          >
            <span className="text-sm font-black tabular-nums text-slate-400">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">{name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {secondary}
              </p>
            </div>
            <span className={`rounded-md border px-2 py-1 text-sm font-black tabular-nums ${pressureTone(Number(primary))}`}>
              {primary}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PopulationDongList({ rows }: { rows: PopulationDong[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          key={`population-${row.dong_name}`}
          className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
        >
          <span className="text-sm font-black tabular-nums text-slate-400">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">
              {row.dong_name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {row.poi_count}개 POI · {trendLabel(row.forecast_population_delta)}
              {row.top_poi?.poi_name ? ` · ${row.top_poi.poi_name}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black tabular-nums text-slate-950">
              {formatNumber(row.forecast_population_mid_sum)}명
            </p>
            <span
              className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-black tabular-nums ${pressureTone(
                row.avg_poi_pressure_score,
              )}`}
            >
              {formatScore(row.avg_poi_pressure_score)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function riskLabel(flags: string[]) {
  if (!flags.length) return "risk 없음";
  const labels: Record<string, string> = {
    pattern_fallback_used: "패턴",
    signals_disagree: "신호 불일치",
    weak_2026_proxy_validation: "검증 약함",
    no_live_population_poi_coverage: "인구 미커버",
    thin_current_traffic_links: "도로 표본 적음",
    recent_rank_volatility: "최근 순위 급변",
  };
  return flags.map((flag) => labels[flag] ?? flag).join(" · ");
}

function GuardrailList({ rows }: { rows: GuardrailDong[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          key={`guardrail-${row.dong_name}`}
          className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
        >
          <span className="text-sm font-black tabular-nums text-slate-400">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">
              {row.dong_name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              pressure {formatScore(row.composite_pressure_score)} ·{" "}
              {riskLabel(row.guardrails.risk_flags)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black tabular-nums text-slate-950">
              {formatScore(row.monitoring_priority_score)}
            </p>
            <span
              className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-black tabular-nums ${pressureTone(
                row.confidence_score,
              )}`}
            >
              {row.confidence_level}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

const liveModel = modelSummary.models.find((model) => model.live_usable) ??
  modelSummary.models[0];
const offlineModel = modelSummary.models.find((model) => !model.live_usable);
const latestRoad = isCompleted(roadComparison.latest)
  ? roadComparison.latest
  : null;
const latestDemand = isCompleted(demandComparison.latest)
  ? demandComparison.latest
  : null;
const latestPoi = isCompleted(poiComparison.latest) ? poiComparison.latest : null;
const latestPublicPressure = isCompleted(publicPressureComparison.latest)
  ? publicPressureComparison.latest
  : null;

const topDemandRegions = [...forecast.regions]
  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  .slice(0, 5);
const topTrafficRegions = [...trafficForecast.regions]
  .sort(
    (a, b) =>
      (b.predicted_congestion_score ?? 0) -
      (a.predicted_congestion_score ?? 0),
  )
  .slice(0, 5);
const topPoiRows = [...poiFeatures.direct_citydata_rows]
  .filter((poi) => poi.source_status === "citydata_live")
  .sort((a, b) => (b.poi_pressure_score ?? 0) - (a.poi_pressure_score ?? 0))
  .slice(0, 5);
const topPopulationDongs = [...populationPressure.dongs].slice(0, 5);
const topGuardrailDongs = [...demandGuardrail.top_monitoring_dongs].slice(0, 5);

export default function PresentationPage() {
  const topPopulation = dataSummary.citydata?.top_population;
  const topPopulationLabel = topPopulation
    ? `${topPopulation.area_name ?? "-"} ${formatNumber(
        topPopulation.population_min,
      )}-${formatNumber(topPopulation.population_max)}명`
    : "-";

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            지도
          </Link>
          <div className="text-center">
            <p className="text-xs font-black tracking-normal text-slate-500">
              공개 데이터 기반 예측
            </p>
            <p className="text-sm font-black text-slate-950">모델 상태 점검</p>
          </div>
          <Link
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            href="/data"
          >
            데이터
          </Link>
        </nav>

        <header className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">
                역삼권 9개 동
              </span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">
                직접 택시콜 아님
              </span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
                다음 1시간 전망
              </span>
            </div>
            <h1 className="mt-4 max-w-4xl break-keep text-2xl font-black leading-tight tracking-normal text-slate-950 sm:text-4xl">
              공개 신호로 계산한 역삼권 수요 압박 상태
            </h1>
            <p className="mt-4 max-w-4xl break-keep text-base leading-7 text-slate-600">
              서울 citydata, TOPIS, KMA, 대중교통 OD, OSM을 결합해 다음
              1시간의 이동수요 proxy와 도로 압박을 계산합니다. 이 값은
              실제 택시 호출량이나 기사 공급량이 아니라, 공개 데이터로
              관측 가능한 신호를 모은 우선 관찰 지표입니다.
            </p>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-xs font-black tracking-normal text-slate-400">
              최근 갱신
            </p>
            <div className="mt-4 space-y-3">
              <MiniStat
                label="수집 스냅샷"
                value={formatKst(dataSummary.citydata?.collected_at)}
                detail={`${dataSummary.citydata?.place_count ?? poiFeatures.live_poi_count}개 POI`}
              />
              <MiniStat
                label="예측 대상"
                value={formatKst(forecast.target_datetime)}
                detail={`입력 ${formatKst(forecast.feature_datetime)}`}
              />
              <MiniStat
                label="현재 최대 인구"
                value={topPopulationLabel}
                detail={`${topPopulation?.congestion_level ?? "-"} · ${topPopulation?.traffic_speed_kmh ?? "-"}km/h`}
              />
            </div>
          </aside>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            detail={`${modelSummary.feature_table.period.start.slice(0, 10)}~${modelSummary.feature_table.period.end.slice(0, 10)} hourly 공개 feature`}
            icon={<Database className="h-4 w-4" />}
            label="학습 데이터"
            value={`${formatNumber(modelSummary.feature_table.rows)} rows`}
          />
          <MetricCard
            detail={`패턴 대비 MAE ${formatPercent(
              demandGuardrail.global_baseline_readiness
                .model_vs_pattern_mae_improvement_pct,
              1,
            )} 개선`}
            icon={<BarChart3 className="h-4 w-4" />}
            label="수요 confidence"
            value={formatScore(
              demandGuardrail.global_baseline_readiness
                .baseline_strength_score,
              3,
            )}
          />
          <MetricCard
            detail={`도로 검증 ${roadComparison.completed_count}건 완료`}
            icon={<Activity className="h-4 w-4" />}
            label="도로 예측 오차"
            value={formatScore(latestRoad?.overall.congestion_mae, 3)}
          />
          <MetricCard
            detail={`${populationPressure.coverage.covered_dong_count}개 동, ${populationPressure.coverage.live_poi_count}개 live POI 집계`}
            icon={<Users className="h-4 w-4" />}
            label="생활·유동인구 proxy"
            value={`${formatNumber(populationPressure.overall.forecast_population_mid_sum)}명`}
          />
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Section eyebrow="수요 전망" title="다음 1시간 수요 proxy">
            <BriefingList rows={topDemandRegions} type="demand" />
          </Section>
          <Section eyebrow="도로 전망" title="다음 1시간 도로 압박">
            <BriefingList rows={topTrafficRegions} type="traffic" />
          </Section>
          <Section eyebrow="생활·유동인구" title="POI 인구 1시간 예측">
            <PopulationDongList rows={topPopulationDongs} />
          </Section>
          <Section eyebrow="장소 현황" title="POI 현재 압박">
            <BriefingList rows={topPoiRows} type="poi" />
          </Section>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Section eyebrow="동작 흐름" title="지금 실제로 돌아가는 계산">
            <ol className="space-y-3 text-sm leading-7 text-slate-700">
              {[
                "실시간 citydata, KMA 날씨, 도로 링크 상태를 수집해 현재 feature를 갱신합니다.",
                "택시 호출 원자료가 없기 때문에 대중교통·생활인구·도로·날씨 기반 이동수요 proxy를 예측합니다.",
                "citydata POI의 1시간 인구 예측을 행정동 coverage로 묶어 생활·유동인구 pressure를 계산합니다.",
                "수요 proxy와 도로 혼잡 예측을 결합해 동별 pressure ranking을 계산합니다.",
                "검증은 택시 콜 정확도가 아니라 이후 공개 관측 신호와의 방향성·오차 점검입니다.",
              ].map((item, index) => (
                <li
                  key={item}
                  className="grid grid-cols-[28px_1fr] gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <span className="text-sm font-black tabular-nums text-slate-400">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section eyebrow="검증" title="예측 후 점검되는 값">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat
                detail={`${topGuardrailDongs[0]?.confidence_level ?? "-"} confidence`}
                label="우선 관찰 1순위"
                value={topGuardrailDongs[0]?.dong_name ?? "-"}
              />
              <MiniStat
                detail={`confidence 가중 pressure`}
                label="guardrail 점수"
                value={formatScore(
                  topGuardrailDongs[0]?.monitoring_priority_score,
                  3,
                )}
              />
              <MiniStat
                detail={`Top ${latestRoad?.overall.top_predicted_congestion_dong ?? "-"} / 관측 ${latestRoad?.overall.top_actual_congestion_dong ?? "-"}`}
                label="도로 혼잡 MAE"
                value={formatScore(latestRoad?.overall.congestion_mae, 3)}
              />
              <MiniStat
                detail={`평균 속도 오차`}
                label="도로 속도 MAE"
                value={`${formatNumber(latestRoad?.overall.speed_mae_kmh, 1)}km/h`}
              />
              <MiniStat
                detail={`관측 기준은 도로 혼잡, 택시 콜 아님`}
                label="수요 방향성"
                value={formatScore(latestDemand?.overall.spearman_r, 3)}
              />
              <MiniStat
                detail={`패턴 baseline 대비 MAE 개선`}
                label="모델 vs 패턴"
                value={formatPercent(
                  baselineReadiness.supervised_2025_holdout
                    .model_vs_pattern_mae_improvement_pct,
                  1,
                )}
              />
              <MiniStat
                detail={`2026 proxy ${formatNumber(
                  baselineReadiness.observed_2026_proxy_check.row_count,
                )} rows`}
                label="사후 순위검증"
                value={formatScore(
                  baselineReadiness.observed_2026_proxy_check.spearman_r,
                  3,
                )}
              />
              <MiniStat
                detail={`혼잡도 단계 일치율`}
                label="POI 성적표"
                value={formatPercent(
                  latestPoi?.overall.congestion_level_accuracy_pct,
                )}
              />
              <MiniStat
                detail={`완료 ${populationPressure.validation.completed_count}건 / 대기 ${populationPressure.validation.waiting_count}건`}
                label="생활·유동 검증"
                value={
                  populationPressure.validation.latest_kind === "completed"
                    ? formatNumber(populationPressure.validation.population_mae)
                    : "대기"
                }
              />
              <MiniStat
                detail={`공개 pressure 기준값 row ${latestPublicPressure?.overall.row_count ?? "-"}`}
                label="pressure 방향성"
                value={formatScore(
                  latestPublicPressure?.overall
                    .priority_vs_public_pressure_spearman,
                  3,
                )}
              />
              <MiniStat
                detail={`완료 ${publicPressureComparison.completed_count}건 / 대기 ${publicPressureComparison.waiting_count}건`}
                label="공개 기준 비교"
                value={
                  latestPublicPressure?.overall.same_top_dong ? "Top 일치" : "Top 다름"
                }
              />
            </div>
            <div className="mt-4">
              <GuardrailList rows={topGuardrailDongs} />
            </div>
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-950">
              pressure 점수는 수요, 도로 혼잡, 속도, 접근성을 합산한 보조 지표입니다.
              도로 혼잡 하나만으로 정답 라벨을 만들 수 없으므로 Spearman은 보조
              신호로만 해석합니다.
            </p>
          </Section>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Section eyebrow="해석 범위" title="현재 가능한 해석과 아닌 것">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-900">
                  <ShieldCheck className="h-4 w-4" />
                  현재 되는 것
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-950">
                  공개 데이터 기반 이동수요 대리 지표, 도로 혼잡 전망,
                  생활·유동인구 pressure proxy, 우선 관찰 지역 ranking.
                </p>
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-center gap-2 text-sm font-black text-rose-900">
                  <Timer className="h-4 w-4" />
                  현재 범위 밖
                </div>
                <p className="mt-2 text-sm leading-6 text-rose-950">
                  직접 호출량, 실제 차량 공급량 최적화, 운영 배차 지시는
                  현재 데이터와 모델 검증 범위에 포함하지 않습니다.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              라이브 모델은 현재 사용 가능한 feature만 씁니다.{" "}
              {offlineModel
                ? `사후 관측 feature를 포함한 오프라인 상한은 R2 ${formatScore(
                    offlineModel.metrics.r2,
                    3,
                  )}이고, 라이브 모델은 R2 ${formatScore(
                    liveModel?.metrics.r2,
                    3,
                  )}입니다.`
                : `라이브 모델 R2는 ${formatScore(liveModel?.metrics.r2, 3)}입니다.`}
            </div>
          </Section>

          <Section eyebrow="결과 파일" title="현재 앱이 읽는 산출물">
            <div className="grid gap-2 sm:grid-cols-2">
              {artifactLinks.map((item) => (
                <a
                  key={item.href}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                  href={item.href}
                >
                  <span>{item.label}</span>
                  <FileJson className="h-4 w-4" />
                </a>
              ))}
            </div>
            <a
              className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
              href="/a-eye-presentation/index.html"
            >
              분석 이미지 열기
            </a>
          </Section>
        </section>

        <Section eyebrow="출처" title="공식 출처">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {officialSources.map((source) => (
              <a
                key={source.href}
                className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                href={source.href}
                rel="noreferrer"
                target="_blank"
              >
                <p className="text-sm font-black text-slate-950">{source.name}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {source.provider}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {source.use}
                </p>
              </a>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
