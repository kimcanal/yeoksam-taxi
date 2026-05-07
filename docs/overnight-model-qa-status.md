# Overnight Model QA Status

Generated: 2026. 05. 07. 22:44 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 07. 22:43
- Raw citydata: `data/raw/citydata/2026-05-07/2243.json`
- Raw weather: `data/raw/weather/2026-05-07/2244.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.3 C
- Precipitation 1h: 0 mm
- Humidity: 87%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 07. 23:00
- Traffic target: 2026. 05. 07. 23:00
- Taxi pressure target: 2026. 05. 07. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8624 | high |
| 2 | 대치4동 | 0.4257 | watch |
| 3 | 역삼1동 | 0.3726 | low |
| 4 | 삼성1동 | 0.3396 | low |
| 5 | 청담동 | 0.2455 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.8244 | - |
| 3 | 역삼1동 | 0.7138 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8225 | - |
| 2 | 청담동 | 0.5336 | - |
| 3 | 삼성1동 | 0.3898 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6542 | 0.7617 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4416 | 0.5098 | 0.7027 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3603 | 0.4259 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3499 | 0.4495 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.3310 | 0.3747 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 07. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 07. 23:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 121750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 18
- Completed comparisons: 1
- Waiting comparisons: 17
- Live demand log count: 50
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 07. 22:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.4667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 07. 23:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 9
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.451
- Estimated positive imbalance after: 0.538
- Estimated relief score: 0.913
- Highest relief dong: 논현1동
