# Overnight Model QA Status

Generated: 2026. 05. 10. 06:23 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 06:23
- Raw citydata: `data/raw/citydata/2026-05-10/0623.json`
- Raw weather: `data/raw/weather/2026-05-10/0623.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 9.1 C
- Precipitation 1h: 0 mm
- Humidity: 70%
- Wind: 1 m/s

## Latest Targets

- Demand target: 2026. 05. 10. 07:00
- Traffic target: 2026. 05. 10. 07:00
- Taxi pressure target: 2026. 05. 10. 07:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5884 | medium |
| 2 | 논현1동 | 0.4266 | watch |
| 3 | 청담동 | 0.2323 | low |
| 4 | 논현2동 | 0.2172 | low |
| 5 | 대치4동 | 0.2063 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 논현2동 | 0.4502 | - |
| 3 | 대치4동 | 0.4046 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7690 | - |
| 2 | 청담동 | 0.5551 | - |
| 3 | 신사동 | 0.4166 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4825 | 0.6003 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3795 | 0.4418 | 0.6865 | high | pattern_fallback_used |
| 3 | 역삼1동 | 0.2567 | 0.3052 | 0.6465 | medium | pattern_fallback_used |
| 4 | 청담동 | 0.2136 | 0.2490 | 0.6839 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.1946 | 0.2447 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 10. 07:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 10. 07:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 62750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 68
- Completed comparisons: 2
- Waiting comparisons: 66
- Live demand log count: 100
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 06:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.0833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 10. 07:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 2
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.415
- Estimated positive imbalance after: 0.22
- Estimated relief score: 0.195
- Highest relief dong: 삼성1동
