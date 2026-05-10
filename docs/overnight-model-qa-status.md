# Overnight Model QA Status

Generated: 2026. 05. 11. 02:27 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 11. 02:27
- Raw citydata: `data/raw/citydata/2026-05-11/0227.json`
- Raw weather: `data/raw/weather/2026-05-11/0227.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 12.1 C
- Precipitation 1h: 0 mm
- Humidity: 76%
- Wind: 0.2 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 03:00
- Traffic target: 2026. 05. 11. 03:00
- Taxi pressure target: 2026. 05. 11. 03:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8359 | high |
| 2 | 삼성1동 | 0.4300 | watch |
| 3 | 대치4동 | 0.3962 | low |
| 4 | 역삼1동 | 0.3743 | low |
| 5 | 청담동 | 0.3481 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.8681 | - |
| 3 | 삼성1동 | 0.8465 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7792 | - |
| 2 | 청담동 | 0.4725 | - |
| 3 | 신사동 | 0.3749 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6238 | 0.7263 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4348 | 0.5069 | 0.6840 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 삼성1동 | 0.4245 | 0.5069 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3625 | 0.4559 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 청담동 | 0.3593 | 0.4030 | 0.7589 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 11. 03:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 03:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 65000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 84
- Completed comparisons: 2
- Waiting comparisons: 82
- Live demand log count: 116
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 11. 02:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.2
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 11. 03:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.1
- Positive imbalance before: 1.225
- Estimated positive imbalance after: 0.445
- Estimated relief score: 0.78
- Highest relief dong: 논현1동
