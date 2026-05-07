# Overnight Model QA Status

Generated: 2026. 05. 07. 16:16 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct call-volume predictions.

## API Collection

- Citydata collected: 2026. 05. 07. 16:16
- Raw citydata: `data/raw/citydata/2026-05-07/1616.json`
- Raw weather: `data/raw/weather/2026-05-07/1616.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 15.5 C
- Precipitation 1h: 0 mm
- Humidity: 83%
- Wind: 1.4 m/s

## Latest Targets

- Demand target: 2026. 05. 07. 17:00
- Traffic target: 2026. 05. 07. 17:00
- Taxi pressure target: 2026. 05. 07. 17:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9300 | high |
| 2 | 대치4동 | 0.4328 | watch |
| 3 | 역삼1동 | 0.3376 | low |
| 4 | 삼성1동 | 0.3245 | low |
| 5 | 청담동 | 0.2930 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 1.0000 | - |
| 2 | 대치4동 | 0.7940 | - |
| 3 | 역삼1동 | 0.5867 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.9236 | - |
| 2 | 청담동 | 0.7936 | - |
| 3 | 삼성1동 | 0.5798 | - |

## Guardrail Monitoring Priority

| Rank | Dong | Priority | Pressure | Confidence | Level | Risk flags |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | 논현1동 | 0.7394 | 0.8781 | 0.6490 | medium | pattern_fallback_used |
| 2 | 역삼1동 | 0.4880 | 0.5689 | 0.6840 | high | pattern_fallback_used |
| 3 | 삼성1동 | 0.4191 | 0.5214 | 0.5638 | medium | pattern_fallback_used, weak_2026_proxy_validation |
| 4 | 삼성2동 | 0.3803 | 0.4224 | 0.7785 | high | pattern_fallback_used |
| 5 | 대치4동 | 0.3401 | 0.4467 | 0.4699 | low | pattern_fallback_used, signals_disagree, no_live_population_poi_coverage, recent_rank_volatility |

- Guardrail target: 2026. 05. 07. 17:00
- Forecast strategy: pattern
- Baseline strength score: 0.6303
- Model vs pattern MAE improvement: 6.5%

## Population Pressure Proxy

- Target: 2026. 05. 07. 17:00
- Live POIs: 7
- Covered dongs: 6
- Forecast population midpoint sum: 293250

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 13
- Completed comparisons: 1
- Waiting comparisons: 12
- Live demand log count: 45
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 07. 15:00
- Latest comparison top predicted: 논현1동
- Latest comparison top observed congestion: 논현1동
- Latest road-signal Spearman (policy check): 0.8833
- POI forecast completed/waiting: 0 / 1
- Latest POI forecast target: 2026. 05. 07. 17:00
- Latest POI matched rows: -
- Latest POI population MAE: -
- Latest POI congestion-level hit rate: -%
- Latest POI top predicted/observed: - / -

## Dispatch Effect Proxy

- Method: proxy_counterfactual_v1
- Intervention areas: 3
- Monitoring units: 8
- Max incentive multiplier: 1.2
- Positive imbalance before: 1.697
- Estimated positive imbalance after: 0.882
- Estimated relief score: 0.815
- Highest relief dong: 논현1동
