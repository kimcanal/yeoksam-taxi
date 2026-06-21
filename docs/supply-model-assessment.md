# Supply Model Assessment

`deploy/supply_api` is a presentation-facing supply proxy simulator. Treat it as an
OD/road-link supply proxy with demand-delta post-correction, not as a verified
live taxi supply forecast.

The demand and supply values should be interpreted as comparable model proxy
units. They are suitable for relative gaps, rankings, and hourly patterns, but
not as validated real-world taxi-call counts or available-vehicle counts.

The current module should be framed as a demand-supply imbalance quantification
layer. It compares demand model output with a road-link supply proxy on the same
model scale, then reports signed gap, shortage, surplus, coverage ratio, and
pressure ratio. Dynamic dispatch and driver incentive policy should remain a
separate downstream simulation layer.

Do not present the supply side as a trained ML forecasting model. It is a
rule-based proxy simulator built from aggregate road-link mean maps, Korean
local context features, and bounded demand-delta correction.

Because direct taxi availability, empty-car cruising, and driver acceptance
labels are not available in this repository, the supply side should be presented
as an evidence-constrained proxy. Its primary signals are Korean/Seoul/Gangnam
features already present in the project data; international papers are only
secondary methodological support. The absolute supply scale remains a simulation
calibration.

## What It Uses

- Road-link activity features from `supply_model.pkl.gz`, including month,
  weekday/day-code, hour, weather, and road-link count/mean maps.
- Dong allocation from `link_dong_mapping.csv` and
  `dong_supply_weights.json`.
- Korean project data used by the demand/supply context:
  - `deploy/backend/data/actual_demand.csv`
  - `deploy/backend/data/poi/gangnam_poi_kr.csv`
  - `deploy/backend/data/subway/*역별 시간대별 이용인원.xlsx`
  - `deploy/backend/data/traffic_data/교통량*.xlsx`
  - `deploy/backend/data/weather_data/gangnam_weather.csv`
- Demand API output as a bounded calibration signal. The implementation uses
  same-weekday demand deltas and caps rather than copying the demand curve
  directly.
- Korean taxi operating prior:
  - 22:00-04:00 is treated as a night taxi operation window.
  - 23:00-02:00 receives the strongest matchable-supply friction.
  - Friday/Saturday late-night pressure is exposed through metadata, but it is
    not used as a default numeric multiplier because the current local demand
    sample does not strongly support it.
  - The prior represents the net effect of night-surcharge incentives,
    private/corporate driver night-work friction, and optional weekend scenario
    pressure; it is not a measured live fleet count.
- Partial-day demand, such as today's demand before all 24 hours are available,
  is extrapolated from same-weekday baseline demand before scaling daily supply.
  Unobserved future hours keep the baseline supply pattern instead of being
  treated as zero demand.
- Hourly demand deltas are confidence-weighted and smoothed across neighboring
  hours, so post-corrected demand spikes do not directly become supply spikes.
- Supply endpoints can use `weather=auto`; the server resolves this from the
  demand model's hourly weather data and exposes the resolved code through
  `weather_meta`.
- Hand-authored temporal priors for matchable taxi supply and late-night /
  evening shortage patterns.
- Dedicated gap endpoints in `deploy/supply_api`, separate from incentive
  simulation:
  - `/api/gap/hourly`
  - `/api/gap/dong-hourly`
- Gap outputs include both raw ratios and more conservative presentation fields:
  - `bounded_gap_index`: `(demand_proxy - supply_proxy) / (demand_proxy + supply_proxy)`
  - `confidence_level`: `low` when low demand or extreme proxy ratios make
    shortage/surplus ratios fragile
  - `confidence_reasons`: short machine-readable caveats

## Confidence

The simulator is credible for demo-level relative patterns:

- comparing whether supply is lower or higher than demand by hour;
- showing late-night, commute, and evening shortage pressure;
- explaining how a dynamic dispatch or incentive layer would consume a
  demand-supply gap.
- producing a numeric imbalance index such as `demand_proxy - supply_proxy`,
  `shortage_ratio`, and `supply_coverage_ratio`.
- explaining that the model follows Korean local demand, Gangnam POI, Seoul
  subway, Seoul traffic, weather, and road-link tendencies, not live-vehicle
  ground truth.

It is not yet credible as an operational supply forecast:

- there is no direct validation against real taxi availability, GPS, driver
  acceptance, or empty-car cruising labels;
- the effective supply scale is calibrated with priors and demand totals;
- weather defaults to a coarse code unless the caller provides a stronger
  weather feature;
- dynamic incentive output is policy simulation, not a measured behavioral
  response model.
- the supply proxy is an idealized estimate calibrated for comparison, so it
  should not be presented as observed vehicle availability.
- train/validation/test split, model loss, and overfitting claims are not
  applicable to the supply proxy unless real supply labels are added.

## Evidence Basis

Primary local/Korean evidence:

- `actual_demand.csv`: Korean taxi-demand observations used by the project
  demand model.
- `gangnam_poi_kr.csv`: Gangnam/Yeoksam commercial, transit, and POI context.
- Seoul Metro hourly station passenger spreadsheets: Korean public-transit
  time-of-day patterns around nearby stations.
- Seoul traffic-volume spreadsheets: Seoul road-traffic time-of-day context.
- `gangnam_weather.csv` and live weather lookup: local weather context.
- Seoul Open Data Plaza is the public source family for Seoul living-population,
  metropolitan movement, subway, and traffic features. <https://data.seoul.go.kr/>
- Korean taxi operating prior: internal presentation prior for Seoul/Korean
  taxi characteristics, including night operation windows, driver work-pattern
  friction, and optional weekend late-night scenario pressure. This is marked as
  `korea_policy_operating_prior_heuristic` in the API metadata because it is a
  calibrated operating assumption, not direct vehicle-availability ground truth.
  It should be replaced or recalibrated if official Seoul taxi operation-rate,
  empty-car, GPS, or driver-supply data become available.
- `supply-local-evidence.md`: local `actual_demand.csv` supports a strong
  17-21 evening demand peak and dong-level imbalance, but does not validate
  weekend late-night supply pressure as a default multiplier.

Secondary methodological support, not direct Seoul validation:

- Zhang and Ghanem, "Demand, Supply, and Performance of Street-Hail Taxi"
  (2019): supports representing taxi demand and supply as dynamic road-network
  fields when detailed GPS data are available. <https://arxiv.org/abs/1909.12861>
- Davis, Raina, and Jagannathan, "Taxi Demand-Supply Forecasting" (2018):
  supports spatial partition choice and neighbor-aware demand-supply modeling.
  <https://arxiv.org/abs/1812.03699>
- Liu et al., "Contextualized Spatial-Temporal Network for Taxi OD Demand
  Prediction" (2019): supports OD, temporal, spatial, and weather context in
  taxi-demand modeling. <https://arxiv.org/abs/1905.06335>
- Toman et al., "Spatiotemporal Analysis of Ridesourcing and Taxi Demand"
  (2020): supports separating temporal effects from residual spatial
  dependence and land-use effects. <https://arxiv.org/abs/2008.00568>
- Schroder et al., "Anomalous supply shortages from dynamic pricing in
  on-demand mobility" (2020): motivates keeping imbalance measurement separate
  from dynamic-pricing or incentive claims. <https://arxiv.org/abs/2003.07736>

## Recommended Presentation Language

Use: `도로링크 기반 공급 프록시`, `수요-공급 gap 시뮬레이션`,
`수요-공급 불균형 정량화`, `공급 proxy 시뮬레이터`,
`배차 정책을 설명하기 위한 상대 비교선`.

Avoid: `실시간 택시 공급 예측`, `운영급 배차 최적화`,
`검증된 기사 반응 모델`, `실제 공급량 정답`, `학습된 공급 예측 모델`.
