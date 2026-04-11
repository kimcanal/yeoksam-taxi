# Dispatch Road-Network Review

## What We Have Now

- `public/roads.geojson` is the full rendered road geometry from OSM road features.
- `public/road-network.json` is a lighter directed routing graph derived from those roads.
- The routing graph already preserves:
  - node positions
  - directed segments
  - one-way flow
  - turn restrictions
  - road class
  - road width
  - road name
  - OSM `wayId`

This is enough for prototype dispatch, shortest-path work, route previews, and vehicle movement that stays on real road centerlines.

## New Dispatch-Oriented Metadata

The road-graph export and runtime graph now carry a few extra routing hints:

- Each segment stores a precomputed `travelCost` so shortest-path queries do not need to recompute cost multipliers every search step.
- Each node stores:
  - `outDegree`
  - `neighborCount`
  - `isIntersection`
  - `isTerminal`

These fields make it easier to distinguish between:

- corridor mid-block nodes that are good pickup/dropoff anchors
- dead-end or edge nodes that are poor service points
- larger intersections that may be routable but are awkward as curbside stops

## Pickup / Dropoff Hotspot Update

Taxi hotspot generation now uses the road graph itself when selecting service points along loop routes.

Instead of picking only by distance along the route, hotspot selection now penalizes nodes that are:

- terminal / dead-end style nodes
- larger intersections
- directly on signal nodes
- inside turning geometry instead of a straighter curb segment
- too tightly packed with adjacent route nodes

That keeps generated pickup and dropoff points closer to stable mid-block road positions, which is a better fit for later dispatch logic.

## What OSM Still Does Not Give Us Cleanly

OSM is good enough for a prototype road graph, but it is not a full dispatch-grade street operations dataset.

Still missing or weak:

- lane-level curb access rules
- reliable legal pickup/dropoff restrictions
- live traffic speed and delay data
- temporary closures, incidents, and construction
- detailed turn-pocket geometry
- taxi stand / curb reservation semantics

## Practical Takeaway

For the current simulator, OSM-derived roads are the right base layer for dispatch and routing work.

For a production dispatch system later, we would likely keep OSM as a geometry backbone and add:

- better ETA / speed layers
- curbside or stop-eligibility rules
- stronger map-matching around pickup and dropoff
- demand-aware scoring on top of the graph
