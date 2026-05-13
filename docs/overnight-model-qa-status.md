# Overnight Model QA Status

Generated: 2026. 05. 13. 22:52 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 13. 22:52
- Raw citydata: `data/raw/citydata/2026-05-13/2252.json`
- Raw weather: `data/raw/weather/2026-05-13/2252.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 19.9 C
- Precipitation 1h: 0 mm
- Humidity: 61%
- Wind: 1.9 m/s

## Latest Targets

- Demand target: 2026. 05. 13. 23:00
- Traffic target: 2026. 05. 13. 23:00
- Taxi pressure target: 2026. 05. 13. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8792 | high |
| 2 | 대치4동 | 0.3810 | low |
| 3 | 역삼1동 | 0.3604 | low |
| 4 | 삼성1동 | 0.3333 | low |
| 5 | 청담동 | 0.2376 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7741 | - |
| 3 | 역삼1동 | 0.7040 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8579 | - |
| 2 | 청담동 | 0.5215 | - |
| 3 | 신사동 | 0.3874 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6606 | 0.7691 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4308 | 0.5022 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3546 | 0.4192 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3235 | 0.4248 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.3094 | 0.3502 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 13. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 13. 23:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 126250

## Validation

- Taxi pressure comparison status: waiting_for_observation
- Taxi pressure log count: 133
- Completed comparisons: 0
- Waiting comparisons: 133
- Live demand log count: 165
- Latest comparison kind: waiting
- Latest comparison target: 2026. 05. 13. 23:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: -
- Latest road-signal Spearman (policy check): -
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 13. 23:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.357
- Estimated positive imbalance after: 0.559
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
