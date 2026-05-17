# Overnight Model QA Status

Generated: 2026. 05. 17. 14:27 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 14:27
- Raw citydata: `data/raw/citydata/2026-05-17/1427.json`
- Raw weather: `data/raw/weather/2026-05-17/1427.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 29.3 C
- Precipitation 1h: 0 mm
- Humidity: 25%
- Wind: 2 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 15:00
- Traffic target: 2026. 05. 17. 15:00
- Taxi pressure target: 2026. 05. 17. 15:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8964 | high |
| 2 | 삼성1동 | 0.4057 | watch |
| 3 | 역삼1동 | 0.3396 | low |
| 4 | 청담동 | 0.2553 | low |
| 5 | 대치4동 | 0.2453 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6697 | - |
| 3 | 삼성1동 | 0.5551 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8769 | - |
| 2 | 청담동 | 0.6880 | - |
| 3 | 삼성1동 | 0.5143 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6375 | 0.7726 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 삼성1동 | 0.4401 | 0.5308 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 3 | 역삼1동 | 0.4261 | 0.5017 | 0.6652 | medium | pattern_fallback_used |
| 4 | 삼성2동 | 0.2813 | 0.3124 | 0.7785 | high | pattern_fallback_used |
| 5 | 청담동 | 0.2647 | 0.3056 | 0.7027 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 17. 15:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 15:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 152000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 205
- Completed comparisons: 1
- Waiting comparisons: 204
- Live demand log count: 237
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 13:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.8167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 15:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.125
- Estimated positive imbalance after: 0.619
- Estimated relief score: 0.506
- Highest relief dong: 논현1동
