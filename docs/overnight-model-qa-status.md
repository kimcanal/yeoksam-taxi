# Overnight Model QA Status

Generated: 2026. 05. 14. 19:57 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 14. 19:57
- Raw citydata: `data/raw/citydata/2026-05-14/1957.json`
- Raw weather: `data/raw/weather/2026-05-14/1957.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 26.4 C
- Precipitation 1h: 0 mm
- Humidity: 44%
- Wind: 1.3 m/s

## Latest Targets

- Demand target: 2026. 05. 14. 20:00
- Traffic target: 2026. 05. 14. 20:00
- Taxi pressure target: 2026. 05. 14. 20:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8937 | high |
| 2 | 역삼1동 | 0.4412 | watch |
| 3 | 삼성1동 | 0.3758 | low |
| 4 | 대치4동 | 0.3321 | low |
| 5 | 논현2동 | 0.2851 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.7836 | - |
| 3 | 대치4동 | 0.7148 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8792 | - |
| 2 | 청담동 | 0.6423 | - |
| 3 | 신사동 | 0.4863 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7245 | 0.8435 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.5095 | 0.6059 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성2동 | 0.4061 | 0.4553 | 0.7597 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.3965 | 0.4687 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.2983 | 0.3918 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, recent_rank_volatility |

- Guardrail target: 2026. 05. 14. 20:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 14. 20:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 206750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 148
- Completed comparisons: 1
- Waiting comparisons: 147
- Live demand log count: 180
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 14. 19:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.8167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 14. 20:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.66
- Estimated positive imbalance after: 0.862
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
