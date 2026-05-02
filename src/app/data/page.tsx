import dataSummary from "../../../public/data-summary.json";
import dispatchPlan from "../../../public/dispatch-plan.json";
import featureSnapshot from "../../../public/feature-snapshot.json";

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
  return "border-slate-500/50 bg-slate-500/15 text-slate-200";
}

export default function DataPage() {
  const places = dataSummary.citydata.places;
  const decisions = dispatchPlan.decisions.slice(0, 5);
  const featureRows = featureSnapshot.features.slice(0, 5);
  const topPopulation = dataSummary.citydata.top_population;
  const topDecision = dispatchPlan.decisions[0] ?? null;
  const topFeature = featureSnapshot.features[0] ?? null;

  return (
    <main className="h-screen overflow-y-auto bg-[#0b1020] text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-sm font-semibold text-cyan-200">A-Eye Data Status</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal">실시간 수집 · 예측 · 배차 현황</h1>
          </div>
          <div className="text-right text-sm text-slate-300">
            <p>요약 생성 {formatKst(dataSummary.generated_at)}</p>
            <p>원천 파일 {dataSummary.raw_citydata_path ?? "-"}</p>
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
              {dataSummary.forecast?.source === "demo" ? "데모 예측" : "모델 예측"}
            </p>
            <p className="mt-1 text-sm text-slate-300">{dataSummary.forecast?.region_count ?? 0}개 동</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">배차 최우선</p>
            <p className="mt-3 text-2xl font-bold">{topDecision?.dong_name ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-300">{topDecision?.action ?? "-"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Feature Top</p>
            <p className="mt-3 text-2xl font-bold">{topFeature?.area_name ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-300">{topFeature?.demand_proxy_score ?? "-"} proxy</p>
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
                      <td className="px-5 py-3 text-slate-400">{place.observed_at}</td>
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
                      <dd className="mt-1 font-semibold">{decision.predicted_demand_score}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">공차</dt>
                      <dd className="mt-1 font-semibold">{decision.idle_taxis}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">이동</dt>
                      <dd className="mt-1 font-semibold">{decision.recommended_taxis}대</dd>
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
