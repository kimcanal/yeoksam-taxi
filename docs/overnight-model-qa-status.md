# Overnight Model QA Status

Generated: 2026. 05. 16. 20:30 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 20:29
- Raw citydata: `data/raw/citydata/2026-05-16/2029.json`
- Raw weather: `data/raw/weather/2026-05-16/2029.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 23.8 C
- Precipitation 1h: 0 mm
- Humidity: 38%
- Wind: 1 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 21:00
- Traffic target: 2026. 05. 16. 21:00
- Taxi pressure target: 2026. 05. 16. 21:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8758 | high |
| 2 | 역삼1동 | 0.5344 | watch |
| 3 | 삼성1동 | 0.3530 | low |
| 4 | 대치4동 | 0.2732 | low |
| 5 | 논현2동 | 0.2696 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 논현1동 | 0.9942 | - |
| 3 | 대치4동 | 0.5787 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8495 | - |
| 2 | 청담동 | 0.6419 | - |
| 3 | 신사동 | 0.4523 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6950 | 0.7860 | 0.7428 | high | pattern_fallback_used, recent_rank_volatility |
| 2 | 역삼1동 | 0.5455 | 0.6487 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3914 | 0.4627 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3679 | 0.4125 | 0.7597 | high | pattern_fallback_used |
| 5 | 청담동 | 0.2781 | 0.3180 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 16. 21:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 21:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 147250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 190
- Completed comparisons: 2
- Waiting comparisons: 188
- Live demand log count: 222
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 20:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.8333
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 21:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.32
- Estimated positive imbalance after: 0.602
- Estimated relief score: 0.718
- Highest relief dong: 역삼1동
