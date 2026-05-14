# Overnight Model QA Status

Generated: 2026. 05. 15. 07:32 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 15. 07:32
- Raw citydata: `data/raw/citydata/2026-05-15/0732.json`
- Raw weather: `data/raw/weather/2026-05-15/0732.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 20.4 C
- Precipitation 1h: 0 mm
- Humidity: 69%
- Wind: 1.1 m/s

## Latest Targets

- Demand target: 2026. 05. 15. 08:00
- Traffic target: 2026. 05. 15. 08:00
- Taxi pressure target: 2026. 05. 15. 08:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.6485 | medium |
| 2 | 대치4동 | 0.5395 | watch |
| 3 | 논현2동 | 0.3569 | low |
| 4 | 삼성1동 | 0.3453 | low |
| 5 | 역삼1동 | 0.2799 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현2동 | 0.7053 | - |
| 3 | 논현1동 | 0.6857 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8070 | - |
| 2 | 청담동 | 0.6751 | - |
| 3 | 신사동 | 0.4610 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.5362 | 0.6064 | 0.7428 | high | pattern_fallback_used |
| 2 | 대치4동 | 0.4016 | 0.5274 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 3 | 삼성1동 | 0.3549 | 0.4195 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 4 | 역삼1동 | 0.3547 | 0.4176 | 0.6652 | medium | pattern_fallback_used |
| 5 | 논현2동 | 0.3206 | 0.4107 | 0.5126 | medium | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 15. 08:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 15. 08:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 117750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 160
- Completed comparisons: 1
- Waiting comparisons: 159
- Live demand log count: 192
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 15. 07:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.3833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 15. 08:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.145
- Estimated positive imbalance after: 0.64
- Estimated relief score: 0.506
- Highest relief dong: 대치4동
