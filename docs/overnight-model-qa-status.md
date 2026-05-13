# Overnight Model QA Status

Generated: 2026. 05. 13. 20:00 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 13. 20:00
- Raw citydata: `data/raw/citydata/2026-05-13/2000.json`
- Raw weather: `data/raw/weather/2026-05-13/2000.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 21.2 C
- Precipitation 1h: 0 mm
- Humidity: 52%
- Wind: 0.6 m/s

## Latest Targets

- Demand target: 2026. 05. 13. 21:00
- Traffic target: 2026. 05. 13. 21:00
- Taxi pressure target: 2026. 05. 13. 21:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8948 | high |
| 2 | 역삼1동 | 0.4513 | watch |
| 3 | 대치4동 | 0.3918 | low |
| 4 | 삼성1동 | 0.3739 | low |
| 5 | 논현2동 | 0.2946 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8510 | - |
| 3 | 대치4동 | 0.7890 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8799 | - |
| 2 | 청담동 | 0.5916 | - |
| 3 | 신사동 | 0.4494 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7204 | 0.8387 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.5070 | 0.6152 | 0.6090 | medium | pattern_fallback_used |
| 3 | 삼성2동 | 0.4343 | 0.4824 | 0.7785 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.4102 | 0.4849 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.3371 | 0.4331 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage, recent_rank_volatility |

- Guardrail target: 2026. 05. 13. 21:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 13. 20:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 206250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 130
- Completed comparisons: 1
- Waiting comparisons: 129
- Live demand log count: 162
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 13. 19:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.95
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 13. 20:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 5
- Monitoring units: 9
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.88
- Estimated positive imbalance after: 0.984
- Estimated relief score: 0.896
- Highest relief dong: 논현1동
