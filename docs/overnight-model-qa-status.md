# Overnight Model QA Status

Generated: 2026. 05. 11. 01:27 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 11. 01:27
- Raw citydata: `data/raw/citydata/2026-05-11/0127.json`
- Raw weather: `data/raw/weather/2026-05-11/0127.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 12.5 C
- Precipitation 1h: 0 mm
- Humidity: 72%
- Wind: 0.3 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 02:00
- Traffic target: 2026. 05. 11. 02:00
- Taxi pressure target: 2026. 05. 11. 02:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 0.5242 | watch |
| 2 | 논현1동 | 0.4423 | watch |
| 3 | 청담동 | 0.2331 | low |
| 4 | 삼성1동 | 0.1798 | low |
| 5 | 대치4동 | 0.1737 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 논현1동 | 0.3679 | - |
| 3 | 대치4동 | 0.3109 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8111 | - |
| 2 | 청담동 | 0.5010 | - |
| 3 | 신사동 | 0.3935 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 역삼1동 | 0.5190 | 0.6050 | 0.6840 | high | pattern_fallback_used |
| 2 | 논현1동 | 0.4064 | 0.4596 | 0.7428 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 청담동 | 0.2399 | 0.2743 | 0.7214 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.1994 | 0.2405 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 삼성2동 | 0.1800 | 0.2037 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 11. 02:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 02:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 65000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 83
- Completed comparisons: 2
- Waiting comparisons: 81
- Live demand log count: 115
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 11. 01:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.6
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 11. 02:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.508
- Estimated positive imbalance after: 0.198
- Estimated relief score: 0.31
- Highest relief dong: 역삼1동
