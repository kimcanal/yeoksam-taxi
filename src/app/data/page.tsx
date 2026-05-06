import dataCatalogJson from "../../../public/data-catalog.json";
import dataSummaryJson from "../../../public/data-summary.json";
import featureSnapshotJson from "../../../public/feature-snapshot.json";
import forecastJson from "../../../public/forecast/latest.json";
import liveForecastComparisonJson from "../../../public/live-forecast-comparison.json";
import modelObservabilityJson from "../../../public/model-observability.json";
import modelSummaryJson from "../../../public/model-summary.json";
import poiForecastComparisonJson from "../../../public/poi-forecast-comparison.json";
import poiFeaturesJson from "../../../public/poi-features.json";
import publicPressureBaselineJson from "../../../public/public-pressure-baseline-comparison.json";
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
import RelativeTime from "./RelativeTime";

export const metadata: Metadata = {
  title: "교통 데이터 운영 | 역삼권",
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

type DataCatalogSource = {
  name: string;
  provider: string;
  url: string;
  used_for: string;
  live_available: boolean;
  availability_note?: string;
};

type DataCatalogArtifact = {
  name: string;
  path: string;
  size: string;
  hosted: boolean;
  purpose: string;
};

type DataCatalog = {
  generated_at: string | null;
  distribution_policy: {
    full_dataset_hosted: boolean;
    reason: string;
    public_site_hosts: string[];
  };
  sources: DataCatalogSource[];
  artifacts: DataCatalogArtifact[];
};

type DataSummary = {
  generated_at: string | null;
  raw_citydata_path?: string | null;
  raw_weather_path?: string | null;
  raw_citydata_attempt_path?: string | null;
  raw_weather_attempt_path?: string | null;
  raw_citydata_attempt_meta?: {
    ok?: boolean;
    status?: number | string | null;
    error?: string | null;
    collected_at?: string | null;
    source?: string | null;
  } | null;
  raw_weather_attempt_meta?: {
    ok?: boolean;
    status?: number | string | null;
    error?: string | null;
    collected_at?: string | null;
    source?: string | null;
  } | null;
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
  pattern_cache_source?: string | null;
  feature_set?: string | null;
  model_feature_set?: string | null;
  model_target?: string | null;
  weather_override_applied?: boolean;
  generated_at: string | null;
  raw_prediction_unit?: string | null;
  proxy_source?: string | null;
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

type PoiFeatureRow = {
  source_status: string;
  poi_code: string;
  poi_name: string;
  area_name: string;
  coverage_dong: string | null;
  category: string | null;
  current_population_mid: number | null;
  current_congestion_level: string | null;
  current_congestion_score: number | null;
  current_traffic_index: string | null;
  current_traffic_speed_kmh: number | null;
  demand_proxy_score: number | null;
  poi_pressure_score: number | null;
  population_forecast_1h: {
    forecast_time: string | null;
    congestion_level: string | null;
    population_mid: number | null;
  } | null;
  forecast_population_delta: number | null;
  forecast_population_delta_pct: number | null;
  note?: string | null;
};

type PoiFeaturesStatus = {
  generated_at: string | null;
  citydata_collection_count: number;
  live_poi_count: number;
  supplemental_poi_count: number;
  row_count: number;
  direct_citydata_rows: PoiFeatureRow[];
  supplemental_watchlist: PoiFeatureRow[];
  top_live_poi: PoiFeatureRow | null;
  note: string;
};

type CompletedPoiForecastComparison = {
  kind: "completed";
  target_datetime: string | null;
  source_observed_at: string | null;
  overall: {
    forecast_row_count: number;
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
};

type WaitingPoiForecastComparison = {
  kind: "waiting";
  target_datetime: string | null;
  source_observed_at: string | null;
  forecast_row_count: number;
  matched_row_count: number;
  status: string;
};

type PoiForecastComparison = {
  generated_at: string | null;
  comparison_type: string;
  completed_count: number;
  waiting_count: number;
  latest: CompletedPoiForecastComparison | WaitingPoiForecastComparison | null;
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

type CompletedLiveForecastComparison = {
  kind: "completed";
  target_datetime: string | null;
  actual_observed_at: string | null;
  overall: {
    row_count: number | null;
    spearman_r: number | null;
    mean_abs_score_gap: number | null;
    top_forecast_dong: string | null;
    top_observed_congestion_dong: string | null;
    same_top_dong: boolean | null;
  };
  rows: Array<{
    dong_name: string;
    forecast_score: number;
    observed_congestion_score: number;
    observed_avg_speed_kmh: number | null;
    forecast_rank: number | null;
    observed_congestion_rank: number | null;
    score_gap: number;
    abs_score_gap: number;
    rank_gap: number | null;
  }>;
};

type WaitingLiveForecastComparison = {
  kind: "waiting";
  target_datetime: string | null;
  top_forecast_dong?: string | null;
  status: "waiting_for_target_time" | "waiting_for_observed_snapshot" | string;
};

type LiveForecastComparison = {
  generated_at: string | null;
  status: string | null;
  log_count: number;
  completed_count: number;
  waiting_count: number;
  latest: CompletedLiveForecastComparison | WaitingLiveForecastComparison | null;
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
  rows?: Array<{
    dong_name: string;
    predicted_congestion_score: number;
    actual_congestion_score: number;
    congestion_error: number;
    abs_congestion_error: number;
    predicted_avg_speed_kmh: number;
    actual_avg_speed_kmh: number;
    speed_error_kmh: number;
    abs_speed_error_kmh: number;
    predicted_congestion_rank: number | null;
    actual_congestion_rank: number | null;
  }>;
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
  horizon_hours?: number | null;
  source?: string;
  model_type: string;
  inputs?: Record<string, string>;
  formula?: Record<string, string>;
  interpretation: string;
  regions: TaxiPressureRegion[];
};

type CompletedTaxiPressureComparison = {
  kind: "completed";
  target_datetime: string | null;
  actual_observed_at: string | null;
  overall: {
    check_type?: string | null;
    row_count?: number | null;
    congestion_mae?: number | null;
    speed_mae_kmh?: number | null;
    priority_vs_road_congestion_spearman: number | null;
    pressure_vs_congestion_rank_spearman?: number | null;
    top_predicted_priority_dong: string | null;
    top_actual_congestion_dong: string | null;
    same_top_dong: boolean | null;
  };
  rows?: Array<{
    dong_name: string;
    predicted_dispatch_priority_score: number;
    predicted_taxi_pressure_score: number;
    actual_congestion_score: number;
    predicted_priority_rank: number | null;
    actual_congestion_rank: number | null;
    congestion_error: number;
  }>;
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
  check_type?: string | null;
  log_count: number;
  completed_count: number;
  waiting_count: number;
  latest: CompletedTaxiPressureComparison | WaitingTaxiPressureComparison | null;
};

type PublicPressureBaselineRow = {
  dong_name: string;
  predicted_dispatch_priority_score: number | null;
  predicted_priority_rank: number | null;
  observed_population_score: number | null;
  observed_congestion_score: number | null;
  observed_speed_score: number | null;
  observed_public_pressure: number | null;
  observed_pressure_rank: number | null;
};

type CompletedPublicPressureComparison = {
  kind: "completed";
  target_datetime: string | null;
  overall: {
    priority_vs_public_pressure_spearman: number | null;
    top_predicted_priority_dong: string | null;
    top_observed_public_pressure_dong: string | null;
    same_top_dong: boolean | null;
    row_count: number;
  };
  rows: PublicPressureBaselineRow[];
};

type WaitingPublicPressureComparison = {
  kind: "waiting";
  target_datetime: string | null;
  status: string;
};

type PublicPressureBaselineComparison = {
  generated_at: string | null;
  description: string;
  comparison_type: string;
  log_count: number;
  completed_count: number;
  waiting_count: number;
  latest: CompletedPublicPressureComparison | WaitingPublicPressureComparison | null;
  completed: CompletedPublicPressureComparison[];
  waiting: WaitingPublicPressureComparison[];
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

const dataCatalog = dataCatalogJson as DataCatalog;
const dataSummary = dataSummaryJson as DataSummary;
const forecast = forecastJson as ForecastStatus;
const featureSnapshot = featureSnapshotJson as FeatureStatus;
const poiForecastComparison = poiForecastComparisonJson as PoiForecastComparison;
const poiFeatures = poiFeaturesJson as PoiFeaturesStatus;
const liveForecastComparison = liveForecastComparisonJson as LiveForecastComparison;
const modelSummary = modelSummaryJson as ModelSummary;
const observability = modelObservabilityJson as ModelObservability;
const publicPressureBaseline = publicPressureBaselineJson as PublicPressureBaselineComparison;
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

function formatMonth(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 7);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatMetric(value?: number | null, digits = 3) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function formatSignedMetric(value?: number | null, digits = 3) {
  if (value == null || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function formatPercentScore(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}`;
}

function assetBasename(value?: string | null) {
  if (!value) return "-";
  const parts = value.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? value;
}

function populationLabel(place?: CitydataPlace | null) {
  if (!place) return "-";
  return `${formatNumber(place.population_min)}~${formatNumber(place.population_max)}명`;
}

function precipitationLabel(value?: string | null) {
  if (!value || value === "unknown") return "강수 확인 중";
  if (value === "없음" || value === "0") return "강수 없음";
  return value;
}

function weatherObservationLabel(place: CitydataPlace) {
  const temperature = place.temperature_c == null ? "기온 -" : `${place.temperature_c}°C`;
  return `${precipitationLabel(place.precipitation_type)} · ${temperature}`;
}

function strategyLabel(strategy?: string | null) {
  if (strategy === "exact") return "실시간 입력 기반";
  if (strategy === "pattern") return "과거 패턴 + 현재 맥락";
  if (strategy === "model") return "모델 예측";
  return strategy ?? "-";
}

function featureSetLabel(value?: string | null) {
  if (!value) return "-";
  const labels: Record<string, string> = {
    pattern_mean_from_historical_proxy_targets: "과거 같은 시간대 proxy 평균",
    node_only_fallback: "노드 입력 fallback",
    live_compatible_calendar_weather_static: "실시간 입력 + 달력/날씨/공간 특성",
    full_observed: "관측값 전체 입력",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function predictionUnitLabel(value?: string | null) {
  if (!value) return "-";
  if (value === "inbound_boardings_per_1k_pop (t+1h)") {
    return "1시간 뒤 인구 1천 명당 유입 승차량 proxy";
  }
  return value.replaceAll("_", " ");
}

function proxySourceLabel(value?: string | null) {
  if (!value) return "공개 데이터 기반 이동수요 proxy 예측";
  if (value === "Seoul transit OD-derived movement demand proxy (normalized by living population).") {
    return "서울 대중교통 OD에서 만든 이동수요 proxy(생활인구로 정규화)";
  }
  return value;
}

function actionLevelLabel(value?: string | null) {
  const labels: Record<string, string> = {
    high: "높음",
    medium: "중간",
    low: "낮음",
    hold: "유지",
  };
  return value ? labels[value] ?? value : "-";
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
  if (name === "full_observed") return "관측값 전체를 쓰는 비교 모델";
  if (name === "live_compatible_calendar_weather_static") return "실시간 입력만 쓰는 모델";
  return name;
}

function modelTargetLabel(value?: string | null) {
  if (!value) return "-";
  if (value === "target_inbound_boardings_per_1k_pop_t_plus_1h") {
    return "1시간 뒤 유입 이동수요 proxy / 인구 1천 명";
  }
  return value.replaceAll("_", " ");
}

function formulaLabel(key: string) {
  const labels: Record<string, string> = {
    taxi_pressure_score: "택시 배차 압박도",
    congestion_pressure: "혼잡 압박도",
    road_accessibility_score: "도로 접근성",
    dispatch_priority_score: "배차 우선순위",
  };
  return labels[key] ?? key.replaceAll("_", " ");
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

function sourceModeLabel(source: DataCatalogSource) {
  return source.live_available ? "실시간/재수집 가능" : "과거 학습용";
}

function sourceNameLabel(name: string) {
  const labels: Record<string, string> = {
    "Seoul public-transit OD by administrative dong": "서울 행정동 대중교통 OD",
    "TOPIS traffic information": "TOPIS 교통량/속도",
    "Seoul realtime citydata": "서울 실시간 도시데이터",
    "Seoul living population": "서울 생활인구",
    "KMA ASOS hourly weather and nowcast": "KMA ASOS/초단기 날씨",
    "Korean public holidays": "공휴일 달력",
    "OpenStreetMap and Seoul spatial features": "OSM/서울 공간 특성",
  };
  return labels[name] ?? name;
}

function sourceUseLabel(value: string) {
  const labels: Record<string, string> = {
    "Movement-demand proxy target and offline validation features":
      "이동수요 대리 지표의 기준값과 오프라인 검증 데이터를 만듭니다.",
    "Traffic volume proxy, road speed, congestion and supply proxy":
      "차량 교통량 proxy, 도로 속도, 혼잡도, 공급 압박 신호를 구성합니다.",
    "Realtime place population, road congestion and weather context":
      "현재 장소 인구, 도로 혼잡, 날씨 맥락을 실시간 스냅샷으로 기록합니다.",
    "Offline demographic context and full observed model":
      "인구 정규화와 오프라인 상한선 모델의 생활권 맥락으로 사용합니다.",
    "Temperature, precipitation, humidity, wind, pressure, snow and live weather override":
      "기온, 강수, 습도, 바람 등 날씨 입력값과 실시간 날씨 보정에 사용합니다.",
    "Holiday flag and holiday names": "평일/주말/공휴일 구분값을 생성합니다.",
    "Roads, buildings, transit infrastructure and static POI features":
      "도로, 건물, 대중교통 인프라, POI 같은 정적 공간 특성을 생성합니다.",
  };
  return labels[value] ?? value;
}

function availabilityNoteLabel(value: string) {
  const labels: Record<string, string> = {
    "Published after the fact; not a live feature.": "사후 공개 데이터라 실시간 입력에서는 제외합니다.",
    "Published after the fact; excluded from live-compatible model.":
      "사후 공개 데이터라 실시간 호환 모델에서는 제외합니다.",
    "Static features are refreshed manually or by data rebuild.":
      "정적 공간 특성은 수동 갱신 또는 데이터 재생성 때 갱신합니다.",
  };
  return labels[value] ?? value;
}

function artifactNameLabel(name: string) {
  const labels: Record<string, string> = {
    "Dong-hour feature table v2": "동-시간 학습 테이블 v2",
    "Live-compatible model": "실시간 호환 수요 모델",
    "Feature-set evaluation": "입력 조합별 성능 비교",
    "Latest forecast": "최신 수요 예측 JSON",
    "Latest traffic forecast": "최신 도로 예측 JSON",
    "Traffic forecast comparison": "도로 예측 비교 JSON",
  };
  return labels[name] ?? name;
}

function artifactPurposeLabel(purpose: string) {
  const labels: Record<string, string> = {
    "Main training/evaluation table": "학습/평가용 메인 테이블",
    "Runtime model artifact": "실행용 모델 파일",
    "Compare full observed, live-compatible and baseline scores":
      "오프라인 상한선, 실시간 호환 모델, 기준선 성능 비교",
    "Map demand scores": "지도 수요 히트맵에 쓰는 점수",
    "Next-hour dong-level traffic volume proxy, congestion and speed estimates":
      "1시간 뒤 동별 교통량 proxy, 혼잡도, 속도 예측",
    "Compare predicted road congestion/speed with later citydata observations":
      "예측 도로 혼잡/속도와 이후 citydata 관측값 비교",
  };
  return labels[purpose] ?? purpose;
}

const places = [...dataSummary.citydata.places];
const citydataAttemptMeta = dataSummary.raw_citydata_attempt_meta ?? null;
const weatherAttemptMeta = dataSummary.raw_weather_attempt_meta ?? null;
const liveSourceCount = dataCatalog.sources.filter((source) => source.live_available).length;
const offlineSourceCount = dataCatalog.sources.length - liveSourceCount;
const hostedArtifacts = dataCatalog.artifacts.filter((artifact) => artifact.hosted);
const localArtifacts = dataCatalog.artifacts.filter((artifact) => !artifact.hosted);
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
const topPoiRows = [...(poiFeatures.direct_citydata_rows ?? [])]
  .sort((left, right) => (right.poi_pressure_score ?? 0) - (left.poi_pressure_score ?? 0))
  .slice(0, 8);
const latestPoiForecastComparison = poiForecastComparison.latest;
const featureImportance = observability.feature_importance.top_features.slice(0, 8);
const validation2026 = observability.observed_validation_2026 ?? null;
const latestLiveComparison = liveForecastComparison.latest;
const latestTrafficComparison = trafficForecastComparison.latest;
const demandComparisonRows =
  latestLiveComparison?.kind === "completed" ? latestLiveComparison.rows.slice(0, 5) : [];
const roadComparisonRows =
  latestTrafficComparison?.kind === "completed" ? (latestTrafficComparison.rows ?? []).slice(0, 5) : [];
const pressureComparisonRows =
  taxiPressureComparison.latest?.kind === "completed"
    ? (taxiPressureComparison.latest.rows ?? []).slice(0, 5)
    : [];
const topModelDrivers = featureImportance.slice(0, 5);
const pressureFormulaRows = Object.entries(taxiPressure.formula ?? {});

export default function DataStatusPage() {
  return (
    <main className="h-screen overflow-y-auto bg-[#f4f6f8] text-slate-900 selection:bg-sky-200/70">
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link
            href="/"
            className="whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:px-4 sm:text-sm"
          >
            ← 맵으로
          </Link>
          <div className="min-w-0 truncate text-sm font-black text-slate-950 sm:text-base">
            <span className="hidden sm:inline">교통 데이터 운영</span>
            <span className="sm:hidden">데이터</span>
          </div>
          <Link
            href="/presentation"
            className="whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:px-4 sm:text-sm"
          >
            발표 자료
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 lg:py-6">
        <section className="grid gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm md:grid-cols-4">
          <div>
            <p className="font-bold text-slate-500">수집 스냅샷</p>
            <p className="mt-1 font-black text-slate-950">{formatKst(dataSummary.citydata.collected_at)}</p>
          </div>
          <div>
            <p className="font-bold text-slate-500">예측 대상</p>
            <p className="mt-1 font-black text-slate-950">{formatKst(forecast.target_datetime)}</p>
          </div>
          <div>
            <p className="font-bold text-slate-500">POI / 행정동</p>
            <p className="mt-1 font-black text-slate-950">
              {poiFeatures.live_poi_count}개 / {modelSummary.target_area.dong_count}개
            </p>
          </div>
          <div>
            <p className="font-bold text-slate-500">검증 누적</p>
            <p className="mt-1 font-black text-slate-950">
              도로 {trafficForecastComparison.completed_count}건 · POI {poiForecastComparison.completed_count}건
            </p>
          </div>
        </section>

        <header className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Data Inventory</p>
            <h1 className="mt-2 max-w-4xl break-keep text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
              공개 데이터 운영 현황
            </h1>
            <p className="mt-3 max-w-3xl break-keep text-sm leading-6 text-slate-600">
              수집 중인 공개 API, 과거 학습 테이블, 예측 산출물, 사후 검증 결과를 한 화면에서 확인합니다.
              목표는 실제 호출량 단정이 아니라 1시간 뒤 이동수요 대리 지표와 도로 상태를 공개 데이터로 추정하는 것입니다.
            </p>
          </div>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-5 w-5" />
              <p className="font-black">데이터 경계</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              비공개 호출 로그는 학습하지 않습니다. 이 화면의 “수요”는 대중교통 승차량 기반 이동수요 대리 지표(proxy)입니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-500">학습 기간</p>
                <p className="font-bold text-slate-800">
                  {formatMonth(modelSummary.feature_table.period.start)} ~ {formatMonth(modelSummary.feature_table.period.end)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">학습 행</p>
                <p className="font-bold text-slate-800">{formatNumber(modelSummary.feature_table.rows)}건</p>
              </div>
              <div>
                <p className="text-slate-500">공간 단위</p>
                <p className="font-bold text-slate-800">{modelSummary.target_area.dong_count}개 행정동</p>
              </div>
              <div>
                <p className="text-slate-500">데이터 구분</p>
                <p className="font-bold text-slate-800">
                  실시간 {liveSourceCount} / 과거 {offlineSourceCount}
                </p>
              </div>
            </div>
          </section>
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-600">수집·가공 요약</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  3년치 공개 데이터를 동-시간 학습 테이블로 묶었습니다.
                </h2>
              </div>
              <Database className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetricTile
                label="통합 학습 테이블"
                value={`${formatNumber(modelSummary.feature_table.rows)}건`}
                insight={`${modelSummary.feature_table.size_mb}MB · 1시간 단위`}
              />
              <MetricTile
                label="학습 기간"
                value={`${formatMonth(modelSummary.feature_table.period.start)} ~ ${formatMonth(
                  modelSummary.feature_table.period.end,
                )}`}
                insight="동별 1시간 단위"
              />
              <MetricTile
                label="예측 대상"
                value="1시간 뒤 이동수요 대리 지표"
                insight="대중교통 승차량 기반, 택시 콜 아님"
              />
              <MetricTile
                label="공개 페이지 배포"
                value={`${hostedArtifacts.length}개 요약 산출물`}
                insight={`용량이 큰 원본·모델 파일 ${localArtifacts.length}개는 로컬에서 재생성`}
              />
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-amber-600">용어 정리</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">이 페이지에서 “수요”가 뜻하는 것</h2>
              </div>
              <ShieldCheck className="h-6 w-6 text-amber-600" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">지표 의미</p>
                <p className="mt-2 text-sm leading-6 text-emerald-950">
                  공개 대중교통 승차량과 공간·날씨·교통 입력값으로 만든 동별 이동수요 대리 지표(proxy)입니다.
                  실제 호출 데이터가 생기면 예측 대상만 바꿔 확장할 수 있습니다.
                </p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">현재 범위 밖</p>
                <p className="mt-2 text-sm leading-6 text-rose-950">
                  직접 호출량, 개별 차량 위치, 실제 기사 공급량 같은 비공개 운영 데이터는
                  현재 학습·검증 대상에 포함하지 않습니다.
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              아래의 도로 혼잡 비교는 “정답 채점”이 아니라 공개 관측 신호와 예측 신호가 같은 방향으로
              움직이는지 확인하는 참고 지표입니다.
            </p>
          </Panel>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-500">데이터 소스</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">수집·학습에 쓰는 공개 데이터</h2>
            </div>
            <p className="text-sm font-bold text-slate-500">
              총 {dataCatalog.sources.length}개 · 실시간 {liveSourceCount}개 · 과거 학습용 {offlineSourceCount}개
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dataCatalog.sources.map((source) => (
              <SourceCard key={source.name} source={source} />
            ))}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-sm font-bold text-slate-500">산출물</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">가공 결과물과 공개 범위</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              전체 학습 CSV와 모델 파일은 용량이 크고 재생성 가능한 산출물이라 정적 사이트에 직접 올리지 않고,
              발표 화면에는 요약 JSON과 최신 예측/검증 결과만 배포합니다.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">산출물</th>
                  <th className="px-5 py-3">용도</th>
                  <th className="px-5 py-3">크기</th>
                  <th className="px-5 py-3">공개</th>
                  <th className="px-5 py-3">경로</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataCatalog.artifacts.map((artifact) => (
                  <tr key={artifact.path} className="text-slate-700">
                    <td className="px-5 py-3 font-black text-slate-950">{artifactNameLabel(artifact.name)}</td>
                    <td className="px-5 py-3">{artifactPurposeLabel(artifact.purpose)}</td>
                    <td className="px-5 py-3 font-bold">{artifact.size}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${
                          artifact.hosted
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {artifact.hosted ? "공개" : "로컬"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{artifact.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_45px_rgba(15,23,42,0.10)]">
          <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                  예측 신호 점검
                </p>
                <h2 className="mt-2 text-2xl font-black">예측 신호가 실제 흐름과 얼마나 가까운지 봅니다</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  여기서는 정답/오답을 선언하지 않습니다. 수요 proxy는 대중교통 기반 기준값으로,
                  도로 모델은 citydata/TOPIS 관측값으로 각각 방향성과 오차를 따로 봅니다.
                  도로 혼잡은 보조 관측 신호이지 택시 호출량 정답지가 아닙니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right text-xs">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                  <p className="text-slate-400">수요 proxy 기록</p>
                  <p className="mt-1 font-black text-cyan-200">
                    {liveForecastComparison.completed_count}/{liveForecastComparison.log_count}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                  <p className="text-slate-400">도로 예측 기록</p>
                  <p className="mt-1 font-black text-amber-200">
                    {trafficForecastComparison.completed_count}/{trafficForecastComparison.log_count}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-slate-200 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            <ValidationCard
              eyebrow="수요 proxy 방향성"
              title={
                latestLiveComparison?.kind === "completed"
                  ? `${formatKst(latestLiveComparison.target_datetime)} 예측`
                  : "관측 대기"
              }
              status="순위 상관"
              statusClass="border-cyan-200 bg-cyan-50 text-cyan-800"
              metrics={[
                {
                  label: "순위 상관",
                  value:
                    latestLiveComparison?.kind === "completed"
                      ? formatMetric(latestLiveComparison.overall.spearman_r, 3)
                      : "-",
                },
                {
                  label: "평균 점수 차이",
                  value:
                    latestLiveComparison?.kind === "completed"
                      ? formatMetric(latestLiveComparison.overall.mean_abs_score_gap, 3)
                      : "-",
                },
                {
                  label: "예측 상위 동",
                  value:
                    latestLiveComparison?.kind === "completed"
                      ? latestLiveComparison.overall.top_forecast_dong ?? "-"
                      : "-",
                },
                {
                  label: "도로 혼잡 참고값",
                  value:
                    latestLiveComparison?.kind === "completed"
                      ? latestLiveComparison.overall.top_observed_congestion_dong ?? "-"
                      : "-",
                },
              ]}
            />

            <ValidationCard
              eyebrow="도로 모델 오차"
              title={
                latestTrafficComparison?.kind === "completed"
                  ? `${formatKst(latestTrafficComparison.target_datetime)} 예측`
                  : "관측 대기"
              }
              status="오차 기준"
              statusClass="border-amber-200 bg-amber-50 text-amber-800"
              metrics={[
                {
                  label: "혼잡 MAE",
                  value:
                    latestTrafficComparison?.kind === "completed"
                      ? formatMetric(latestTrafficComparison.overall.congestion_mae, 3)
                      : "-",
                },
                {
                  label: "속도 MAE",
                  value: trafficGapLabel(latestTrafficComparison),
                },
                {
                  label: "예측 혼잡 상위",
                  value:
                    latestTrafficComparison?.kind === "completed"
                      ? latestTrafficComparison.overall.top_predicted_congestion_dong ?? "-"
                      : latestTrafficComparison?.top_predicted_congestion_dong ?? "-",
                },
                {
                  label: "실제 혼잡 상위",
                  value: trafficActualLabel(latestTrafficComparison),
                },
              ]}
            />

            <ValidationCard
              eyebrow="배차 pressure 정책 점검"
              title={
                taxiPressureComparison.latest?.kind === "completed"
                  ? `${formatKst(taxiPressureComparison.latest.target_datetime)} 도로 신호 점검`
                  : "관측 대기"
              }
              status="정책 점검"
              statusClass="border-rose-200 bg-rose-50 text-rose-800"
              metrics={[
                {
                  label: "도로혼잡 상관(보조)",
                  value:
                    taxiPressureComparison.latest?.kind === "completed"
                      ? formatMetric(
                          taxiPressureComparison.latest.overall.priority_vs_road_congestion_spearman,
                          3,
                        )
                      : "-",
                },
                {
                  label: "혼잡 MAE",
                  value:
                    taxiPressureComparison.latest?.kind === "completed"
                      ? formatMetric(taxiPressureComparison.latest.overall.congestion_mae, 3)
                      : "-",
                },
                {
                  label: "우선순위 상위",
                  value:
                    taxiPressureComparison.latest?.kind === "completed"
                      ? taxiPressureComparison.latest.overall.top_predicted_priority_dong ?? "-"
                      : taxiPressureComparison.latest?.top_predicted_priority_dong ?? "-",
                },
                {
                  label: "실제 혼잡 상위 동",
                  value:
                    taxiPressureComparison.latest?.kind === "completed"
                      ? taxiPressureComparison.latest.overall.top_actual_congestion_dong ?? "-"
                      : "-",
                },
              ]}
              note="pressure는 수요+교통+접근성을 합산한 정책 점수입니다. 도로 혼잡만으로는 정답 라벨이 되지 않으므로 이 Spearman은 보조 신호로만 해석합니다."
            />

            <ValidationCard
              eyebrow="공개 pressure 기준값 비교"
              title={
                publicPressureBaseline.latest?.kind === "completed"
                  ? `${formatKst(publicPressureBaseline.latest.target_datetime)} 점검`
                  : "기준값 대기"
              }
              status="공개 데이터 비교"
              statusClass="border-indigo-200 bg-indigo-50 text-indigo-800"
              metrics={[
                {
                  label: "pressure Spearman",
                  value:
                    publicPressureBaseline.latest?.kind === "completed"
                      ? formatMetric(
                          publicPressureBaseline.latest.overall.priority_vs_public_pressure_spearman,
                          3,
                        )
                      : "-",
                },
                {
                  label: "예측 상위 동",
                  value:
                    publicPressureBaseline.latest?.kind === "completed"
                      ? publicPressureBaseline.latest.overall.top_predicted_priority_dong ?? "-"
                      : "-",
                },
                {
                  label: "관측 상위 동",
                  value:
                    publicPressureBaseline.latest?.kind === "completed"
                      ? publicPressureBaseline.latest.overall.top_observed_public_pressure_dong ?? "-"
                      : "-",
                },
                {
                  label: "완료 비교",
                  value: `${publicPressureBaseline.completed_count}건`,
                },
              ]}
              note="관측 pressure = 생활인구(45%) + 도로혼잡(35%) + 저속도(20%). 택시 콜 없이 공개 데이터끼리 비교하는 구조입니다."
            />
          </div>

          <div className="grid gap-0 border-t border-slate-200 xl:grid-cols-3">
            <div className="p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900">동별 수요 proxy 방향성 참고</p>
                  <p className="mt-1 text-xs text-slate-500">
                    같은 정답지가 아니므로 도로 혼잡값은 보조 신호로만 봅니다.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  관측 {latestLiveComparison?.kind === "completed" ? formatKst(latestLiveComparison.actual_observed_at) : "-"}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="border-y border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">동</th>
                      <th className="px-3 py-2 text-right">예측</th>
                      <th className="px-3 py-2 text-right">도로 혼잡 참고</th>
                      <th className="px-3 py-2 text-right">점수 차이</th>
                      <th className="px-3 py-2 text-right">순위 차이</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {demandComparisonRows.map((row) => (
                      <tr key={row.dong_name} className="text-slate-700">
                        <td className="px-3 py-2 font-bold text-slate-950">{row.dong_name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatPercentScore(row.forecast_score)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPercentScore(row.observed_congestion_score)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatSignedMetric(row.score_gap, 3)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatSignedMetric(row.rank_gap, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-200 p-5 xl:border-l xl:border-t-0">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900">도로 예측 오차</p>
                  <p className="mt-1 text-xs text-slate-500">
                    예측 혼잡도와 실제 citydata 도로 관측값의 오차입니다.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {latestTrafficComparison?.kind === "completed" ? formatKst(latestTrafficComparison.actual_observed_at) : "-"}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="border-y border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">동</th>
                      <th className="px-3 py-2 text-right">예측 혼잡</th>
                      <th className="px-3 py-2 text-right">실측 혼잡</th>
                      <th className="px-3 py-2 text-right">속도 오차</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roadComparisonRows.map((row) => (
                      <tr key={row.dong_name} className="text-slate-700">
                        <td className="px-3 py-2 font-bold text-slate-950">{row.dong_name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPercentScore(row.predicted_congestion_score)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPercentScore(row.actual_congestion_score)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatSignedMetric(row.speed_error_kmh, 1)}km/h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-200 p-5 xl:border-l xl:border-t-0">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900">배차 우선순위 vs 관측 혼잡</p>
                  <p className="mt-1 text-xs text-slate-500">
                    인센티브/재배치 우선순위가 이후 도로 압박 구간과 맞물렸는지 봅니다.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {taxiPressureComparison.latest?.kind === "completed"
                    ? formatKst(taxiPressureComparison.latest.actual_observed_at)
                    : "-"}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="border-y border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">동</th>
                      <th className="px-3 py-2 text-right">우선순위</th>
                      <th className="px-3 py-2 text-right">압박도</th>
                      <th className="px-3 py-2 text-right">실측 혼잡</th>
                      <th className="px-3 py-2 text-right">순위 차이</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pressureComparisonRows.map((row) => (
                      <tr key={row.dong_name} className="text-slate-700">
                        <td className="px-3 py-2 font-bold text-slate-950">{row.dong_name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPercentScore(row.predicted_dispatch_priority_score)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPercentScore(row.predicted_taxi_pressure_score)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPercentScore(row.actual_congestion_score)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.predicted_priority_rank != null && row.actual_congestion_rank != null
                            ? formatSignedMetric(row.predicted_priority_rank - row.actual_congestion_rank, 0)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-indigo-600">예측 방식</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  모델이 보는 입력과 계산 흐름
                </h2>
              </div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-800">
                {taxiPressure.horizon_hours ?? 1}시간 뒤 예측
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <MetricTile
                label="수요 예측 대상"
                value={modelTargetLabel(forecast.model_target ?? forecast.raw_prediction_unit)}
                insight={`예측 시각 ${formatKst(forecast.target_datetime)}`}
              />
              <MetricTile
                label="실시간 입력"
                value={`${dataSummary.citydata.place_count}개 POI + KMA + 도로`}
                insight={`입력 생성 ${formatKst(forecast.feature_datetime ?? dataSummary.features?.generated_at)}`}
              />
              <MetricTile
                label="사용한 입력 조합"
                value={featureSetLabel(forecast.feature_set ?? forecast.model_feature_set)}
                insight={`전략 ${strategyLabel(forecast.strategy)}`}
              />
              <MetricTile
                label="비교 기준"
                value="예측 시각 이후 관측값"
                insight="택시 콜 라벨이 아니라 공개 proxy 신호"
              />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">계산 흐름</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <PipelineStep
                  icon={<Database className="h-4 w-4" />}
                  label="입력"
                  title="현재 상태를 입력값으로 변환"
                  body="생활인구, 혼잡도, 도로 속도, 날씨, 요일, 정적 POI/건물/도로 특성을 동 단위로 합칩니다."
                />
                <PipelineStep
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="예측"
                  title="1시간 뒤 수요·도로를 예측"
                  body="이동수요 proxy 점수와 도로 혼잡/속도를 따로 예측한 뒤 같은 시간대로 정렬합니다."
                />
                <PipelineStep
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="비교"
                  title="시간이 지나면 관측값과 비교"
                  body="예측 시각 이후 새 citydata/TOPIS 관측이 생기면 점수 차이, MAE, 순위 차이를 누적합니다."
                />
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-rose-600">배차 압박도 계산식</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">배차 판단식과 영향 요인</h2>
              </div>
              <Signal className="h-6 w-6 text-rose-600" />
            </div>

            <div className="mt-5 space-y-3">
              {pressureFormulaRows.length > 0 ? (
                pressureFormulaRows.map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      {formulaLabel(key)}
                    </p>
                    <code className="mt-1 block whitespace-normal break-words text-xs font-bold text-slate-900">
                      {value}
                    </code>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  공식 메타데이터가 아직 배포되지 않았습니다.
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm font-black text-slate-900">수요 모델 상위 설명 변수</p>
              <div className="mt-4 space-y-3">
                {topModelDrivers.map((feature) => (
                  <div key={feature.feature} className="grid grid-cols-[116px_1fr_44px] items-center gap-3 text-sm">
                    <p className="truncate font-bold text-slate-700">{featureLabel(feature.feature)}</p>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className={`h-2 rounded-full bg-indigo-500 ${scoreWidthClass(
                          feature.normalized_importance,
                        )}`}
                      />
                    </div>
                    <p className="text-right text-xs font-black text-slate-500">
                      {(feature.normalized_importance * 100).toFixed(0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              해석 주의: 현재 “실제값”은 택시 호출 수가 아니라 공개 API로 다시 관측된 도로 혼잡/속도와
              대중교통 기반 proxy입니다. 직접 호출량 라벨이 없기 때문에 이 화면은 공개 관측 신호와
              예측 방향을 비교하는 보조 자료입니다.
            </p>
          </Panel>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-4">
          <FlowCard
            icon={<Radio className="h-5 w-5" />}
            eyebrow="1. 예측값 저장"
            title="1시간 뒤 수요 proxy 예측"
            body={`${dataSummary.citydata.place_count}개 주요 장소의 현재 인구, 혼잡도, 도로 속도, 날씨를 모델 입력으로 사용합니다.`}
            footer={`예측 시각: ${formatKst(forecast.target_datetime)}`}
          />
          <FlowCard
            icon={<Database className="h-5 w-5" />}
            eyebrow="2. 도로 예측"
            title="1시간 뒤 교통량/혼잡도 예측"
            body="TOPIS 3년 교통량 proxy 모델과 현재 citydata 속도/혼잡도를 결합해 동별 도로 상태를 예측합니다."
            footer={`도로 예측 시각: ${formatKst(trafficForecast.target_datetime)}`}
          />
          <FlowCard
            icon={<Signal className="h-5 w-5" />}
            eyebrow="3. 차이 계산"
            title="예측값과 공개 관측 신호 비교"
            body="예측 시간이 지난 뒤 들어온 API 관측값과 예측값을 매칭해 도로 속도 MAE와 순위 방향성을 누적합니다."
            footer={`도로 모델 MAPE: ${formatMetric(trafficForecastSummary.overall.mape_pct, 1)}%`}
          />
          <FlowCard
            icon={<Route className="h-5 w-5" />}
            eyebrow="4. 배차 판단"
            title="택시 배차 압박도 모델"
            body="수요 proxy, 교통량, 혼잡도, 도로 접근성을 결합해 1시간 뒤 우선 배차가 필요한 동을 순위화합니다."
            footer={`우선 배차 후보: ${topTaxiPressure?.dong_name ?? "-"}`}
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
                body="시간, 날씨, 공휴일, 정적 공간 특성과 과거 패턴을 사용해 9개 동의 수요 proxy 점수를 계산합니다."
              />
              <PipelineStep
                icon={<GitBranch className="h-4 w-4" />}
                label="CLOUDFLARE_API_TOKEN"
                title="예측/관측 로그 공개"
                body="예측값과 현재 관측 요약을 JSON으로 배포하고, 예측 시간이 지난 뒤 관측값과 비교할 수 있게 누적합니다."
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
                TOPIS 모델 + citydata 보정
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
                insight={`혼잡 점수 ${
                  latestTrafficComparison?.kind === "waiting" &&
                  latestTrafficComparison.top_predicted_congestion_score != null
                    ? latestTrafficComparison.top_predicted_congestion_score.toFixed(3)
                    : formatMetric(topTrafficForecast?.predicted_congestion_score, 3)
                }`}
              />
              <MetricTile
                label="관측 도로값"
                value={trafficActualLabel(latestTrafficComparison)}
                insight="예측 시각 이후 citydata"
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
                혼잡도와 평균속도는 현재 citydata 도로 관측값으로 보정한 실시간 추정값이며,
                예측 시간이 지난 뒤 새 API 관측값이 들어오면 실제값과 오차를 계산합니다.
              </p>
            </div>
          </Panel>
        </section>

        <section className="mt-8">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-indigo-600">POI별 실시간 성적표</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  행정동 평균 뒤에 숨은 주요 지점 신호
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  서울 citydata로 직접 수집 가능한 강남권 POI는 현재 인구, 혼잡 단계, 도로 속도와
                  1시간 뒤 인구 예보를 함께 남깁니다. citydata 코드가 확인되지 않은 역·도로 거점은
                  OSM 보조 POI로 분리해 지도 맥락에만 씁니다.
                </p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>citydata POI {poiFeatures.live_poi_count}개</p>
                <p className="mt-1">보조 POI {poiFeatures.supplemental_poi_count}개</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <MetricTile
                label="POI 예보 검증"
                value={
                  latestPoiForecastComparison?.kind === "completed"
                    ? `${latestPoiForecastComparison.overall.row_count}개 완료`
                    : `${poiForecastComparison.waiting_count}건 대기`
                }
                insight={
                  latestPoiForecastComparison?.kind === "completed"
                    ? `${formatKst(latestPoiForecastComparison.target_datetime)} 관측 비교`
                    : "다음 citydata 스냅샷 대기"
                }
              />
              <MetricTile
                label="인구 예보 오차"
                value={
                  latestPoiForecastComparison?.kind === "completed"
                    ? `${formatNumber(latestPoiForecastComparison.overall.population_mae)}명`
                    : "-"
                }
                insight={
                  latestPoiForecastComparison?.kind === "completed"
                    ? `MAPE ${formatMetric(latestPoiForecastComparison.overall.population_mape_pct, 1)}%`
                    : "완료 비교 없음"
                }
              />
              <MetricTile
                label="혼잡 단계 적중"
                value={
                  latestPoiForecastComparison?.kind === "completed"
                    ? `${formatMetric(latestPoiForecastComparison.overall.congestion_level_accuracy_pct, 1)}%`
                    : "-"
                }
                insight={
                  latestPoiForecastComparison?.kind === "completed"
                    ? `혼잡 MAE ${formatMetric(latestPoiForecastComparison.overall.congestion_score_mae, 3)}`
                    : "citydata 단계 기준"
                }
              />
              <MetricTile
                label="상위 POI"
                value={
                  latestPoiForecastComparison?.kind === "completed"
                    ? latestPoiForecastComparison.overall.top_observed_population_poi ?? "-"
                    : poiFeatures.top_live_poi?.poi_name ?? "-"
                }
                insight={
                  latestPoiForecastComparison?.kind === "completed"
                    ? `순위상관 ${formatMetric(latestPoiForecastComparison.overall.population_rank_spearman, 3)}`
                    : "현재 pressure 기준"
                }
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-y border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">POI</th>
                    <th className="px-4 py-3">담당 동</th>
                    <th className="px-4 py-3">현재 인구</th>
                    <th className="px-4 py-3">현재 혼잡</th>
                    <th className="px-4 py-3">도로 속도</th>
                    <th className="px-4 py-3">1시간 뒤 인구</th>
                    <th className="px-4 py-3">POI pressure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topPoiRows.map((poi) => (
                    <tr key={poi.poi_code} className="text-slate-700">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-950">{poi.poi_name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{poi.poi_code}</p>
                      </td>
                      <td className="px-4 py-3">{poi.coverage_dong ?? "-"}</td>
                      <td className="px-4 py-3">
                        {poi.current_population_mid == null
                          ? "-"
                          : `${formatNumber(poi.current_population_mid)}명`}
                      </td>
                      <td className="px-4 py-3">{poi.current_congestion_level ?? "-"}</td>
                      <td className="px-4 py-3">
                        {poi.current_traffic_speed_kmh == null
                          ? "-"
                          : `${poi.current_traffic_speed_kmh}km/h`}
                      </td>
                      <td className="px-4 py-3">
                        {poi.population_forecast_1h?.population_mid == null
                          ? "-"
                          : `${formatNumber(poi.population_forecast_1h.population_mid)}명`}
                        {poi.forecast_population_delta != null ? (
                          <span className="ml-2 text-xs text-slate-400">
                            {poi.forecast_population_delta >= 0 ? "+" : ""}
                            {formatNumber(poi.forecast_population_delta)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-700">
                        {formatMetric(poi.poi_pressure_score, 3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              POI pressure는 citydata 현재 인구·혼잡·도로 속도와 citydata의 단기 인구 예보를 합친
              공개 데이터 기반 지점 신호입니다. 택시 호출량 정답 라벨이 아닙니다.
            </p>
          </Panel>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-600">현재 실제 관측값</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">API로 확인한 최신 관측값</h2>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>
                  수집 {formatKst(dataSummary.citydata.collected_at)}{" "}
                  <RelativeTime iso={dataSummary.citydata.collected_at} className="text-xs text-slate-400" />
                </p>
                {citydataAttemptMeta?.collected_at && citydataAttemptMeta.ok === false ? (
                  <p className="mt-1 text-xs text-rose-700">
                    최근 시도 {formatKst(citydataAttemptMeta.collected_at)}{" "}
                    <RelativeTime iso={citydataAttemptMeta.collected_at} className="text-[11px] text-rose-700/80" />
                    {" "}
                    (실패: {citydataAttemptMeta.error ?? citydataAttemptMeta.status ?? "unknown"})
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  KMA {featureSnapshot.weather_status.kma_ok ? "OK" : "FAIL"}
                  {featureSnapshot.weather_status.kma_status != null ? ` (${featureSnapshot.weather_status.kma_status})` : ""}
                </p>
                {dataSummary.raw_citydata_path ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    citydata 캐시: <span className="font-mono">{dataSummary.raw_citydata_path}</span>
                  </p>
                ) : null}
                {dataSummary.raw_weather_path ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    날씨 캐시: <span className="font-mono">{dataSummary.raw_weather_path}</span>
                  </p>
                ) : null}
                {weatherAttemptMeta?.collected_at && weatherAttemptMeta.ok === false ? (
                  <p className="mt-1 text-xs text-rose-700">
                    날씨 최근 시도 {formatKst(weatherAttemptMeta.collected_at)}{" "}
                    <RelativeTime iso={weatherAttemptMeta.collected_at} className="text-[11px] text-rose-700/80" />
                    {" "}
                    (실패: {weatherAttemptMeta.error ?? weatherAttemptMeta.status ?? "unknown"})
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-y border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">장소</th>
                    <th className="px-4 py-3">생활인구</th>
                    <th className="px-4 py-3">혼잡도</th>
                    <th className="px-4 py-3">도로</th>
                    <th className="px-4 py-3">강수/기온</th>
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
                      <td className="px-4 py-3">{weatherObservationLabel(place)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatSeoulLocal(place.observed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              참고: <span className="font-medium text-slate-600">강수 없음</span>은 강수형태(PTY)=0을 의미하며
              날씨 데이터 누락이 아닙니다. (누락/장애는 상단의 KMA OK/FAIL과 최신 수집 시도 로그로 표시)
            </p>
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-600">입력값 스냅샷</p>
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
                      수요 proxy {(row.demand_proxy_score * 100).toFixed(1)}
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
                <h2 className="mt-2 text-2xl font-black text-slate-900">택시 배차 압박도</h2>
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
                    수요 {(row.predicted_movement_demand_score * 100).toFixed(0)} · 교통량{" "}
                    {(row.predicted_traffic_volume_score * 100).toFixed(0)} · 접근성{" "}
                    {(row.road_accessibility_score * 100).toFixed(0)} · {actionLevelLabel(row.action_level)}
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
                <h2 className="mt-2 text-2xl font-black text-slate-900">동별 교통량/혼잡도 예측</h2>
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
                <h2 className="mt-2 text-2xl font-black text-slate-900">9개 동 상대 점수</h2>
              </div>
              <Timer className="h-6 w-6 text-cyan-600" />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {proxySourceLabel(forecast.proxy_source)} · 캐시{" "}
              {assetBasename(forecast.pattern_cache_source ?? null)}
            </p>
            <p className="text-xs leading-5 text-slate-500">
              단위 {predictionUnitLabel(forecast.raw_prediction_unit)} · 입력 조합 {featureSetLabel(forecast.feature_set)}
            </p>
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
                      <th className="px-3 py-3">입력 변수</th>
                      <th className="px-3 py-3">R²</th>
                      <th className="px-3 py-3">MAPE</th>
                      <th className="px-3 py-3">실시간 사용</th>
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
                      <td className="px-3 py-3 font-bold">직전값 기준선</td>
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
              <h2 className="font-black">발표 요약</h2>
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </section>
  );
}

function SourceCard({ source }: { source: DataCatalogSource }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            {source.provider}
          </p>
          <h3 className="mt-2 text-lg font-black leading-6 text-slate-950">
            {sourceNameLabel(source.name)}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
            source.live_available
              ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200"
              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          {sourceModeLabel(source)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{sourceUseLabel(source.used_for)}</p>
      {source.availability_note ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          {availabilityNoteLabel(source.availability_note)}
        </p>
      ) : null}
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-white"
      >
        공식 출처
      </a>
    </article>
  );
}

function ValidationCard({
  eyebrow,
  title,
  status,
  statusClass,
  metrics,
  note,
}: {
  eyebrow: string;
  title: string;
  status: string;
  statusClass: string;
  metrics: Array<{ label: string; value: string }>;
  note?: string;
}) {
  return (
    <section className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
          <h3 className="mt-2 text-lg font-black text-slate-950">{title}</h3>
        </div>
        <span className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-bold ${statusClass}`}>
          {status}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-bold text-slate-500">{metric.label}</p>
            <p className="mt-1 truncate text-sm font-black text-slate-950">{metric.value}</p>
          </div>
        ))}
      </div>
      {note ? <p className="mt-3 text-xs leading-5 text-slate-400">{note}</p> : null}
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 text-slate-700 border border-slate-200">
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
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-base font-black leading-6 text-slate-950">{value}</p>
      {insight && <p className="mt-1 text-[10px] text-slate-500 font-medium">{insight}</p>}
    </div>
  );
}
