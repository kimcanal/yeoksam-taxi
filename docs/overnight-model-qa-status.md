# Overnight Model QA Status

Generated: 2026. 05. 11. 04:33 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 11. 04:33
- Raw citydata: `data/raw/citydata/2026-05-11/0433.json`
- Raw weather: `data/raw/weather/2026-05-11/0433.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 12 C
- Precipitation 1h: 0 mm
- Humidity: 74%
- Wind: 0.6 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 05:00
- Traffic target: 2026. 05. 11. 05:00
- Taxi pressure target: 2026. 05. 11. 05:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.6211 | medium |
| 2 | 논현1동 | 0.4239 | watch |
| 3 | 대치4동 | 0.2726 | low |
| 4 | 역삼1동 | 0.2315 | low |
| 5 | 청담동 | 0.2043 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 대치4동 | 0.5559 | - |
| 3 | 역삼1동 | 0.4734 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8070 | - |
| 2 | 청담동 | 0.5516 | - |
| 3 | 삼성1동 | 0.4446 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.5020 | 0.6181 | 0.5826 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3816 | 0.4400 | 0.7053 | high | pattern_fallback_used |
| 3 | 역삼1동 | 0.3019 | 0.3520 | 0.6840 | high | pattern_fallback_used, recent_rank_volatility |
| 4 | 대치4동 | 0.2536 | 0.3189 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.1957 | 0.2237 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 11. 05:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 05:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 64000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 86
- Completed comparisons: 1
- Waiting comparisons: 85
- Live demand log count: 118
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 11. 04:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.4
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 11. 05:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.582
- Estimated positive imbalance after: 0.272
- Estimated relief score: 0.31
- Highest relief dong: 삼성1동
