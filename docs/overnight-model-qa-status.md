# Overnight Model QA Status

Generated: 2026. 05. 11. 12:33 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 11. 12:33
- Raw citydata: `data/raw/citydata/2026-05-11/1233.json`
- Raw weather: `data/raw/weather/2026-05-11/1233.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 19.5 C
- Precipitation 1h: 0 mm
- Humidity: 64%
- Wind: 1.2 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 13:00
- Traffic target: 2026. 05. 11. 13:00
- Taxi pressure target: 2026. 05. 11. 13:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7800 | high |
| 2 | 대치4동 | 0.5212 | watch |
| 3 | 삼성1동 | 0.2627 | low |
| 4 | 청담동 | 0.2536 | low |
| 5 | 역삼1동 | 0.2441 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.8136 | - |
| 3 | 역삼1동 | 0.3981 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8822 | - |
| 2 | 청담동 | 0.6988 | - |
| 3 | 신사동 | 0.4584 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6803 | 0.7693 | 0.7428 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.3906 | 0.4554 | 0.6840 | high | pattern_fallback_used |
| 3 | 대치4동 | 0.3903 | 0.5242 | 0.4324 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 4 | 삼성1동 | 0.3454 | 0.4083 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 삼성2동 | 0.3331 | 0.3735 | 0.7597 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 11. 13:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 13:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 289750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 579
- Completed comparisons: 554
- Waiting comparisons: 25
- Live demand log count: 611
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 11. 12:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.75
- POI forecast completed/waiting: 540 / 8
- Latest POI forecast target: 2026. 05. 11. 12:00
- Latest POI matched rows: 7
- Latest POI population MAE: 1785.7
- Latest POI congestion-level hit rate: 57.1%
- Latest POI top predicted/observed: 강남역 / 강남역

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 6
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.112
- Estimated positive imbalance after: 0.492
- Estimated relief score: 0.62
- Highest relief dong: 대치4동
