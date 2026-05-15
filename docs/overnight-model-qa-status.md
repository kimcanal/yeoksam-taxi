# Overnight Model QA Status

Generated: 2026. 05. 15. 21:51 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 15. 21:51
- Raw citydata: `data/raw/citydata/2026-05-15/2151.json`
- Raw weather: `data/raw/weather/2026-05-15/2151.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 23.5 C
- Precipitation 1h: 0 mm
- Humidity: 48%
- Wind: 0.3 m/s

## Latest Targets

- Demand target: 2026. 05. 15. 22:00
- Traffic target: 2026. 05. 15. 22:00
- Taxi pressure target: 2026. 05. 15. 22:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8852 | high |
| 2 | 삼성1동 | 0.4101 | watch |
| 3 | 대치4동 | 0.4064 | watch |
| 4 | 역삼1동 | 0.3884 | low |
| 5 | 삼성2동 | 0.2568 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7910 | - |
| 3 | 역삼1동 | 0.7559 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8564 | - |
| 2 | 청담동 | 0.5571 | - |
| 3 | 삼성1동 | 0.4994 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7346 | 0.8229 | 0.7615 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4615 | 0.5380 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4040 | 0.4776 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3753 | 0.4130 | 0.7972 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3380 | 0.4342 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 15. 22:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 15. 22:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 167500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 169
- Completed comparisons: 1
- Waiting comparisons: 168
- Live demand log count: 201
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 15. 21:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.5833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 15. 22:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 9
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.662
- Estimated positive imbalance after: 0.767
- Estimated relief score: 0.895
- Highest relief dong: 논현1동
