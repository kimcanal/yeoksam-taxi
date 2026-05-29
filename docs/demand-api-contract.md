# Demand API Contract

This frontend does not train or batch-run the demand model. The backend owns
model training, feature generation, persistence, traffic/weather feature lookup,
and dispatch interpretation. The frontend requests the selected dong/date and
renders the backend response without calculating demand locally.

## Runtime Behavior

- Configure `NEXT_PUBLIC_DEMAND_API_ENDPOINT` to enable backend fetches.
- The frontend proxy accepts `YYYY-MM-DD` from the UI and forwards `YYYYMMDD`
  to the FastAPI demand endpoints.
- Selected-dong graph data comes from FastAPI `/api/demand/hourly`.
- All-dong heatmap data comes from FastAPI `/api/demand/daily`; if daily
  aggregation is temporarily unavailable, the frontend can fall back to hourly
  requests per target dong.
- If the endpoint is not configured, fails, or returns malformed data, the UI
  shows an API-required state. It does not synthesize local demand predictions.
- The backend value is treated as the actual hourly demand total for that
  dong. The frontend preserves that hourly total when generating 5-minute
  visualization slots.
- If the backend needs temporary random/sample demand, it should generate it
  deterministically from the request key (`dong + date`) so the same demo
  request renders identically on every client.

## Request

```text
GET {NEXT_PUBLIC_DEMAND_API_ENDPOINT}?dong=역삼1동&date=2026-05-21
GET {NEXT_PUBLIC_DEMAND_API_ENDPOINT}?scope=daily&date=2026-05-21
```

Query parameters:

- `dong`: required Korean administrative dong name. Current frontend options:
  `역삼1동`, `역삼2동`, `논현1동`, `논현2동`, `삼성1동`, `삼성2동`, `신사동`, `청담동`, `대치4동`.
- `date`: required local service date in `YYYY-MM-DD` at the frontend proxy;
  the backend receives `YYYYMMDD`.

## Required JSON Shape

Hourly response:

```json
{
  "dong": "역삼1동",
  "date": "20260521",
  "unit": "calls_per_hour",
  "generated": true,
  "points": [
    {
      "hour": 0,
      "population_pred": 18420,
      "demand_count": 133,
      "traffic_vph": 720,
      "weather_condition": "clear"
    },
    {
      "hour": 1,
      "population_pred": 17110,
      "demand_count": 116,
      "traffic_vph": 610,
      "weather_condition": "clear"
    }
  ]
}
```

Daily heatmap response:

```json
{
  "date": "20260521",
  "unit": "calls_per_hour",
  "demand": {
    "역삼1동": {
      "0": 575.4,
      "1": 145.2
    },
    "역삼2동": {
      "0": 420.1,
      "1": 131.8
    }
  }
}
```

## Field Meanings

- Top-level `dong`, `date`, and `unit`: echo the interpreted request and unit.
- `generated`: optional boolean. Use `true` while the backend is returning
  deterministic temporary/sample values instead of final model output.
- `points`: required hourly demand rows for the selected `dong` and `date`.
  24 hourly rows are preferred. The frontend accepts any valid subset and sorts
  by `hour`.
- `hour`: integer from `0` to `23`.
- `population_pred`: optional predicted living/floating population for that hour.
  `populationPred` and `population` are also accepted when supplied.
- `demand_count`: required backend taxi demand total for the hour. For
  compatibility, the frontend also accepts `demandCount`, `demand_pred`,
  `demandPred`, and `demand`.
- `traffic_vph`, `weather_condition`: optional compact per-hour context fields
  when the backend wants to expose chart/tool-tip context without repeating the
  full selected object on every row.

## 5-Minute Visualization Allocation

The map cannot render one object per real taxi call. The frontend therefore
uses a two-step display transform:

```text
hourly backend demand -> 12 equal 5-minute display slots -> scaled visual units
```

Rules:

- The 1-hour backend total is the source of truth.
- Each hour is split evenly into 12 five-minute display slots.
- The 12 generated 5-minute slots sum exactly to the backend hourly total.
- The generated 5-minute values are visualization display values, not
  independent model predictions or frontend statistical estimates.
- The 3D map scales those 5-minute values before rendering vehicles. The
  current frontend scale is approximately `1 visual taxi = 40 real calls`,
  with a one-object hint for nonzero demand and a cap at the simulator vehicle
  limit.

## Frontend Scope

The frontend renders this payload as:

- hourly demand line
- smoothed trend line
- peak-hour summary
- current 5-minute allocated demand
- scaled visual taxi count for the map
- selected-dong minimap highlight based on the returned curve
- all-dong or selected-dong heatmap from the daily demand response
- selected-dong 3D floor glow, road-corridor emphasis, and static context
  anchors for map presentation

Backend-owned work, including model training, feature tables, validation CSVs,
batch prediction artifacts, and dispatch policy, should live in the backend or
data repository.
