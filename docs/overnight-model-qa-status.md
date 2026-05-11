# Overnight Model QA Status

Generated: 2026. 05. 11. 16:32 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 11. 16:31
- Raw citydata: `data/raw/citydata/2026-05-11/1631.json`
- Raw weather: `data/raw/weather/2026-05-11/1631.json`
- KMA status: OK (200)
- Weather note: 강수 관측 또는 API 값을 확인하세요.
- Temperature: 17.9 C
- Precipitation 1h: 3.5 mm
- Humidity: 89%
- Wind: 0.9 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 17:00
- Traffic target: 2026. 05. 11. 17:00
- Taxi pressure target: 2026. 05. 11. 17:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9084 | high |
| 2 | 대치4동 | 0.4406 | watch |
| 3 | 역삼1동 | 0.3456 | low |
| 4 | 삼성1동 | 0.3234 | low |
| 5 | 청담동 | 0.2768 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7992 | - |
| 3 | 역삼1동 | 0.5977 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8890 | - |
| 2 | 청담동 | 0.7500 | - |
| 3 | 삼성1동 | 0.5666 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7507 | 0.8740 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4949 | 0.5769 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4022 | 0.4851 | 0.6201 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3679 | 0.4164 | 0.7410 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3441 | 0.4519 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, recent_rank_volatility |

- Guardrail target: 2026. 05. 11. 17:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 17:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 283250

## Validation

- Taxi pressure comparison status: waiting_for_observation
- Taxi pressure log count: 94
- Completed comparisons: 0
- Waiting comparisons: 94
- Live demand log count: 126
- Latest comparison kind: waiting
- Latest comparison target: 2026. 05. 11. 17:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: -
- Latest road-signal Spearman (policy check): -
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 11. 17:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.584
- Estimated positive imbalance after: 0.769
- Estimated relief score: 0.815
- Highest relief dong: 논현1동
