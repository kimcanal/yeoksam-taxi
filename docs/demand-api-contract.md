# Demand API Contract

This frontend does not train or batch-run the demand model. The backend owns
model training, feature generation, persistence, and dispatch interpretation.
The frontend only requests a demand curve and supporting context.

## Runtime Behavior

- Configure `NEXT_PUBLIC_DEMAND_API_ENDPOINT` to enable backend fetches.
- The frontend sends `dong`, `weekday`, and calendar/time parameters as query
  parameters.
- If the endpoint is not configured, fails, or returns malformed data, the UI
  shows an API-required state. It does not synthesize local demand predictions.

## Request

```text
GET {NEXT_PUBLIC_DEMAND_API_ENDPOINT}?dong=역삼1동&weekday=friday&date=2026-05-20&hour=9&month=5&day=20&is_weekend=0&traffic_link_ids=1080012700,1080012800
```

Current weekday IDs:

```text
monday, tuesday, wednesday, thursday, friday, saturday, sunday
```

## Query Fields Used by Frontend

- `dong`: selected 행정동 이름 (예: `역삼1동`)
- `weekday`: one of `monday...sunday`
- `date`: `YYYY-MM-DD`
- `hour`: `0..23` (시뮬레이터 시각)
- `month`: `1..12`
- `day`: `1..31`
- `is_weekend`: `1` (토/일) or `0` (평일)
- `traffic_link_ids`: comma-separated road link ids used as optional traffic
  context features

> Note: `traffic_link_ids` is currently a **context hint field** in the demand
> request. It is not yet used to render the in-scene road overlay.

## Required JSON Shape

```json
{
  "points": [
    {
      "hour": 0,
      "population_pred": 18420,
      "r": 0.0072,
      "demand_pred": 133
    },
    {
      "hour": 1,
      "population_pred": 17110,
      "r": 0.0068,
      "demand_pred": 116
    }
  ]
}
```

## Field Meanings

- `points`: 24 hourly rows are preferred. The frontend accepts any valid subset
  and sorts by `hour`.
- `hour`: integer from `0` to `23`.
- `population_pred`: optional predicted living/floating population for that hour.
  `populationPred` and `population` are also accepted when supplied.
- `r`: optional backend correction coefficient.
- `demand_pred`: required backend taxi demand estimate.
  `demandPred` and `demand` are also accepted.

## Frontend Scope

The frontend renders this payload as:

- hourly demand line
- smoothed trend line
- peak-hour summary
- selected-dong minimap highlight based on the returned curve

Backend-owned work, including model training, feature tables, validation CSVs,
batch prediction artifacts, and dispatch policy, should live in the backend or
data repository.

## Feature Readiness Matrix (Must be shared for every new frontend feature)

| Feature | Backend ready? | Frontend status | Data source |
| --- | --- | --- | --- |
| Hourly demand curve | Yes (required) | Live API fetch | `NEXT_PUBLIC_DEMAND_API_ENDPOINT` |
| Dong mini-map heat | Partial (derived) | Uses demand response + local scoring | Demand API payload + frontend calc |
| Road traffic overlay | Not yet | Demo synthetic only | Local deterministic segment scoring |
| Building kind visual styles | Not required | Frontend-only rendering | OSM/building assets |

When proposing new features, include this matrix (or equivalent) in PR body and
state clearly whether each item is API-backed, partially API-backed, or demo-only.
