# Overnight Model QA Status

Generated: 2026. 05. 18. 14:35 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 18. 14:35
- Raw citydata: `data/raw/citydata/2026-05-18/1435.json`
- Raw weather: `data/raw/weather/2026-05-18/1435.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 29.9 C
- Precipitation 1h: 0 mm
- Humidity: 21%
- Wind: 1.9 m/s

## Latest Targets

- Demand target: 2026. 05. 18. 15:00
- Traffic target: 2026. 05. 18. 15:00
- Taxi pressure target: 2026. 05. 18. 15:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8212 | high |
| 2 | 대치4동 | 0.5399 | watch |
| 3 | 삼성1동 | 0.3017 | low |
| 4 | 청담동 | 0.2635 | low |
| 5 | 역삼1동 | 0.2505 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.8919 | - |
| 3 | 역삼1동 | 0.4101 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8583 | - |
| 2 | 청담동 | 0.7283 | - |
| 3 | 삼성1동 | 0.5055 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7038 | 0.8036 | 0.7240 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4094 | 0.4773 | 0.6840 | high | pattern_fallback_used |
| 3 | 대치4동 | 0.4033 | 0.5296 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 4 | 삼성1동 | 0.3896 | 0.4652 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 삼성2동 | 0.3447 | 0.3865 | 0.7597 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 18. 15:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 18. 15:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 295750

## Validation

- Taxi pressure comparison status: waiting_for_observation
- Taxi pressure log count: 225
- Completed comparisons: 0
- Waiting comparisons: 225
- Live demand log count: 257
- Latest comparison kind: waiting
- Latest comparison target: 2026. 05. 18. 15:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: -
- Latest road-signal Spearman (policy check): -
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 18. 15:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 6
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.201
- Estimated positive imbalance after: 0.581
- Estimated relief score: 0.62
- Highest relief dong: 대치4동
