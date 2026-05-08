# Overnight Model QA Status

Generated: 2026. 05. 08. 12:17 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 08. 12:17
- Raw citydata: `data/raw/citydata/2026-05-08/1217.json`
- Raw weather: `data/raw/weather/2026-05-08/1217.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 18.4 C
- Precipitation 1h: 0 mm
- Humidity: 34%
- Wind: 3.9 m/s

## Latest Targets

- Demand target: 2026. 05. 08. 13:00
- Traffic target: 2026. 05. 08. 13:00
- Taxi pressure target: 2026. 05. 08. 13:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8161 | high |
| 2 | 대치4동 | 0.5804 | medium |
| 3 | 삼성1동 | 0.3173 | low |
| 4 | 논현2동 | 0.2533 | low |
| 5 | 청담동 | 0.2495 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.8528 | - |
| 3 | 역삼1동 | 0.4261 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9069 | - |
| 2 | 청담동 | 0.6752 | - |
| 3 | 삼성1동 | 0.4977 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7012 | 0.8006 | 0.7240 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.4285 | 0.5276 | 0.5826 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 대치4동 | 0.4182 | 0.5492 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 4 | 역삼1동 | 0.3858 | 0.4682 | 0.6090 | medium | pattern_fallback_used |
| 5 | 삼성2동 | 0.3457 | 0.3913 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 08. 13:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 08. 13:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 297250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 30
- Completed comparisons: 1
- Waiting comparisons: 29
- Live demand log count: 62
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 08. 11:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.8667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 08. 13:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.565
- Estimated positive imbalance after: 0.847
- Estimated relief score: 0.718
- Highest relief dong: 대치4동
