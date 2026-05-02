# Data Directory

This directory keeps the capstone data pipeline explicit without committing
large or frequently changing raw files.

## Layout

- `raw/`: local API collection output. Ignored by git except `.gitkeep`.
- `processed/`: local preprocessing outputs. Ignored by git except `.gitkeep`.
- `samples/`: small committed sample inputs used for demos and reproducibility.

## Recommended Flow

```bash
npm run data:collect:citydata
npm run data:collect:weather
npm run data:features
npm run data:summary
npm run dispatch:plan
```

The dashboard should read small public summaries, not all raw samples:

- `public/data-summary.json`
- `public/feature-snapshot.json`
- `public/forecast/latest.json`
- `public/dispatch-plan.json`

This keeps the repository light while still making the data flow inspectable.
