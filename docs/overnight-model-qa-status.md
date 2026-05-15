# Overnight Model QA Status

Generated: 2026. 05. 16. 06:30 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 06:30
- Raw citydata: `data/raw/citydata/2026-05-16/0630.json`
- Raw weather: `data/raw/weather/2026-05-16/0630.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 17 C
- Precipitation 1h: 0 mm
- Humidity: 79%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 07:00
- Traffic target: 2026. 05. 16. 07:00
- Taxi pressure target: 2026. 05. 16. 07:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.6157 | medium |
| 2 | 논현1동 | 0.6018 | medium |
| 3 | 대치4동 | 0.3254 | low |
| 4 | 논현2동 | 0.2688 | low |
| 5 | 청담동 | 0.2445 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 대치4동 | 0.6732 | - |
| 3 | 논현1동 | 0.6266 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7773 | - |
| 2 | 청담동 | 0.5493 | - |
| 3 | 삼성1동 | 0.4165 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.4989 | 0.5697 | 0.7240 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.4966 | 0.6179 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 역삼1동 | 0.3095 | 0.3608 | 0.6840 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.3040 | 0.3823 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.2382 | 0.2750 | 0.7027 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 16. 07:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 07:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 66750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 178
- Completed comparisons: 1
- Waiting comparisons: 177
- Live demand log count: 210
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 06:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.2833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 07:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.763
- Estimated positive imbalance after: 0.258
- Estimated relief score: 0.505
- Highest relief dong: 삼성1동
