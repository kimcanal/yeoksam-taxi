# Notebooks

Place exploratory notebooks here when the model dataset is ready.

Suggested notebooks:

- `01_eda.ipynb`: dong/time/weather demand exploration.
- `02_feature_engineering.ipynb`: lag features, weather joins, and spatial
  indexing checks.
- `03_model_evaluation.ipynb`: actual-vs-predicted charts and metrics.
- `03_dong_demand_proxy_colab.py`: Colab-ready cell script for training the
  dong-hour movement-demand proxy model.

Keep large datasets out of notebooks. Store small reproducible samples under
`data/samples/` and local raw data under git-ignored `data/raw/`.

## Current Training Input

Upload this CSV to Colab:

```text
data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv
```

Recommended target:

```text
1-hour-ahead inbound_boardings_per_1k_pop
```

Interpretation:

```text
1시간 뒤 행정동별 유입 이동 수요 proxy
```

Local script equivalent:

```bash
npm run model:train:demand-proxy
```

Current outputs are written under:

```text
data/processed/model/
```
