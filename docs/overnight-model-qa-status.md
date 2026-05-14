# Overnight Model QA Status

Generated: 2026. 05. 15. 24:57 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 15. 24:57
- Raw citydata: `data/raw/citydata/2026-05-15/0057.json`
- Raw weather: `data/raw/weather/2026-05-15/0057.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 20.2 C
- Precipitation 1h: 0 mm
- Humidity: 69%
- Wind: 0.8 m/s

## Latest Targets

- Demand target: 2026. 05. 15. 01:00
- Traffic target: 2026. 05. 15. 01:00
- Taxi pressure target: 2026. 05. 15. 01:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8272 | high |
| 2 | 역삼2동 | 0.4750 | watch |
| 3 | 대치4동 | 0.4206 | watch |
| 4 | 삼성1동 | 0.4074 | watch |
| 5 | 역삼1동 | 0.3815 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼2동 | 1.0000 | - |
| 2 | 논현1동 | 0.9621 | - |
| 3 | 대치4동 | 0.7845 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8127 | - |
| 2 | 청담동 | 0.4601 | - |
| 3 | 삼성1동 | 0.3767 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6455 | 0.7300 | 0.7428 | high | pattern_fallback_used, recent_rank_volatility |
| 2 | 역삼1동 | 0.4384 | 0.5111 | 0.6840 | high | pattern_fallback_used |
| 3 | 역삼2동 | 0.3988 | 0.5045 | 0.5345 | medium | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 4 | 삼성1동 | 0.3929 | 0.4739 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.3593 | 0.4425 | 0.5824 | medium | pattern_fallback_used, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 15. 01:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 15. 01:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 81750

## Validation

- Taxi pressure comparison status: waiting_for_observation
- Taxi pressure log count: 153
- Completed comparisons: 0
- Waiting comparisons: 153
- Live demand log count: 185
- Latest comparison kind: waiting
- Latest comparison target: 2026. 05. 15. 01:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: -
- Latest road-signal Spearman (policy check): -
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 15. 01:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 5
- Monitoring units: 10
- Max incentive multiplier: 1.1
- Positive imbalance before: 1.85
- Estimated positive imbalance after: 0.875
- Estimated relief score: 0.975
- Highest relief dong: 대치4동
