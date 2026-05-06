# Overnight Model QA Status

Generated: 2026. 05. 07. 04:41 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 07. 04:41
- Raw citydata: `data/raw/citydata/2026-05-07/0441.json`
- Raw weather: `data/raw/weather/2026-05-07/0441.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 12.2 C
- Precipitation 1h: 0 mm
- Humidity: 71%
- Wind: 1.1 m/s

## Latest Targets

- Demand target: 2026. 05. 07. 05:00
- Traffic target: 2026. 05. 07. 05:00
- Taxi pressure target: 2026. 05. 07. 05:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5587 | medium |
| 2 | 논현1동 | 0.4203 | watch |
| 3 | 대치4동 | 0.2655 | low |
| 4 | 역삼1동 | 0.2227 | low |
| 5 | 청담동 | 0.2047 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 대치4동 | 0.5442 | - |
| 3 | 역삼1동 | 0.4459 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8142 | - |
| 2 | 청담동 | 0.5595 | - |
| 3 | 신사동 | 0.3451 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4726 | 0.5880 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3863 | 0.4454 | 0.7053 | high | pattern_fallback_used |
| 3 | 역삼1동 | 0.2916 | 0.3399 | 0.6840 | high | pattern_fallback_used, recent_rank_volatility |
| 4 | 대치4동 | 0.2504 | 0.3149 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.1957 | 0.2237 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 07. 05:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 07. 05:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 69500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 5
- Completed comparisons: 1
- Waiting comparisons: 4
- Live demand log count: 37
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 07. 04:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.1667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 07. 05:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 2
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.461
- Estimated positive imbalance after: 0.266
- Estimated relief score: 0.195
- Highest relief dong: 삼성1동
