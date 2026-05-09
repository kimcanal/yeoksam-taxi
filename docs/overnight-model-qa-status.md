# Overnight Model QA Status

Generated: 2026. 05. 09. 22:39 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 09. 22:39
- Raw citydata: `data/raw/citydata/2026-05-09/2239.json`
- Raw weather: `data/raw/weather/2026-05-09/2239.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.1 C
- Precipitation 1h: 0 mm
- Humidity: 43%
- Wind: 0.8 m/s

## Latest Targets

- Demand target: 2026. 05. 09. 23:00
- Traffic target: 2026. 05. 09. 23:00
- Taxi pressure target: 2026. 05. 09. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8577 | high |
| 2 | 역삼1동 | 0.4094 | watch |
| 3 | 삼성1동 | 0.2235 | low |
| 4 | 대치4동 | 0.2217 | low |
| 5 | 청담동 | 0.2206 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8008 | - |
| 3 | 대치4동 | 0.4122 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8089 | - |
| 2 | 청담동 | 0.4782 | - |
| 3 | 신사동 | 0.4128 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6469 | 0.7532 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4488 | 0.5337 | 0.6465 | medium | pattern_fallback_used |
| 3 | 삼성2동 | 0.2883 | 0.3232 | 0.7597 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.2512 | 0.2969 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 청담동 | 0.2235 | 0.2606 | 0.6839 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 09. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 09. 23:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 112250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 60
- Completed comparisons: 1
- Waiting comparisons: 59
- Live demand log count: 92
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 09. 22:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.3333
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 09. 23:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.83
- Estimated positive imbalance after: 0.325
- Estimated relief score: 0.505
- Highest relief dong: 논현1동
