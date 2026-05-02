# Forecast Contract

This dashboard can run before the external demand model is ready. Until then,
`public/forecast/latest.json` may contain a demo forecast with `"source": "demo"`.
When the model output is ready, replace that file with the same shape and set
`"source": "model"` or omit `source`.

## Runtime Behavior

- If `public/forecast/latest.json` exists and has at least one region, the
  heatmap reads that file.
- If the file is absent, empty, or malformed, the dashboard falls back to the
  bundled sample forecast snapshots.
- `source: "demo"` is shown as `데모 예측` so it is not confused with the
  final model result.

## Required JSON Shape

```json
{
  "source": "model",
  "target_datetime": "2026-05-02T21:00:00+09:00",
  "weather": "clear",
  "generated_at": "2026-05-02T20:45:00+09:00",
  "regions": [
    { "dong_name": "역삼1동", "score": 0.94, "confidence": 0.81 },
    { "dong_name": "논현1동", "score": 0.71, "confidence": 0.76 }
  ]
}
```

## Field Meanings

- `source`: optional. Use `demo` for placeholder output and `model` for actual
  model output.
- `target_datetime`: forecast target time in ISO 8601 with timezone.
- `weather`: weather condition used by the model. Recommended values are
  `clear`, `rain`, or `snow`.
- `generated_at`: when the forecast was produced.
- `regions`: one row per heatmap dong.
- `dong_name`: must match one of the 9 dashboard dongs:
  `역삼1동`, `역삼2동`, `논현1동`, `논현2동`, `삼성1동`, `삼성2동`, `신사동`,
  `청담동`, `대치4동`.
- `score`: normalized relative demand, `0` to `1`.
- `confidence`: model confidence, `0` to `1`.

## Real-Time API Role

The Seoul citydata API is useful and acceptable here, but it should be described
as a current-situation layer, not as future demand itself.

Use it for:

- current live population around major POIs
- crowding level
- traffic status
- observed weather context

Do not claim it directly provides:

- future taxi calls
- all dong-level demand
- exact taxi supply
- full road speed coverage

For future demand, the model should combine current citydata context with time,
weather forecast, historical or transferred demand patterns, and any available
dong-level mobility features.
