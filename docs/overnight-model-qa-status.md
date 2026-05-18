# Overnight Model QA Status

Generated: 2026. 05. 18. 12:23 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 18. 12:23
- Raw citydata: `data/raw/citydata/2026-05-18/1223.json`
- Raw weather: `data/raw/weather/2026-05-18/1223.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 29.1 C
- Precipitation 1h: 0 mm
- Humidity: 25%
- Wind: 2.4 m/s

## Latest Targets

- Demand target: 2026. 05. 18. 13:00
- Traffic target: 2026. 05. 18. 13:00
- Taxi pressure target: 2026. 05. 18. 13:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7745 | high |
| 2 | 대치4동 | 0.5227 | watch |
| 3 | 삼성1동 | 0.3017 | low |
| 4 | 역삼1동 | 0.2437 | low |
| 5 | 논현2동 | 0.2404 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.8156 | - |
| 3 | 역삼1동 | 0.4107 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8742 | - |
| 2 | 청담동 | 0.6441 | - |
| 3 | 삼성1동 | 0.4980 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6844 | 0.7740 | 0.7428 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.3994 | 0.4656 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3820 | 0.4608 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3809 | 0.5234 | 0.3949 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.3410 | 0.3860 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 18. 13:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 18. 13:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 291750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 224
- Completed comparisons: 1
- Waiting comparisons: 223
- Live demand log count: 256
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 18. 11:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.4333
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 18. 13:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.114
- Estimated positive imbalance after: 0.609
- Estimated relief score: 0.505
- Highest relief dong: 대치4동
