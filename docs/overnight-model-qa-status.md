# Overnight Model QA Status

Generated: 2026. 05. 12. 04:41 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 12. 04:41
- Raw citydata: `data/raw/citydata/2026-05-12/0441.json`
- Raw weather: `data/raw/weather/2026-05-12/0441.json`
- KMA status: OK (200)
- Weather note: 강수 관측 또는 API 값을 확인하세요.
- Temperature: 15.6 C
- Precipitation 1h: 2 mm
- Humidity: 95%
- Wind: 1.5 m/s

## Latest Targets

- Demand target: 2026. 05. 12. 05:00
- Traffic target: 2026. 05. 12. 05:00
- Taxi pressure target: 2026. 05. 12. 05:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5997 | medium |
| 2 | 논현1동 | 0.4246 | watch |
| 3 | 대치4동 | 0.2780 | low |
| 4 | 역삼1동 | 0.2277 | low |
| 5 | 청담동 | 0.2152 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 대치4동 | 0.5697 | - |
| 3 | 역삼1동 | 0.4567 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8066 | - |
| 2 | 청담동 | 0.5798 | - |
| 3 | 삼성1동 | 0.4069 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4977 | 0.6128 | 0.5826 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3844 | 0.4432 | 0.7053 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 역삼1동 | 0.2995 | 0.3492 | 0.6840 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.2579 | 0.3243 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.2076 | 0.2374 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 12. 05:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 12. 05:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 68500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 102
- Completed comparisons: 1
- Waiting comparisons: 101
- Live demand log count: 134
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 12. 04:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.1833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 12. 05:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 4
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.579
- Estimated positive imbalance after: 0.171
- Estimated relief score: 0.408
- Highest relief dong: 삼성1동
