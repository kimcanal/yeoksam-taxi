# Overnight Model QA Status

Generated: 2026. 05. 17. 06:24 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 06:24
- Raw citydata: `data/raw/citydata/2026-05-17/0624.json`
- Raw weather: `data/raw/weather/2026-05-17/0624.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 15.2 C
- Precipitation 1h: 0 mm
- Humidity: 71%
- Wind: 1.3 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 07:00
- Traffic target: 2026. 05. 17. 07:00
- Taxi pressure target: 2026. 05. 17. 07:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.6180 | medium |
| 2 | 논현1동 | 0.4543 | watch |
| 3 | 청담동 | 0.2277 | low |
| 4 | 논현2동 | 0.2231 | low |
| 5 | 대치4동 | 0.2193 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 논현2동 | 0.4429 | - |
| 3 | 대치4동 | 0.4122 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7754 | - |
| 2 | 청담동 | 0.5474 | - |
| 3 | 신사동 | 0.4056 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4928 | 0.6131 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.4096 | 0.4677 | 0.7240 | high | pattern_fallback_used |
| 3 | 역삼1동 | 0.2635 | 0.3072 | 0.6840 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.2133 | 0.2627 | 0.5824 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.2120 | 0.2471 | 0.6839 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 17. 07:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 07:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 65250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 200
- Completed comparisons: 2
- Waiting comparisons: 198
- Live demand log count: 232
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 06:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.3
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 07:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.465
- Estimated positive imbalance after: 0.155
- Estimated relief score: 0.31
- Highest relief dong: 삼성1동
