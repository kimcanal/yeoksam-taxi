# Overnight Model QA Status

Generated: 2026. 05. 10. 08:25 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 10. 08:24
- Raw citydata: `data/raw/citydata/2026-05-10/0824.json`
- Raw weather: `data/raw/weather/2026-05-10/0824.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 16.3 C
- Precipitation 1h: 0 mm
- Humidity: 45%
- Wind: 1.5 m/s

## Latest Targets

- Demand target: 2026. 05. 10. 09:00
- Traffic target: 2026. 05. 10. 09:00
- Taxi pressure target: 2026. 05. 10. 09:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 0.6425 | medium |
| 2 | 논현1동 | 0.6113 | medium |
| 3 | 역삼1동 | 0.2907 | low |
| 4 | 청담동 | 0.2900 | low |
| 5 | 논현2동 | 0.2860 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 삼성1동 | 1.0000 | - |
| 2 | 논현1동 | 0.6377 | - |
| 3 | 역삼1동 | 0.6051 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8009 | - |
| 2 | 청담동 | 0.6897 | - |
| 3 | 삼성1동 | 0.4498 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 삼성1동 | 0.5204 | 0.6342 | 0.6013 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 2 | 논현1동 | 0.5001 | 0.5710 | 0.7240 | high | pattern_fallback_used |
| 3 | 역삼1동 | 0.3632 | 0.4193 | 0.7027 | high | pattern_fallback_used |
| 4 | 청담동 | 0.2642 | 0.3080 | 0.6839 | high | pattern_fallback_used |
| 5 | 논현2동 | 0.2430 | 0.3254 | 0.4376 | low | pattern_fallback_used, signals_disagree, weak_2026_proxy_validation, no_live_population_poi_coverage, thin_current_traffic_links |

- Guardrail target: 2026. 05. 10. 09:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 10. 09:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 81750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 70
- Completed comparisons: 2
- Waiting comparisons: 68
- Live demand log count: 102
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 10. 08:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.2167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 10. 09:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.673
- Estimated positive imbalance after: 0.363
- Estimated relief score: 0.31
- Highest relief dong: 삼성1동
