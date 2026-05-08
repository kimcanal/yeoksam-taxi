# Overnight Model QA Status

Generated: 2026. 05. 08. 21:45 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 08. 21:45
- Raw citydata: `data/raw/citydata/2026-05-08/2145.json`
- Raw weather: `data/raw/weather/2026-05-08/2145.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 16.2 C
- Precipitation 1h: 0 mm
- Humidity: 41%
- Wind: 0.9 m/s

## Latest Targets

- Demand target: 2026. 05. 08. 22:00
- Traffic target: 2026. 05. 08. 22:00
- Taxi pressure target: 2026. 05. 08. 22:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8816 | high |
| 2 | 대치4동 | 0.3942 | low |
| 3 | 역삼1동 | 0.3887 | low |
| 4 | 삼성1동 | 0.3861 | low |
| 5 | 논현2동 | 0.2569 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7953 | - |
| 3 | 역삼1동 | 0.7610 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8518 | - |
| 2 | 청담동 | 0.6196 | - |
| 3 | 삼성1동 | 0.4573 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7016 | 0.8168 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4670 | 0.5391 | 0.7027 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3944 | 0.4662 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3744 | 0.4198 | 0.7597 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3370 | 0.4330 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 08. 22:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 08. 22:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 160750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 38
- Completed comparisons: 1
- Waiting comparisons: 37
- Live demand log count: 70
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 08. 21:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.7833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 08. 22:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.575
- Estimated positive imbalance after: 0.777
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
