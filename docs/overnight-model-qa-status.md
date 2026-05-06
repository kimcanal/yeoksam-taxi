# Overnight Model QA Status

Generated: 2026. 05. 07. 24:53 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 07. 24:53
- Raw citydata: `data/raw/citydata/2026-05-07/0053.json`
- Raw weather: `data/raw/weather/2026-05-07/0053.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 15.3 C
- Precipitation 1h: 0 mm
- Humidity: 58%
- Wind: 0.5 m/s

## Latest Targets

- Demand target: 2026. 05. 07. 01:00
- Traffic target: 2026. 05. 07. 01:00
- Taxi pressure target: 2026. 05. 07. 01:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 0.5165 | watch |
| 2 | 논현1동 | 0.4268 | watch |
| 3 | 청담동 | 0.2320 | low |
| 4 | 삼성1동 | 0.2019 | low |
| 5 | 대치4동 | 0.1836 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 논현1동 | 0.3390 | - |
| 3 | 대치4동 | 0.2620 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8077 | - |
| 2 | 청담동 | 0.5249 | - |
| 3 | 신사동 | 0.3775 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 역삼1동 | 0.5096 | 0.6060 | 0.6465 | medium | pattern_fallback_used |
| 2 | 논현1동 | 0.3962 | 0.4481 | 0.7428 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 청담동 | 0.2381 | 0.2671 | 0.7589 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.2274 | 0.2688 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.1683 | 0.2072 | 0.5824 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 07. 01:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 07. 01:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 81250

## Validation

- Taxi pressure comparison status: waiting_for_observation
- Taxi pressure log count: 1
- Completed comparisons: 0
- Waiting comparisons: 1
- Live demand log count: 33
- Latest comparison kind: waiting
- Latest comparison target: 2026. 05. 07. 01:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: -
- Latest road-signal Spearman (policy check): -
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 07. 01:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.472
- Estimated positive imbalance after: 0.162
- Estimated relief score: 0.31
- Highest relief dong: 역삼1동
