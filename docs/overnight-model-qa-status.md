# Overnight Model QA Status

Generated: 2026. 05. 17. 16:12 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 16:12
- Raw citydata: `data/raw/citydata/2026-05-17/1612.json`
- Raw weather: `data/raw/weather/2026-05-17/1612.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 28.8 C
- Precipitation 1h: 0 mm
- Humidity: 29%
- Wind: 1.8 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 17:00
- Traffic target: 2026. 05. 17. 17:00
- Taxi pressure target: 2026. 05. 17. 17:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8910 | high |
| 2 | 삼성1동 | 0.3404 | low |
| 3 | 역삼1동 | 0.3400 | low |
| 4 | 청담동 | 0.2624 | low |
| 5 | 대치4동 | 0.2350 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6636 | - |
| 3 | 대치4동 | 0.4075 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8571 | - |
| 2 | 청담동 | 0.7109 | - |
| 3 | 삼성1동 | 0.5695 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6326 | 0.7666 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 역삼1동 | 0.4304 | 0.5018 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3953 | 0.4720 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.2679 | 0.3093 | 0.7027 | high | pattern_fallback_used |
| 5 | 삼성2동 | 0.2644 | 0.2937 | 0.7785 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 17. 17:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 17:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 145000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 206
- Completed comparisons: 1
- Waiting comparisons: 205
- Live demand log count: 238
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 15:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.7167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 17:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.973
- Estimated positive imbalance after: 0.468
- Estimated relief score: 0.506
- Highest relief dong: 논현1동
