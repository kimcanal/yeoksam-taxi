# Overnight Model QA Status

Generated: 2026. 05. 12. 06:43 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 12. 06:37
- Raw citydata: `data/raw/citydata/2026-05-12/0637.json`
- Raw weather: `data/raw/weather/2026-05-12/0642.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 15.8 C
- Precipitation 1h: 0 mm
- Humidity: 95%
- Wind: 0.5 m/s

## Latest Targets

- Demand target: 2026. 05. 12. 07:00
- Traffic target: 2026. 05. 12. 07:00
- Taxi pressure target: 2026. 05. 12. 07:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.6514 | medium |
| 2 | 대치4동 | 0.3848 | low |
| 3 | 삼성1동 | 0.3600 | low |
| 4 | 청담동 | 0.2848 | low |
| 5 | 논현2동 | 0.2820 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 삼성1동 | 0.6471 | - |
| 3 | 논현2동 | 0.6180 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 청담동 | 0.7872 | - |
| 3 | 신사동 | 0.6345 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.4324 | 0.5395 | 0.5590 | medium | pattern_fallback_used, no_live_population_poi_coverage, thin_current_traffic_links |
| 2 | 대치4동 | 0.3275 | 0.4500 | 0.3949 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, thin_current_traffic_links |
| 3 | 삼성1동 | 0.3116 | 0.3952 | 0.5301 | medium | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links, recent_rank_volatility |
| 4 | 논현2동 | 0.2581 | 0.3236 | 0.5501 | medium | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |
| 5 | 역삼1동 | 0.2341 | 0.2864 | 0.5940 | medium | pattern_fallback_used, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 12. 07:00
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
- Taxi pressure log count: 104
- Completed comparisons: 1
- Waiting comparisons: 103
- Live demand log count: 136
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 12. 06:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 1
- POI forecast completed/waiting: 0 / 0
- Latest POI forecast target: -
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 2
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.3
- Estimated positive imbalance after: 0.105
- Estimated relief score: 0.195
- Highest relief dong: 대치4동
