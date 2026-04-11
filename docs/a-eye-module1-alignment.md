# A-Eye Module 1 Alignment

## Why This Repo Exists

`A-Eye` currently keeps one active implementation path:

- `Yeoksam 3x3 micro area`
- `5-minute synthetic demand`
- `rule-based dispatch`
- `before / after SUMO export`

That baseline is still the main evaluation path for dispatch comparison.

This repo exists as the spatial companion to that baseline:

- a `Module 1` style digital-twin viewer
- a real-map geometry layer around Gangnam Station
- a place to validate how roads, signals, curbside pickup/dropoff, and scene readability feel before richer data overlays are added

## Why 9 Dongs Instead of 3x3 Cells

The active `A-Eye` docs define the capstone as a `Gangnam Station micro-area digital twin prototype`.

Using 9 real administrative dongs is a better fit for this viewer because it:

- stays inside the same Gangnam Station micro-area story
- maps cleanly to real OSM administrative boundaries
- makes road, building, signal, and curbside context easier to explain
- gives a natural target for later dong-level CSV features

The simplified `3x3` layout is still useful for compact dispatch comparison and zone-level modeling.

The two layers are therefore complementary:

- `3x3`: simplified dispatch-evaluation layer
- `9 dongs`: spatial digital-twin layer

## Why OSM Matters In This Context

OSM is not being used here as a random map source.

It matters specifically because `A-Eye` needs a believable spatial backbone for:

- road-aligned taxi motion
- pickup and dropoff placement
- signal-aware intersection behavior
- non-road area separation
- station-area presentation around the Gangnam core

For this scope, OSM is a strong prototype geometry source because it gives:

- administrative boundaries
- road centerlines
- one-way flow
- turn restrictions
- traffic signal anchors
- buildings and non-road polygons

That is enough to support a micro-area digital-twin presentation layer.

## What This Repo Should Claim

This repo can claim:

- a `Gangnam Station micro-area` digital-twin companion for `A-Eye`
- a `9-dong OSM` spatial layer for Module 1 style presentation
- prototype-grade road, signal, and curbside reasoning on top of real geometry

This repo should not claim:

- full Gangnam digital twin
- full Seoul traffic replication
- dispatch-grade legal curbside or lane-rule authority
- replacement of the active SUMO baseline

## Practical Integration Rule

The recommended interpretation going forward is:

- keep `A-Eye` baseline evaluation on the existing simplified SUMO path
- keep this repo focused on realistic spatial presentation and road-level behavior
- add future demand/dispatch overlays in a way that can still aggregate back to simpler project zones when needed
