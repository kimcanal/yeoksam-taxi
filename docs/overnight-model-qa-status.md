# Overnight Model QA Status

Generated: 2026. 05. 12. 22:47 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 12. 22:46
- Raw citydata: `data/raw/citydata/2026-05-12/2246.json`
- Raw weather: `data/raw/weather/2026-05-12/2246.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 18.1 C
- Precipitation 1h: 0 mm
- Humidity: 63%
- Wind: 0.2 m/s

## Latest Targets

- Demand target: 2026. 05. 12. 23:00
- Traffic target: 2026. 05. 12. 23:00
- Taxi pressure target: 2026. 05. 12. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8738 | high |
| 2 | 대치4동 | 0.3793 | low |
| 3 | 역삼1동 | 0.3745 | low |
| 4 | 삼성1동 | 0.3351 | low |
| 5 | 청담동 | 0.2320 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7842 | - |
| 3 | 역삼1동 | 0.7093 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8381 | - |
| 2 | 청담동 | 0.5068 | - |
| 3 | 삼성1동 | 0.3987 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6555 | 0.7632 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4412 | 0.5094 | 0.7027 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3586 | 0.4239 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3320 | 0.4266 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.3067 | 0.3472 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 12. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 12. 23:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 121750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 115
- Completed comparisons: 1
- Waiting comparisons: 114
- Live demand log count: 147
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 12. 22:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.6
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 12. 23:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.378
- Estimated positive imbalance after: 0.58
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
