# Overnight Model QA Status

Generated: 2026. 05. 11. 22:18 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 11. 22:17
- Raw citydata: `data/raw/citydata/2026-05-11/2217.json`
- Raw weather: `data/raw/weather/2026-05-11/2217.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 17.5 C
- Precipitation 1h: 0 mm
- Humidity: 81%
- Wind: 0.5 m/s

## Latest Targets

- Demand target: 2026. 05. 11. 23:00
- Traffic target: 2026. 05. 11. 23:00
- Taxi pressure target: 2026. 05. 11. 23:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8756 | high |
| 2 | 대치4동 | 0.4132 | watch |
| 3 | 역삼1동 | 0.3392 | low |
| 4 | 삼성1동 | 0.3060 | low |
| 5 | 청담동 | 0.2431 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7955 | - |
| 3 | 역삼1동 | 0.6825 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8423 | - |
| 2 | 청담동 | 0.5253 | - |
| 3 | 신사동 | 0.4000 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6566 | 0.7644 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4276 | 0.4889 | 0.7215 | high | pattern_fallback_used |
| 3 | 대치4동 | 0.3402 | 0.4371 | 0.5074 | medium | pattern_fallback_used, no_live_population_poi_coverage |
| 4 | 삼성1동 | 0.3312 | 0.3915 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 삼성2동 | 0.3221 | 0.3611 | 0.7597 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 11. 23:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 11. 23:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 112750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 97
- Completed comparisons: 1
- Waiting comparisons: 96
- Live demand log count: 129
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 11. 21:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.3667
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 11. 23:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.225
- Estimated positive imbalance after: 0.525
- Estimated relief score: 0.7
- Highest relief dong: 논현1동
