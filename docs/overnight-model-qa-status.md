# Overnight Model QA Status

Generated: 2026. 05. 16. 17:44 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 17:44
- Raw citydata: `data/raw/citydata/2026-05-16/1744.json`
- Raw weather: `data/raw/weather/2026-05-16/1744.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 28.3 C
- Precipitation 1h: 0 mm
- Humidity: 27%
- Wind: 1.4 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 18:00
- Traffic target: 2026. 05. 16. 18:00
- Taxi pressure target: 2026. 05. 16. 18:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9178 | high |
| 2 | 역삼1동 | 0.3672 | low |
| 3 | 삼성1동 | 0.3085 | low |
| 4 | 청담동 | 0.2533 | low |
| 5 | 대치4동 | 0.2381 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6587 | - |
| 3 | 대치4동 | 0.4239 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9107 | - |
| 2 | 청담동 | 0.7113 | - |
| 3 | 삼성1동 | 0.5676 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7079 | 0.8407 | 0.6490 | medium | pattern_fallback_used |
| 2 | 역삼1동 | 0.4477 | 0.5324 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3630 | 0.4335 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3092 | 0.3434 | 0.7785 | high | pattern_fallback_used |
| 5 | 청담동 | 0.2952 | 0.3375 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 16. 18:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 18:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 175750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 187
- Completed comparisons: 1
- Waiting comparisons: 186
- Live demand log count: 219
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 17:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.7
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 18:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.282
- Estimated positive imbalance after: 0.777
- Estimated relief score: 0.505
- Highest relief dong: 논현1동
