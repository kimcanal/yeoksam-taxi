# Overnight Model QA Status

Generated: 2026. 05. 09. 14:14 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 09. 14:14
- Raw citydata: `data/raw/citydata/2026-05-09/1414.json`
- Raw weather: `data/raw/weather/2026-05-09/1414.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 23 C
- Precipitation 1h: 0 mm
- Humidity: 21%
- Wind: 2.1 m/s

## Latest Targets

- Demand target: 2026. 05. 09. 15:00
- Traffic target: 2026. 05. 09. 15:00
- Taxi pressure target: 2026. 05. 09. 15:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9032 | high |
| 2 | 삼성1동 | 0.3702 | low |
| 3 | 역삼1동 | 0.3145 | low |
| 4 | 논현2동 | 0.2968 | low |
| 5 | 청담동 | 0.2922 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.5850 | - |
| 3 | 삼성1동 | 0.4921 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8890 | - |
| 2 | 청담동 | 0.7866 | - |
| 3 | 신사동 | 0.5216 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6605 | 0.8004 | 0.6115 | medium | pattern_fallback_used, signals_disagree |
| 2 | 삼성1동 | 0.4502 | 0.5322 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 역삼1동 | 0.4174 | 0.4914 | 0.6652 | medium | pattern_fallback_used |
| 4 | 청담동 | 0.3356 | 0.3913 | 0.6839 | high | pattern_fallback_used |
| 5 | 삼성2동 | 0.3055 | 0.3331 | 0.8160 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 09. 15:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 09. 15:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 191250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 52
- Completed comparisons: 1
- Waiting comparisons: 51
- Live demand log count: 84
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 09. 13:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.75
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 09. 15:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 5
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.388
- Estimated positive imbalance after: 0.687
- Estimated relief score: 0.702
- Highest relief dong: 논현1동
