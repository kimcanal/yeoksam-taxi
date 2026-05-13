# Overnight Model QA Status

Generated: 2026. 05. 14. 24:11 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 14. 24:11
- Raw citydata: `data/raw/citydata/2026-05-14/0011.json`
- Raw weather: `data/raw/weather/2026-05-14/0011.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 18.1 C
- Precipitation 1h: 0 mm
- Humidity: 71%
- Wind: 0.9 m/s

## Latest Targets

- Demand target: 2026. 05. 14. 01:00
- Traffic target: 2026. 05. 14. 01:00
- Taxi pressure target: 2026. 05. 14. 01:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8452 | high |
| 2 | 삼성1동 | 0.4629 | watch |
| 3 | 역삼1동 | 0.4529 | watch |
| 4 | 대치4동 | 0.4498 | watch |
| 5 | 청담동 | 0.3699 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.8972 | - |
| 3 | 역삼1동 | 0.8619 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7952 | - |
| 2 | 청담동 | 0.5063 | - |
| 3 | 신사동 | 0.3595 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6404 | 0.7456 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4894 | 0.5650 | 0.7027 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4414 | 0.5218 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.3857 | 0.4326 | 0.7589 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3716 | 0.4774 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 14. 01:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 14. 01:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 81750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 134
- Completed comparisons: 2
- Waiting comparisons: 132
- Live demand log count: 166
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 13. 23:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.6667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 14. 01:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.1
- Positive imbalance before: 1.598
- Estimated positive imbalance after: 0.818
- Estimated relief score: 0.78
- Highest relief dong: 역삼1동
