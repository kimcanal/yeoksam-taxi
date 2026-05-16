# Overnight Model QA Status

Generated: 2026. 05. 16. 22:39 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 22:39
- Raw citydata: `data/raw/citydata/2026-05-16/2239.json`
- Raw weather: `data/raw/weather/2026-05-16/2239.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 20.5 C
- Precipitation 1h: 0 mm
- Humidity: 52%
- Wind: 0.7 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 23:00
- Traffic target: 2026. 05. 16. 23:00
- Taxi pressure target: 2026. 05. 16. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8632 | high |
| 2 | 역삼1동 | 0.4585 | watch |
| 3 | 삼성1동 | 0.3071 | low |
| 4 | 대치4동 | 0.2927 | low |
| 5 | 청담동 | 0.2223 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8708 | - |
| 3 | 대치4동 | 0.5952 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8142 | - |
| 2 | 청담동 | 0.4810 | - |
| 3 | 신사동 | 0.3905 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6814 | 0.7780 | 0.7240 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4796 | 0.5703 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.3348 | 0.3958 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.2910 | 0.3263 | 0.7597 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.2719 | 0.3419 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 16. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 23:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 115250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 192
- Completed comparisons: 1
- Waiting comparisons: 191
- Live demand log count: 224
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 22:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.6667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 23:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 6
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.138
- Estimated positive imbalance after: 0.535
- Estimated relief score: 0.603
- Highest relief dong: 논현1동
