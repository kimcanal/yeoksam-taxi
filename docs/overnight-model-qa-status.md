# Overnight Model QA Status

Generated: 2026. 05. 12. 18:12 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 12. 18:12
- Raw citydata: `data/raw/citydata/2026-05-12/1812.json`
- Raw weather: `data/raw/weather/2026-05-12/1812.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 22.9 C
- Precipitation 1h: 0 mm
- Humidity: 50%
- Wind: 3.3 m/s

## Latest Targets

- Demand target: 2026. 05. 12. 19:00
- Traffic target: 2026. 05. 12. 19:00
- Taxi pressure target: 2026. 05. 12. 19:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9271 | high |
| 2 | 대치4동 | 0.4315 | watch |
| 3 | 역삼1동 | 0.4089 | watch |
| 4 | 삼성1동 | 0.3709 | low |
| 5 | 논현2동 | 0.2885 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7224 | - |
| 3 | 역삼1동 | 0.6781 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9183 | - |
| 2 | 청담동 | 0.7331 | - |
| 3 | 삼성1동 | 0.5539 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7528 | 0.8765 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.5171 | 0.6028 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4301 | 0.5084 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3925 | 0.4443 | 0.7410 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3289 | 0.4319 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, recent_rank_volatility |

- Guardrail target: 2026. 05. 12. 19:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 12. 19:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 250250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 111
- Completed comparisons: 1
- Waiting comparisons: 110
- Live demand log count: 143
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 12. 17:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.8167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 12. 19:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 9
- Max incentive multiplier: 1.2
- Positive imbalance before: 2.108
- Estimated positive imbalance after: 1.195
- Estimated relief score: 0.913
- Highest relief dong: 논현1동
