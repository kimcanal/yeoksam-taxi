# Supply Model Next Steps

The current supply module is an evidence-constrained proxy, not a verified taxi
availability forecast. The biggest remaining gap is Korean supply-side ground
truth.

## Current Origin Of "Korean" Features

Grounded local inputs:

- Korean taxi-demand observations in `deploy/backend/data/actual_demand.csv`
- Gangnam/Yeoksam POI context in `deploy/backend/data/poi/gangnam_poi_kr.csv`
- Seoul Metro hourly station passenger spreadsheets in
  `deploy/backend/data/subway`
- Seoul traffic-volume spreadsheets in `deploy/backend/data/traffic_data`
- Gangnam weather history in `deploy/backend/data/weather_data/gangnam_weather.csv`
- Seoul Open Data Plaza as the public source family for Seoul traffic,
  transit, movement, and living-population features: <https://data.seoul.go.kr/>

Heuristic Korean operating prior:

- 22:00-04:00 is treated as a night taxi operation window.
- 23:00-02:00 receives the strongest matchable-supply friction.
- Friday/Saturday late-night pressure is represented only as metadata/scenario
  context. It is not a default multiplier because current local demand evidence
  is stronger for the 17-21 evening peak than for weekend late-night pressure.
- This prior is marked as `korea_policy_operating_prior_heuristic` because it is
  not directly calibrated from observed vehicle availability.

## Highest-Value Improvements

1. Add supply-side ground truth.
   - Best: taxi GPS availability, empty-car cruising, occupied/available state,
     or dispatch acceptance labels.
   - Good enough: Seoul taxi operation-rate by hour, corporate/private active
     vehicle counts, or platform aggregate supply indices.

2. Calibrate the Korean operating prior from data.
   - Replace fixed night factors with learned factors by hour, weekday,
     holiday, and weather.
   - Keep output fields `evidence_status` and `confidence_level` so the UI can
     tell whether a value is observed, estimated, or heuristic.

3. Separate demand pressure from supply availability.
   - Demand can explain where shortage pressure appears.
   - Supply should not be copied from demand; it needs independent road,
     operation-rate, driver, and policy signals.

4. Add backtesting.
   - Compare predicted shortage windows against observed failure proxies, such
     as high wait time, unserved calls, cancellation, or low acceptance.
   - Report MAE/RMSE for supply proxy only when ground truth exists; until then,
     report rank stability and sensitivity checks.

5. Add sensitivity scenarios.
   - `normal`
   - `rain_or_snow`
   - `friday_late_night`
   - `holiday`
   - `post_surcharge`

## Presentation-Safe Claim

Use:

> Supply is represented as a Seoul/Gangnam road-link and operations proxy. Korean
> local demand, POI, subway, traffic, weather, and an explicitly marked
> heuristic night-operation prior are used to quantify demand-supply imbalance.

Avoid:

> This is a validated Korean taxi supply forecast.
