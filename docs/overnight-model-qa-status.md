# Overnight Model QA Status

Generated: 2026. 05. 13. 22:00 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 13. 22:00
- Raw citydata: `data/raw/citydata/2026-05-13/2200.json`
- Raw weather: `data/raw/weather/2026-05-13/2200.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 20.6 C
- Precipitation 1h: 0 mm
- Humidity: 57%
- Wind: 1.8 m/s

## Latest Targets

- Demand target: 2026. 05. 13. 23:00
- Traffic target: 2026. 05. 13. 23:00
- Taxi pressure target: 2026. 05. 13. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8612 | high |
| 2 | 대치4동 | 0.3998 | low |
| 3 | 역삼1동 | 0.3653 | low |
| 4 | 삼성1동 | 0.3431 | low |
| 5 | 청담동 | 0.2329 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7741 | - |
| 3 | 역삼1동 | 0.7040 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8172 | - |
| 2 | 청담동 | 0.5051 | - |
| 3 | 삼성1동 | 0.4114 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6690 | 0.7789 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4465 | 0.5205 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3660 | 0.4327 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3365 | 0.4323 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.3202 | 0.3557 | 0.7785 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 13. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 13. 22:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 150500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 132
- Completed comparisons: 2
- Waiting comparisons: 130
- Live demand log count: 164
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 13. 21:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.5
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 13. 22:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.375
- Estimated positive imbalance after: 0.577
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
