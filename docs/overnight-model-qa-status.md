# Overnight Model QA Status

Generated: 2026. 05. 14. 02:50 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 14. 02:50
- Raw citydata: `data/raw/citydata/2026-05-14/0250.json`
- Raw weather: `data/raw/weather/2026-05-14/0250.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 15.6 C
- Precipitation 1h: 0 mm
- Humidity: 83%
- Wind: 0.5 m/s

## Latest Targets

- Demand target: 2026. 05. 14. 03:00
- Traffic target: 2026. 05. 14. 03:00
- Taxi pressure target: 2026. 05. 14. 03:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8299 | high |
| 2 | 대치4동 | 0.4944 | watch |
| 3 | 삼성1동 | 0.4790 | watch |
| 4 | 역삼1동 | 0.4037 | watch |
| 5 | 청담동 | 0.3587 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.9243 | - |
| 3 | 삼성1동 | 0.8665 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7576 | - |
| 2 | 청담동 | 0.4824 | - |
| 3 | 신사동 | 0.3805 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6253 | 0.7280 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4465 | 0.5257 | 0.6652 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.4425 | 0.5284 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3904 | 0.5016 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.3726 | 0.4179 | 0.7589 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 14. 03:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 14. 03:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 74500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 136
- Completed comparisons: 1
- Waiting comparisons: 135
- Live demand log count: 168
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 14. 02:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.35
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 14. 03:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 9
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.493
- Estimated positive imbalance after: 0.598
- Estimated relief score: 0.895
- Highest relief dong: 대치4동
