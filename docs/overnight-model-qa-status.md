# Overnight Model QA Status

Generated: 2026. 05. 08. 24:05 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 08. 24:05
- Raw citydata: `data/raw/citydata/2026-05-08/0005.json`
- Raw weather: `data/raw/weather/2026-05-08/0005.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.1 C
- Precipitation 1h: 0 mm
- Humidity: 85%
- Wind: 0.5 m/s

## Latest Targets

- Demand target: 2026. 05. 08. 01:00
- Traffic target: 2026. 05. 08. 01:00
- Taxi pressure target: 2026. 05. 08. 01:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 0.5335 | watch |
| 2 | 논현1동 | 0.4210 | watch |
| 3 | 청담동 | 0.2396 | low |
| 4 | 역삼2동 | 0.1832 | low |
| 5 | 대치4동 | 0.1754 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 역삼2동 | 0.3626 | - |
| 3 | 논현1동 | 0.3458 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7754 | - |
| 2 | 청담동 | 0.5308 | - |
| 3 | 신사동 | 0.3701 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 역삼1동 | 0.5359 | 0.6247 | 0.6840 | high | pattern_fallback_used |
| 2 | 논현1동 | 0.3937 | 0.4452 | 0.7428 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 청담동 | 0.2316 | 0.2700 | 0.6839 | high | pattern_fallback_used |
| 4 | 삼성1동 | 0.1952 | 0.2308 | 0.6576 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 5 | 역삼2동 | 0.1813 | 0.2246 | 0.5720 | medium | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage |

- Guardrail target: 2026. 05. 08. 01:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 08. 01:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 81250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 19
- Completed comparisons: 1
- Waiting comparisons: 18
- Live demand log count: 51
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 07. 23:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 대치4동
- Latest road-signal Spearman (policy check): 0.4333
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 08. 01:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 1
- Monitoring units: 3
- Max incentive multiplier: 1.2
- Positive imbalance before: 0.541
- Estimated positive imbalance after: 0.231
- Estimated relief score: 0.31
- Highest relief dong: 역삼1동
