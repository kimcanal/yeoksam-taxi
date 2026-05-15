# Overnight Model QA Status

Generated: 2026. 05. 16. 08:27 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 08:27
- Raw citydata: `data/raw/citydata/2026-05-16/0827.json`
- Raw weather: `data/raw/weather/2026-05-16/0827.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 22.5 C
- Precipitation 1h: 0 mm
- Humidity: 58%
- Wind: 0.8 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 09:00
- Traffic target: 2026. 05. 16. 09:00
- Taxi pressure target: 2026. 05. 16. 09:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8543 | high |
| 2 | 삼성1동 | 0.5428 | watch |
| 3 | 대치4동 | 0.3307 | low |
| 4 | 역삼1동 | 0.3068 | low |
| 5 | 청담동 | 0.3014 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 삼성1동 | 0.8556 | - |
| 3 | 대치4동 | 0.6934 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8062 | - |
| 2 | 청담동 | 0.7258 | - |
| 3 | 삼성1동 | 0.4468 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6400 | 0.7451 | 0.6865 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.4722 | 0.5696 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 3 | 역삼1동 | 0.3752 | 0.4417 | 0.6652 | medium | pattern_fallback_used |
| 4 | 대치4동 | 0.3066 | 0.3856 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.2737 | 0.3191 | 0.6839 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 16. 09:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 09:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 99250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 180
- Completed comparisons: 2
- Waiting comparisons: 178
- Live demand log count: 212
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 08:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.1
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 09:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.235
- Estimated positive imbalance after: 0.437
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
