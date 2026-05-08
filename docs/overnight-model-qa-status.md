# Overnight Model QA Status

Generated: 2026. 05. 08. 20:39 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 08. 20:39
- Raw citydata: `data/raw/citydata/2026-05-08/2039.json`
- Raw weather: `data/raw/weather/2026-05-08/2039.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 17.7 C
- Precipitation 1h: 0 mm
- Humidity: 34%
- Wind: 2.5 m/s

## Latest Targets

- Demand target: 2026. 05. 08. 21:00
- Traffic target: 2026. 05. 08. 21:00
- Taxi pressure target: 2026. 05. 08. 21:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8957 | high |
| 2 | 역삼1동 | 0.4296 | watch |
| 3 | 삼성1동 | 0.3952 | low |
| 4 | 대치4동 | 0.3863 | low |
| 5 | 삼성2동 | 0.2685 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8034 | - |
| 3 | 대치4동 | 0.7767 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8788 | - |
| 2 | 청담동 | 0.6028 | - |
| 3 | 신사동 | 0.4503 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7126 | 0.8296 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4991 | 0.5818 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4110 | 0.4859 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.4052 | 0.4543 | 0.7597 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3398 | 0.4273 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 08. 21:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 08. 21:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 187750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 37
- Completed comparisons: 1
- Waiting comparisons: 36
- Live demand log count: 69
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 08. 20:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.8
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 08. 21:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.711
- Estimated positive imbalance after: 0.914
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
