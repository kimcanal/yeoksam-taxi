# Overnight Model QA Status

Generated: 2026. 05. 09. 02:40 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 09. 02:39
- Raw citydata: `data/raw/citydata/2026-05-09/0239.json`
- Raw weather: `data/raw/weather/2026-05-09/0239.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 11.1 C
- Precipitation 1h: 0 mm
- Humidity: 62%
- Wind: 1.1 m/s

## Latest Targets

- Demand target: 2026. 05. 09. 03:00
- Traffic target: 2026. 05. 09. 03:00
- Taxi pressure target: 2026. 05. 09. 03:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8657 | high |
| 2 | 역삼1동 | 0.3616 | low |
| 3 | 삼성1동 | 0.3564 | low |
| 4 | 청담동 | 0.3153 | low |
| 5 | 대치4동 | 0.2878 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.7611 | - |
| 3 | 삼성1동 | 0.7448 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8461 | - |
| 2 | 청담동 | 0.4711 | - |
| 3 | 신사동 | 0.3625 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6653 | 0.7596 | 0.7240 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4197 | 0.4942 | 0.6652 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3780 | 0.4559 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.3332 | 0.3738 | 0.7589 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.2580 | 0.3344 | 0.4924 | low | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 09. 03:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 09. 03:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 71500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 43
- Completed comparisons: 1
- Waiting comparisons: 42
- Live demand log count: 75
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 09. 02:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.4167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 09. 03:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.068
- Estimated positive imbalance after: 0.367
- Estimated relief score: 0.701
- Highest relief dong: 논현1동
