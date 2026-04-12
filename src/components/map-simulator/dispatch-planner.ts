import * as THREE from "three";

export type DispatchHotspot = {
  id: string;
  nodeKey: string;
  point: THREE.Vector3;
  label: string;
  roadName: string | null;
};

export type DispatchGraph = {
  nodes: Map<string, { point: THREE.Vector3 }>;
};

export type DispatchRoute = {
  endKey: string;
};

export type DispatchRouteBuilder<TRoute extends DispatchRoute> = (
  start: string,
  end: string,
  id: string,
  label: string | null,
) => TRoute | null;

export type DispatchAssignment<
  TRoute extends DispatchRoute,
  THotspot extends DispatchHotspot,
> = {
  pickupHotspot: THotspot;
  dropoffHotspot: THotspot;
  pickupRoute: TRoute;
};

export type DispatchDemandSnapshot = {
  elapsedTimeSeconds: number;
  completedTrips: number;
  hotspotCount: number;
  activePickupsByHotspotId: ReadonlyMap<string, number>;
  activeDropoffsByHotspotId: ReadonlyMap<string, number>;
};

export type DispatchPlanningRequest = {
  startKey: string;
  seed: number;
  vehicleId: string;
  demandSnapshot: DispatchDemandSnapshot;
};

export type DispatchPlannerContext<
  TRoute extends DispatchRoute,
  THotspot extends DispatchHotspot,
> = {
  hotspots: THotspot[];
  graph: DispatchGraph;
  routeBuilder: DispatchRouteBuilder<TRoute>;
};

export type DispatchPlannerSession<
  TRoute extends DispatchRoute,
  THotspot extends DispatchHotspot,
> = {
  planJob: (
    request: DispatchPlanningRequest,
  ) => DispatchAssignment<TRoute, THotspot> | null;
};

export type DispatchPlanner<
  TRoute extends DispatchRoute,
  THotspot extends DispatchHotspot,
> = {
  id: string;
  createSession: (
    context: DispatchPlannerContext<TRoute, THotspot>,
  ) => DispatchPlannerSession<TRoute, THotspot>;
};

export type DispatchPlannerRegistry<
  TRoute extends DispatchRoute,
  THotspot extends DispatchHotspot,
> = {
  defaultPlannerId: string;
  availablePlannerIds: string[];
  getPlanner: (
    plannerId?: string | null,
  ) => DispatchPlanner<TRoute, THotspot>;
  createSession: (options: {
    plannerId?: string | null;
    context: DispatchPlannerContext<TRoute, THotspot>;
  }) => {
    plannerId: string;
    session: DispatchPlannerSession<TRoute, THotspot>;
    usedFallback: boolean;
  };
};

type RankedHotspot<THotspot extends DispatchHotspot> = {
  hotspot: THotspot;
  distance: number;
};

const MIN_PREFERRED_DROPOFF_DISTANCE = 26;
const MAX_PICKUP_POOL_SIZE = 12;
const MAX_PICKUP_ATTEMPTS = 18;

export function createDispatchPlannerRegistry<
  TRoute extends DispatchRoute,
  THotspot extends DispatchHotspot,
>(
  planners: DispatchPlanner<TRoute, THotspot>[],
  defaultPlannerId?: string,
): DispatchPlannerRegistry<TRoute, THotspot> {
  if (!planners.length) {
    throw new Error("At least one dispatch planner must be registered");
  }

  const plannerById = new Map<string, DispatchPlanner<TRoute, THotspot>>();
  planners.forEach((planner) => {
    if (plannerById.has(planner.id)) {
      throw new Error(`Duplicate dispatch planner id: ${planner.id}`);
    }
    plannerById.set(planner.id, planner);
  });

  const fallbackPlanner = defaultPlannerId
    ? plannerById.get(defaultPlannerId) ?? null
    : planners[0]!;
  if (!fallbackPlanner) {
    throw new Error(
      `Unknown default dispatch planner id: ${defaultPlannerId ?? "unknown"}`,
    );
  }

  const getPlanner = (plannerId?: string | null) =>
    plannerById.get(plannerId ?? fallbackPlanner.id) ?? fallbackPlanner;

  return {
    defaultPlannerId: fallbackPlanner.id,
    availablePlannerIds: planners.map((planner) => planner.id),
    getPlanner,
    createSession({ plannerId, context }) {
      const planner = getPlanner(plannerId);
      return {
        plannerId: planner.id,
        session: planner.createSession(context),
        usedFallback: Boolean(plannerId) && planner.id !== plannerId,
      };
    },
  };
}

function rankHotspotsByDistance<THotspot extends DispatchHotspot>(
  origin: THREE.Vector3,
  hotspots: THotspot[],
  predicate: (hotspot: THotspot) => boolean,
  descending = false,
) {
  const ranked: RankedHotspot<THotspot>[] = [];

  for (let index = 0; index < hotspots.length; index += 1) {
    const hotspot = hotspots[index]!;
    if (!predicate(hotspot)) {
      continue;
    }
    ranked.push({
      hotspot,
      distance: hotspot.point.distanceTo(origin),
    });
  }

  ranked.sort((left, right) =>
    descending
      ? right.distance - left.distance
      : left.distance - right.distance,
  );

  return ranked;
}

export function createHeuristicDispatchPlanner<
  TRoute extends DispatchRoute,
  THotspot extends DispatchHotspot,
>(): DispatchPlanner<TRoute, THotspot> {
  return {
    id: "heuristic-default",
    createSession({
      hotspots,
      graph,
      routeBuilder,
    }: DispatchPlannerContext<TRoute, THotspot>) {
      const orderedPickupsByStartKey = new Map<string, THotspot[]>();
      const preferredDropsByPickupId = new Map<string, THotspot[]>();
      const fallbackDropsByPickupId = new Map<string, THotspot[]>();

      for (let index = 0; index < hotspots.length; index += 1) {
        const pickup = hotspots[index]!;
        const rankedDrops = rankHotspotsByDistance(
          pickup.point,
          hotspots,
          (hotspot) =>
            hotspot.id !== pickup.id && hotspot.nodeKey !== pickup.nodeKey,
          true,
        );

        preferredDropsByPickupId.set(
          pickup.id,
          rankedDrops
            .filter((entry) => entry.distance > MIN_PREFERRED_DROPOFF_DISTANCE)
            .map((entry) => entry.hotspot),
        );
        fallbackDropsByPickupId.set(
          pickup.id,
          rankedDrops.map((entry) => entry.hotspot),
        );
      }

      const orderedPickupsForStartKey = (startKey: string) => {
        const cached = orderedPickupsByStartKey.get(startKey);
        if (cached) {
          return cached;
        }

        const originPoint = graph.nodes.get(startKey)?.point ?? null;
        if (!originPoint) {
          orderedPickupsByStartKey.set(startKey, []);
          return [];
        }

        const rankedPickups = rankHotspotsByDistance(
          originPoint,
          hotspots,
          (hotspot) => hotspot.nodeKey !== startKey,
        );
        const pickupPool = rankedPickups.slice(
          1,
          Math.min(rankedPickups.length, MAX_PICKUP_POOL_SIZE),
        );
        const orderedPickups = (pickupPool.length ? pickupPool : rankedPickups).map(
          (entry) => entry.hotspot,
        );

        orderedPickupsByStartKey.set(startKey, orderedPickups);
        return orderedPickups;
      };

      return {
        planJob({ startKey, seed, vehicleId }: DispatchPlanningRequest) {
          const orderedPickups = orderedPickupsForStartKey(startKey);
          if (!orderedPickups.length) {
            return null;
          }

          for (
            let attempt = 0;
            attempt < Math.min(orderedPickups.length * 2, MAX_PICKUP_ATTEMPTS);
            attempt += 1
          ) {
            const pickup =
              orderedPickups[(seed + attempt * 3) % orderedPickups.length]!;
            const orderedDrops =
              preferredDropsByPickupId.get(pickup.id)?.length
                ? preferredDropsByPickupId.get(pickup.id)!
                : (fallbackDropsByPickupId.get(pickup.id) ?? []);

            if (!orderedDrops.length) {
              continue;
            }

            const dropoff =
              orderedDrops[(seed * 2 + attempt) % orderedDrops.length]!;
            const pickupRoute = routeBuilder(
              startKey,
              pickup.nodeKey,
              `${vehicleId}-pickup-${seed}-${attempt}`,
              pickup.roadName ?? pickup.label,
            );
            const dropRoute = routeBuilder(
              pickup.nodeKey,
              dropoff.nodeKey,
              `${vehicleId}-drop-validate-${seed}-${attempt}`,
              dropoff.roadName ?? dropoff.label,
            );

            if (pickupRoute && dropRoute) {
              return {
                pickupHotspot: pickup,
                dropoffHotspot: dropoff,
                pickupRoute,
              };
            }
          }

          return null;
        },
      };
    },
  };
}
