# Overnight Model QA Status

Generated: 2026. 05. 10. 16:08 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 16:08
- Raw citydata: `data/raw/citydata/2026-05-10/1608.json`
- Raw weather: `data/raw/weather/2026-05-10/1608.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 24.5 C
- Precipitation 1h: 0 mm
- Humidity: 19%
- Wind: 1.5 m/s

## Latest Targets

- Demand target: 2026. 05. 10. 17:00
- Traffic target: 2026. 05. 10. 17:00
- Taxi pressure target: 2026. 05. 10. 17:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8881 | high |
| 2 | 역삼1동 | 0.3433 | low |
| 3 | 삼성1동 | 0.3119 | low |
| 4 | 청담동 | 0.2626 | low |
| 5 | 대치4동 | 0.2341 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6635 | - |
| 3 | 삼성1동 | 0.4144 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8602 | - |
| 2 | 청담동 | 0.7070 | - |
| 3 | 삼성1동 | 0.4735 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6334 | 0.7676 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 역삼1동 | 0.4202 | 0.4947 | 0.6652 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3433 | 0.4353 | 0.5301 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.2671 | 0.3083 | 0.7027 | high | pattern_fallback_used |
| 5 | 삼성2동 | 0.2553 | 0.2890 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 10. 17:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 10. 17:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 140500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 74
- Completed comparisons: 1
- Waiting comparisons: 73
- Live demand log count: 106
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 15:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.45
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 10. 17:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 4
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.879
- Estimated positive imbalance after: 0.471
- Estimated relief score: 0.408
- Highest relief dong: 논현1동
