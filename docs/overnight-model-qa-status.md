# Overnight Model QA Status

Generated: 2026. 05. 07. 10:07 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 07. 10:07
- Raw citydata: `data/raw/citydata/2026-05-07/1007.json`
- Raw weather: `data/raw/weather/2026-05-07/1007.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 18.7 C
- Precipitation 1h: 0 mm
- Humidity: 50%
- Wind: 1.8 m/s

## Latest Targets

- Demand target: 2026. 05. 07. 11:00
- Traffic target: 2026. 05. 07. 11:00
- Taxi pressure target: 2026. 05. 07. 11:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7564 | high |
| 2 | 대치4동 | 0.5162 | watch |
| 3 | 삼성1동 | 0.3182 | low |
| 4 | 청담동 | 0.2491 | low |
| 5 | 역삼1동 | 0.2355 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 대치4동 | 1.0000 | - |
| 2 | 논현1동 | 0.7972 | - |
| 3 | 논현2동 | 0.4250 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8613 | - |
| 2 | 청담동 | 0.6556 | - |
| 3 | 신사동 | 0.5225 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6420 | 0.7331 | 0.7240 | high | pattern_fallback_used |
| 2 | 삼성1동 | 0.4032 | 0.4815 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 3 | 역삼1동 | 0.3851 | 0.4446 | 0.7027 | high | pattern_fallback_used |
| 4 | 대치4동 | 0.3776 | 0.5189 | 0.3949 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |
| 5 | 삼성2동 | 0.3377 | 0.3860 | 0.7222 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 07. 11:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 07. 11:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 265750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 10
- Completed comparisons: 1
- Waiting comparisons: 9
- Live demand log count: 42
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 07. 09:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.2167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 07. 11:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 2
- Monitoring units: 5
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.07
- Estimated positive imbalance after: 0.565
- Estimated relief score: 0.505
- Highest relief dong: 대치4동
