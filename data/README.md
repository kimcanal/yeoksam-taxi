# Data Directory

This repo only keeps the small data needed to run the map product.

## Kept In Repo

- `config/`: runtime config such as POI target lists
- `samples/`: tiny committed demo inputs
- `raw/.gitkeep`, `processed/.gitkeep`: placeholders only

## Kept Out Of Repo

- raw archive downloads
- processed training tables
- local validation logs
- model artifacts used for experimentation

Those belong in ignored local folders or shared storage, not in the published
map repository.

## Current Rule

If a file is not required for:

1. rendering the deployed map,
2. serving the checked-in demo JSON, or
3. regenerating OSM geometry,

it should not live under this repo's `data/` tree.
