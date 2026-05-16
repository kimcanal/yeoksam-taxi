# Overnight Model QA Status

Generated: 2026. 05. 17. 24:30 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 17. 24:30
- Raw citydata: `data/raw/citydata/2026-05-17/0030.json`
- Raw weather: `data/raw/weather/2026-05-17/0030.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 17.6 C
- Precipitation 1h: 0 mm
- Humidity: 64%
- Wind: 1.2 m/s

## Latest Targets

- Demand target: 2026. 05. 17. 01:00
- Traffic target: 2026. 05. 17. 01:00
- Taxi pressure target: 2026. 05. 17. 01:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8806 | high |
| 2 | 삼성1동 | 0.5179 | watch |
| 3 | 역삼1동 | 0.5043 | watch |
| 4 | 청담동 | 0.2223 | low |
| 5 | 논현2동 | 0.1842 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.9851 | - |
| 3 | 삼성1동 | 0.9077 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8499 | - |
| 2 | 청담동 | 0.4418 | - |
| 3 | 신사동 | 0.3727 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6534 | 0.7607 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.5179 | 0.6037 | 0.6840 | high | pattern_fallback_used, recent_rank_volatility |
| 3 | 삼성1동 | 0.4642 | 0.5543 | 0.6388 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 청담동 | 0.2446 | 0.2744 | 0.7589 | high | pattern_fallback_used |
| 5 | 신사동 | 0.1867 | 0.2217 | 0.6496 | medium | pattern_fallback_used |

- Guardrail target: 2026. 05. 17. 01:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 17. 01:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 80250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 194
- Completed comparisons: 1
- Waiting comparisons: 193
- Live demand log count: 226
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 17. 24:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.5167
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 17. 01:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 9
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.528
- Estimated positive imbalance after: 0.598
- Estimated relief score: 0.93
- Highest relief dong: 논현1동
