# Overnight Model QA Status

Generated: 2026. 05. 17. 02:29 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 02:28
- Raw citydata: `data/raw/citydata/2026-05-17/0228.json`
- Raw weather: `data/raw/weather/2026-05-17/0228.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 15.6 C
- Precipitation 1h: 0 mm
- Humidity: 69%
- Wind: 1.1 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 03:00
- Traffic target: 2026. 05. 17. 03:00
- Taxi pressure target: 2026. 05. 17. 03:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8454 | high |
| 2 | 삼성1동 | 0.4730 | watch |
| 3 | 역삼1동 | 0.4725 | watch |
| 4 | 청담동 | 0.2725 | low |
| 5 | 논현2동 | 0.1734 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.9613 | - |
| 3 | 삼성1동 | 0.9305 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8051 | - |
| 2 | 청담동 | 0.4998 | - |
| 3 | 신사동 | 0.3545 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6545 | 0.7473 | 0.7240 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4758 | 0.5774 | 0.6090 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.4366 | 0.5320 | 0.6013 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.2822 | 0.3226 | 0.7214 | high | pattern_fallback_used |
| 5 | 신사동 | 0.1825 | 0.2189 | 0.6308 | medium | pattern_fallback_used, signals_disagree |

- Guardrail target: 2026. 05. 17. 03:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 03:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 70250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 196
- Completed comparisons: 2
- Waiting comparisons: 194
- Live demand log count: 228
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 02:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): -0.05
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 03:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 6
- Max incentive multiplier: 1.1
- Positive imbalance before: 1.162
- Estimated positive imbalance after: 0.577
- Estimated relief score: 0.585
- Highest relief dong: 논현1동
