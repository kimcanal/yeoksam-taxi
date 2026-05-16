# Overnight Model QA Status

Generated: 2026. 05. 17. 04:33 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 04:33
- Raw citydata: `data/raw/citydata/2026-05-17/0433.json`
- Raw weather: `data/raw/weather/2026-05-17/0433.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.7 C
- Precipitation 1h: 0 mm
- Humidity: 71%
- Wind: 1.2 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 05:00
- Traffic target: 2026. 05. 17. 05:00
- Taxi pressure target: 2026. 05. 17. 05:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5674 | medium |
| 2 | 논현1동 | 0.4166 | watch |
| 3 | 논현2동 | 0.2658 | low |
| 4 | 청담동 | 0.2260 | low |
| 5 | 대치4동 | 0.1965 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 논현2동 | 0.4351 | - |
| 3 | 대치4동 | 0.3669 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7842 | - |
| 2 | 청담동 | 0.5519 | - |
| 3 | 신사동 | 0.3484 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4784 | 0.5952 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3883 | 0.4434 | 0.7240 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 역삼1동 | 0.2389 | 0.2813 | 0.6652 | medium | pattern_fallback_used |
| 4 | 논현2동 | 0.2307 | 0.2955 | 0.5126 | medium | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |
| 5 | 청담동 | 0.2241 | 0.2613 | 0.6839 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 17. 05:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 05:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 61750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 198
- Completed comparisons: 1
- Waiting comparisons: 197
- Live demand log count: 230
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 04:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 논현2동
- Latest road-signal Spearman (policy check): 0.0833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 05:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.463
- Estimated positive imbalance after: 0.153
- Estimated relief score: 0.31
- Highest relief dong: 삼성1동
