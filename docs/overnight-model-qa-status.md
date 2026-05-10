# Overnight Model QA Status

Generated: 2026. 05. 10. 17:47 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 17:46
- Raw citydata: `data/raw/citydata/2026-05-10/1746.json`
- Raw weather: `data/raw/weather/2026-05-10/1747.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 22.2 C
- Precipitation 1h: 0 mm
- Humidity: 24%
- Wind: 1.5 m/s

## Latest Targets

- Demand target: 2026. 05. 10. 18:00
- Traffic target: 2026. 05. 10. 18:00
- Taxi pressure target: 2026. 05. 10. 18:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9014 | high |
| 2 | 역삼1동 | 0.3436 | low |
| 3 | 삼성1동 | 0.3367 | low |
| 4 | 청담동 | 0.2365 | low |
| 5 | 논현2동 | 0.2272 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.6954 | - |
| 3 | 대치4동 | 0.3846 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8845 | - |
| 2 | 청담동 | 0.6550 | - |
| 3 | 삼성1동 | 0.5937 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6393 | 0.7748 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 역삼1동 | 0.4107 | 0.4934 | 0.6277 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3867 | 0.4571 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.2688 | 0.3043 | 0.7410 | high | pattern_fallback_used |
| 5 | 청담동 | 0.2321 | 0.2679 | 0.7027 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 10. 18:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 10. 18:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 138500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 75
- Completed comparisons: 1
- Waiting comparisons: 74
- Live demand log count: 107
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 17:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.65
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 10. 18:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.037
- Estimated positive imbalance after: 0.531
- Estimated relief score: 0.506
- Highest relief dong: 논현1동
