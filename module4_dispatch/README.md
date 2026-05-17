# Module 4: Dynamic Dispatch And Incentive Policy

This module converts predicted demand into a dispatch decision.

## Current Policy

The current preferred handoff is the fused pressure artifact:

```text
public/taxi-pressure/latest.json
```

It combines the future movement-demand proxy, future traffic-volume proxy,
predicted congestion/speed, and road accessibility into a ranked dispatch
priority score.

Legacy rule-based dispatch is still available through:

```text
imbalance_score = predicted_demand_score - supply_proxy_score
supply_proxy_score = inverse live road congestion/speed proxy
```

Then:

- high imbalance: recommend proactive relocation and stronger incentive
- medium imbalance: recommend light coverage
- watch: monitor and prepare light coverage
- low imbalance: hold position

This is deliberately simple because real KakaoT taxi GPS and driver acceptance
data are unavailable. Current Seoul citydata road congestion is treated as the
available supply-side proxy:

```text
less congestion / faster roads -> higher supply proxy
more congestion / slower roads -> lower supply proxy
```

This does not mean we know exact idle taxi counts. It means we estimate how easy
it is for taxis to cover demand in each dong.

## Spec Mapping

The original goal is dynamic dispatch and incentive policy. The current
repository implements the explainable prototype layer first:

- demand comes from `public/forecast/latest.json`;
- supply comes from `data/processed/traffic/citydata_dong_traffic_latest.json`;
- the output is a ranked dispatch decision list, not an operational optimizer.

This is enough to show how prediction results become service decisions, while
leaving real GPS, ETA, acceptance-rate, and incentive learning for later data
handoff.

## Command

```bash
npm run dispatch:plan
```

The command reads:

- `public/forecast/latest.json`
- `data/processed/traffic/citydata_dong_traffic_latest.json`

And writes:

- `public/dispatch-plan.json`

## Presentation Sentence

> We rank future dong-level movement demand from the model, estimate current
> coverability from live citydata road congestion, then prioritize dongs where
> predicted demand is high and road-based supply proxy is low.

See `../docs/spec-alignment.md` for the full capstone-spec comparison.

For the latest pressure model formula and live validation output, see
`../docs/taxi-pressure-model.md`.

## Python ML Backend

This repo now also includes a Python backend prototype:

```text
module4_dispatch/dynamic_dispatch_backend.py
```

It is aimed at the capstone-style backend handoff:

- generates 6 months of synthetic Gangnam 9-dong history
- trains demand and surge regressors
- estimates effective supply from current active supply, congestion, and short-trip acceptance
- serves a FastAPI endpoint for the Next.js frontend

### Why this is still a proxy

The model predicts:

- `actual_demand_volume`
- `optimal_surge_multiplier`

It does **not** learn true future idle taxi supply from labels, because real
driver GPS / availability logs are not in this repo. Instead, future
coverability is estimated from:

- current active supply
- short-trip ratio
- live congestion score
- AV night-window policy

That is the honest capstone-safe version of “supply-side prediction” with the
available data constraints.

### Train an artifact

```bash
.venv/bin/python module4_dispatch/dynamic_dispatch_backend.py
```

### Serve the API

Install backend dependencies first:

```bash
pip install fastapi uvicorn lightgbm xgboost pandas scikit-learn joblib
```

Then:

```bash
.venv/bin/python module4_dispatch/dynamic_dispatch_backend.py --serve --port 8010
```

### API contract

`POST /dispatch/policy`

Example request:

```json
{
  "timestamp": "2026-05-16T23:30:00+09:00",
  "dong_name": "역삼1동",
  "weather_temp": 18.2,
  "precipitation_mm": 4.1,
  "current_active_supply": 1120,
  "short_trip_ratio": 0.56,
  "live_congestion_score": 4.2
}
```

Example response:

```json
{
  "timestamp": "2026-05-16T23:30:00+09:00",
  "dong_name": "역삼1동",
  "predicted_demand_volume": 920,
  "estimated_effective_supply": 410,
  "predicted_imbalance_score": 1.2439,
  "recommended_surge_multiplier": 1.848,
  "driver_incentive_output_krw": 3600,
  "av_allocation_flag": true
}
```
