# Overnight Model QA Status

Generated: 2026. 05. 09. 20:26 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 09. 20:25
- Raw citydata: `data/raw/citydata/2026-05-09/2025.json`
- Raw weather: `data/raw/weather/2026-05-09/2026.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 17.3 C
- Precipitation 1h: 0 mm
- Humidity: 31%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 09. 21:00
- Traffic target: 2026. 05. 09. 21:00
- Taxi pressure target: 2026. 05. 09. 21:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8792 | high |
| 2 | 역삼1동 | 0.5285 | watch |
| 3 | 삼성1동 | 0.3547 | low |
| 4 | 대치4동 | 0.2718 | low |
| 5 | 청담동 | 0.2612 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 논현1동 | 0.9933 | - |
| 3 | 대치4동 | 0.5761 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8605 | - |
| 2 | 청담동 | 0.6517 | - |
| 3 | 신사동 | 0.4708 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6976 | 0.7889 | 0.7428 | high | pattern_fallback_used, recent_rank_volatility |
| 2 | 역삼1동 | 0.5372 | 0.6388 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3897 | 0.4607 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3619 | 0.4096 | 0.7410 | high | pattern_fallback_used |
| 5 | 청담동 | 0.2631 | 0.3008 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 09. 21:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 09. 21:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 144750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 58
- Completed comparisons: 2
- Waiting comparisons: 56
- Live demand log count: 90
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 09. 20:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.8667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 09. 21:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.344
- Estimated positive imbalance after: 0.626
- Estimated relief score: 0.718
- Highest relief dong: 논현1동
