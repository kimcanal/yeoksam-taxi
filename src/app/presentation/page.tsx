const sourceLinks = [
  {
    name: "서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보",
    provider: "서울특별시 열린데이터광장",
    use: "2024~2025년 행정동별, 시간대별 대중교통 승차량",
    href: "https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do",
  },
  {
    name: "서울시 읍면동마스터 정보",
    provider: "서울특별시 열린데이터광장",
    use: "행정동 코드와 강남 9개 동 이름 매핑",
    href: "https://data.seoul.go.kr/dataList/OA-21234/S/1/datasetView.do",
  },
  {
    name: "기상청 지상(종관, ASOS) 시간자료 조회서비스",
    provider: "기상청 / 공공데이터포털",
    use: "서울 지점 시간별 기온, 강수량, 습도, 풍속, 적설",
    href: "https://www.data.go.kr/data/15057210/openapi.do",
  },
  {
    name: "한국천문연구원 특일 정보",
    provider: "한국천문연구원 / 공공데이터포털",
    use: "공휴일과 공휴일 전날 여부",
    href: "https://www.data.go.kr/data/15012690/openapi.do",
  },
];

const metricCards = [
  ["153,783", "학습 row", "다음 1시간 target 생성 후"],
  ["712일", "분석 기간", "2024.01.01~2025.12.31"],
  ["9개 동", "예측 단위", "강남 주요 행정동"],
  ["R2 0.9854", "Test 성능", "MAE 약 166명"],
];

const storySteps = [
  {
    title: "왜 대중교통인가",
    text: "택시 호출 데이터는 공개적으로 확보하기 어렵습니다. 그래서 실제로 관측 가능한 대중교통 승차량을 이동 수요의 대체 지표로 사용했습니다.",
  },
  {
    title: "무엇을 예측했나",
    text: "강남 9개 동에서 다음 1시간 동안 발생할 대중교통 승차량을 예측했습니다. 택시 호출량 그 자체가 아니라, 지역별 이동 수요의 방향을 보는 모델입니다.",
  },
  {
    title: "어디에 쓰나",
    text: "A-Eye 지도에서 앞으로 수요가 커질 가능성이 높은 동을 먼저 보여주고, 배차나 대기 위치 판단의 근거로 연결할 수 있습니다.",
  },
];

const takeaways = [
  "수요를 가장 크게 가르는 요인은 요일과 시간대였습니다.",
  "금요일, 목요일, 화요일은 높고 일요일과 공휴일은 뚜렷하게 낮았습니다.",
  "비, 눈, 영하 날씨는 같은 요일과 시간대 대비 수요를 낮추는 보정 신호로 나타났습니다.",
  "날씨보다 반복되는 생활 패턴이 더 강했습니다. 그래서 lag feature가 중요했습니다.",
  "이 결과는 택시 수요의 정답지가 아니라, 공개 데이터로 만든 이동 수요 신호입니다.",
];

const slides = [
  {
    title: "성능 요약",
    file: "06_model_metrics_summary.svg",
    note: "Train, validation, test 성능을 한 장으로 확인합니다.",
  },
  {
    title: "실제값과 예측값",
    file: "07_actual_vs_predicted_scatter.svg",
    note: "점이 대각선에 가까울수록 실제 흐름을 잘 따라간 것입니다.",
  },
  {
    title: "시간 흐름 예시",
    file: "08_prediction_timeseries_sample.svg",
    note: "한 동의 피크와 저점이 시간에 따라 어떻게 맞는지 봅니다.",
  },
  {
    title: "학습 구조",
    file: "09_model_feature_pipeline.svg",
    note: "요일, 시간, 날씨, 휴일, 과거 수요를 결합했습니다.",
  },
];

export default function PresentationPage() {
  return (
    <main className="h-screen overflow-y-auto bg-[#f6f7f9] text-slate-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-7 sm:py-8">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-bold text-blue-700">A-Eye Demand Study</p>
              <h1 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">
                공개 데이터로 본 강남의 다음 1시간 이동 수요
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                이 페이지는 “택시 호출 데이터가 없을 때 무엇으로 수요를 추정할 수 있는가”에 대한
                실험 결과입니다. 대중교통 승차량, 날씨, 요일, 휴일, 과거 수요 패턴을 묶어
                강남 9개 동의 다음 1시간 이동 수요를 예측했습니다.
              </p>
            </div>
            <div className="rounded-full border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-800">
              Test R2 0.9854 · MAE 약 166명
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

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">발표에서 먼저 말할 것</h2>
            <p className="mt-4 text-base leading-8 text-slate-700">
              “실제 택시 호출량은 아직 확보하지 못했습니다. 대신 공개 데이터로 관측 가능한
              대중교통 승차량을 이동 수요의 대체 지표로 두고, 강남 9개 동의 다음 1시간 수요를
              예측했습니다. 이 모델은 정답을 확정하는 모델이라기보다, 지도에서 어느 동에 수요가
              몰릴 가능성이 있는지 먼저 보는 신호로 쓰기 위한 모델입니다.”
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
          <b>해석할 때 주의할 점:</b> 이 모델은 카카오T 같은 실제 택시 호출량을 학습한 것이 아닙니다.
          대중교통 승차량을 기반으로 만든 이동 수요 proxy이기 때문에, 발표에서는 “택시 수요를
          직접 맞혔다”가 아니라 “공개 데이터로 가까운 미래의 이동 수요를 추정했다”라고 말하는 게 정확합니다.
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">데이터 출처</h2>
              <p className="mt-2 text-sm text-slate-600">
                원천 데이터는 모두 공개 포털에서 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                href="/a-eye-presentation/index.html"
              >
                이미지 모음
              </a>
              <a
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                href="/a-eye-presentation/transit_correlation_report.html"
              >
                상관 분석
              </a>
            </div>
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
