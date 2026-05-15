# Overnight Model QA Status

Generated: 2026. 05. 16. 24:51 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 24:50
- Raw citydata: `data/raw/citydata/2026-05-16/0050.json`
- Raw weather: `data/raw/weather/2026-05-16/0050.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 19.6 C
- Precipitation 1h: 0 mm
- Humidity: 65%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 01:00
- Traffic target: 2026. 05. 16. 01:00
- Taxi pressure target: 2026. 05. 16. 01:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8698 | high |
| 2 | 역삼1동 | 0.3906 | low |
| 3 | 삼성1동 | 0.3723 | low |
| 4 | 청담동 | 0.2938 | low |
| 5 | 대치4동 | 0.2305 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.7819 | - |
| 3 | 삼성1동 | 0.7208 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8442 | - |
| 2 | 청담동 | 0.4868 | - |
| 3 | 신사동 | 0.3816 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6530 | 0.7603 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4490 | 0.5234 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3869 | 0.4620 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.3000 | 0.3498 | 0.6839 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.2232 | 0.2693 | 0.6199 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 16. 01:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 01:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 89750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 172
- Completed comparisons: 1
- Waiting comparisons: 171
- Live demand log count: 204
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 24:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.7
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 01:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 6
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.067
- Estimated positive imbalance after: 0.464
- Estimated relief score: 0.603
- Highest relief dong: 논현1동
