# Overnight Model QA Status

Generated: 2026. 05. 08. 18:44 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 08. 18:44
- Raw citydata: `data/raw/citydata/2026-05-08/1844.json`
- Raw weather: `data/raw/weather/2026-05-08/1844.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 18.7 C
- Precipitation 1h: 0 mm
- Humidity: 30%
- Wind: 2.2 m/s

## Latest Targets

- Demand target: 2026. 05. 08. 19:00
- Traffic target: 2026. 05. 08. 19:00
- Taxi pressure target: 2026. 05. 08. 19:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9446 | high |
| 2 | 역삼1동 | 0.4054 | watch |
| 3 | 삼성1동 | 0.3584 | low |
| 4 | 대치4동 | 0.3474 | low |
| 5 | 청담동 | 0.2737 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6473 | - |
| 3 | 대치4동 | 0.6185 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9453 | - |
| 2 | 청담동 | 0.7478 | - |
| 3 | 삼성1동 | 0.5791 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7598 | 0.8846 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4916 | 0.5846 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.4059 | 0.4896 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3846 | 0.4396 | 0.7222 | high | pattern_fallback_used |
| 5 | 청담동 | 0.3253 | 0.3719 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 08. 19:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 08. 19:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 231750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 35
- Completed comparisons: 1
- Waiting comparisons: 34
- Live demand log count: 67
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 08. 18:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.7167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 08. 19:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 10
- Max incentive multiplier: 1.2
- Positive imbalance before: 2.11
- Estimated positive imbalance after: 1.1
- Estimated relief score: 1.01
- Highest relief dong: 논현1동
