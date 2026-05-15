# Overnight Model QA Status

Generated: 2026. 05. 16. 03:45 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 16. 03:45
- Raw citydata: `data/raw/citydata/2026-05-16/0345.json`
- Raw weather: `data/raw/weather/2026-05-16/0345.json`
- KMA status: CHECK (429)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 0 C
- Precipitation 1h: 0 mm
- Humidity: 0%
- Wind: 0 m/s

## Latest Targets

- Demand target: 2026. 05. 16. 04:00
- Traffic target: 2026. 05. 16. 04:00
- Taxi pressure target: 2026. 05. 16. 04:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.5002 | watch |
| 2 | 논현1동 | 0.3813 | low |
| 3 | 청담동 | 0.2111 | low |
| 4 | 역삼1동 | 0.1700 | low |
| 5 | 신사동 | 0.1255 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.2941 | - |
| 3 | 논현1동 | 0.2284 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8343 | - |
| 2 | 청담동 | 0.4641 | - |
| 3 | 신사동 | 0.3742 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.4435 | 0.5576 | 0.5451 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.3570 | 0.4076 | 0.7240 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 역삼1동 | 0.2250 | 0.2788 | 0.5715 | medium | pattern_fallback_used, signals_disagree |
| 4 | 청담동 | 0.2195 | 0.2462 | 0.7589 | high | pattern_fallback_used |
| 5 | 신사동 | 0.1530 | 0.1835 | 0.6308 | medium | pattern_fallback_used, signals_disagree |

- Guardrail target: 2026. 05. 16. 04:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 16. 04:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 68500

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 175
- Completed comparisons: 1
- Waiting comparisons: 174
- Live demand log count: 207
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 16. 03:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.1667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 16. 04:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 2
- Max incentive multiplier: 1.1
- Positive imbalance before: 0.347
- Estimated positive imbalance after: 0.152
- Estimated relief score: 0.195
- Highest relief dong: 삼성1동
