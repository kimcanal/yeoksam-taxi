# Taxi Dispatch Pressure Model

This project does not have direct KakaoT taxi-call labels. The final dispatch
model therefore predicts a public-data proxy:

```text
1-hour-ahead dong-level taxi dispatch pressure
```

The score is not a taxi-call count. It is a ranked decision signal for where an
operator should watch, pre-position supply, or apply a light incentive.

## Inputs

The pressure model fuses three already reproducible forecasts:

- movement-demand proxy: `public/forecast/latest.json`
- road traffic and congestion forecast: `public/traffic-forecast/latest.json`
- current road observations from Seoul citydata:
  `data/processed/traffic/citydata_dong_traffic_latest.json`

The live cycle calls the public APIs first, then rebuilds all model-facing JSON
artifacts:

```bash
npm run model:live:demand-cycle
```

## Formula

The current v1 ensemble is intentionally explainable:

```text
taxi_pressure_score =
  0.52 * movement_demand_score
+ 0.20 * traffic_volume_score
+ 0.28 * congestion_pressure

congestion_pressure =
  1 - road_accessibility_score

road_accessibility_score =
  0.68 * (1 - predicted_congestion_score)
+ 0.32 * clamp(predicted_avg_speed_kmh / 35)

dispatch_priority_score =
  0.74 * taxi_pressure_score
+ 0.26 * max(0, movement_demand_score - road_accessibility_score)
```

Output:

```text
public/taxi-pressure/latest.json
```

The top region is the dong with the highest `dispatch_priority_score`.

## Validation

Each prediction is appended to:

```text
data/processed/live_validation/taxi_pressure_log.jsonl
```

The comparison script tries to match each forecast target hour with a later
Seoul citydata traffic snapshot:

```bash
npm run model:taxi-pressure:compare
```

Output:

```text
public/taxi-pressure-comparison.json
data/processed/live_validation/taxi_pressure_comparison.json
```

Because no taxi-call labels are available, this validation compares pressure
rankings against observed road congestion/speed. It is a live proxy validation,
not taxi-call accuracy.

## Presentation Wording

Use:

> We predict future movement demand, road traffic, and congestion separately,
> then fuse them into a dong-level taxi dispatch pressure score. Since direct
> taxi-call logs are unavailable, the model is evaluated as a public-data proxy
> using later observed citydata traffic signals.

Do not use:

> We directly predict KakaoT taxi calls.
