# Overnight Model QA Status

Generated: 2026. 05. 12. 19:57 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 12. 19:57
- Raw citydata: `data/raw/citydata/2026-05-12/1957.json`
- Raw weather: `data/raw/weather/2026-05-12/1957.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 21.2 C
- Precipitation 1h: 0 mm
- Humidity: 60%
- Wind: 2 m/s

## Latest Targets

- Demand target: 2026. 05. 12. 20:00
- Traffic target: 2026. 05. 12. 20:00
- Taxi pressure target: 2026. 05. 12. 20:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8792 | high |
| 2 | 역삼1동 | 0.4384 | watch |
| 3 | 삼성1동 | 0.3512 | low |
| 4 | 대치4동 | 0.3497 | low |
| 5 | 삼성2동 | 0.2641 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.7920 | - |
| 3 | 대치4동 | 0.7141 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8469 | - |
| 2 | 청담동 | 0.6403 | - |
| 3 | 신사동 | 0.4683 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7162 | 0.8338 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.5051 | 0.6007 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성2동 | 0.4059 | 0.4508 | 0.7785 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.3897 | 0.4607 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 대치4동 | 0.3094 | 0.3975 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage, recent_rank_volatility |

- Guardrail target: 2026. 05. 12. 20:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 12. 20:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 206250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 112
- Completed comparisons: 1
- Waiting comparisons: 111
- Live demand log count: 144
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 12. 19:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.4167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 12. 20:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.418
- Estimated positive imbalance after: 0.718
- Estimated relief score: 0.7
- Highest relief dong: 논현1동
