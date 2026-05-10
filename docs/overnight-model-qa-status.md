# Overnight Model QA Status

Generated: 2026. 05. 10. 23:33 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 23:33
- Raw citydata: `data/raw/citydata/2026-05-10/2333.json`
- Raw weather: `data/raw/weather/2026-05-10/2333.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.2 C
- Precipitation 1h: 0 mm
- Humidity: 52%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 24:00
- Traffic target: 2026. 05. 11. 24:00
- Taxi pressure target: 2026. 05. 11. 24:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8601 | high |
| 2 | 역삼1동 | 0.3551 | low |
| 3 | 청담동 | 0.2679 | low |
| 4 | 삼성1동 | 0.1868 | low |
| 5 | 신사동 | 0.1729 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.7538 | - |
| 3 | 청담동 | 0.3253 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8271 | - |
| 2 | 청담동 | 0.4445 | - |
| 3 | 신사동 | 0.3506 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6464 | 0.7526 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4257 | 0.4963 | 0.6840 | high | pattern_fallback_used |
| 3 | 청담동 | 0.2797 | 0.3137 | 0.7589 | high | pattern_fallback_used |
| 4 | 삼성2동 | 0.2440 | 0.2685 | 0.7972 | high | pattern_fallback_used |
| 5 | 신사동 | 0.2149 | 0.2604 | 0.6121 | medium | pattern_fallback_used, signals_disagree |

- Guardrail target: 2026. 05. 11. 24:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 24:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 78750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 81
- Completed comparisons: 1
- Waiting comparisons: 80
- Live demand log count: 113
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 23:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.8833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 11. 24:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 4
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.732
- Estimated positive imbalance after: 0.324
- Estimated relief score: 0.408
- Highest relief dong: 논현1동
