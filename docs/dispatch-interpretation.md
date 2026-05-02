# Dispatch Interpretation

The heatmap answers one question:

> Which dong is expected to have stronger future taxi demand?

The dispatch layer should answer the next question:

> Given that forecast, where should idle taxis be encouraged to move before
> demand appears?

## Minimal Dispatch Logic

For each dong:

```text
imbalance_score = predicted_demand_score - current_supply_score
```

Where:

- `predicted_demand_score` comes from `public/forecast/latest.json`.
- `current_supply_score` is a proxy from the current 3D taxi distribution until
  real taxi GPS/supply data is available.

The simplest interpretation:

- high demand + low nearby taxi supply = dispatch priority
- high demand + enough taxi supply = monitor only
- low demand + high taxi supply = candidate source area for relocation

## Demo Narrative

Current demo scenario:

1. Current citydata shows live crowding, traffic, and weather around Gangnam
   Station, Yeoksam Station, Seolleung Station, and nearby POIs.
2. The heatmap shows the selected future target time.
3. Top demand dongs are interpreted as proactive idle-taxi coverage candidates.
4. The 3D road scene provides a visual supply proxy and dispatch explanation
   surface, not exact operational taxi GPS.

Recommended presentation sentence:

> We use Seoul citydata as the current context layer, then use the demand model
> output to rank future dong-level demand. Dispatch priority is defined by the
> gap between predicted demand and currently available simulated supply.

## Current Limitations

- Current supply is simulated, not real KakaoT vehicle availability.
- Seoul citydata POIs do not cover every dong evenly.
- Road traffic values can be missing or reported as category-only.
- Demo forecasts are placeholders until the external model writes
  `source: "model"` into `public/forecast/latest.json`.

## What To Improve After Model Delivery

1. Map predicted dong demand to nearest road hotspots.
2. Count idle simulated taxis inside or near each dong.
3. Show `demand`, `supply`, and `imbalance` side by side.
4. Animate idle taxis relocating toward the top imbalance dong.
5. Compare before/after with proxy metrics such as pickup wait time and
   coverage distance.
