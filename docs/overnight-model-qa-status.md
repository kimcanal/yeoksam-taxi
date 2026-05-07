# Overnight Model QA Status

Generated: 2026. 05. 08. 01:43 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 08. 01:43
- Raw citydata: `data/raw/citydata/2026-05-08/0143.json`
- Raw weather: `data/raw/weather/2026-05-08/0143.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 13 C
- Precipitation 1h: 0 mm
- Humidity: 85%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 08. 02:00
- Traffic target: 2026. 05. 08. 02:00
- Taxi pressure target: 2026. 05. 08. 02:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 0.5269 | watch |
| 2 | 논현1동 | 0.4361 | watch |
| 3 | 청담동 | 0.2263 | low |
| 4 | 대치4동 | 0.2111 | low |
| 5 | 역삼2동 | 0.1797 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 역삼2동 | 0.3626 | - |
| 3 | 논현1동 | 0.3458 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8138 | - |
| 2 | 청담동 | 0.4939 | - |
| 3 | 대치4동 | 0.3578 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 역삼1동 | 0.5130 | 0.6100 | 0.6465 | medium | pattern_fallback_used |
| 2 | 논현1동 | 0.3994 | 0.4517 | 0.7428 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 청담동 | 0.2276 | 0.2577 | 0.7402 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.1974 | 0.2333 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.1941 | 0.2342 | 0.6199 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 08. 02:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 08. 02:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 75750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 21
- Completed comparisons: 2
- Waiting comparisons: 19
- Live demand log count: 53
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 08. 01:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.8
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 08. 02:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.517
- Estimated positive imbalance after: 0.207
- Estimated relief score: 0.31
- Highest relief dong: 역삼1동
