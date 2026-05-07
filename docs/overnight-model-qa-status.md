# Overnight Model QA Status

Generated: 2026. 05. 08. 07:36 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 08. 07:31
- Raw citydata: `data/raw/citydata/2026-05-08/0731.json`
- Raw weather: `data/raw/weather/2026-05-08/0736.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 13.6 C
- Precipitation 1h: 0 mm
- Humidity: 54%
- Wind: 2.5 m/s

## Latest Targets

- Demand target: 2026. 05. 08. 08:00
- Traffic target: 2026. 05. 08. 08:00
- Taxi pressure target: 2026. 05. 08. 08:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7485 | high |
| 2 | 대치4동 | 0.3848 | low |
| 3 | 삼성1동 | 0.3116 | low |
| 4 | 논현2동 | 0.3043 | low |
| 5 | 청담동 | 0.2846 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현2동 | 0.7054 | - |
| 3 | 논현1동 | 0.6828 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 청담동 | 0.7666 | - |
| 3 | 신사동 | 0.6398 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.5073 | 0.6073 | 0.6340 | medium | pattern_fallback_used, no_live_population_poi_coverage, thin_current_traffic_links |
| 2 | 대치4동 | 0.3275 | 0.4500 | 0.3949 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, thin_current_traffic_links |
| 3 | 논현2동 | 0.2744 | 0.3515 | 0.5126 | medium | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |
| 4 | 삼성1동 | 0.2565 | 0.3429 | 0.4401 | low | pattern_fallback_used, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links, recent_rank_volatility |
| 5 | 역삼1동 | 0.2194 | 0.2630 | 0.6315 | medium | pattern_fallback_used, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 08. 08:00
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
- Taxi pressure log count: 27
- Completed comparisons: 1
- Waiting comparisons: 26
- Live demand log count: 59
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 08. 07:00
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
- Intervention areas: 1
- Monitoring units: 2
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.305
- Estimated positive imbalance after: 0.11
- Estimated relief score: 0.195
- Highest relief dong: 대치4동
