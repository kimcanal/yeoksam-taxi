# Demand API Contract

This frontend does not train or batch-run the demand model. The backend owns
model training, feature generation, persistence, traffic/weather feature lookup,
and dispatch interpretation. The frontend requests the selected dong/date and
renders the backend response without calculating demand locally.

## Runtime Behavior

- The default frontend proxy endpoint is `/api/demand`; it forwards to
  `http://localhost:2223/api/demand/*` unless `.env` overrides the backend URL.
- The frontend proxy accepts `YYYY-MM-DD` or `YYYYMMDD` from the UI and forwards
  strict `YYYYMMDD` to the FastAPI demand endpoints.
- Selected-dong graph data comes from FastAPI `/api/demand/hourly`.
- All-dong heatmap data comes from FastAPI `/api/demand/dong-daily`; if daily
  aggregation is temporarily unavailable, the frontend should surface the API
  error rather than synthesize local demand predictions.
- If the endpoint is not configured, fails, or returns malformed data, the UI
  shows an API-required state. It does not synthesize local demand predictions.
- The backend value is treated as the authoritative hourly demand proxy for
  that dong. The frontend renders it as a one-hour display slot and does not
  create independent short-interval demand predictions.
- If the backend needs temporary random/sample demand, it should generate it
  deterministically from the request key (`dong + date`) so the same demo
  request renders identically on every client.

## Request

```text
GET /api/demand?dong=역삼1동&date=2026-05-21
GET /api/demand?scope=daily&date=2026-05-21
```

Query parameters:

- `dong`: required Korean administrative dong name. Current frontend options:
  `역삼1동`, `역삼2동`, `논현1동`, `논현2동`, `삼성1동`, `삼성2동`, `신사동`, `청담동`, `대치4동`.
- `date`: required local service date in `YYYY-MM-DD` at the frontend proxy;
  the backend receives `YYYYMMDD`.

Backend URL defaults:

```env
BACKEND_DEMAND_API_URL=http://localhost:2223/api/demand/hourly
BACKEND_DEMAND_DAILY_API_URL=http://localhost:2223/api/demand/dong-daily
```

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
hourly backend demand -> one-hour display slot -> scaled visual vehicle agents
```

Rules:

- The 1-hour backend proxy total is the source of truth for visualization.
- The frontend keeps a single display slot per hour because the backend API is
  hourly.
- The generated display value is a visualization value, not an independent
  model prediction or frontend statistical estimate.
- The 3D map scales that hourly value before rendering vehicle agents. The
  current frontend scale starts from approximately
  `1 visual vehicle agent = 40 demand proxy calls`, with a one-object hint for
  nonzero demand and a cap at the simulator vehicle limit.

## Frontend Scope

The frontend renders this payload as:

- hourly demand line
- smoothed trend line
- peak-hour summary
- current hourly display-slot demand
- scaled visual vehicle-agent count for the map
- selected-dong minimap highlight based on the returned curve
- all-dong or selected-dong heatmap from the daily demand response
- selected-dong 3D floor glow, road-corridor emphasis, and static context
  anchors for map presentation

Backend-owned work, including model training, feature tables, validation CSVs,
batch prediction artifacts, and dispatch policy, should live in the backend or
data repository.
