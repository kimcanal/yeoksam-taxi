const sourceLinks = [
  {
    name: "서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보",
    provider: "서울특별시 열린데이터광장",
    use: "2024-2025 행정동 OD 시간대별 승객수",
    href: "https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do",
  },
  {
    name: "서울시 읍면동마스터 정보",
    provider: "서울특별시 열린데이터광장",
    use: "행정동 ID와 강남 9개 동 이름 매핑",
    href: "https://data.seoul.go.kr/dataList/OA-21234/S/1/datasetView.do",
  },
  {
    name: "기상청 지상(종관, ASOS) 시간자료 조회서비스",
    provider: "기상청 / 공공데이터포털",
    use: "서울 ASOS 108 시간별 기온, 강수량, 습도, 풍속, 적설",
    href: "https://www.data.go.kr/data/15057210/openapi.do",
  },
  {
    name: "한국천문연구원 특일 정보",
    provider: "한국천문연구원 / 공공데이터포털",
    use: "2024-2025 공휴일 및 공휴일 전날 flag",
    href: "https://www.data.go.kr/data/15012690/openapi.do",
  },
];

const conclusions = [
  "예측 대상은 실제 택시 호출량이 아니라 다음 1시간 강남 9개 동 대중교통 승차량이다.",
  "테스트 성능은 R2 0.9854, MAE 약 166명/동·시간으로, 시간대별 승차량 변동을 대부분 설명했다.",
  "요일 효과가 가장 크다. 금요일, 목요일, 화요일 수요가 높고 일요일과 공휴일은 크게 낮다.",
  "날씨는 요일/시간보다 영향이 작지만, 눈·강수·영하 조건에서는 같은 요일·시간 평균 대비 수요가 내려가는 경향이 있다.",
  "월/계절 기준으로는 여름의 보정 지수가 높고 겨울이 낮아 계절성을 확인할 수 있다.",
];

const slides = [
  {
    title: "모델 성능 요약",
    file: "06_model_metrics_summary.svg",
    note: "R2, MAE, train/validation/test 결과를 한 장으로 설명",
  },
  {
    title: "실제값 vs 예측값",
    file: "07_actual_vs_predicted_scatter.svg",
    note: "예측이 실제 test split과 얼마나 맞는지 보여주는 핵심 그림",
  },
  {
    title: "시간 흐름 예측 예시",
    file: "08_prediction_timeseries_sample.svg",
    note: "한 행정동에서 피크와 저점의 흐름을 따라가는지 확인",
  },
  {
    title: "Feature 구조",
    file: "09_model_feature_pipeline.svg",
    note: "모델이 보는 입력 feature와 target 설명",
  },
];

export default function PresentationPage() {
  return (
    <main className="h-screen overflow-y-auto bg-[#f5f7fb] text-slate-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
          <div>
            <p className="text-sm font-bold text-blue-700">A-Eye Presentation</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal">
              강남 대중교통 기반 근미래 수요 예측 결과
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              2024-2025 서울시 행정동 OD 대중교통 자료에 기상청 ASOS 날씨와 공휴일
              feature를 결합해, 강남 9개 동의 다음 1시간 승차 수요를 예측했습니다.
            </p>
          </div>
          <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800">
            Test R2 0.9854 · MAE 166명
          </div>
        </header>

        <section className="grid grid-cols-4 gap-4">
          {[
            ["153,783", "학습 가능 row", "target shift 이후"],
            ["712일", "분석 날짜", "2024-01-01~2025-12-31"],
            ["ASOS 108", "날씨 소스", "기상청 서울 지점"],
            ["9개 동", "예측 단위", "강남 target dongs"],
          ].map(([value, label, sub]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-black">{value}</p>
              <p className="mt-2 text-xs text-slate-500">{sub}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold">바로 보기</h2>
              <p className="mt-2 text-sm text-slate-600">
                아래 링크는 모두 사이트의 정적 경로에서 열립니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                href="/a-eye-presentation/index.html"
              >
                발표 자료 인덱스
              </a>
              <a
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                href="/a-eye-presentation/transit_correlation_report.html"
              >
                상관 분석
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">데이터 출처</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-3 pr-4">데이터</th>
                  <th className="py-3 pr-4">제공처</th>
                  <th className="py-3 pr-4">사용 목적</th>
                  <th className="py-3 pr-4">링크</th>
                </tr>
              </thead>
              <tbody>
                {sourceLinks.map((source) => (
                  <tr key={source.href} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-bold">{source.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{source.provider}</td>
                    <td className="py-3 pr-4 text-slate-600">{source.use}</td>
                    <td className="py-3 pr-4">
                      <a
                        className="font-bold text-blue-700"
                        href={source.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        원문
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-[0.9fr_1.1fr] gap-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold">결론</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {conclusions.map((item) => (
                <li key={item} className="border-b border-slate-100 pb-3 last:border-0">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold">발표에서 말할 문장</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              “본 모델은 실제 택시 호출량을 직접 예측한 것이 아니라, 공개적으로 확보 가능한
              대중교통 승차 수요를 이동 수요 proxy로 사용했습니다. 행정동, 시간대, 요일,
              공휴일, 기상청 ASOS 날씨, 과거 lag 수요를 입력으로 사용해 다음 1시간의 동별
              승차 수요를 예측했고, 테스트 구간에서 R2 0.9854를 기록했습니다.”
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-5">
          {slides.map((slide) => (
            <article key={slide.file} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold">{slide.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{slide.note}</p>
                </div>
                <a className="text-sm font-bold text-blue-700" href={`/a-eye-presentation/${slide.file}`}>
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
