# Overnight Model QA Status

Generated: 2026. 05. 17. 08:25 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 08:25
- Raw citydata: `data/raw/citydata/2026-05-17/0825.json`
- Raw weather: `data/raw/weather/2026-05-17/0825.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 21.9 C
- Precipitation 1h: 0 mm
- Humidity: 51%
- Wind: 1.3 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 09:00
- Traffic target: 2026. 05. 17. 09:00
- Taxi pressure target: 2026. 05. 17. 09:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.6582 | medium |
| 2 | 삼성1동 | 0.6240 | medium |
| 3 | 역삼1동 | 0.2920 | low |
| 4 | 청담동 | 0.2851 | low |
| 5 | 논현2동 | 0.2846 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 논현1동 | 0.7036 | - |
| 3 | 논현2동 | 0.6081 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7986 | - |
| 2 | 청담동 | 0.6746 | - |
| 3 | 삼성1동 | 0.4282 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.5378 | 0.6082 | 0.7428 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.5098 | 0.6277 | 0.5826 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 역삼1동 | 0.3617 | 0.4217 | 0.6840 | high | pattern_fallback_used |
| 4 | 청담동 | 0.2617 | 0.3051 | 0.6839 | high | pattern_fallback_used |
| 5 | 논현2동 | 0.2450 | 0.3280 | 0.4376 | low | pattern_fallback_used, signals_disagree, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 17. 09:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 09:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 84250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 202
- Completed comparisons: 2
- Waiting comparisons: 200
- Live demand log count: 234
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 08:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.3833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 09:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 4
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.737
- Estimated positive imbalance after: 0.329
- Estimated relief score: 0.408
- Highest relief dong: 삼성1동
