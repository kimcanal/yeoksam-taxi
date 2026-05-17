# Overnight Model QA Status

Generated: 2026. 05. 18. 01:29 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 18. 01:29
- Raw citydata: `data/raw/citydata/2026-05-18/0129.json`
- Raw weather: `data/raw/weather/2026-05-18/0129.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 16 C
- Precipitation 1h: 0 mm
- Humidity: 64%
- Wind: 1.4 m/s

## Latest Targets

- Demand target: 2026. 05. 18. 02:00
- Traffic target: 2026. 05. 18. 02:00
- Taxi pressure target: 2026. 05. 18. 02:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 0.5081 | watch |
| 2 | 논현1동 | 0.4235 | watch |
| 3 | 청담동 | 0.2322 | low |
| 4 | 대치4동 | 0.2012 | low |
| 5 | 삼성1동 | 0.2008 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 논현1동 | 0.3642 | - |
| 3 | 삼성1동 | 0.2701 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7701 | - |
| 2 | 청담동 | 0.5207 | - |
| 3 | 신사동 | 0.3654 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 역삼1동 | 0.5030 | 0.5982 | 0.6465 | medium | pattern_fallback_used |
| 2 | 논현1동 | 0.3831 | 0.4374 | 0.7240 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 청담동 | 0.2328 | 0.2611 | 0.7589 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.2226 | 0.2658 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.1697 | 0.2200 | 0.4924 | low | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 18. 02:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 18. 02:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 67500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 215
- Completed comparisons: 2
- Waiting comparisons: 213
- Live demand log count: 247
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 18. 01:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.3667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 18. 02:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.459
- Estimated positive imbalance after: 0.149
- Estimated relief score: 0.31
- Highest relief dong: 역삼1동
