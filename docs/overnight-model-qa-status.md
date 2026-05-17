# Overnight Model QA Status

Generated: 2026. 05. 17. 10:14 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 10:14
- Raw citydata: `data/raw/citydata/2026-05-17/1014.json`
- Raw weather: `data/raw/weather/2026-05-17/1014.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 26.3 C
- Precipitation 1h: 0 mm
- Humidity: 36%
- Wind: 1.5 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 11:00
- Traffic target: 2026. 05. 17. 11:00
- Taxi pressure target: 2026. 05. 17. 11:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8530 | high |
| 2 | 삼성1동 | 0.5108 | watch |
| 3 | 역삼1동 | 0.3485 | low |
| 4 | 대치4동 | 0.2990 | low |
| 5 | 논현2동 | 0.2801 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 삼성1동 | 0.8188 | - |
| 3 | 역삼1동 | 0.6967 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8157 | - |
| 2 | 청담동 | 0.6567 | - |
| 3 | 신사동 | 0.4555 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6309 | 0.7492 | 0.6490 | medium | pattern_fallback_used |
| 2 | 삼성1동 | 0.4555 | 0.5494 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 3 | 역삼1동 | 0.4183 | 0.4877 | 0.6840 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.2667 | 0.3456 | 0.4924 | low | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 논현2동 | 0.2624 | 0.3361 | 0.5126 | medium | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 17. 11:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 11:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 104750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 203
- Completed comparisons: 1
- Waiting comparisons: 202
- Live demand log count: 235
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 09:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.45
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 11:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.217
- Estimated positive imbalance after: 0.516
- Estimated relief score: 0.701
- Highest relief dong: 논현1동
