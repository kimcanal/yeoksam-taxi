# Overnight Model QA Status

Generated: 2026. 05. 18. 02:30 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 18. 02:29
- Raw citydata: `data/raw/citydata/2026-05-18/0229.json`
- Raw weather: `data/raw/weather/2026-05-18/0229.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 15.5 C
- Precipitation 1h: 0 mm
- Humidity: 63%
- Wind: 1 m/s

## Latest Targets

- Demand target: 2026. 05. 18. 03:00
- Traffic target: 2026. 05. 18. 03:00
- Taxi pressure target: 2026. 05. 18. 03:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8269 | high |
| 2 | 삼성1동 | 0.4031 | watch |
| 3 | 역삼1동 | 0.3600 | low |
| 4 | 대치4동 | 0.3518 | low |
| 5 | 청담동 | 0.3426 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8030 | - |
| 3 | 삼성1동 | 0.7670 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7591 | - |
| 2 | 청담동 | 0.5303 | - |
| 3 | 신사동 | 0.3962 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6064 | 0.7202 | 0.6490 | medium | pattern_fallback_used |
| 2 | 역삼1동 | 0.4139 | 0.5023 | 0.6090 | medium | pattern_fallback_used, recent_rank_volatility |
| 3 | 삼성1동 | 0.4058 | 0.4797 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.3481 | 0.3905 | 0.7589 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3414 | 0.4118 | 0.6199 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 18. 03:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 18. 03:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 65000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 216
- Completed comparisons: 2
- Waiting comparisons: 214
- Live demand log count: 248
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 18. 02:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.3333
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 18. 03:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 7
- Max incentive multiplier: 1.1
- Positive imbalance before: 1.05
- Estimated positive imbalance after: 0.367
- Estimated relief score: 0.683
- Highest relief dong: 논현1동
