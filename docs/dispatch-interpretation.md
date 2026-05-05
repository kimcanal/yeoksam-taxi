# Dispatch Interpretation

The heatmap answers one question:

> Which dong is expected to have stronger future taxi demand?

The dispatch layer should answer the next question:

> Given that forecast, where should idle taxis be encouraged to move before
> demand appears?

## Minimal Dispatch Logic

For each dong:

```text
imbalance_score = predicted_demand_score - supply_proxy_score
supply_proxy_score = inverse live road congestion/speed proxy
```

Where:

- `predicted_demand_score` comes from `public/forecast/latest.json`.
- `supply_proxy_score` comes from
  `data/processed/traffic/citydata_dong_traffic_latest.json`.
- Higher congestion and lower road speed reduce the supply proxy because taxis
  are harder to reposition into that dong.

The simplest interpretation:

- high demand + low nearby taxi supply = dispatch priority
- high demand + enough traffic coverability = monitor only
- low demand + low coverability = do not spend scarce repositioning effort there

## Demo Narrative

Current demo scenario:

1. Current citydata shows live crowding, traffic, and weather around Gangnam
   Station, Yeoksam Station, Seolleung Station, and nearby POIs.
2. The heatmap shows the selected future target time.
3. The dispatch policy combines the predicted demand score with live road
   congestion to rank dongs by supply-demand imbalance.
4. The 3D road scene provides a visual explanation surface, not exact
   operational taxi GPS.

Recommended presentation sentence:

> We use Seoul citydata as the current context layer, then use the demand model
> output to rank future dong-level demand. Dispatch priority is defined by the
> gap between predicted demand and live road-based supply proxy.

## Current Limitations

- Current supply is a road coverability proxy, not real KakaoT vehicle
  availability.
- Seoul citydata POIs do not cover every dong evenly.
- Road traffic values can be missing or reported as category-only.
- Live forecasts may use pattern fallback when future exact feature rows are not
  available.

## What To Improve After Model Delivery

1. Map predicted dong demand to nearest road hotspots.
2. Count idle simulated taxis inside or near each dong when simulation state is
   available.
3. Show `demand`, `supply`, and `imbalance` side by side.
4. Animate idle taxis relocating toward the top imbalance dong.
5. Compare before/after with proxy metrics such as pickup wait time and
   coverage distance.
