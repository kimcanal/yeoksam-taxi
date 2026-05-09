# Overnight Model QA Status

Generated: 2026. 05. 10. 07:23 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 07:23
- Raw citydata: `data/raw/citydata/2026-05-10/0723.json`
- Raw weather: `data/raw/weather/2026-05-10/0723.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 12.8 C
- Precipitation 1h: 0 mm
- Humidity: 57%
- Wind: 0.6 m/s

## Latest Targets

- Demand target: 2026. 05. 10. 08:00
- Traffic target: 2026. 05. 10. 08:00
- Taxi pressure target: 2026. 05. 10. 08:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.6326 | medium |
| 2 | 삼성1동 | 0.5887 | medium |
| 3 | 논현2동 | 0.3122 | low |
| 4 | 역삼1동 | 0.2760 | low |
| 5 | 청담동 | 0.2521 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 논현1동 | 0.6775 | - |
| 3 | 논현2동 | 0.5854 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7899 | - |
| 2 | 청담동 | 0.5959 | - |
| 3 | 신사동 | 0.4032 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.5312 | 0.5951 | 0.7615 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.4879 | 0.6070 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 역삼1동 | 0.3378 | 0.3938 | 0.6840 | high | pattern_fallback_used |
| 4 | 논현2동 | 0.2861 | 0.3587 | 0.5501 | medium | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |
| 5 | 대치4동 | 0.2385 | 0.2999 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 10. 08:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 10. 08:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 68000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 69
- Completed comparisons: 2
- Waiting comparisons: 67
- Live demand log count: 101
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 07:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 논현2동
- Latest road-signal Spearman (policy check): -0.15
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 10. 08:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 3
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.692
- Estimated positive imbalance after: 0.399
- Estimated relief score: 0.293
- Highest relief dong: 삼성1동
