# Overnight Model QA Status

Generated: 2026. 05. 17. 12:21 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 12:20
- Raw citydata: `data/raw/citydata/2026-05-17/1220.json`
- Raw weather: `data/raw/weather/2026-05-17/1221.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 28.7 C
- Precipitation 1h: 0 mm
- Humidity: 34%
- Wind: 1.5 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 13:00
- Traffic target: 2026. 05. 17. 13:00
- Taxi pressure target: 2026. 05. 17. 13:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8728 | high |
| 2 | 삼성1동 | 0.4384 | watch |
| 3 | 역삼1동 | 0.3380 | low |
| 4 | 대치4동 | 0.2931 | low |
| 5 | 청담동 | 0.2656 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6857 | - |
| 3 | 삼성1동 | 0.6777 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8362 | - |
| 2 | 청담동 | 0.7186 | - |
| 3 | 신사동 | 0.4689 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6254 | 0.7579 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 삼성1동 | 0.4558 | 0.5388 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 3 | 역삼1동 | 0.4043 | 0.4906 | 0.6090 | medium | pattern_fallback_used |
| 4 | 대치4동 | 0.2775 | 0.3348 | 0.6199 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.2616 | 0.3020 | 0.7027 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 17. 13:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 13:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 134500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 204
- Completed comparisons: 1
- Waiting comparisons: 203
- Live demand log count: 236
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 11:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.65
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 13:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.241
- Estimated positive imbalance after: 0.541
- Estimated relief score: 0.701
- Highest relief dong: 논현1동
