# Overnight Model QA Status

Generated: 2026. 05. 09. 03:43 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 09. 03:43
- Raw citydata: `data/raw/citydata/2026-05-09/0343.json`
- Raw weather: `data/raw/weather/2026-05-09/0343.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 10.2 C
- Precipitation 1h: 0 mm
- Humidity: 65%
- Wind: 0.6 m/s

## Latest Targets

- Demand target: 2026. 05. 09. 04:00
- Traffic target: 2026. 05. 09. 04:00
- Taxi pressure target: 2026. 05. 09. 04:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5212 | watch |
| 2 | 논현1동 | 0.3781 | low |
| 3 | 청담동 | 0.2021 | low |
| 4 | 역삼1동 | 0.1664 | low |
| 5 | 신사동 | 0.1192 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.2930 | - |
| 3 | 논현1동 | 0.2144 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8336 | - |
| 2 | 청담동 | 0.4466 | - |
| 3 | 신사동 | 0.3548 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4505 | 0.5664 | 0.5451 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3513 | 0.4011 | 0.7240 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 역삼1동 | 0.2205 | 0.2732 | 0.5715 | medium | pattern_fallback_used, signals_disagree |
| 4 | 청담동 | 0.2142 | 0.2380 | 0.7777 | high | pattern_fallback_used |
| 5 | 삼성2동 | 0.1702 | 0.1927 | 0.7410 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 09. 04:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 09. 04:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 66250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 44
- Completed comparisons: 1
- Waiting comparisons: 43
- Live demand log count: 76
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 09. 03:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.3833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 09. 04:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 2
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.4
- Estimated positive imbalance after: 0.205
- Estimated relief score: 0.195
- Highest relief dong: 삼성1동
