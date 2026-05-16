# Overnight Model QA Status

Generated: 2026. 05. 16. 21:35 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 21:35
- Raw citydata: `data/raw/citydata/2026-05-16/2135.json`
- Raw weather: `data/raw/weather/2026-05-16/2135.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 21.8 C
- Precipitation 1h: 0 mm
- Humidity: 45%
- Wind: 0.6 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 22:00
- Traffic target: 2026. 05. 16. 22:00
- Taxi pressure target: 2026. 05. 16. 22:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8547 | high |
| 2 | 역삼1동 | 0.4626 | watch |
| 3 | 삼성1동 | 0.3545 | low |
| 4 | 대치4동 | 0.3089 | low |
| 5 | 청담동 | 0.2583 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8893 | - |
| 3 | 대치4동 | 0.6777 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7994 | - |
| 2 | 청담동 | 0.6479 | - |
| 3 | 신사동 | 0.4929 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6645 | 0.7736 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4926 | 0.5858 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3759 | 0.4444 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3567 | 0.3962 | 0.7785 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.2849 | 0.3660 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 16. 22:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 22:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 136000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 191
- Completed comparisons: 1
- Waiting comparisons: 190
- Live demand log count: 223
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 21:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 청담동
- Latest road-signal Spearman (policy check): -0.2167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 22:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 6
- Max incentive multiplier: 1.1
- Positive imbalance before: 1.144
- Estimated positive imbalance after: 0.558
- Estimated relief score: 0.586
- Highest relief dong: 논현1동
