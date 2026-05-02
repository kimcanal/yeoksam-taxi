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
