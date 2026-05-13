# Overnight Model QA Status

Generated: 2026. 05. 13. 18:16 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 13. 18:16
- Raw citydata: `data/raw/citydata/2026-05-13/1816.json`
- Raw weather: `data/raw/weather/2026-05-13/1816.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 23 C
- Precipitation 1h: 0 mm
- Humidity: 48%
- Wind: 2.7 m/s

## Latest Targets

- Demand target: 2026. 05. 13. 19:00
- Traffic target: 2026. 05. 13. 19:00
- Taxi pressure target: 2026. 05. 13. 19:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9169 | high |
| 2 | 역삼1동 | 0.4189 | watch |
| 3 | 대치4동 | 0.4093 | watch |
| 4 | 삼성1동 | 0.3822 | low |
| 5 | 논현2동 | 0.2832 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7210 | - |
| 3 | 역삼1동 | 0.6791 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9077 | - |
| 2 | 청담동 | 0.6955 | - |
| 3 | 삼성1동 | 0.5591 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7448 | 0.8671 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.5200 | 0.6062 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4456 | 0.5268 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3994 | 0.4521 | 0.7410 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3216 | 0.4224 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, recent_rank_volatility |

- Guardrail target: 2026. 05. 13. 19:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 13. 19:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 246250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 129
- Completed comparisons: 1
- Waiting comparisons: 128
- Live demand log count: 161
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 13. 17:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.6167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 13. 19:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 11
- Max incentive multiplier: 1.2
- Positive imbalance before: 2.066
- Estimated positive imbalance after: 0.941
- Estimated relief score: 1.125
- Highest relief dong: 논현1동
