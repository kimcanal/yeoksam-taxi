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

## Current Training Path

The current model-ready training table is:

```text
data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv
```

Recommended target:

```text
target_inbound_boardings_per_1k_pop_t_plus_1h
```

Meaning:

```text
1시간 뒤 행정동별 유입 이동 수요를 생활인구 1,000명 기준으로 예측
```

Colab-friendly cell script:

```text
notebooks/03_dong_demand_proxy_colab.py
```

Local reproducible training command:

```bash
npm run model:train:demand-proxy
```

Outputs:

- `data/processed/model/dong_demand_proxy_metrics.json`
- `data/processed/model/dong_demand_proxy_predictions_2025.csv`
- `data/processed/model/dong_demand_proxy_feature_importance.json`
- `data/processed/model/dong_demand_proxy_model.joblib`
- `data/processed/model/forecast_latest_model_backtest.json`

Current test metrics:

| Model | R2 | MAE | RMSE | MAPE |
| --- | ---: | ---: | ---: | ---: |
| HistGradientBoostingRegressor | 0.9888 | 2.5301 | 5.6787 | 21.49% |
| persistence baseline | 0.6156 | 13.5306 | 33.3253 | 63.25% |

Top permutation-importance features in the current run:

1. `net_inbound_boardings_per_1k_pop`
2. `hour`
3. `inbound_boardings_per_1k_pop`
4. `dong_area_m2`
5. `inbound_boardings`

To replace the dashboard forecast JSON after validating metrics:

```bash
npm run model:train:demand-proxy -- --write-public-forecast
```

## Future Prediction Note

The trained model can predict future demand proxy only when future feature rows
are available. Some features are known ahead of time, while others need
forecasts or assumptions:

- known ahead: hour, weekday, holiday, dong POI/static features
- forecastable: weather
- must be supplied/estimated: future traffic proxy, future living population,
  future public-transit OD/current lag features

For a 1-hour-ahead demo, use the latest observed movement/traffic features plus
future calendar and weather forecast. For multi-hour forecasts, create future
feature rows from historical time-of-week averages or a separate nowcasting
pipeline.

## Current Fusion Handoff

The demand model is now one input to the final taxi dispatch pressure proxy.
Run the live cycle to collect API data, predict demand, predict traffic, fuse
the results, and write validation logs:

```bash
npm run model:live:demand-cycle
```

The fusion output is:

```text
public/taxi-pressure/latest.json
```

See `../docs/taxi-pressure-model.md` for the formula and validation contract.
