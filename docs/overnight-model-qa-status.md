# Overnight Model QA Status

Generated: 2026. 05. 15. 05:39 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 15. 05:39
- Raw citydata: `data/raw/citydata/2026-05-15/0539.json`
- Raw weather: `data/raw/weather/2026-05-15/0539.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 17.7 C
- Precipitation 1h: 0 mm
- Humidity: 81%
- Wind: 1.2 m/s

## Latest Targets

- Demand target: 2026. 05. 15. 06:00
- Traffic target: 2026. 05. 15. 06:00
- Taxi pressure target: 2026. 05. 15. 06:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5721 | medium |
| 2 | 대치4동 | 0.5112 | watch |
| 3 | 논현1동 | 0.5109 | watch |
| 4 | 역삼1동 | 0.2988 | low |
| 5 | 청담동 | 0.2536 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 삼성1동 | 0.8755 | - |
| 3 | 역삼1동 | 0.6317 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7636 | - |
| 2 | 청담동 | 0.6622 | - |
| 3 | 삼성1동 | 0.4719 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4845 | 0.5785 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation, recent_rank_volatility |
| 2 | 논현1동 | 0.4405 | 0.5030 | 0.7240 | high | pattern_fallback_used |
| 3 | 대치4동 | 0.4048 | 0.5201 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 4 | 역삼1동 | 0.3662 | 0.4269 | 0.6840 | high | pattern_fallback_used |
| 5 | 청담동 | 0.2290 | 0.2618 | 0.7214 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 15. 06:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 15. 06:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 70000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 158
- Completed comparisons: 1
- Waiting comparisons: 157
- Live demand log count: 190
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 15. 05:00
- Latest comparison top predicted: 삼성1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.4667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 15. 06:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.024
- Estimated positive imbalance after: 0.519
- Estimated relief score: 0.505
- Highest relief dong: 대치4동
