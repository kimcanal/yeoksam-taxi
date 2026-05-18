# Demand API Contract

This frontend does not train or batch-run the demand model. The backend owns
model training, feature generation, and persistence. The frontend only requests
a 24-hour demand curve for the selected dong and weekday.

## Runtime Behavior

- Configure `NEXT_PUBLIC_DEMAND_API_ENDPOINT` to enable backend fetches.
- The frontend sends `dong` and `weekday` as query parameters.
- If the endpoint is not configured, fails, or returns malformed data, the UI
  falls back to bundled mock curves in `src/components/map-simulator/demand-mock-series.ts`.
- The fallback is presentation data only; it is not a model artifact.

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
- `population_pred`: predicted living/floating population for that hour.
  `populationPred` and `population` are also accepted.
- `r`: backend correction coefficient.
- `demand_pred`: taxi demand estimate, usually `population_pred * r`.
  `demandPred` and `demand` are also accepted.

## Frontend Scope

The frontend renders this payload as:

- hourly demand line
- smoothed trend line
- peak-hour summary
- dong selection state in the minimap

Backend-owned work, including model training, feature tables, validation CSVs,
and batch prediction artifacts, should live in the backend or data repository.
