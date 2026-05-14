# Overnight Model QA Status

Generated: 2026. 05. 15. 06:36 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 15. 06:35
- Raw citydata: `data/raw/citydata/2026-05-15/0635.json`
- Raw weather: `data/raw/weather/2026-05-15/0635.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 18.1 C
- Precipitation 1h: 0 mm
- Humidity: 80%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 15. 07:00
- Traffic target: 2026. 05. 15. 07:00
- Taxi pressure target: 2026. 05. 15. 07:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.5508 | medium |
| 2 | 대치4동 | 0.5177 | watch |
| 3 | 삼성1동 | 0.4228 | watch |
| 4 | 역삼1동 | 0.2947 | low |
| 5 | 논현2동 | 0.2713 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 삼성1동 | 0.6633 | - |
| 3 | 논현2동 | 0.6292 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7963 | - |
| 2 | 청담동 | 0.6812 | - |
| 3 | 삼성1동 | 0.4529 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.4644 | 0.5354 | 0.7053 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.3968 | 0.4786 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 3 | 대치4동 | 0.3962 | 0.5203 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 4 | 역삼1동 | 0.3636 | 0.4198 | 0.7027 | high | pattern_fallback_used |
| 5 | 삼성2동 | 0.2435 | 0.2756 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 15. 07:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 15. 07:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 81750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 159
- Completed comparisons: 1
- Waiting comparisons: 158
- Live demand log count: 191
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 15. 06:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.6167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 15. 07:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 4
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.775
- Estimated positive imbalance after: 0.367
- Estimated relief score: 0.408
- Highest relief dong: 대치4동
