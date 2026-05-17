# Overnight Model QA Status

Generated: 2026. 05. 18. 07:26 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 18. 07:25
- Raw citydata: `data/raw/citydata/2026-05-18/0725.json`
- Raw weather: `data/raw/weather/2026-05-18/0726.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 19.8 C
- Precipitation 1h: 0 mm
- Humidity: 57%
- Wind: 1 m/s

## Latest Targets

- Demand target: 2026. 05. 18. 08:00
- Traffic target: 2026. 05. 18. 08:00
- Taxi pressure target: 2026. 05. 18. 08:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.6293 | medium |
| 2 | 대치4동 | 0.5245 | watch |
| 3 | 삼성1동 | 0.3489 | low |
| 4 | 논현2동 | 0.3179 | low |
| 5 | 역삼1동 | 0.2771 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현2동 | 0.6773 | - |
| 3 | 논현1동 | 0.6618 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8020 | - |
| 2 | 청담동 | 0.6667 | - |
| 3 | 삼성1동 | 0.4992 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.5232 | 0.5917 | 0.7428 | high | pattern_fallback_used |
| 2 | 대치4동 | 0.3992 | 0.5243 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 3 | 역삼1동 | 0.3510 | 0.4052 | 0.7027 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.3467 | 0.4182 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 5 | 논현2동 | 0.2632 | 0.3605 | 0.4001 | low | pattern_fallback_used, signals_disagree, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 18. 08:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 18. 08:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 119750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 221
- Completed comparisons: 2
- Waiting comparisons: 219
- Live demand log count: 253
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 18. 07:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.3167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 18. 08:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 4
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.862
- Estimated positive imbalance after: 0.454
- Estimated relief score: 0.408
- Highest relief dong: 대치4동
