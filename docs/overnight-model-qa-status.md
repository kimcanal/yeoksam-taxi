# Overnight Model QA Status

Generated: 2026. 05. 11. 08:26 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 11. 08:26
- Raw citydata: `data/raw/citydata/2026-05-11/0826.json`
- Raw weather: `data/raw/weather/2026-05-11/0826.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 16.4 C
- Precipitation 1h: 0 mm
- Humidity: 66%
- Wind: 2.3 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 09:00
- Traffic target: 2026. 05. 11. 09:00
- Taxi pressure target: 2026. 05. 11. 09:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.6910 | medium |
| 2 | 대치4동 | 0.5391 | watch |
| 3 | 삼성1동 | 0.3087 | low |
| 4 | 논현2동 | 0.2849 | low |
| 5 | 역삼1동 | 0.2708 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.7157 | - |
| 3 | 논현2동 | 0.5911 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8503 | - |
| 2 | 청담동 | 0.6548 | - |
| 3 | 삼성1동 | 0.5124 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.5851 | 0.6554 | 0.7615 | high | pattern_fallback_used |
| 2 | 대치4동 | 0.3922 | 0.5267 | 0.4324 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 3 | 역삼1동 | 0.3768 | 0.4350 | 0.7027 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.3150 | 0.3800 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 삼성2동 | 0.3039 | 0.3473 | 0.7222 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 11. 09:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 09:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 180750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 90
- Completed comparisons: 2
- Waiting comparisons: 88
- Live demand log count: 122
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 11. 08:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.0167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 11. 09:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.978
- Estimated positive imbalance after: 0.473
- Estimated relief score: 0.505
- Highest relief dong: 대치4동
