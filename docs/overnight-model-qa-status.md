# Overnight Model QA Status

Generated: 2026. 05. 12. 20:50 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 12. 20:45
- Raw citydata: `data/raw/citydata/2026-05-12/2045.json`
- Raw weather: `data/raw/weather/2026-05-12/2050.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 20.2 C
- Precipitation 1h: 0 mm
- Humidity: 64%
- Wind: 1.4 m/s

## Latest Targets

- Demand target: 2026. 05. 12. 21:00
- Traffic target: 2026. 05. 12. 21:00
- Taxi pressure target: 2026. 05. 12. 21:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9530 | high |
| 2 | 역삼1동 | 0.3451 | low |
| 3 | 삼성1동 | 0.3336 | low |
| 4 | 대치4동 | 0.3044 | low |
| 5 | 청담동 | 0.2692 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8504 | - |
| 3 | 대치4동 | 0.7910 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 청담동 | 0.6884 | - |
| 3 | 신사동 | 0.5465 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.5961 | 0.7500 | 0.5440 | medium | pattern_fallback_used, no_live_population_poi_coverage, thin_current_traffic_links |
| 2 | 역삼1동 | 0.3144 | 0.4013 | 0.5190 | medium | pattern_fallback_used, no_live_population_poi_coverage, thin_current_traffic_links |
| 3 | 삼성1동 | 0.2761 | 0.3691 | 0.4401 | low | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |
| 4 | 대치4동 | 0.2711 | 0.3560 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, thin_current_traffic_links |
| 5 | 논현2동 | 0.2315 | 0.2843 | 0.5876 | medium | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 12. 21:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: -
- Live POIs: 0
- Covered dongs: 0
- Forecast population midpoint sum: -

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 113
- Completed comparisons: 1
- Waiting comparisons: 112
- Live demand log count: 145
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 12. 20:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 1
- POI forecast completed/waiting: 0 / 0
- Latest POI forecast target: -
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 3
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.541
- Estimated positive imbalance after: 0.248
- Estimated relief score: 0.293
- Highest relief dong: 논현1동
