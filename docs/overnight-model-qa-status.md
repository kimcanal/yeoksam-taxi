# Overnight Model QA Status

Generated: 2026. 05. 06. 16:25 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 06. 14:22
- Raw citydata: `data/raw/citydata/2026-05-06/1422.json`
- Raw weather: `data/raw/weather/2026-05-06/1422.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 24.7 C
- Precipitation 1h: 0 mm
- Humidity: 35%
- Wind: 1.9 m/s

## Latest Targets

- Demand target: 2026. 05. 06. 17:00
- Traffic target: 2026. 05. 06. 17:00
- Taxi pressure target: 2026. 05. 06. 14:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8384 | high |
| 2 | 대치4동 | 0.5335 | watch |
| 3 | 삼성1동 | 0.2738 | low |
| 4 | 청담동 | 0.2568 | low |
| 5 | 역삼1동 | 0.2468 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.8109 | - |
| 3 | 역삼1동 | 0.5997 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9172 | - |
| 2 | 청담동 | 0.8000 | - |
| 3 | 신사동 | 0.6234 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7325 | 0.8699 | 0.6490 | medium | pattern_fallback_used |
| 2 | 역삼1동 | 0.4946 | 0.5766 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4334 | 0.5282 | 0.6013 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3682 | 0.4168 | 0.7410 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3462 | 0.4547 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, recent_rank_volatility |

- Guardrail target: 2026. 05. 06. 17:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 06. 15:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 303250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 23
- Completed comparisons: 12
- Waiting comparisons: 11
- Live demand log count: 24
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 06. 12:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.2667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 06. 15:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 9
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.733
- Estimated positive imbalance after: 0.82
- Estimated relief score: 0.913
- Highest relief dong: 논현1동
