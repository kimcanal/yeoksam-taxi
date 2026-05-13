# Overnight Model QA Status

Generated: 2026. 05. 14. 04:42 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 14. 04:42
- Raw citydata: `data/raw/citydata/2026-05-14/0442.json`
- Raw weather: `data/raw/weather/2026-05-14/0442.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.8 C
- Precipitation 1h: 0 mm
- Humidity: 87%
- Wind: 0.9 m/s

## Latest Targets

- Demand target: 2026. 05. 14. 05:00
- Traffic target: 2026. 05. 14. 05:00
- Taxi pressure target: 2026. 05. 14. 05:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5483 | watch |
| 2 | 논현1동 | 0.4265 | watch |
| 3 | 대치4동 | 0.2761 | low |
| 4 | 역삼1동 | 0.2228 | low |
| 5 | 청담동 | 0.1968 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 대치4동 | 0.5498 | - |
| 3 | 역삼1동 | 0.4468 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8066 | - |
| 2 | 청담동 | 0.5343 | - |
| 3 | 신사동 | 0.3263 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4665 | 0.5804 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3855 | 0.4444 | 0.7053 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 역삼1동 | 0.2945 | 0.3433 | 0.6840 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.2588 | 0.3255 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.1910 | 0.2184 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 14. 05:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 14. 05:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 69500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 138
- Completed comparisons: 1
- Waiting comparisons: 137
- Live demand log count: 170
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 14. 04:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.0333
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 14. 05:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 3
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.487
- Estimated positive imbalance after: 0.194
- Estimated relief score: 0.293
- Highest relief dong: 삼성1동
