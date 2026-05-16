# Overnight Model QA Status

Generated: 2026. 05. 16. 15:59 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 15:59
- Raw citydata: `data/raw/citydata/2026-05-16/1559.json`
- Raw weather: `data/raw/weather/2026-05-16/1559.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 29.2 C
- Precipitation 1h: 0 mm
- Humidity: 28%
- Wind: 2.6 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 16:00
- Traffic target: 2026. 05. 16. 16:00
- Taxi pressure target: 2026. 05. 16. 16:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9172 | high |
| 2 | 삼성1동 | 0.3270 | low |
| 3 | 역삼1동 | 0.3253 | low |
| 4 | 청담동 | 0.2714 | low |
| 5 | 논현2동 | 0.2438 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6075 | - |
| 3 | 논현2동 | 0.4528 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9020 | - |
| 2 | 청담동 | 0.7301 | - |
| 3 | 신사동 | 0.5630 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6916 | 0.8381 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 역삼1동 | 0.4299 | 0.5112 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3956 | 0.4677 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.3137 | 0.3693 | 0.6652 | medium | pattern_fallback_used, signals_disagree |
| 5 | 삼성2동 | 0.2993 | 0.3324 | 0.7785 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 16. 16:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 16:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 190750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 185
- Completed comparisons: 1
- Waiting comparisons: 184
- Live demand log count: 217
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 15:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.5667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 16:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.089
- Estimated positive imbalance after: 0.584
- Estimated relief score: 0.505
- Highest relief dong: 논현1동
