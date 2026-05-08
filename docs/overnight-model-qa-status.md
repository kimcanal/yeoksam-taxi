# Overnight Model QA Status

Generated: 2026. 05. 09. 24:42 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 09. 24:42
- Raw citydata: `data/raw/citydata/2026-05-09/0042.json`
- Raw weather: `data/raw/weather/2026-05-09/0042.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 14.7 C
- Precipitation 1h: 0 mm
- Humidity: 49%
- Wind: 1.3 m/s

## Latest Targets

- Demand target: 2026. 05. 09. 01:00
- Traffic target: 2026. 05. 09. 01:00
- Taxi pressure target: 2026. 05. 09. 01:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8707 | high |
| 2 | 역삼1동 | 0.4717 | watch |
| 3 | 청담동 | 0.4716 | watch |
| 4 | 신사동 | 0.3303 | low |
| 5 | 삼성2동 | 0.2972 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 역삼1동 | 0.8999 | - |
| 3 | 청담동 | 0.7263 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.8457 | - |
| 2 | 청담동 | 0.4723 | - |
| 3 | 신사동 | 0.4005 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.6524 | 0.7595 | 0.6865 | high | pattern_fallback_used |
| 2 | 역삼1동 | 0.4949 | 0.5769 | 0.6840 | high | pattern_fallback_used |
| 3 | 청담동 | 0.4565 | 0.5120 | 0.7589 | high | pattern_fallback_used |
| 4 | 삼성2동 | 0.3955 | 0.4435 | 0.7597 | high | pattern_fallback_used |
| 5 | 신사동 | 0.3809 | 0.4348 | 0.7246 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 09. 01:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 09. 01:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 85750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 41
- Completed comparisons: 1
- Waiting comparisons: 40
- Live demand log count: 73
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 09. 24:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 역삼1동
- Latest road-signal Spearman (policy check): 0.8
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 09. 01:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 7
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.279
- Estimated positive imbalance after: 0.561
- Estimated relief score: 0.718
- Highest relief dong: 논현1동
