# Local Evidence For Supply Proxy

This note records what can be defended from project-local Korean/Seoul/Gangnam
data. It should be used before citing international taxi papers.

## Actual Demand Sample

Source:

- `deploy/backend/data/actual_demand.csv`

Observed range:

- dates: `2026-03-02` to `2026-04-02`
- administrative dongs: 10
- rows: 7,680

Hourly demand index, normalized by the 24-hour mean:

| Hour | Index |
| --- | ---: |
| 00 | 0.107 |
| 01 | 0.021 |
| 02 | 0.017 |
| 03 | 0.014 |
| 04 | 0.029 |
| 05 | 0.125 |
| 06 | 0.313 |
| 07 | 0.767 |
| 08 | 1.169 |
| 09 | 0.993 |
| 10 | 0.773 |
| 11 | 0.835 |
| 12 | 0.963 |
| 13 | 1.063 |
| 14 | 1.194 |
| 15 | 1.408 |
| 16 | 1.685 |
| 17 | 2.570 |
| 18 | 3.483 |
| 19 | 2.164 |
| 20 | 1.469 |
| 21 | 1.323 |
| 22 | 1.070 |
| 23 | 0.447 |

Period summary:

| Period | Mean Index | Total Share |
| --- | ---: | ---: |
| 22-02 late night | 0.332 | 0.069 |
| 23-02 peak late night | 0.148 | 0.025 |
| 07-09 AM commute | 0.976 | 0.122 |
| 10-16 daytime | 1.132 | 0.330 |
| 17-21 evening | 2.202 | 0.459 |

Top demand hours:

| Hour | Calls |
| --- | ---: |
| 18 | 2,897,247 |
| 17 | 2,137,493 |
| 19 | 1,799,538 |
| 16 | 1,401,560 |
| 20 | 1,221,997 |
| 15 | 1,171,179 |
| 21 | 1,100,181 |
| 14 | 992,727 |

Top demand dongs:

| Dong | Calls |
| --- | ---: |
| 역삼1동 | 5,121,306 |
| 논현1동 | 3,568,310 |
| 대치4동 | 2,421,067 |
| 압구정동 | 2,158,126 |
| 삼성1동 | 2,035,824 |

## What This Supports

- The local demand data strongly supports an evening peak around 17-21,
  especially 18:00.
- It supports dong-level spatial imbalance, especially strong demand in
  역삼1동 and 논현1동.
- It supports using the demand model output as the primary pressure signal for
  gap calculation.

## What This Does Not Support

- It does not directly validate taxi supply.
- It does not validate available-vehicle counts, empty-car cruising, or driver
  acceptance.
- In this sample, Friday/Saturday late-night pressure is not strong enough to
  justify a default weekend late-night multiplier. Weekend late-night should be
  metadata or scenario analysis unless supply-side labels are added.

## Current Modeling Decision

- Keep night-operation friction as a heuristic supply-side scenario prior.
- Do not use weekend late-night pressure as a default numeric multiplier.
- Use `bounded_gap_index`, `confidence_level`, and `confidence_reasons` to
  prevent over-reading fragile low-demand or extreme-ratio hours.

## Presentation-Safe Claim

> The local Korean demand data supports evening and dong-level imbalance
> patterns. The supply side remains a proxy simulator, so the project quantifies
> imbalance rather than claiming verified supply forecasting.
