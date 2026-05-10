# Overnight Model QA Status

Generated: 2026. 05. 10. 14:22 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 14:22
- Raw citydata: `data/raw/citydata/2026-05-10/1422.json`
- Raw weather: `data/raw/weather/2026-05-10/1422.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 24.3 C
- Precipitation 1h: 0 mm
- Humidity: 20%
- Wind: 2 m/s

## Latest Targets

- Demand target: 2026. 05. 10. 15:00
- Traffic target: 2026. 05. 10. 15:00
- Taxi pressure target: 2026. 05. 10. 15:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8869 | high |
| 2 | 삼성1동 | 0.4107 | watch |
| 3 | 역삼1동 | 0.3352 | low |
| 4 | 논현2동 | 0.2572 | low |
| 5 | 청담동 | 0.2542 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6701 | - |
| 3 | 삼성1동 | 0.5657 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8552 | - |
| 2 | 청담동 | 0.6788 | - |
| 3 | 삼성1동 | 0.5332 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6322 | 0.7661 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 역삼1동 | 0.4153 | 0.4890 | 0.6652 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.4148 | 0.5260 | 0.5301 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 4 | 삼성2동 | 0.2763 | 0.3158 | 0.7222 | high | pattern_fallback_used |
| 5 | 청담동 | 0.2636 | 0.3043 | 0.7027 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 10. 15:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 10. 15:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 151500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 73
- Completed comparisons: 1
- Waiting comparisons: 72
- Live demand log count: 105
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 13:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.4667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 10. 15:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 6
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.093
- Estimated positive imbalance after: 0.49
- Estimated relief score: 0.603
- Highest relief dong: 논현1동
