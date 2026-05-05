# Overnight Model QA Status

Generated: 2026. 05. 06. 01:27 KST

This file is updated by the overnight model QA cycle. It tracks public-data
proxy forecasts, not direct KakaoT taxi-call predictions.

## API Collection

- Citydata collected: 2026. 05. 06. 01:27
- Raw citydata: `data\raw\citydata\2026-05-06\0127.json`
- Raw weather: `data\raw\weather\2026-05-06\0127.json`
- KMA status: OK (200)
- Weather note: 강수 없음. 데이터 누락이 아닙니다.
- Temperature: 9.1 C
- Precipitation 1h: 0 mm
- Humidity: 67%
- Wind: 1.7 m/s

## Latest Targets

- Demand target: 2026. 05. 06. 02:00
- Traffic target: 2026. 05. 06. 02:00
- Taxi pressure target: 2026. 05. 06. 02:00

## Taxi Pressure Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 0.5204 | watch |
| 2 | 논현1동 | 0.4103 | watch |
| 3 | 청담동 | 0.2329 | low |
| 4 | 대치4동 | 0.1838 | low |
| 5 | 삼성1동 | 0.1770 | low |

## Demand Proxy Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 역삼1동 | 1.0000 | - |
| 2 | 논현1동 | 0.3222 | - |
| 3 | 대치4동 | 0.2884 | - |

## Traffic Congestion Top Regions

| Rank | Dong | Score | Level |
| ---: | --- | ---: | --- |
| 1 | 논현1동 | 0.7830 | - |
| 2 | 청담동 | 0.5228 | - |
| 3 | 신사동 | 0.4921 | - |

## Validation

- Taxi pressure comparison status: has_completed_comparison
- Taxi pressure log count: 3
- Completed comparisons: 2
- Waiting comparisons: 1
- Live demand log count: 4
- Latest comparison kind: completed
- Latest comparison target: 2026. 05. 06. 01:00
- Latest comparison top predicted: 역삼1동
- Latest comparison top observed congestion: 대치4동
- Latest rank Spearman: 0.25
