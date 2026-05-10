# Overnight Model QA Status

Generated: 2026. 05. 10. 20:27 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 20:27
- Raw citydata: `data/raw/citydata/2026-05-10/2027.json`
- Raw weather: `data/raw/weather/2026-05-10/2027.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 17.4 C
- Precipitation 1h: 0 mm
- Humidity: 34%
- Wind: 0.5 m/s

## Latest Targets

- Demand target: 2026. 05. 10. 21:00
- Traffic target: 2026. 05. 10. 21:00
- Taxi pressure target: 2026. 05. 10. 21:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7969 | high |
| 2 | 역삼1동 | 0.5159 | watch |
| 3 | 삼성1동 | 0.4106 | watch |
| 4 | 대치4동 | 0.2578 | low |
| 5 | 삼성2동 | 0.2441 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 논현1동 | 0.9052 | - |
| 3 | 삼성1동 | 0.6121 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8153 | - |
| 2 | 청담동 | 0.6036 | - |
| 3 | 삼성1동 | 0.4829 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6230 | 0.7114 | 0.7240 | high | pattern_fallback_used, recent_rank_volatility |
| 2 | 역삼1동 | 0.5167 | 0.6144 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.4101 | 0.4848 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3427 | 0.3842 | 0.7597 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.2449 | 0.3016 | 0.5824 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 10. 21:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 10. 21:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 119250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 78
- Completed comparisons: 2
- Waiting comparisons: 76
- Live demand log count: 110
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 20:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.3833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 10. 21:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 6
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.178
- Estimated positive imbalance after: 0.575
- Estimated relief score: 0.603
- Highest relief dong: 역삼1동
