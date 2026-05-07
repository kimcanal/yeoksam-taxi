# Overnight Model QA Status

Generated: 2026. 05. 07. 12:21 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 07. 12:21
- Raw citydata: `data/raw/citydata/2026-05-07/1221.json`
- Raw weather: `data/raw/weather/2026-05-07/1221.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 20.9 C
- Precipitation 1h: 0 mm
- Humidity: 53%
- Wind: 1.7 m/s

## Latest Targets

- Demand target: 2026. 05. 07. 13:00
- Traffic target: 2026. 05. 07. 13:00
- Taxi pressure target: 2026. 05. 07. 13:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7742 | high |
| 2 | 대치4동 | 0.5200 | watch |
| 3 | 삼성1동 | 0.3083 | low |
| 4 | 논현2동 | 0.2648 | low |
| 5 | 청담동 | 0.2487 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.8113 | - |
| 3 | 논현2동 | 0.4108 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8712 | - |
| 2 | 청담동 | 0.6724 | - |
| 3 | 삼성1동 | 0.5055 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6754 | 0.7712 | 0.7240 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.4256 | 0.5186 | 0.6013 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 역삼1동 | 0.4017 | 0.4729 | 0.6652 | medium | pattern_fallback_used |
| 4 | 대치4동 | 0.3691 | 0.5192 | 0.3574 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.3570 | 0.3965 | 0.7785 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 07. 13:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 07. 13:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 307250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 11
- Completed comparisons: 1
- Waiting comparisons: 10
- Live demand log count: 43
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 07. 11:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): -0.05
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 07. 13:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.26
- Estimated positive imbalance after: 0.755
- Estimated relief score: 0.505
- Highest relief dong: 대치4동
