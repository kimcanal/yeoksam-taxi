# Overnight Model QA Status

Generated: 2026. 05. 18. 08:27 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 18. 08:27
- Raw citydata: `data/raw/citydata/2026-05-18/0827.json`
- Raw weather: `data/raw/weather/2026-05-18/0827.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 22.8 C
- Precipitation 1h: 0 mm
- Humidity: 47%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 18. 09:00
- Traffic target: 2026. 05. 18. 09:00
- Taxi pressure target: 2026. 05. 18. 09:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.6884 | medium |
| 2 | 대치4동 | 0.5548 | medium |
| 3 | 삼성1동 | 0.2892 | low |
| 4 | 역삼1동 | 0.2692 | low |
| 5 | 논현2동 | 0.2585 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.7226 | - |
| 3 | 논현2동 | 0.5884 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8324 | - |
| 2 | 청담동 | 0.6428 | - |
| 3 | 신사동 | 0.5489 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.5775 | 0.6531 | 0.7428 | high | pattern_fallback_used |
| 2 | 대치4동 | 0.4188 | 0.5381 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 3 | 역삼1동 | 0.3726 | 0.4344 | 0.6840 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.3072 | 0.3632 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 삼성2동 | 0.2857 | 0.3234 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 18. 09:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 18. 09:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 178750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 222
- Completed comparisons: 2
- Waiting comparisons: 220
- Live demand log count: 254
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 18. 08:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.3167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 18. 09:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 4
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.947
- Estimated positive imbalance after: 0.539
- Estimated relief score: 0.408
- Highest relief dong: 대치4동
