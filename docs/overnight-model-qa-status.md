# Overnight Model QA Status

Generated: 2026. 05. 15. 12:22 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 15. 12:22
- Raw citydata: `data/raw/citydata/2026-05-15/1222.json`
- Raw weather: `data/raw/weather/2026-05-15/1222.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 29 C
- Precipitation 1h: 0 mm
- Humidity: 36%
- Wind: 1.6 m/s

## Latest Targets

- Demand target: 2026. 05. 15. 13:00
- Traffic target: 2026. 05. 15. 13:00
- Taxi pressure target: 2026. 05. 15. 13:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8043 | high |
| 2 | 대치4동 | 0.5343 | watch |
| 3 | 삼성1동 | 0.3115 | low |
| 4 | 청담동 | 0.2692 | low |
| 5 | 역삼1동 | 0.2577 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.8651 | - |
| 3 | 역삼1동 | 0.4298 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8689 | - |
| 2 | 청담동 | 0.7358 | - |
| 3 | 삼성1동 | 0.4836 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6960 | 0.7947 | 0.7240 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.4207 | 0.5075 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 역삼1동 | 0.4159 | 0.4848 | 0.6840 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.4012 | 0.5269 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.3416 | 0.3867 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 15. 13:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 15. 13:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 295250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 163
- Completed comparisons: 1
- Waiting comparisons: 162
- Live demand log count: 195
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 15. 11:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.5667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 15. 13:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.307
- Estimated positive imbalance after: 0.589
- Estimated relief score: 0.718
- Highest relief dong: 대치4동
