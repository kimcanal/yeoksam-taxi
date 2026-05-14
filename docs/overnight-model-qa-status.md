# Overnight Model QA Status

Generated: 2026. 05. 14. 21:52 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 14. 21:52
- Raw citydata: `data/raw/citydata/2026-05-14/2152.json`
- Raw weather: `data/raw/weather/2026-05-14/2152.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 23.3 C
- Precipitation 1h: 0 mm
- Humidity: 57%
- Wind: 2 m/s

## Latest Targets

- Demand target: 2026. 05. 14. 22:00
- Traffic target: 2026. 05. 14. 22:00
- Taxi pressure target: 2026. 05. 14. 22:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8712 | high |
| 2 | 역삼1동 | 0.4231 | watch |
| 3 | 대치4동 | 0.4124 | watch |
| 4 | 삼성1동 | 0.3802 | low |
| 5 | 삼성2동 | 0.2702 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.8275 | - |
| 3 | 역삼1동 | 0.7818 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8313 | - |
| 2 | 청담동 | 0.5740 | - |
| 3 | 삼성1동 | 0.4503 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6802 | 0.7919 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4784 | 0.5577 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성2동 | 0.3917 | 0.4392 | 0.7597 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.3881 | 0.4588 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.3416 | 0.4486 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 14. 22:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 14. 22:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 155000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 150
- Completed comparisons: 1
- Waiting comparisons: 149
- Live demand log count: 182
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 14. 21:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.4333
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 14. 22:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.628
- Estimated positive imbalance after: 0.831
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
