# Overnight Model QA Status

Generated: 2026. 05. 15. 04:41 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 15. 04:41
- Raw citydata: `data/raw/citydata/2026-05-15/0441.json`
- Raw weather: `data/raw/weather/2026-05-15/0441.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 18.1 C
- Precipitation 1h: 0 mm
- Humidity: 80%
- Wind: 0.8 m/s

## Latest Targets

- Demand target: 2026. 05. 15. 05:00
- Traffic target: 2026. 05. 15. 05:00
- Taxi pressure target: 2026. 05. 15. 05:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5416 | watch |
| 2 | 논현1동 | 0.4133 | watch |
| 3 | 대치4동 | 0.2715 | low |
| 4 | 청담동 | 0.2029 | low |
| 5 | 역삼1동 | 0.2005 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 대치4동 | 0.5465 | - |
| 3 | 논현2동 | 0.4172 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7743 | - |
| 2 | 청담동 | 0.5437 | - |
| 3 | 신사동 | 0.3318 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4650 | 0.5786 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3773 | 0.4350 | 0.7053 | high | pattern_fallback_used |
| 3 | 역삼1동 | 0.2692 | 0.3170 | 0.6652 | medium | pattern_fallback_used |
| 4 | 대치4동 | 0.2537 | 0.3190 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.1926 | 0.2202 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 15. 05:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 15. 05:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 70000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 157
- Completed comparisons: 1
- Waiting comparisons: 156
- Live demand log count: 189
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 15. 04:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): -0.2333
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 15. 05:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 3
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.441
- Estimated positive imbalance after: 0.148
- Estimated relief score: 0.293
- Highest relief dong: 삼성1동
