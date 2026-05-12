# Overnight Model QA Status

Generated: 2026. 05. 12. 16:15 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 12. 16:15
- Raw citydata: `data/raw/citydata/2026-05-12/1615.json`
- Raw weather: `data/raw/weather/2026-05-12/1615.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 24.6 C
- Precipitation 1h: 0 mm
- Humidity: 47%
- Wind: 2.3 m/s

## Latest Targets

- Demand target: 2026. 05. 12. 17:00
- Traffic target: 2026. 05. 12. 17:00
- Taxi pressure target: 2026. 05. 12. 17:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9121 | high |
| 2 | 대치4동 | 0.4074 | watch |
| 3 | 역삼1동 | 0.3423 | low |
| 4 | 삼성1동 | 0.3130 | low |
| 5 | 청담동 | 0.2917 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.8134 | - |
| 3 | 역삼1동 | 0.5981 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8955 | - |
| 2 | 청담동 | 0.7909 | - |
| 3 | 삼성1동 | 0.5488 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7323 | 0.8697 | 0.6490 | medium | pattern_fallback_used |
| 2 | 역삼1동 | 0.4906 | 0.5719 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4102 | 0.5051 | 0.5826 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3672 | 0.4156 | 0.7410 | high | pattern_fallback_used |
| 5 | 청담동 | 0.3374 | 0.3858 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 12. 17:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 12. 17:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 290750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 110
- Completed comparisons: 1
- Waiting comparisons: 109
- Live demand log count: 142
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 12. 15:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.3833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 12. 17:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.443
- Estimated positive imbalance after: 0.743
- Estimated relief score: 0.7
- Highest relief dong: 논현1동
