# Module 4: Dynamic Dispatch And Incentive Policy

This module converts predicted demand into a dispatch decision.

## Current Policy

The current preferred handoff is the fused pressure artifact:

```text
public/taxi-pressure/latest.json
```

It combines the future movement-demand proxy, future traffic-volume proxy,
predicted congestion/speed, and road accessibility into a ranked dispatch
priority score.

Legacy rule-based dispatch is still available through:

```text
imbalance_score = predicted_demand_score - supply_proxy_score
supply_proxy_score = inverse live road congestion/speed proxy
```

Then:

- high imbalance: recommend proactive relocation and stronger incentive
- medium imbalance: recommend light coverage
- watch: monitor and prepare light coverage
- low imbalance: hold position

This is deliberately simple because real KakaoT taxi GPS and driver acceptance
data are unavailable. Current Seoul citydata road congestion is treated as the
available supply-side proxy:

```text
less congestion / faster roads -> higher supply proxy
more congestion / slower roads -> lower supply proxy
```

This does not mean we know exact idle taxi counts. It means we estimate how easy
it is for taxis to cover demand in each dong.

## Spec Mapping

The original goal is dynamic dispatch and incentive policy. The current
repository implements the explainable prototype layer first:

- demand comes from `public/forecast/latest.json`;
- supply comes from `data/processed/traffic/citydata_dong_traffic_latest.json`;
- the output is a ranked dispatch decision list, not an operational optimizer.

This is enough to show how prediction results become service decisions, while
leaving real GPS, ETA, acceptance-rate, and incentive learning for later data
handoff.

## Command

```bash
npm run dispatch:plan
```

The command reads:

- `public/forecast/latest.json`
- `data/processed/traffic/citydata_dong_traffic_latest.json`

And writes:

- `public/dispatch-plan.json`

## Presentation Sentence

> We rank future dong-level movement demand from the model, estimate current
> coverability from live citydata road congestion, then prioritize dongs where
> predicted demand is high and road-based supply proxy is low.

See `../docs/spec-alignment.md` for the full capstone-spec comparison.

For the latest pressure model formula and live validation output, see
`../docs/taxi-pressure-model.md`.
