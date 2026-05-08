# Overnight Model QA Status

Generated: 2026. 05. 09. 04:39 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 09. 04:39
- Raw citydata: `data/raw/citydata/2026-05-09/0439.json`
- Raw weather: `data/raw/weather/2026-05-09/0439.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 9.7 C
- Precipitation 1h: 0 mm
- Humidity: 70%
- Wind: 1 m/s

## Latest Targets

- Demand target: 2026. 05. 09. 05:00
- Traffic target: 2026. 05. 09. 05:00
- Taxi pressure target: 2026. 05. 09. 05:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5108 | watch |
| 2 | 논현1동 | 0.4161 | watch |
| 3 | 대치4동 | 0.2482 | low |
| 4 | 논현2동 | 0.2346 | low |
| 5 | 청담동 | 0.1974 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 대치4동 | 0.4888 | - |
| 3 | 논현2동 | 0.4455 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7853 | - |
| 2 | 청담동 | 0.4872 | - |
| 3 | 신사동 | 0.3617 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4440 | 0.5583 | 0.5451 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3875 | 0.4424 | 0.7240 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 역삼1동 | 0.2412 | 0.2812 | 0.6840 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.2303 | 0.2896 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.2029 | 0.2298 | 0.7402 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 09. 05:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 09. 05:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 63250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 45
- Completed comparisons: 1
- Waiting comparisons: 44
- Live demand log count: 77
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 09. 04:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): -0.3
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 09. 05:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 2
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.348
- Estimated positive imbalance after: 0.153
- Estimated relief score: 0.195
- Highest relief dong: 삼성1동
