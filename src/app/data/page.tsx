import dataSummaryJson from "../../../public/data-summary.json";
import featureSnapshotJson from "../../../public/feature-snapshot.json";
import forecastJson from "../../../public/forecast/latest.json";
import modelObservabilityJson from "../../../public/model-observability.json";
import modelSummaryJson from "../../../public/model-summary.json";
import taxiPressureComparisonJson from "../../../public/taxi-pressure-comparison.json";
import taxiPressureJson from "../../../public/taxi-pressure/latest.json";
import trafficForecastComparisonJson from "../../../public/traffic-forecast-comparison.json";
import trafficForecastJson from "../../../public/traffic-forecast/latest.json";
import trafficForecastSummaryJson from "../../../public/traffic-forecast-summary.json";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CloudSun,
  Database,
  FileText,
  GitBranch,
  MapPin,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Signal,
  Timer,
} from "lucide-react";
import RefreshForecastControl from "./RefreshForecastControl";

export const metadata: Metadata = {
  title: "데이터 현황 | A-Eye",
};

type CitydataPlace = {
  area_name: string;
  congestion_level: string;
  population_min: number;
  population_max: number;
  traffic_index: string;
  traffic_speed_kmh: number | null;
  precipitation_type: string;
  temperature_c: number | null;
  observed_at: string | null;
};

type DataSummary = {
  generated_at: string | null;
  citydata: {
    collected_at: string | null;
    source: string;
    place_count: number;
    top_population: CitydataPlace | null;
    places: CitydataPlace[];
  };
  forecast?: {
    target_datetime: string | null;
    strategy: string | null;
    feature_set?: string | null;
    model_feature_set?: string | null;
    generated_at: string | null;
    region_count?: number | null;
  };
  features?: {
    generated_at: string | null;
    row_count: number;
  };
};

type ForecastRegion = {
  dong_name: string;
  score: number;
  confidence: number | null;
  raw_prediction: number | null;
};

type ForecastStatus = {
  target_datetime: string | null;
  feature_datetime?: string | null;
  strategy: string | null;
  pattern_cache_used?: boolean;
  weather_override_applied?: boolean;
  generated_at: string | null;
  calendar?: {
    weekday?: string | null;
    day_type?: string | null;
    is_holiday?: string | null;
    holiday_names?: string | null;
  };
  regions: ForecastRegion[];
};

type FeatureRow = {
  area_name: string;
  live_population_mid: number;
  congestion_level: string;
  traffic_index: string;
  traffic_speed_kmh: number | null;
  kma_temperature_c: number | null;
  kma_precipitation_mm_1h: number | null;
  kma_humidity_pct: number | null;
  kma_wind_speed_ms: number | null;
  subway_station_count: number;
  bus_stop_count: number;
  event_count: number;
  demand_proxy_score: number;
};

type FeatureStatus = {
  generated_at: string | null;
  row_count: number;
  weather_status: {
    kma_ok: boolean;
    kma_status?: number | string | null;
    kma_error?: string | null;
  };
  kma_nowcast?: {
    temperature_c?: number | null;
    precipitation_mm_1h?: number | null;
    humidity_pct?: number | null;
    wind_speed_ms?: number | null;
  };
  features: FeatureRow[];
};

type ModelRow = {
  name: string;
  role: string;
  algorithm: string;
  feature_count: number;
  live_usable: boolean;
  metrics: {
    r2: number | null;
    mape_pct: number | null;
    mae?: number | null;
    rmse?: number | null;
  };
  uses?: string[];
  excludes?: string[];
  caveat?: string;
};

type ModelSummary = {
  target_area: {
    dong_count: number;
    dongs: string[];
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
    horizon_hours: number;
    interpretation: string;
  };
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

type FeatureImportance = {
  rank: number;
  feature: string;
  importance_mean: number;
  normalized_importance: number;
};

type ObservedValidation2026 = {
  row_count: number;
  normalized_row_count: number;
  dongs: string[];
  date_range: {
    start: string;
    end: string;
  };
  overall: {
    spearman_r: number | null;
    pearson_r: number | null;
    per_dong_spearman_mean?: number | null;
    normalized_mape_pct?: number | null;
  };
  per_dong: Array<{
    dong_name: string;
    spearman_r: number | null;
    row_count: number;
    normalized_mape_pct: number | null;
  }>;
};

type TrafficForecastRegion = {
  dong_name: string;
  predicted_traffic_volume_proxy: number;
  predicted_traffic_volume_score: number;
  predicted_congestion_score: number;
  predicted_avg_speed_kmh: number;
  current_congestion_score: number | null;
  current_avg_speed_kmh: number | null;
  current_link_count: number | null;
};

type TrafficForecastStatus = {
  generated_at: string | null;
  target_datetime: string | null;
  feature_datetime: string | null;
  model_target: string;
  note: string;
  regions: TrafficForecastRegion[];
};

type TrafficForecastSummary = {
  generated_at: string | null;
  target: string;
  horizon_hours: number;
  overall: {
    r2: number | null;
    mae: number | null;
    rmse: number | null;
    mape_pct: number | null;
  };
  baselines: {
    current_hour_persistence: {
      r2: number | null;
      mape_pct: number | null;
    };
    same_hour_previous_day: {
      r2: number | null;
      mape_pct: number | null;
    };
  };
};

type CompletedTrafficComparison = {
  kind: "completed";
  target_datetime: string | null;
  actual_observed_at: string | null;
  overall: {
    congestion_mae: number | null;
    speed_mae_kmh: number | null;
    congestion_rank_spearman: number | null;
    top_predicted_congestion_dong: string | null;
    top_actual_congestion_dong: string | null;
    same_top_congestion_dong: boolean | null;
  };
};

type WaitingTrafficComparison = {
  kind: "waiting";
  target_datetime: string | null;
  top_predicted_congestion_dong: string | null;
  top_predicted_congestion_score: number | null;
  status: "waiting_for_target_time" | "waiting_for_observed_snapshot" | string;
};

type TrafficForecastComparison = {
  generated_at: string | null;
  status: string | null;
  log_count: number;
  completed_count: number;
  waiting_count: number;
  latest: CompletedTrafficComparison | WaitingTrafficComparison | null;
};

type TaxiPressureRegion = {
  dong_name: string;
  taxi_pressure_score: number;
  dispatch_priority_score: number;
  predicted_movement_demand_score: number;
  predicted_traffic_volume_score: number;
  predicted_congestion_score: number;
  predicted_avg_speed_kmh: number;
  road_accessibility_score: number;
  action_level: string;
  incentive_multiplier: number;
};

type TaxiPressureStatus = {
  generated_at: string | null;
  target_datetime: string | null;
  feature_datetime: string | null;
  model_type: string;
  interpretation: string;
  regions: TaxiPressureRegion[];
};

type CompletedTaxiPressureComparison = {
  kind: "completed";
  target_datetime: string | null;
  overall: {
    priority_vs_congestion_rank_spearman: number | null;
    top_predicted_priority_dong: string | null;
    top_actual_congestion_dong: string | null;
    same_top_dong: boolean | null;
  };
};

type WaitingTaxiPressureComparison = {
  kind: "waiting";
  target_datetime: string | null;
  top_predicted_priority_dong: string | null;
  top_predicted_priority_score: number | null;
  status: "waiting_for_target_time" | "waiting_for_observed_snapshot" | string;
};

type TaxiPressureComparison = {
  generated_at: string | null;
  status: string | null;
  log_count: number;
  completed_count: number;
  waiting_count: number;
  latest: CompletedTaxiPressureComparison | WaitingTaxiPressureComparison | null;
};

type ModelObservability = {
  generated_at: string | null;
  feature_importance: {
    feature_count: number;
    top_features: FeatureImportance[];
  };
  live_validation: {
    log_count: number;
    latest_generated_at: string | null;
    latest_target_datetime: string | null;
    latest_strategy: string | null;
    latest_top_region: string | null;
  };
  observed_validation_2026?: ObservedValidation2026 | null;
};

const dataSummary = dataSummaryJson as DataSummary;
const forecast = forecastJson as ForecastStatus;
const featureSnapshot = featureSnapshotJson as FeatureStatus;
const modelSummary = modelSummaryJson as ModelSummary;
const observability = modelObservabilityJson as ModelObservability;
const taxiPressure = taxiPressureJson as TaxiPressureStatus;
const taxiPressureComparison = taxiPressureComparisonJson as TaxiPressureComparison;
const trafficForecast = trafficForecastJson as TrafficForecastStatus;
const trafficForecastSummary = trafficForecastSummaryJson as TrafficForecastSummary;
const trafficForecastComparison = trafficForecastComparisonJson as TrafficForecastComparison;

function formatKst(value?: string | null) {
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

function formatSeoulLocal(value?: string | null) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    const [date, time] = value.split(" ");
    const [year, month, day] = date.split("-");
    return `${year}. ${month}. ${day}. ${time}`;
  }
  return formatKst(value);
}

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatMetric(value?: number | null, digits = 3) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function populationLabel(place?: CitydataPlace | null) {
  if (!place) return "-";
  return `${formatNumber(place.population_min)}~${formatNumber(place.population_max)}명`;
}

function strategyLabel(strategy?: string | null) {
  if (strategy === "exact") return "실시간 feature 기반";
  if (strategy === "pattern") return "과거 패턴 + 현재 맥락";
  if (strategy === "model") return "모델 예측";
  return strategy ?? "-";
}

function scoreWidthClass(value?: number | null) {
  const score = value ?? 0;
  if (score >= 0.9) return "w-full";
  if (score >= 0.75) return "w-5/6";
  if (score >= 0.6) return "w-2/3";
  if (score >= 0.45) return "w-1/2";
  if (score >= 0.3) return "w-1/3";
  if (score >= 0.15) return "w-1/5";
  if (score > 0) return "w-[8%]";
  return "w-0";
}

function featureLabel(feature: string) {
  const labels: Record<string, string> = {
    hour: "시간대",
    day_type: "평일/주말/공휴일",
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

function modelLabel(name: string) {
  if (name === "full_observed") return "Full 검증 모델";
  if (name === "live_compatible_calendar_weather_static") return "Live-compatible 모델";
  return name;
}

function trafficComparisonStatusLabel(comparison: TrafficForecastComparison) {
  const latest = comparison.latest;
  if (!latest) return "예측 없음";
  if (latest.kind === "completed") return "비교 완료";
  if (latest.status === "waiting_for_target_time") return "검증 대기";
  return "실제 도로 관측 대기";
}

function trafficComparisonTitle(comparison: TrafficForecastComparison) {
  const latest = comparison.latest;
  if (!latest) return "아직 비교할 도로 예측 로그가 없습니다.";
  if (latest.kind === "completed") {
    return `${formatKst(latest.target_datetime)} 도로 예측과 ${formatKst(
      latest.actual_observed_at,
    )} 관측을 비교했습니다.`;
  }
  return `${formatKst(latest.target_datetime)} 도로 예측은 ${trafficComparisonStatusLabel(
    comparison,
  )}입니다.`;
}

function trafficActualLabel(latest: TrafficForecastComparison["latest"]) {
  if (!latest) return "-";
  if (latest.kind === "completed") return latest.overall.top_actual_congestion_dong ?? "-";
  if (latest.status === "waiting_for_target_time") return "아직 없음";
  return "매칭 대기";
}

function trafficGapLabel(latest: TrafficForecastComparison["latest"]) {
  if (!latest || latest.kind !== "completed") return "계산 대기";
  return `${formatMetric(latest.overall.speed_mae_kmh, 1)}km/h`;
}

function taxiPressureValidationLabel(comparison: TaxiPressureComparison) {
  const latest = comparison.latest;
  if (!latest) return "예측 없음";
  if (latest.kind === "completed") return "비교 완료";
  if (latest.status === "waiting_for_target_time") return "검증 대기";
  return "실제 관측 대기";
}

const places = [...dataSummary.citydata.places];
const taxiPressureRows = [...taxiPressure.regions].sort(
  (left, right) => right.dispatch_priority_score - left.dispatch_priority_score,
);
const topTaxiPressure = taxiPressureRows[0] ?? null;
const trafficForecastRows = [...trafficForecast.regions].sort(
  (left, right) => right.predicted_congestion_score - left.predicted_congestion_score,
);
const topTrafficForecast = trafficForecastRows[0] ?? null;
const topFeatures = [...featureSnapshot.features]
  .sort((left, right) => right.demand_proxy_score - left.demand_proxy_score)
  .slice(0, 4);
const featureImportance = observability.feature_importance.top_features.slice(0, 8);
const validation2026 = observability.observed_validation_2026 ?? null;
const latestTrafficComparison = trafficForecastComparison.latest;
const trafficComparison = trafficComparisonStatusLabel(trafficForecastComparison);

export default function DataStatusPage() {
  return (
    <main className="h-screen overflow-y-auto bg-transparent text-slate-100 selection:bg-cyan-400/30">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link
            href="/"
            className="whitespace-nowrap rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/5 sm:px-4 sm:text-sm"
          >
            ← 맵으로
          </Link>
          <div className="min-w-0 truncate text-xs font-black tracking-[0.18em] text-cyan-200 sm:text-sm sm:tracking-[0.24em]">
            <span className="hidden sm:inline">A-EYE DATA STATUS</span>
            <span className="sm:hidden">DATA</span>
          </div>
          <Link
            href="/presentation"
            className="whitespace-nowrap rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/5 sm:px-4 sm:text-sm"
          >
            발표 자료
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:py-10">
        <header className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="text-sm font-bold text-cyan-300">Hourly Prediction Check</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
              예측값과 실제 관측값을 비교합니다.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
              한 시간마다 현재 API 값을 수집해 9개 동의 1시간 뒤 이동수요 proxy와 도로
              교통량/혼잡도를 예측하고, 시간이 지난 뒤 들어오는 실제 관측값과 맞춰봅니다.
              지금 페이지의 목적은 “예측을 얼마나 그럴듯하게 냈는지”와 “실제값과 얼마나
              차이 나는지”를 확인하는 것입니다.
            </p>
          </div>

          <section className="rounded-2xl border border-cyan-500/20 bg-cyan-50 p-5">
            <div className="flex items-center gap-2 text-cyan-900">
              <ShieldCheck className="h-5 w-5" />
              <p className="font-black">현재 공개 범위</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              브라우저에는 API 키가 노출되지 않습니다. GitHub Actions가 서버 쪽에서 수집하고,
              Cloudflare에는 예측값과 관측 요약 JSON만 배포합니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">공간 단위</p>
                <p className="font-bold text-slate-800">{modelSummary.target_area.dong_count}개 행정동</p>
              </div>
              <div>
                <p className="text-slate-500">예측 시점</p>
                <p className="font-bold text-slate-800">{formatKst(forecast.target_datetime)}</p>
              </div>
              <div>
                <p className="text-slate-500">예측 방식</p>
                <p className="font-bold text-slate-800">{strategyLabel(forecast.strategy)}</p>
              </div>
              <div>
                <p className="text-slate-500">검증 상태</p>
                <p className="font-bold text-slate-800">{trafficComparison}</p>
              </div>
            </div>
          </section>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-4">
          <FlowCard
            icon={<Radio className="h-5 w-5" />}
            eyebrow="1. 예측값 저장"
            title="1시간 뒤 수요 proxy 예측"
            body={`${dataSummary.citydata.place_count}개 주요 장소의 현재 인구, 혼잡도, 도로 속도, 날씨를 모델 입력으로 사용합니다.`}
            footer={`예측 target: ${formatKst(forecast.target_datetime)}`}
          />
          <FlowCard
            icon={<Database className="h-5 w-5" />}
            eyebrow="2. 도로 예측"
            title="1시간 뒤 교통량/혼잡도 예측"
            body="TOPIS 3년 교통량 proxy 모델과 현재 citydata 속도/혼잡도를 결합해 동별 도로 상태를 예측합니다."
            footer={`도로 target: ${formatKst(trafficForecast.target_datetime)}`}
          />
          <FlowCard
            icon={<Signal className="h-5 w-5" />}
            eyebrow="3. 차이 계산"
            title="예측값과 실제값 비교"
            body="target 시간이 지난 뒤 들어온 API 관측값과 예측값을 매칭해 속도 MAE와 혼잡도 rank 차이를 누적합니다."
            footer={`도로 모델 MAPE: ${formatMetric(trafficForecastSummary.overall.mape_pct, 1)}%`}
          />
          <FlowCard
            icon={<Route className="h-5 w-5" />}
            eyebrow="4. 배차 판단"
            title="택시 배차 pressure 모델"
            body="수요 proxy, 교통량, 혼잡도, 도로 접근성을 결합해 1시간 뒤 우선 배차가 필요한 동을 순위화합니다."
            footer={`pressure top: ${topTaxiPressure?.dong_name ?? "-"}`}
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel>
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-bold text-cyan-600">API 키로 실제로 하는 일</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">수집 → 예측 → 관측 → 비교</h2>
              </div>
              <RefreshCw className="h-6 w-6 text-cyan-600" />
            </div>

            <div className="mt-6 space-y-4">
              <PipelineStep
                icon={<MapPin className="h-4 w-4" />}
                label="SEOUL_OPEN_API_KEY"
                title="현재 실제 관측값 수집"
                body="강남역, 역삼역 등 7개 거점의 생활인구, 혼잡도, 도로 속도를 가져와 현재 상태를 기록합니다."
              />
              <PipelineStep
                icon={<CloudSun className="h-4 w-4" />}
                label="KMA_API_KEY / DATA_GO_KR_API_KEY"
                title="날씨 스냅샷 수집"
                body="기온, 강수, 습도, 풍속을 모델 입력으로 결합하고, 같은 값을 나중에 실제 관측값으로도 남깁니다."
              />
              <PipelineStep
                icon={<BarChart3 className="h-4 w-4" />}
                label="MODEL ARTIFACT"
                title="1시간 뒤 예측값 생성"
                body="시간, 날씨, 공휴일, 정적 공간 특성과 과거 패턴을 사용해 9개 동의 수요 proxy score를 계산합니다."
              />
              <PipelineStep
                icon={<GitBranch className="h-4 w-4" />}
                label="CLOUDFLARE_API_TOKEN"
                title="예측/관측 로그 공개"
                body="예측값과 현재 관측 요약을 JSON으로 배포하고, target 시간이 지난 뒤 실제값과 비교할 수 있게 누적합니다."
              />
            </div>
          </Panel>

          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-amber-600 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  도로 교통량/혼잡도 예측과 검증 상태
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {trafficComparisonTitle(trafficForecastComparison)}
                </h2>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900">
                TOPIS ML + citydata 보정
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <MetricTile
                label="예측 혼잡 상위"
                value={
                  latestTrafficComparison?.kind === "completed"
                    ? latestTrafficComparison.overall.top_predicted_congestion_dong ?? "-"
                    : latestTrafficComparison?.top_predicted_congestion_dong ?? topTrafficForecast?.dong_name ?? "-"
                }
                insight={`혼잡 score ${
                  latestTrafficComparison?.kind === "waiting" &&
                  latestTrafficComparison.top_predicted_congestion_score != null
                    ? latestTrafficComparison.top_predicted_congestion_score.toFixed(3)
                    : formatMetric(topTrafficForecast?.predicted_congestion_score, 3)
                }`}
              />
              <MetricTile
                label="실제 도로값"
                value={trafficActualLabel(latestTrafficComparison)}
                insight="target 시간 이후 citydata"
              />
              <MetricTile
                label="속도 오차"
                value={trafficGapLabel(latestTrafficComparison)}
                insight="비교 완료 후 MAE 표시"
              />
              <MetricTile
                label="모델 검증"
                value={`${formatMetric(trafficForecastSummary.overall.mape_pct, 1)}%`}
                insight="2026 Q1 TOPIS MAPE"
              />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">해석</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                도로 교통량 proxy는 TOPIS 동·시간별 교통량으로 학습한 ML 모델의 예측값입니다.
                혼잡도와 평균속도는 현재 citydata 도로 관측값으로 보정한 live estimate이며,
                target 시간이 지난 뒤 새 API 관측값이 들어오면 실제값과 오차를 계산합니다.
              </p>
            </div>
          </Panel>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-600">현재 실제 관측값</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">API가 방금 읽은 값</h2>
              </div>
              <p className="text-sm text-slate-500">수집 {formatKst(dataSummary.citydata.collected_at)}</p>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-y border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">장소</th>
                    <th className="px-4 py-3">생활인구</th>
                    <th className="px-4 py-3">혼잡도</th>
                    <th className="px-4 py-3">도로</th>
                    <th className="px-4 py-3">날씨</th>
                    <th className="px-4 py-3">관측</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {places.map((place) => (
                    <tr key={place.area_name} className="text-slate-700">
                      <td className="px-4 py-3 font-bold text-slate-950">{place.area_name}</td>
                      <td className="px-4 py-3">{populationLabel(place)}</td>
                      <td className="px-4 py-3">{place.congestion_level}</td>
                      <td className="px-4 py-3">
                        {place.traffic_index} · {place.traffic_speed_kmh ?? "-"}km/h
                      </td>
                      <td className="px-4 py-3">
                        {place.precipitation_type} · {place.temperature_c ?? "-"}°C
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatSeoulLocal(place.observed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-600">Feature snapshot</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">모델 입력으로 바뀐 값</h2>
              </div>
              <FileText className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="mt-5 space-y-4">
              {topFeatures.map((row) => (
                <div key={row.area_name} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-bold text-slate-950">{row.area_name}</p>
                    <p className="text-sm font-bold text-emerald-700">
                      proxy {(row.demand_proxy_score * 100).toFixed(1)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    인구 {formatNumber(row.live_population_mid)} · 지하철 {row.subway_station_count} ·
                    버스 {row.bus_stop_count} · 이벤트 {row.event_count}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-rose-600">최종 배차 판단</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">택시 배차 pressure</h2>
              </div>
              <ShieldCheck className="h-6 w-6 text-rose-600" />
            </div>
            <div className="mt-5 space-y-3">
              {taxiPressureRows.slice(0, 6).map((row) => (
                <div
                  key={row.dong_name}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black text-slate-950">{row.dong_name}</p>
                    <p className="text-sm font-bold text-rose-700">
                      {(row.dispatch_priority_score * 100).toFixed(0)}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    demand {(row.predicted_movement_demand_score * 100).toFixed(0)} · traffic{" "}
                    {(row.predicted_traffic_volume_score * 100).toFixed(0)} · access{" "}
                    {(row.road_accessibility_score * 100).toFixed(0)} · {row.action_level}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500">
              검증 상태: {taxiPressureValidationLabel(taxiPressureComparison)}
            </p>
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-amber-600">1시간 뒤 도로 예측</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">동별 교통량/혼잡도 forecast</h2>
              </div>
              <Route className="h-6 w-6 text-amber-600" />
            </div>
            <div className="mt-5 space-y-3">
              {trafficForecastRows.slice(0, 6).map((row) => (
                <div
                  key={row.dong_name}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black text-slate-950">{row.dong_name}</p>
                    <p className="text-sm font-bold text-amber-700">
                      {row.predicted_avg_speed_kmh.toFixed(1)}km/h
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    예상 혼잡 {formatMetric(row.predicted_congestion_score)} · 교통량 proxy{" "}
                    {formatNumber(row.predicted_traffic_volume_proxy)} · 현재{" "}
                    {row.current_avg_speed_kmh == null ? "-" : `${row.current_avg_speed_kmh.toFixed(1)}km/h`}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-600">1시간 뒤 수요 예측</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">9개 동 상대 score</h2>
              </div>
              <Timer className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="mt-5 space-y-4">
              {forecast.regions.map((region) => (
                <div key={region.dong_name} className="grid grid-cols-[88px_1fr_58px] items-center gap-3">
                  <p className="text-sm font-bold text-slate-800">{region.dong_name}</p>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full bg-cyan-500 ${scoreWidthClass(region.score)}`}
                    />
                  </div>
                  <p className="text-right text-sm font-bold text-cyan-700">
                    {(region.score * 100).toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <details className="mt-8 rounded-2xl border border-slate-200 bg-white/95 shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
          <summary className="cursor-pointer px-5 py-4 text-sm font-black text-slate-800">
            기술 검증 자세히 보기
          </summary>
          <div className="grid gap-6 border-t border-slate-200 p-5 xl:grid-cols-2">
            <section>
              <h3 className="text-lg font-black text-slate-900">모델 성능 비교</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-y border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">모델</th>
                      <th className="px-3 py-3">Feature</th>
                      <th className="px-3 py-3">R²</th>
                      <th className="px-3 py-3">MAPE</th>
                      <th className="px-3 py-3">Live</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modelSummary.models.map((model) => (
                      <tr key={model.name} className="text-slate-700">
                        <td className="px-3 py-3 font-bold text-slate-950">{modelLabel(model.name)}</td>
                        <td className="px-3 py-3">{model.feature_count}</td>
                        <td className="px-3 py-3">{formatMetric(model.metrics.r2, 4)}</td>
                        <td className="px-3 py-3">{formatMetric(model.metrics.mape_pct, 1)}%</td>
                        <td className="px-3 py-3">{model.live_usable ? "가능" : "불가"}</td>
                      </tr>
                    ))}
                    <tr className="text-slate-400">
                      <td className="px-3 py-3 font-bold">Persistence baseline</td>
                      <td className="px-3 py-3">-</td>
                      <td className="px-3 py-3">
                        {formatMetric(modelSummary.baseline.persistence.metrics.r2, 4)}
                      </td>
                      <td className="px-3 py-3">
                        {formatMetric(modelSummary.baseline.persistence.metrics.mape_pct, 1)}%
                      </td>
                      <td className="px-3 py-3">기준선</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900">왜 이 모델이 움직이는가</h3>
              <div className="mt-4 space-y-3">
                {featureImportance.map((feature) => (
                  <div key={feature.feature} className="grid grid-cols-[132px_1fr_52px] items-center gap-3 text-sm">
                    <p className="font-bold text-slate-700">{featureLabel(feature.feature)}</p>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className={`h-2 rounded-full bg-emerald-500 ${scoreWidthClass(
                          feature.normalized_importance,
                        )}`}
                      />
                    </div>
                    <p className="text-right text-slate-400">
                      {(feature.normalized_importance * 100).toFixed(0)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900">예측값 vs 실측값 검증</h3>
              {validation2026 ? (
                <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                  <MetricTile label="기간" value={`${validation2026.date_range.start} ~ ${validation2026.date_range.end}`} />
                  <MetricTile label="관측 행" value={`${formatNumber(validation2026.normalized_row_count)}건`} />
                  <MetricTile label="예측-실측 Spearman" value={formatMetric(validation2026.overall.spearman_r, 3)} />
                  <MetricTile label="동별 평균 Spearman" value={formatMetric(validation2026.overall.per_dong_spearman_mean, 3)} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">아직 공개된 2026 검증 결과가 없습니다.</p>
              )}
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900">예측 로그 누적</h3>
              <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <MetricTile label="누적 횟수" value={`${formatNumber(observability.live_validation.log_count)}회`} />
                <MetricTile label="최근 예측" value={formatKst(observability.live_validation.latest_target_datetime)} />
                <MetricTile label="최근 전략" value={strategyLabel(observability.live_validation.latest_strategy)} />
                <MetricTile label="최근 상위 동" value={observability.live_validation.latest_top_region ?? "-"} />
              </div>
            </section>
          </div>
        </details>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <RefreshForecastControl />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="font-black">발표 때 이렇게 말하면 됩니다</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              “한 시간마다 현재 API 값을 수집해 1시간 뒤 동별 이동수요 proxy를 예측하고,
              시간이 지난 뒤 들어오는 실제 관측값과 비교해 오차를 누적합니다. 택시 콜 수를
              직접 예측하는 것이 아니라, 공개 데이터로 검증 가능한 교통 수요 proxy를 추적합니다.”
            </p>
          </div>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">
          데이터 요약 생성 {formatKst(dataSummary.generated_at)} · 모델 산출물 생성{" "}
          {formatKst(observability.generated_at)}
        </footer>
      </div>
    </main>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80">
      {children}
    </section>
  );
}

function FlowCard({
  icon,
  eyebrow,
  title,
  body,
  footer,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  footer: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
          {icon}
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
      <p className="mt-5 border-t border-slate-100 pt-3 text-sm font-bold text-cyan-700">{footer}</p>
    </section>
  );
}

function PipelineStep({
  icon,
  label,
  title,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr] gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-100 bg-cyan-50 text-cyan-700">
        {icon}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className="mt-1 font-bold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function MetricTile({ label, value, insight }: { label: string; value: string; insight?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
      {insight && <p className="mt-1 text-[10px] text-cyan-700 font-medium">{insight}</p>}
    </div>
  );
}
