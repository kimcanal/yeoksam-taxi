import * as THREE from "three";
import { buildEnvironmentState } from "@/components/map-simulator/environment";
import {
  INTERSECTION_BOX_ENTRY_LOOKAHEAD,
  INTERSECTION_BOX_OCCUPANCY_RADIUS_SQ,
  INTERSECTION_EXIT_BLOCK_SPEED,
  INTERSECTION_EXIT_QUEUE_RADIUS_SQ,
  INTERSECTION_OCCUPANCY_LOOKAHEAD,
  INTERSECTION_SIGNAL_LOOKAHEAD,
  SIGNAL_RADIUS_SQ,
  SIMULATION_STATS_UPDATE_INTERVAL,
  TRAFFIC_ROUTE_REENTRY_DISTANCE,
} from "@/components/map-simulator/scene";
import {
  createSignalApproachDemand,
  createSignalApproachDistance,
  createSignalAxisOccupancy,
  createSignalDirectionalOccupancy,
  canVehicleProceed,
  signalState,
  signalDirectionForVector,
  dominantAxisForHeading,
  approachDirectionForHeading,
  opposingSignalDirection,
} from "@/components/map-simulator/signal";
import {
  addVehicleSampleToBucket,
  clampRouteDistance,
  clearVehicleSampleBuckets,
  copyVehicleMotionState,
  createVehicleSimulationSample,
  resolveNextStopInto,
  syncVehicleSampleBucket,
  vehicleProximityCellCoord,
} from "@/components/map-simulator/road";
import { limitSpeedForNearbyVehicles } from "@/components/map-simulator/simulation";
import {
  castLocalVehicleForMotion,
  type LocalVehicle,
  type LocalVehicleProximityBuckets,
  type LocalVehicleSimulationSample,
} from "@/components/map-simulator/simulation";
import {
  createLocalTaxiVehicle,
  createLocalTrafficVehicle,
} from "@/components/map-simulator/simulation";
import {
  type SignalApproachDemand,
  type SignalApproachDistance,
  type SignalAxisOccupancy,
  type SignalData,
  type SignalDirectionalOccupancy,
  type SignalFlow,
  type Stats,
} from "@/components/map-simulator/types";
import {
  assignVehicleRoute,
  updateVehicleMotionState,
} from "@/components/map-simulator/vehicle";
import {
  cloneVehiclePoseSnapshot,
  createEmptySimulationSnapshot,
  DEFAULT_SIMULATION_CLOCK,
} from "@/components/map-simulator/simulation";
import type {
  HotspotSnapshot,
  SceneStaticContext,
  SignalSnapshot,
  SimulationConfig,
  SimulationSource,
  VehicleSnapshot,
} from "@/components/map-simulator/simulation";

const ROUTE_END_SLOWDOWN_DISTANCE = 18;
const ROUTE_END_SWITCH_DISTANCE = 1.5;

export function createLocalSimulationSource(): SimulationSource {
  let staticContext: SceneStaticContext | null = null;
  let configState: SimulationConfig = {
    taxiCount: 0,
    trafficCount: 0,
    clock: DEFAULT_SIMULATION_CLOCK,
  };
  let elapsedTimeSeconds = 0;
  let latestStats = createEmptySimulationSnapshot().stats;
  let latestSnapshot = createEmptySimulationSnapshot();
  let snapshotDirty = true;
  let activeVehicleSpeedMultiplier = 1;
  let statsAccumulator = 0;

  const vehicles: LocalVehicle[] = [];
  const taxiVehicles: LocalVehicle[] = [];
  const trafficVehicles: LocalVehicle[] = [];
  const taxiById = new globalThis.Map<string, LocalVehicle>();
  const frameSignalStates = new globalThis.Map<string, SignalFlow>();
  const intersectionOccupancy = new globalThis.Map<string, SignalAxisOccupancy>();
  const intersectionApproachDemand = new globalThis.Map<string, SignalApproachDemand>();
  const intersectionApproachDistance = new globalThis.Map<
    string,
    SignalApproachDistance
  >();
  const intersectionExitOccupancy = new globalThis.Map<
    string,
    SignalDirectionalOccupancy
  >();
  const proximityBuckets: LocalVehicleProximityBuckets = new globalThis.Map();
  const vehicleSimulationSamples: LocalVehicleSimulationSample[] = [];

  let signalById = new globalThis.Map<string, SignalData>();

  const ensureSignalStateMaps = () => {
    staticContext?.signals.forEach((signal) => {
      if (!intersectionApproachDemand.has(signal.id)) {
        intersectionApproachDemand.set(signal.id, createSignalApproachDemand());
      }
      if (!intersectionApproachDistance.has(signal.id)) {
        intersectionApproachDistance.set(signal.id, createSignalApproachDistance());
      }
      if (!intersectionOccupancy.has(signal.id)) {
        intersectionOccupancy.set(signal.id, createSignalAxisOccupancy());
      }
      if (!intersectionExitOccupancy.has(signal.id)) {
        intersectionExitOccupancy.set(signal.id, createSignalDirectionalOccupancy());
      }
    });
  };

  const buildStatsSnapshot = (
    waitingVehicles: number,
    activeTrips: number,
  ): Stats => ({
    taxis: taxiVehicles.length,
    traffic: trafficVehicles.length,
    waiting: waitingVehicles,
    signals: staticContext?.signals.length ?? 0,
    activeTrips,
    completedTrips: 0,
    pedestrians: 0,
    pickups: 0,
    dropoffs: 0,
    activeCalls: 0,
    avgPickupWaitSeconds: 0,
    avgRideSeconds: 0,
  });

  const pickNextTrafficRoute = (currentRouteId: string, vehicleIndex: number) => {
    const routePool =
      staticContext?.trafficRoutePool.length
        ? staticContext.trafficRoutePool
        : staticContext?.taxiRoutePool ?? [];
    if (!routePool.length) {
      return null;
    }

    const seed =
      Math.floor(elapsedTimeSeconds * 0.6) + vehicleIndex * 7;
    for (
      let offset = 0;
      offset < routePool.length;
      offset += 1
    ) {
      const route =
        routePool[
          (seed + offset + routePool.length) %
            routePool.length
        ]!;
      if (
        routePool.length === 1 ||
        route.id !== currentRouteId
      ) {
        return route;
      }
    }

    return routePool[seed % routePool.length]!;
  };

  const resetMetrics = () => {
    statsAccumulator = 0;
    latestStats = buildStatsSnapshot(0, 0);
  };

  const clearVehicleLayer = () => {
    vehicles.length = 0;
    taxiVehicles.length = 0;
    trafficVehicles.length = 0;
    taxiById.clear();
    clearVehicleSampleBuckets(proximityBuckets);
    vehicleSimulationSamples.length = 0;
    resetMetrics();
  };

  const rebuildVehicleLayer = (nextTaxiCount: number, nextTrafficCount: number) => {
    const taxiRoutePool =
      staticContext?.trafficRoutePool.length
        ? staticContext.trafficRoutePool
        : staticContext?.taxiRoutePool ?? [];
    if (!staticContext || !taxiRoutePool.length) {
      clearVehicleLayer();
      return;
    }

    clearVehicleLayer();

    for (let index = 0; index < nextTaxiCount; index += 1) {
      const route = taxiRoutePool[index % taxiRoutePool.length]!;
      const vehicle = createLocalTaxiVehicle({
        index,
        totalCount: nextTaxiCount,
        route,
      });
      vehicles.push(vehicle);
      taxiVehicles.push(vehicle);
      taxiById.set(vehicle.id, vehicle);
    }

    for (let index = 0; index < nextTrafficCount; index += 1) {
      const route =
        staticContext.trafficRoutePool[index % staticContext.trafficRoutePool.length]!;
      const vehicle = createLocalTrafficVehicle({
        index,
        totalCount: nextTrafficCount,
        route,
      });
      vehicles.push(vehicle);
      trafficVehicles.push(vehicle);
    }

    latestStats = buildStatsSnapshot(0, 0);
  };

  const refreshSignalFlows = () => {
    if (!staticContext) {
      frameSignalStates.clear();
      return;
    }
    ensureSignalStateMaps();
    frameSignalStates.clear();
    staticContext.signals.forEach((signal) => {
      frameSignalStates.set(signal.id, signalState(signal, elapsedTimeSeconds));
    });
  };

  const syncEnvironmentMultiplier = () => {
    if (!staticContext) {
      activeVehicleSpeedMultiplier = 1;
      return;
    }
    activeVehicleSpeedMultiplier = buildEnvironmentState(
      configState.clock.dateIso,
      configState.clock.minutes,
      configState.clock.weatherMode,
      staticContext.center,
    ).vehicleSpeedMultiplier;
  };

  const updateVehicles = (deltaSeconds: number) => {
    if (!staticContext || !vehicles.length) {
      clearVehicleSampleBuckets(proximityBuckets);
      latestStats = buildStatsSnapshot(0, 0);
      return;
    }

    intersectionOccupancy.forEach((target) => {
      target.ns = 0;
      target.ew = 0;
    });
    intersectionApproachDemand.forEach((target) => {
      target.north.left = 0;
      target.north.straight = 0;
      target.north.right = 0;
      target.east.left = 0;
      target.east.straight = 0;
      target.east.right = 0;
      target.south.left = 0;
      target.south.straight = 0;
      target.south.right = 0;
      target.west.left = 0;
      target.west.straight = 0;
      target.west.right = 0;
    });
    intersectionApproachDistance.forEach((target) => {
      target.north = Number.POSITIVE_INFINITY;
      target.east = Number.POSITIVE_INFINITY;
      target.south = Number.POSITIVE_INFINITY;
      target.west = Number.POSITIVE_INFINITY;
    });
    intersectionExitOccupancy.forEach((target) => {
      target.north = 0;
      target.east = 0;
      target.south = 0;
      target.west = 0;
    });
    clearVehicleSampleBuckets(proximityBuckets);

    for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
      const vehicle = vehicles[vehicleIndex]!;
      copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
    }

    for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
      const vehicle = vehicles[vehicleIndex]!;
      let sample = vehicleSimulationSamples[vehicleIndex];
      if (!sample) {
        sample = createVehicleSimulationSample(vehicle);
        vehicleSimulationSamples[vehicleIndex] = sample;
      } else {
        sample.vehicle = vehicle;
        sample.motion = vehicle.motion;
      }

      const nextStopState = resolveNextStopInto(
        vehicle.route,
        vehicle.distance,
        sample.nextStopState,
        vehicle.motion.nextStopIndex,
      );
      vehicle.motion.nextStopIndex = nextStopState.index;
      vehicle.currentSignalId = null;

      const stop = nextStopState.stop;
      const signal = stop?.signal ?? null;
      if (signal && stop) {
        const signalDistanceSq = sample.motion.position.distanceToSquared(signal.point);
        if (signalDistanceSq < SIGNAL_RADIUS_SQ) {
          vehicle.currentSignalId = signal.id;
        }
        if (nextStopState.ahead < INTERSECTION_SIGNAL_LOOKAHEAD) {
          const approachDemand = intersectionApproachDemand.get(signal.id)!;
          const approachDistance = intersectionApproachDistance.get(signal.id)!;
          const approachDirection = approachDirectionForHeading(vehicle.motion.heading);
          approachDemand[approachDirection][stop.turn] += 1;
          if (stop.turn === "straight" || stop.turn === "right") {
            approachDistance[approachDirection] = Math.min(
              approachDistance[approachDirection],
              nextStopState.ahead,
            );
          }
        }
      }

      if (vehicle.currentSignalId) {
        const currentSignal = signalById.get(vehicle.currentSignalId) ?? null;
        const currentSignalDistanceSq =
          currentSignal?.point.distanceToSquared(sample.motion.position) ??
          Number.POSITIVE_INFINITY;
        if (
          currentSignal &&
          currentSignalDistanceSq < INTERSECTION_BOX_OCCUPANCY_RADIUS_SQ
        ) {
          const claim = intersectionOccupancy.get(currentSignal.id)!;
          const movementAxis = dominantAxisForHeading(vehicle.motion.heading);
          claim[movementAxis] += 1;
        }
        const isQueuedPastIntersection =
          currentSignal &&
          currentSignalDistanceSq < INTERSECTION_EXIT_QUEUE_RADIUS_SQ &&
          vehicle.speed < INTERSECTION_EXIT_BLOCK_SPEED &&
          nextStopState.stop?.signalId !== currentSignal.id;
        if (currentSignal && isQueuedPastIntersection) {
          const exitClaim = intersectionExitOccupancy.get(currentSignal.id)!;
          const travelDirection = signalDirectionForVector(vehicle.motion.heading);
          exitClaim[travelDirection] += 1;
        }
      }

      sample.proximityCellX = vehicleProximityCellCoord(
        sample.motion.lanePosition.x,
      );
      sample.proximityCellZ = vehicleProximityCellCoord(
        sample.motion.lanePosition.z,
      );
      addVehicleSampleToBucket(proximityBuckets, sample);
    }

    let waitingVehicles = 0;
    let activeTrips = 0;

    for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
      const vehicle = vehicles[vehicleIndex]!;
      const current = vehicleSimulationSamples[vehicleIndex]!;
      let nextStopState = current.nextStopState;
      let targetSpeed = vehicle.baseSpeed * activeVehicleSpeedMultiplier;
      let holdPosition = false;

      if (vehicle.serviceTimer > 0) {
        vehicle.serviceTimer = Math.max(0, vehicle.serviceTimer - deltaSeconds);
        targetSpeed = 0;
        holdPosition = true;
        waitingVehicles += 1;
      }

      if (!holdPosition) {
        targetSpeed = limitSpeedForNearbyVehicles({
          vehicle,
          current,
          targetSpeed,
          proximityBuckets,
        });
      }

      if (
        !holdPosition &&
        nextStopState.stop &&
        nextStopState.ahead < INTERSECTION_SIGNAL_LOOKAHEAD
      ) {
        const signal = nextStopState.stop.signal;
        if (signal) {
          const state = frameSignalStates.get(signal.id) ?? signalState(signal, elapsedTimeSeconds);
          const occupancyState = intersectionOccupancy.get(signal.id);
          const approachDemandState = intersectionApproachDemand.get(signal.id);
          const approachDistanceState = intersectionApproachDistance.get(signal.id);
          const exitOccupancyState = intersectionExitOccupancy.get(signal.id);
          const conflictingAxisOccupied =
            occupancyState &&
            (nextStopState.stop.axis === "ns"
              ? occupancyState.ew > 0
              : occupancyState.ns > 0);
          const approachDirection = approachDirectionForHeading(current.motion.heading);
          const opposingDirection = opposingSignalDirection(approachDirection);
          const opposingPriorityDemand = approachDemandState
            ? approachDemandState[opposingDirection].straight +
              approachDemandState[opposingDirection].right
            : 0;
          const opposingPriorityDistance =
            approachDistanceState?.[opposingDirection] ??
            Number.POSITIVE_INFINITY;
          const travelDirection = signalDirectionForVector(current.motion.heading);
          const sameDirectionExitBlocked =
            (exitOccupancyState?.[travelDirection] ?? 0) > 0;
          const canGo = canVehicleProceed(
            nextStopState.stop,
            state,
            Boolean(conflictingAxisOccupied),
            opposingPriorityDemand,
            opposingPriorityDistance,
          );
          const blockedByIntersection =
            Boolean(conflictingAxisOccupied) &&
            nextStopState.ahead < INTERSECTION_OCCUPANCY_LOOKAHEAD;
          const blockedByExitQueue =
            sameDirectionExitBlocked &&
            nextStopState.ahead < INTERSECTION_BOX_ENTRY_LOOKAHEAD;
          if (!canGo || blockedByIntersection || blockedByExitQueue) {
            const stopGap = Math.max(0, nextStopState.ahead - 0.8);
            targetSpeed = Math.min(targetSpeed, Math.max(0, stopGap * 1.32));
            if (stopGap < 1.1) {
              waitingVehicles += 1;
            }
          }
        }
      }

      if (!holdPosition && !vehicle.route.isLoop) {
        const destinationGap = Math.max(
          0,
          vehicle.route.totalLength - vehicle.distance,
        );
        if (destinationGap < ROUTE_END_SLOWDOWN_DISTANCE) {
          const curbGap = Math.max(0, destinationGap - 0.65);
          targetSpeed = Math.min(targetSpeed, Math.max(0, curbGap * 1.4));
          if (destinationGap < ROUTE_END_SWITCH_DISTANCE) {
            const nextRoute = pickNextTrafficRoute(vehicle.route.id, vehicleIndex);
            if (nextRoute) {
              const entryDistance = Math.min(
                nextRoute.totalLength * 0.12,
                TRAFFIC_ROUTE_REENTRY_DISTANCE + (vehicleIndex % 4) * 1.1,
              );
              assignVehicleRoute(
                castLocalVehicleForMotion(vehicle),
                nextRoute,
                entryDistance,
              );
              nextStopState = resolveNextStopInto(
                vehicle.route,
                vehicle.distance,
                nextStopState,
                vehicle.motion.nextStopIndex,
              );
              vehicle.motion.nextStopIndex = nextStopState.index;
              syncVehicleSampleBucket(proximityBuckets, current);
              continue;
            }
          }
        }
      }

      vehicle.speed = holdPosition
        ? 0
        : THREE.MathUtils.damp(vehicle.speed, targetSpeed, 3.2, deltaSeconds);
      if (!holdPosition || (vehicle.kind === "taxi" && vehicle.serviceTimer > 0)) {
        vehicle.distance = clampRouteDistance(
          vehicle.route,
          holdPosition ? vehicle.distance : vehicle.distance + vehicle.speed * deltaSeconds,
        );
        updateVehicleMotionState(castLocalVehicleForMotion(vehicle));
      }

      syncVehicleSampleBucket(proximityBuckets, current);
      if (vehicle.kind === "taxi" && vehicle.isOccupied) {
        activeTrips += 1;
      }
    }

    statsAccumulator += deltaSeconds;
    if (statsAccumulator >= SIMULATION_STATS_UPDATE_INTERVAL) {
      statsAccumulator = 0;
      latestStats = buildStatsSnapshot(waitingVehicles, activeTrips);
    } else {
      latestStats = buildStatsSnapshot(waitingVehicles, activeTrips);
    }
  };

  const buildVehicleSnapshots = (): VehicleSnapshot[] =>
    vehicles.map((vehicle) => ({
      id: vehicle.id,
      kind: vehicle.kind,
      routeId: vehicle.route.id,
      roadName: vehicle.roadName,
      baseSpeed: vehicle.baseSpeed,
      speed: vehicle.speed,
      length: vehicle.length,
      safeGap: vehicle.safeGap,
      palette: vehicle.palette,
      planMode: vehicle.planMode,
      isOccupied: vehicle.isOccupied,
      pickupHotspotId: vehicle.pickupHotspot?.id ?? null,
      dropoffHotspotId: vehicle.dropoffHotspot?.id ?? null,
      renderSeed: vehicle.renderSeed,
      previousPose: cloneVehiclePoseSnapshot(vehicle.previousMotion),
      pose: cloneVehiclePoseSnapshot(vehicle.motion),
    }));

  const buildSignalSnapshots = (): SignalSnapshot[] => {
    if (!staticContext) {
      return [];
    }
    return staticContext.signals.map((signal) => {
      const flow = frameSignalStates.get(signal.id) ?? signalState(signal, elapsedTimeSeconds);
      return {
        id: signal.id,
        key: signal.key,
        point: signal.point.clone(),
        visualPoint: signal.visualPoint.clone(),
        approaches: [...signal.approaches],
        phase: flow.phase,
        flow,
        timings: signal.timingPlan,
        approachState: {
          occupancy: { ...(intersectionOccupancy.get(signal.id) ?? createSignalAxisOccupancy()) },
          demand: intersectionApproachDemand.get(signal.id) ?? createSignalApproachDemand(),
          distance: {
            ...(intersectionApproachDistance.get(signal.id) ?? createSignalApproachDistance()),
          },
          exitOccupancy:
            intersectionExitOccupancy.get(signal.id) ?? createSignalDirectionalOccupancy(),
        },
      };
    });
  };

  const buildHotspotSnapshots = (): HotspotSnapshot[] => {
    return [];
  };

  const rebuildSnapshot = () => {
    latestSnapshot = {
      clock: {
        elapsedTimeSeconds,
        ...configState.clock,
      },
      vehicles: buildVehicleSnapshots(),
      signals: buildSignalSnapshots(),
      hotspots: buildHotspotSnapshots(),
      stats: {
        ...latestStats,
      },
    };
    snapshotDirty = false;
  };

  return {
    id: "local-fallback",
    reset(nextConfig, nextStaticContext) {
      const nextClock = nextConfig.clock ?? DEFAULT_SIMULATION_CLOCK;
      const sameStaticContext = staticContext === nextStaticContext;
      const shouldRebuild =
        !sameStaticContext ||
        !nextConfig.preserveState ||
        nextConfig.taxiCount !== taxiVehicles.length ||
        nextConfig.trafficCount !== trafficVehicles.length;

      staticContext = nextStaticContext;
      configState = {
        ...nextConfig,
        clock: nextClock,
      };
      signalById = new globalThis.Map(
        nextStaticContext.signals.map((signal) => [signal.id, signal] as const),
      );
      syncEnvironmentMultiplier();
      if (shouldRebuild) {
        elapsedTimeSeconds = nextConfig.preserveState ? elapsedTimeSeconds : 0;
        rebuildVehicleLayer(nextConfig.taxiCount, nextConfig.trafficCount);
      }

      refreshSignalFlows();
      snapshotDirty = true;
    },
    step(deltaSeconds) {
      if (!staticContext) {
        return;
      }

      elapsedTimeSeconds += deltaSeconds;
      syncEnvironmentMultiplier();
      refreshSignalFlows();
      updateVehicles(deltaSeconds);
      snapshotDirty = true;
    },
    getSnapshot() {
      if (snapshotDirty) {
        rebuildSnapshot();
      }
      return latestSnapshot;
    },
  };
}
