# Overnight Model QA Status

Generated: 2026. 05. 11. 10:13 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 11. 10:12
- Raw citydata: `data/raw/citydata/2026-05-11/1012.json`
- Raw weather: `data/raw/weather/2026-05-11/1012.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 17.4 C
- Precipitation 1h: 0 mm
- Humidity: 64%
- Wind: 1.9 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 11:00
- Traffic target: 2026. 05. 11. 11:00
- Taxi pressure target: 2026. 05. 11. 11:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7578 | high |
| 2 | 대치4동 | 0.5333 | watch |
| 3 | 삼성1동 | 0.3163 | low |
| 4 | 청담동 | 0.2467 | low |
| 5 | 역삼1동 | 0.2331 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.8087 | - |
| 3 | 논현2동 | 0.4163 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8491 | - |
| 2 | 청담동 | 0.6641 | - |
| 3 | 삼성1동 | 0.5202 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6434 | 0.7346 | 0.7240 | high | pattern_fallback_used |
| 2 | 대치4동 | 0.4033 | 0.5297 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 3 | 역삼1동 | 0.3926 | 0.4577 | 0.6840 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.3839 | 0.4584 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 삼성2동 | 0.3513 | 0.3902 | 0.7785 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 11. 11:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 11:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 260750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 91
- Completed comparisons: 1
- Waiting comparisons: 90
- Live demand log count: 123
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 11. 09:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.3
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 11. 11:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 6
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.139
- Estimated positive imbalance after: 0.536
- Estimated relief score: 0.603
- Highest relief dong: 대치4동
