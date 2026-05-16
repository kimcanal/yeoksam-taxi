# Overnight Model QA Status

Generated: 2026. 05. 17. 05:24 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 05:24
- Raw citydata: `data/raw/citydata/2026-05-17/0524.json`
- Raw weather: `data/raw/weather/2026-05-17/0524.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.6 C
- Precipitation 1h: 0 mm
- Humidity: 72%
- Wind: 1.1 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 06:00
- Traffic target: 2026. 05. 17. 06:00
- Taxi pressure target: 2026. 05. 17. 06:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5868 | medium |
| 2 | 논현1동 | 0.4961 | watch |
| 3 | 논현2동 | 0.2554 | low |
| 4 | 대치4동 | 0.2337 | low |
| 5 | 역삼1동 | 0.2006 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 논현2동 | 0.5148 | - |
| 3 | 대치4동 | 0.4536 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8184 | - |
| 2 | 청담동 | 0.4560 | - |
| 3 | 삼성1동 | 0.3799 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4930 | 0.6070 | 0.5826 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.4347 | 0.4964 | 0.7240 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 역삼1동 | 0.2666 | 0.3108 | 0.6840 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.2191 | 0.2698 | 0.5824 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 논현2동 | 0.2136 | 0.2860 | 0.4376 | low | pattern_fallback_used, signals_disagree, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 17. 06:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 06:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 59750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 199
- Completed comparisons: 2
- Waiting comparisons: 197
- Live demand log count: 231
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 05:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.6167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 06:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.494
- Estimated positive imbalance after: 0.184
- Estimated relief score: 0.31
- Highest relief dong: 삼성1동
