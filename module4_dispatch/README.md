# Module 4: Dynamic Dispatch And Incentive Policy

This module converts predicted demand into a dispatch decision.

## Current Policy

```text
imbalance_score = predicted_demand_score / (idle_taxis + 1)
```

Then:

- high imbalance: recommend proactive relocation and stronger incentive
- medium imbalance: recommend light coverage
- low imbalance: monitor or hold position

This is deliberately simple because real KakaoT taxi GPS and driver acceptance
data are unavailable. The current 3D taxi distribution is treated as a supply
proxy until richer supply data exists.

## Spec Mapping

The original goal is dynamic dispatch and incentive policy. The current
repository implements the explainable prototype layer first:

- demand comes from `public/forecast/latest.json`;
- supply comes from `data/samples/supply-proxy.json` or simulated idle taxis;
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
- `data/samples/supply-proxy.json`

And writes:

- `public/dispatch-plan.json`

## Presentation Sentence

> We rank future dong-level demand from the model, estimate current supply with
> simulated idle taxis, then prioritize dongs where predicted demand is high and
> supply is low.

See `../docs/spec-alignment.md` for the full capstone-spec comparison.
