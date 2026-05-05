const sourceLinks = [
  {
    name: "서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보",
    provider: "서울특별시 열린데이터광장",
    use: "행정동별 시간대 OD 승하차량. 이동 수요 proxy target과 lag 검증 기준으로 사용",
    href: "https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do",
  },
  {
    name: "TOPIS 교통정보 Open API",
    provider: "서울시 교통정보 시스템 TOPIS",
    use: "도로 소통/링크 속도 기반 교통 혼잡도와 공급 proxy 계산",
    href: "https://topis.seoul.go.kr/refRoom/openRefRoom_4.do",
  },
  {
    name: "서울 실시간 도시데이터",
    provider: "서울특별시 열린데이터광장",
    use: "주요 장소 실시간 인구 혼잡도, 교통 상태, 현장 날씨 신호 수집",
    href: "https://data.seoul.go.kr/SeoulRtd/",
  },
  {
    name: "서울 생활인구",
    provider: "서울특별시 열린데이터광장",
    use: "행정동 생활인구 총량과 연령대별 인구. 사후 공개 데이터라 오프라인 검증에 사용",
    href: "https://data.seoul.go.kr/dataVisual/seoul/seoulLivingPopulation.do?tr_code=rsite",
  },
  {
    name: "기상청 지상(종관, ASOS) 시간자료 조회서비스",
    provider: "기상청 / 공공데이터포털",
    use: "서울 지점 시간별 기온, 강수량, 습도, 풍속, 적설, 시정",
    href: "https://www.data.go.kr/data/15057210/openapi.do",
  },
  {
    name: "한국천문연구원 특일 정보",
    provider: "한국천문연구원 / 공공데이터포털",
    use: "공휴일 여부와 휴일명. 2026-05-05 어린이날 같은 빨간날 반영",
    href: "https://www.data.go.kr/data/15012690/openapi.do",
  },
  {
    name: "OpenStreetMap / 행정동 공간 데이터",
    provider: "OpenStreetMap, 서울시 공간 데이터",
    use: "도로, 정류장, 지하철역, 건물, 상업/호텔/아파트 등 정적 환경 feature",
    href: "https://www.openstreetmap.org/copyright",
  },
];

const metricCards = [
  ["236,736", "feature rows", "2023.01.01~2025.12.31, 9개 동 hourly"],
  ["77MB", "원본 feature CSV", "Cloudflare 배포에서는 제외"],
  ["R2 0.9888", "오프라인 상한", "OD/생활인구 관측값 포함"],
  ["R2 0.9585", "라이브 호환 모델", "실시간 사용 가능 feature만 사용"],
];

const modelCards = [
  {
    title: "Offline Upper-bound Model",
    badge: "검증/연구용",
    metric: "R2 0.9888 · MAE 2.53",
    text: "대중교통 OD, 생활인구처럼 사후 공개되는 관측 feature까지 포함합니다. 모델 구조가 수요 패턴을 잘 학습하는지 보는 상한선입니다.",
  },
  {
    title: "Live-compatible Model",
    badge: "운영/지도용",
    metric: "R2 0.9585 · MAE 4.37",
    text: "현재 시점에 만들 수 있는 시간, 요일, 공휴일, 날씨, 행정동, 정적 POI/도로/건물 feature만 사용합니다. 라이브 예측 루프는 이 모델을 우선 사용합니다.",
  },
  {
    title: "Dispatch Priority Layer",
    badge: "Module 4",
    metric: "수요 score - 공급 proxy",
    text: "예측 수요와 실시간 도로 혼잡도 기반 공급 proxy를 결합해 동별 선제 이동 우선순위를 계산합니다.",
  },
];

const storySteps = [
  {
    title: "무엇을 예측하나",
    text: "택시 호출량 원자료가 없기 때문에, 행정동별 다음 1시간 이동 수요 압력을 예측합니다. target은 대중교통 inbound boardings per 1k population을 1시간 뒤로 민 값입니다.",
  },
  {
    title: "왜 두 모델인가",
    text: "사후 공개되는 OD/생활인구 feature를 넣은 모델은 설명력의 상한선이고, 실제 서비스에는 해당 feature를 뺀 live-compatible 모델이 필요합니다.",
  },
  {
    title: "지도에서 어떻게 쓰나",
    text: "지도는 9개 동의 상대 수요 score, confidence, 실시간 혼잡도, 배차 우선순위를 보여줍니다. 목적은 정답 확정이 아니라 선제 판단입니다.",
  },
];

const takeaways = [
  "동 단위 시간별 택시 호출량 공공데이터는 없어서, 공개 데이터 기반 이동 수요 proxy가 현실적인 대안입니다.",
  "오프라인 R2 0.9888은 라이브 성능이 아니라 사후 관측 feature를 포함한 상한선입니다.",
  "라이브 호환 모델 R2 0.9585는 delayed OD/생활인구를 제외하고도 사용할 수 있는 운영 기준입니다.",
  "2026-05-05 같은 공휴일은 calendar feature로 들어가며, KMA nowcast와 citydata 교통 혼잡도는 라이브 루프에서 갱신됩니다.",
  "대용량 feature CSV는 배포하지 않고, 모델 요약/데이터 카탈로그/검증 결과/최신 예측 JSON만 공개합니다.",
];

const downloadLinks = [
  {
    name: "모델 요약 JSON",
    href: "/model-summary.json",
    detail: "target, feature set, 성능, 라이브 파이프라인 요약",
  },
  {
    name: "데이터 카탈로그 JSON",
    href: "/data-catalog.json",
    detail: "원천 데이터, 로컬 산출물 경로, 배포 여부",
  },
  {
    name: "Feature set 검증 CSV",
    href: "/downloads/demand_proxy_feature_set_eval.csv",
    detail: "full, live-compatible, lag, baseline 성능 비교",
  },
  {
    name: "최신 예측 JSON",
    href: "/forecast/latest.json",
    detail: "지도에서 쓰는 동별 수요 score와 confidence",
  },
  {
    name: "최신 배차 우선순위 JSON",
    href: "/dispatch-plan.json",
    detail: "동별 imbalance score와 action level",
  },
];

const artifactRows = [
  ["Feature table", "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv", "77MB", "배포 제외"],
  ["Live model", "data/processed/model_live_compatible/dong_demand_proxy_model.joblib", "1.1MB", "로컬 산출물"],
  ["Feature-set evaluation", "data/processed/model_feature_set_eval/demand_proxy_feature_set_eval.csv", "4KB", "다운로드 제공"],
  ["Latest forecast", "public/forecast/latest.json", "4KB", "다운로드 제공"],
  ["Dispatch plan", "public/dispatch-plan.json", "8KB", "다운로드 제공"],
];

const slides = [
  {
    title: "성능 요약",
    file: "06_model_metrics_summary.svg",
    note: "기존 발표 이미지입니다. 최신 수치는 위 모델 요약과 feature-set CSV를 기준으로 말합니다.",
  },
  {
    title: "실제 수요 proxy와 예측값",
    file: "07_actual_vs_predicted_scatter.svg",
    note: "각 점은 특정 동의 특정 시간대입니다. 대각선에 가까울수록 실제 proxy와 예측이 비슷합니다.",
  },
  {
    title: "시간 흐름 예시",
    file: "08_prediction_timeseries_sample.svg",
    note: "한 동의 피크와 저점이 시간에 따라 어떻게 맞는지 봅니다.",
  },
  {
    title: "학습 구조",
    file: "09_model_feature_pipeline.svg",
    note: "공개 데이터 feature를 결합해 다음 1시간 proxy target을 예측합니다.",
  },
];

export default function PresentationPage() {
  return (
    <main className="h-screen overflow-y-auto bg-[#f6f7f9] text-slate-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-7 sm:py-8">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-bold text-blue-700">A-Eye Demand Model · 2026.05.05</p>
              <h1 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">
                강남 9개 동의 다음 1시간 이동 수요 proxy 예측
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                실제 택시 호출 데이터가 공개되어 있지 않기 때문에, 대중교통 OD와 실시간 교통,
                날씨, 공휴일, 정적 도시 feature를 결합해 지도에서 쓸 수 있는 이동 수요 압력을
                예측했습니다. 발표에서는 “택시 호출량”이 아니라 “이동 수요 proxy”라고 설명하는
                것이 정확합니다.
              </p>
            </div>
            <div className="rounded-full border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-800">
              Live-compatible R2 0.9585
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map(([value, label, sub]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
              <p className="mt-2 text-sm text-slate-500">{sub}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {storySteps.map((step, index) => (
            <article key={step.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-black text-blue-700">0{index + 1}</p>
              <h2 className="mt-2 text-xl font-black">{step.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {modelCards.map((model) => (
            <article key={model.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black">{model.title}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {model.badge}
                </span>
              </div>
              <p className="mt-4 text-lg font-black text-blue-700">{model.metric}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{model.text}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">발표에서 먼저 말할 것</h2>
            <p className="mt-4 text-base leading-8 text-slate-700">
              “공개 데이터에는 동 단위 시간별 택시 호출량이 없습니다. 그래서 우리는 대중교통
              OD를 이동 수요의 proxy target으로 두고 3년치 feature table을 만들었습니다.
              단, 라이브에서는 OD와 생활인구가 사후 공개되기 때문에 해당 feature를 뺀
              live-compatible 모델을 별도로 학습해 운영합니다.”
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">결론</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {takeaways.map((item) => (
                <li key={item} className="border-b border-slate-100 pb-3 last:border-0">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
          <b>정확한 표현:</b> R2 0.9888은 “사후 관측 feature까지 넣었을 때의 오프라인 상한선”이고,
          실제 지도 운영은 R2 0.9585 live-compatible 모델과 패턴 fallback을 함께 사용합니다.
          이것은 한계가 아니라, 실시간 데이터 제약을 분리해서 검증했다는 점에서 발표의 핵심 근거입니다.
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">다운로드와 배포 범위</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                원본 feature CSV는 77MB라 Cloudflare 배포물에 넣지 않습니다. 대신 재현 가능한
                경로와 작은 검증 산출물을 공개해서 발표/검토자가 모델 구조와 결과를 확인할 수 있게 합니다.
              </p>
            </div>
            <a
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
              href="/a-eye-presentation/index.html"
            >
              이미지 발표 자료
            </a>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {downloadLinks.map((item) => (
              <a
                key={item.href}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                href={item.href}
              >
                <p className="font-black text-slate-900">{item.name}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
                <p className="mt-3 text-xs font-bold text-blue-700">{item.href}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">산출물 카탈로그</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-black">Artifact</th>
                  <th className="py-3 pr-4 font-black">Path</th>
                  <th className="py-3 pr-4 font-black">Size</th>
                  <th className="py-3 pr-4 font-black">Deploy</th>
                </tr>
              </thead>
              <tbody>
                {artifactRows.map(([name, path, size, deploy]) => (
                  <tr key={path} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-bold">{name}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">{path}</td>
                    <td className="py-3 pr-4 text-slate-600">{size}</td>
                    <td className="py-3 pr-4 text-slate-600">{deploy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">데이터 출처</h2>
              <p className="mt-2 text-sm text-slate-600">
                원천 데이터는 공식 공개 포털과 API 기준으로 정리했습니다.
              </p>
            </div>
            <a
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
              href="/a-eye-presentation/transit_correlation_report.html"
            >
              상관 분석 리포트
            </a>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sourceLinks.map((source) => (
              <a
                key={source.href}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                href={source.href}
                rel="noreferrer"
                target="_blank"
              >
                <p className="font-black text-slate-900">{source.name}</p>
                <p className="mt-1 text-sm text-slate-500">{source.provider}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{source.use}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {slides.map((slide) => (
            <article key={slide.file} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">{slide.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{slide.note}</p>
                </div>
                <a className="shrink-0 text-sm font-bold text-blue-700" href={`/a-eye-presentation/${slide.file}`}>
                  SVG 열기
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={slide.title}
                className="w-full rounded-lg border border-slate-200 bg-slate-50"
                src={`/a-eye-presentation/${slide.file}`}
              />
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
