# Overnight Model QA Status

Generated: 2026. 05. 10. 03:31 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 03:30
- Raw citydata: `data/raw/citydata/2026-05-10/0330.json`
- Raw weather: `data/raw/weather/2026-05-10/0330.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 9.3 C
- Precipitation 1h: 0 mm
- Humidity: 65%
- Wind: 0.8 m/s

## Latest Targets

- Demand target: 2026. 05. 10. 04:00
- Traffic target: 2026. 05. 10. 04:00
- Taxi pressure target: 2026. 05. 10. 04:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5622 | medium |
| 2 | 논현1동 | 0.3288 | low |
| 3 | 청담동 | 0.2206 | low |
| 4 | 신사동 | 0.1502 | low |
| 5 | 역삼1동 | 0.0949 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 논현1동 | 0.1185 | - |
| 3 | 역삼1동 | 0.1002 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7766 | - |
| 2 | 청담동 | 0.5615 | - |
| 3 | 신사동 | 0.4124 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4761 | 0.5924 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3042 | 0.3408 | 0.7615 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 청담동 | 0.2238 | 0.2510 | 0.7589 | high | pattern_fallback_used |
| 4 | 신사동 | 0.1817 | 0.2054 | 0.7433 | high | pattern_fallback_used |
| 5 | 역삼1동 | 0.1621 | 0.1890 | 0.6840 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 10. 04:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 10. 04:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 61250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 65
- Completed comparisons: 1
- Waiting comparisons: 64
- Live demand log count: 97
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 03:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼2동
- Latest road-signal Spearman (policy check): -0.25
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 10. 04:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.496
- Estimated positive imbalance after: 0.186
- Estimated relief score: 0.31
- Highest relief dong: 삼성1동
