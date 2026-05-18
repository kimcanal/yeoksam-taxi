# Overnight Model QA Status

Generated: 2026. 05. 18. 22:33 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 18. 22:33
- Raw citydata: `data/raw/citydata/2026-05-18/2233.json`
- Raw weather: `data/raw/weather/2026-05-18/2233.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 22.1 C
- Precipitation 1h: 0 mm
- Humidity: 42%
- Wind: 0.8 m/s

## Latest Targets

- Demand target: 2026. 05. 18. 23:00
- Traffic target: 2026. 05. 18. 23:00
- Taxi pressure target: 2026. 05. 18. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8711 | high |
| 2 | 대치4동 | 0.4153 | watch |
| 3 | 역삼1동 | 0.3562 | low |
| 4 | 삼성1동 | 0.3390 | low |
| 5 | 청담동 | 0.2483 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7722 | - |
| 3 | 역삼1동 | 0.6899 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8309 | - |
| 2 | 청담동 | 0.5494 | - |
| 3 | 삼성1동 | 0.4136 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6536 | 0.7610 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4309 | 0.4974 | 0.7027 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.3610 | 0.4268 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3377 | 0.4339 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.2987 | 0.3381 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 18. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 18. 23:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 114750

## Validation

- Taxi pressure comparison status: waiting_for_observation
- Taxi pressure log count: 229
- Completed comparisons: 0
- Waiting comparisons: 229
- Live demand log count: 261
- Latest comparison kind: waiting
- Latest comparison target: 2026. 05. 18. 23:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: -
- Latest road-signal Spearman (policy check): -
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 18. 23:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.416
- Estimated positive imbalance after: 0.618
- Estimated relief score: 0.798
- Highest relief dong: 논현1동
