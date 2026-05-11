# Overnight Model QA Status

Generated: 2026. 05. 12. 02:05 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 12. 02:05
- Raw citydata: `data/raw/citydata/2026-05-12/0205.json`
- Raw weather: `data/raw/weather/2026-05-12/0205.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 15.3 C
- Precipitation 1h: 0 mm
- Humidity: 90%
- Wind: 0.5 m/s

## Latest Targets

- Demand target: 2026. 05. 12. 03:00
- Traffic target: 2026. 05. 12. 03:00
- Taxi pressure target: 2026. 05. 12. 03:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8432 | high |
| 2 | 대치4동 | 0.4626 | watch |
| 3 | 삼성1동 | 0.4155 | watch |
| 4 | 역삼1동 | 0.3965 | low |
| 5 | 청담동 | 0.3804 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.8379 | - |
| 3 | 역삼1동 | 0.8184 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7982 | - |
| 2 | 청담동 | 0.5446 | - |
| 3 | 신사동 | 0.3698 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6164 | 0.7320 | 0.6490 | medium | pattern_fallback_used |
| 2 | 역삼1동 | 0.4460 | 0.5199 | 0.6840 | high | pattern_fallback_used |
| 3 | 청담동 | 0.3923 | 0.4400 | 0.7589 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.3899 | 0.4945 | 0.5301 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.3737 | 0.4699 | 0.5449 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 12. 03:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 12. 03:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 70000

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 99
- Completed comparisons: 1
- Waiting comparisons: 98
- Live demand log count: 131
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 12. 01:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.4
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 12. 03:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 9
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.536
- Estimated positive imbalance after: 0.641
- Estimated relief score: 0.895
- Highest relief dong: 대치4동
