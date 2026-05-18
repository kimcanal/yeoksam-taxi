# Demand API Contract

This frontend does not train or batch-run the demand model. The backend owns
model training, feature generation, persistence, and dispatch interpretation.
The frontend only requests a 24-hour demand curve for the selected dong and
weekday.

## Runtime Behavior

- Configure `NEXT_PUBLIC_DEMAND_API_ENDPOINT` to enable backend fetches.
- The frontend sends `dong` and `weekday` as query parameters.
- If the endpoint is not configured, fails, or returns malformed data, the UI
  shows an API-required state. It does not synthesize local demand predictions.

## Request

```text
GET {NEXT_PUBLIC_DEMAND_API_ENDPOINT}?dong=역삼1동&weekday=friday
```

Current weekday IDs:

```text
monday, tuesday, wednesday, thursday, friday, saturday, sunday
```

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
