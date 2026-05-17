# Overnight Model QA Status

Generated: 2026. 05. 17. 22:39 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 22:39
- Raw citydata: `data/raw/citydata/2026-05-17/2239.json`
- Raw weather: `data/raw/weather/2026-05-17/2239.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 19.8 C
- Precipitation 1h: 0 mm
- Humidity: 49%
- Wind: 0.9 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 23:00
- Traffic target: 2026. 05. 17. 23:00
- Taxi pressure target: 2026. 05. 17. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8629 | high |
| 2 | 역삼1동 | 0.4304 | watch |
| 3 | 삼성1동 | 0.3555 | low |
| 4 | 대치4동 | 0.2637 | low |
| 5 | 청담동 | 0.1848 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8744 | - |
| 3 | 삼성1동 | 0.6843 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8305 | - |
| 2 | 청담동 | 0.4306 | - |
| 3 | 신사동 | 0.3674 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6494 | 0.7561 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4550 | 0.5521 | 0.6090 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3759 | 0.4488 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.2559 | 0.3087 | 0.6199 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.2432 | 0.2727 | 0.7597 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 17. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 23:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 90250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 212
- Completed comparisons: 1
- Waiting comparisons: 211
- Live demand log count: 244
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 22:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.6167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 23:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.104
- Estimated positive imbalance after: 0.403
- Estimated relief score: 0.701
- Highest relief dong: 논현1동
