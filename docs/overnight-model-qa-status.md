# Overnight Model QA Status

Generated: 2026. 05. 09. 01:42 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 09. 01:42
- Raw citydata: `data/raw/citydata/2026-05-09/0142.json`
- Raw weather: `data/raw/weather/2026-05-09/0142.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.2 C
- Precipitation 1h: 0 mm
- Humidity: 48%
- Wind: 1.5 m/s

## Latest Targets

- Demand target: 2026. 05. 09. 02:00
- Traffic target: 2026. 05. 09. 02:00
- Taxi pressure target: 2026. 05. 09. 02:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8586 | high |
| 2 | 청담동 | 0.4725 | watch |
| 3 | 역삼1동 | 0.4607 | watch |
| 4 | 신사동 | 0.3239 | low |
| 5 | 삼성2동 | 0.2946 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8999 | - |
| 3 | 청담동 | 0.7263 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8252 | - |
| 2 | 청담동 | 0.4712 | - |
| 3 | 신사동 | 0.3776 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6449 | 0.7508 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4857 | 0.5662 | 0.6840 | high | pattern_fallback_used |
| 3 | 청담동 | 0.4562 | 0.5117 | 0.7589 | high | pattern_fallback_used |
| 4 | 삼성2동 | 0.3907 | 0.4340 | 0.7785 | high | pattern_fallback_used |
| 5 | 신사동 | 0.3749 | 0.4279 | 0.7246 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 09. 02:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 09. 02:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 75250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 42
- Completed comparisons: 1
- Waiting comparisons: 41
- Live demand log count: 74
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 09. 01:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.1833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 09. 02:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 6
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.106
- Estimated positive imbalance after: 0.503
- Estimated relief score: 0.603
- Highest relief dong: 논현1동
