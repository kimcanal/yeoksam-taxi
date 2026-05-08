# Overnight Model QA Status

Generated: 2026. 05. 08. 15:50 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 08. 15:49
- Raw citydata: `data/raw/citydata/2026-05-08/1549.json`
- Raw weather: `data/raw/weather/2026-05-08/1549.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 19.8 C
- Precipitation 1h: 0 mm
- Humidity: 24%
- Wind: 4 m/s

## Latest Targets

- Demand target: 2026. 05. 08. 16:00
- Traffic target: 2026. 05. 08. 16:00
- Taxi pressure target: 2026. 05. 08. 16:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9151 | high |
| 2 | 대치4동 | 0.4931 | watch |
| 3 | 삼성1동 | 0.3289 | low |
| 4 | 역삼1동 | 0.2978 | low |
| 5 | 청담동 | 0.2788 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.8981 | - |
| 3 | 역삼1동 | 0.5137 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9077 | - |
| 2 | 청담동 | 0.7809 | - |
| 3 | 삼성1동 | 0.5824 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7354 | 0.8733 | 0.6490 | medium | pattern_fallback_used |
| 2 | 역삼1동 | 0.4512 | 0.5312 | 0.6652 | medium | pattern_fallback_used |
| 3 | 삼성1동 | 0.4347 | 0.5298 | 0.6013 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 대치4동 | 0.3732 | 0.4901 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, recent_rank_volatility |
| 5 | 삼성2동 | 0.3632 | 0.4034 | 0.7785 | high | pattern_fallback_used |

- Guardrail target: 2026. 05. 08. 16:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 08. 16:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 295750

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 32
- Completed comparisons: 1
- Waiting comparisons: 31
- Live demand log count: 64
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 08. 15:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 삼성1동
- Latest road-signal Spearman (policy check): 0.85
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 08. 16:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 4
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.74
- Estimated positive imbalance after: 0.924
- Estimated relief score: 0.816
- Highest relief dong: 논현1동
