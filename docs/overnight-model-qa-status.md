# Overnight Model QA Status

Generated: 2026. 05. 06. 15:41 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct KakaoT taxi-call predictions.

## API Collection

- Citydata collected: 2026. 05. 06. 14:22
- Raw citydata: `data/raw/citydata/2026-05-06/1422.json`
- Raw weather: `data/raw/weather/2026-05-06/1422.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 24.7 C
- Precipitation 1h: 0 mm
- Humidity: 35%
- Wind: 1.9 m/s

## Latest Targets

- Demand target: 2026. 05. 06. 15:00
- Traffic target: 2026. 05. 06. 15:00
- Taxi pressure target: 2026. 05. 06. 15:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8404 | high |
| 2 | 대치4동 | 0.5490 | watch |
| 3 | 삼성1동 | 0.3219 | low |
| 4 | 청담동 | 0.2770 | low |
| 5 | 논현2동 | 0.2595 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.9006 | - |
| 3 | 역삼1동 | 0.4163 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8890 | - |
| 2 | 청담동 | 0.7607 | - |
| 3 | 삼성1동 | 0.5608 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7084 | 0.8167 | 0.7053 | high | pattern_fallback_used |
| 2 | 대치4동 | 0.5610 | 0.6995 | 0.5599 | medium | pattern_fallback_used, signals_disagree |
| 3 | 삼성1동 | 0.4267 | 0.5147 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 역삼1동 | 0.4062 | 0.4783 | 0.6652 | medium | pattern_fallback_used |
| 5 | 삼성2동 | 0.3542 | 0.4009 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 06. 15:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 06. 15:00
- Live POIs: 10
- Covered dongs: 7
- Forecast population midpoint sum: 386250

## Validation

- Taxi pressure comparison status: waiting_for_observation
- Taxi pressure log count: 1
- Completed comparisons: 0
- Waiting comparisons: 1
- Live demand log count: 24
- Latest comparison kind: waiting
- Latest comparison target: 2026. 05. 06. 15:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: -
- Latest road-signal Spearman (policy check): -
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 06. 15:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.487
- Estimated positive imbalance after: 0.769
- Estimated relief score: 0.718
- Highest relief dong: 대치4동
