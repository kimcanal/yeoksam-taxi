# Module 3: Demand Prediction

The dashboard consumes model output through `public/forecast/latest.json`.

## Contract

See `docs/forecast-contract.md` for the exact JSON schema.

Before the external model is ready, demo files under
`public/forecast/examples/` can be copied to `public/forecast/latest.json`.
Those examples use `"source": "demo"` so the UI labels them as `데모 예측`.

When the model is ready, write:

```json
{
  "source": "model",
  "target_datetime": "2026-05-03T21:00:00+09:00",
  "weather": "rain",
  "generated_at": "2026-05-03T20:45:00+09:00",
  "regions": [
    { "dong_name": "역삼1동", "score": 0.93, "confidence": 0.82 }
  ]
}
```

## Scope Clarification

The original assignment asks for 5-minute taxi-call forecasts over the next
30 minutes. Because real KakaoT call logs are unavailable, this project presents
dong-level relative demand for selected future target times. The UI and JSON
contract can be extended to multiple horizons later.

For the current presentation deck, the model should be described as:

- `HistGradientBoostingRegressor`
- target: `target_transit_boardings_t_plus_1h`
- unit: 9 Gangnam dongs by datetime
- interpretation: public-transit-boardings-based movement-demand proxy

Do not describe the current model as a direct taxi-call forecast. It is a
1-hour-ahead proxy signal that can be swapped to real taxi-call targets when
those data become available.

## Evaluation Placeholder

The final model handoff should add:

- `metrics.json` with RMSE, MAE, and MAPE.
- actual-vs-predicted CSV or chart output.
- short explanation of training/validation/test time split.

See `../docs/spec-alignment.md` for the full capstone-spec comparison.
