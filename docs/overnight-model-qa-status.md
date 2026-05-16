# Overnight Model QA Status

Generated: 2026. 05. 16. 14:15 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 14:15
- Raw citydata: `data/raw/citydata/2026-05-16/1415.json`
- Raw weather: `data/raw/weather/2026-05-16/1415.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 30.1 C
- Precipitation 1h: 0 mm
- Humidity: 31%
- Wind: 2.2 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 15:00
- Traffic target: 2026. 05. 16. 15:00
- Taxi pressure target: 2026. 05. 16. 15:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9070 | high |
| 2 | 삼성1동 | 0.3555 | low |
| 3 | 역삼1동 | 0.3208 | low |
| 4 | 논현2동 | 0.2872 | low |
| 5 | 청담동 | 0.2824 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.5880 | - |
| 3 | 대치4동 | 0.4979 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8875 | - |
| 2 | 청담동 | 0.7580 | - |
| 3 | 신사동 | 0.5301 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6757 | 0.8188 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 삼성1동 | 0.4360 | 0.5154 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 역삼1동 | 0.4200 | 0.5097 | 0.6090 | medium | pattern_fallback_used |
| 4 | 청담동 | 0.3295 | 0.3841 | 0.6839 | high | pattern_fallback_used |
| 5 | 삼성2동 | 0.3024 | 0.3328 | 0.7972 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 16. 15:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 15:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 191250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 184
- Completed comparisons: 1
- Waiting comparisons: 183
- Live demand log count: 216
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 13:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.8833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 15:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 5
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.363
- Estimated positive imbalance after: 0.564
- Estimated relief score: 0.799
- Highest relief dong: 논현1동
