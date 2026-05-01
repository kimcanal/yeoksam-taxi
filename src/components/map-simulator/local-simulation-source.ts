import * as THREE from "three";
import type { DispatchDemandSnapshot } from "@/components/map-simulator/dispatch-planner";
import { buildEnvironmentState, type WeatherMode } from "@/components/map-simulator/simulation-environment";
import {
  HOTSPOT_ACTIVITY_REFRESH_INTERVAL,
  HOTSPOT_SLOWDOWN_DISTANCE,
  HOTSPOT_TRIGGER_DISTANCE,
  INTERSECTION_BOX_ENTRY_LOOKAHEAD,
  INTERSECTION_BOX_OCCUPANCY_RADIUS_SQ,
  INTERSECTION_EXIT_BLOCK_SPEED,
  INTERSECTION_EXIT_QUEUE_RADIUS_SQ,
  INTERSECTION_OCCUPANCY_LOOKAHEAD,
  INTERSECTION_SIGNAL_LOOKAHEAD,
  SERVICE_STOP_DURATION,
  SIGNAL_RADIUS_SQ,
  SIMULATION_STATS_UPDATE_INTERVAL,
  TRAFFIC_ROUTE_REENTRY_DISTANCE,
  VEHICLE_FOLLOW_LOOKAHEAD_BUFFER,
  VEHICLE_PROXIMITY_CELL_SIZE,
} from "@/components/map-simulator/scene-constants";
import {
  ACTIVE_DISPATCH_PLANNER,
  TAXI_PALETTE,
  TRAFFIC_PALETTES,
  type NextStopState,
  type RouteTemplate,
  type SignalApproachDemand,
  type SignalApproachDistance,
  type SignalAxisOccupancy,
  type SignalData,
  type SignalDirectionalOccupancy,
  type SignalFlow,
  type Stats,
  type Vehicle,
  type VehicleMotionState,
  createNextStopState,
  createSignalApproachDemand,
  createSignalApproachDistance,
  createSignalAxisOccupancy,
  createSignalDirectionalOccupancy,
  createVehicleMotionState,
  clampRouteDistance,
  copyVehicleMotionState,
  canVehicleProceed,
  buildShortestRoute,
  resolveNextStop,
  resolveNextStopInto,
  routeSegmentIndexAtDistance,
  signalState,
  signalDirectionForVector,
  dominantAxisForHeading,
  approachDirectionForHeading,
  opposingSignalDirection,
  updateVehicleMotionState,
  assignVehicleRoute,
  vehicleProximityCellCoord,
  taxiDisplayNumber,
} from "@/components/map-simulator/core";
import type {
  HotspotSnapshot,
  SceneStaticContext,
  SignalSnapshot,
  SimulationConfig,
  SimulationSnapshot,
  SimulationSource,
  VehiclePoseSnapshot,
  VehicleSnapshot,
} from "@/components/map-simulator/simulation-source";

type LocalVehicle = Omit<Vehicle, "group" | "bodyMaterial" | "signMaterial"> & {
  renderSeed: number;
};

type LocalVehicleSimulationSample = {
  vehicle: LocalVehicle;
  motion: VehicleMotionState;
  nextStopState: NextStopState;
  proximityCellX: number;
  proximityCellZ: number;
};

type VehicleProximityBuckets = Map<
  number,
  Map<number, LocalVehicleSimulationSample[]>
>;

const DEFAULT_CLOCK = {
  dateIso: "2026-01-01",
  minutes: 12 * 60,
  weatherMode: "clear" as WeatherMode,
};

function createVehicleSimulationSample(
  vehicle: LocalVehicle,
): LocalVehicleSimulationSample {
  return {
    vehicle,
    motion: vehicle.motion,
    nextStopState: createNextStopState(),
    proximityCellX: 0,
    proximityCellZ: 0,
  };
}

function addVehicleSampleToBucket(
  buckets: VehicleProximityBuckets,
  sample: LocalVehicleSimulationSample,
  cellX = sample.proximityCellX,
  cellZ = sample.proximityCellZ,
) {
  let column = buckets.get(cellX);
  if (!column) {
    column = new Map<number, LocalVehicleSimulationSample[]>();
    buckets.set(cellX, column);
  }

  let bucket = column.get(cellZ);
  if (!bucket) {
    bucket = [];
    column.set(cellZ, bucket);
  }
  bucket.push(sample);
}

function clearVehicleSampleBuckets(buckets: VehicleProximityBuckets) {
  buckets.forEach((column) => {
    column.forEach((bucket) => {
      bucket.length = 0;
    });
  });
}

function syncVehicleSampleBucket(
  buckets: VehicleProximityBuckets,
  sample: LocalVehicleSimulationSample,
) {
  const nextCellX = vehicleProximityCellCoord(sample.motion.lanePosition.x);
  const nextCellZ = vehicleProximityCellCoord(sample.motion.lanePosition.z);
  if (
    nextCellX === sample.proximityCellX &&
    nextCellZ === sample.proximityCellZ
  ) {
    return;
  }

  const currentColumn = buckets.get(sample.proximityCellX);
  const currentBucket = currentColumn?.get(sample.proximityCellZ);
  if (currentBucket) {
    const sampleIndex = currentBucket.indexOf(sample);
    if (sampleIndex !== -1) {
      currentBucket[sampleIndex] = currentBucket[currentBucket.length - 1]!;
      currentBucket.pop();
    }
    if (!currentBucket.length) {
      currentColumn?.delete(sample.proximityCellZ);
      if (currentColumn && !currentColumn.size) {
        buckets.delete(sample.proximityCellX);
      }
    }
  }

  sample.proximityCellX = nextCellX;
  sample.proximityCellZ = nextCellZ;
  addVehicleSampleToBucket(buckets, sample, nextCellX, nextCellZ);
}

function decrementDemandCount(
  demandMap: Map<string, number>,
  hotspotId: string | null | undefined,
) {
  if (!hotspotId) {
    return;
  }

  const nextCount = (demandMap.get(hotspotId) ?? 0) - 1;
  if (nextCount > 0) {
    demandMap.set(hotspotId, nextCount);
  } else {
    demandMap.delete(hotspotId);
  }
}

function incrementDemandCount(
  demandMap: Map<string, number>,
  hotspotId: string | null | undefined,
) {
  if (!hotspotId) {
    return;
  }

  demandMap.set(hotspotId, (demandMap.get(hotspotId) ?? 0) + 1);
}

function replaceDemandMapContents(
  demandMap: Map<string, number>,
  nextValues: ReadonlyMap<string, number>,
) {
  demandMap.clear();
  nextValues.forEach((count, hotspotId) => {
    demandMap.set(hotspotId, count);
  });
}

function demandMapTotal(demandMap: ReadonlyMap<string, number>) {
  let total = 0;
  demandMap.forEach((count) => {
    total += count;
  });
  return total;
}

function clonePose(source: VehicleMotionState): VehiclePoseSnapshot {
  return {
    position: source.position.clone(),
    lanePosition: source.lanePosition.clone(),
    heading: source.heading.clone(),
    right: source.right.clone(),
    yaw: source.yaw,
    segmentIndex: source.segmentIndex,
    nextStopIndex: source.nextStopIndex,
  };
}

function createEmptySnapshot(): SimulationSnapshot {
  return {
    clock: {
      elapsedTimeSeconds: 0,
      ...DEFAULT_CLOCK,
    },
    vehicles: [],
    signals: [],
    hotspots: [],
    stats: {
      taxis: 0,
      traffic: 0,
      waiting: 0,
      signals: 0,
      activeTrips: 0,
      completedTrips: 0,
      pedestrians: 0,
      pickups: 0,
      dropoffs: 0,
      activeCalls: 0,
      avgPickupWaitSeconds: 0,
      avgRideSeconds: 0,
    },
  };
}

export function createLocalSimulationSource(): SimulationSource {
  let staticContext: SceneStaticContext | null = null;
  let configState: SimulationConfig = {
    taxiCount: 0,
    trafficCount: 0,
    clock: DEFAULT_CLOCK,
  };
  let elapsedTimeSeconds = 0;
  let latestStats = createEmptySnapshot().stats;
  let latestSnapshot = createEmptySnapshot();
  let snapshotDirty = true;
  let activeVehicleSpeedMultiplier = 1;
  let hotspotActivityAccumulator = HOTSPOT_ACTIVITY_REFRESH_INTERVAL;
  let statsAccumulator = 0;
  let completedTrips = 0;
  let completedPickups = 0;
  let totalPickupWaitSeconds = 0;
  let totalRideSeconds = 0;

  const vehicles: LocalVehicle[] = [];
  const taxiVehicles: LocalVehicle[] = [];
  const trafficVehicles: LocalVehicle[] = [];
  const taxiById = new Map<string, LocalVehicle>();
  const routeCache = new Map<string, RouteTemplate | null>();
  const frameSignalStates = new Map<string, SignalFlow>();
  const activePickupsByHotspot = new Map<string, number>();
  const activeDropoffsByHotspot = new Map<string, number>();
  const intersectionOccupancy = new Map<string, SignalAxisOccupancy>();
  const intersectionApproachDemand = new Map<string, SignalApproachDemand>();
  const intersectionApproachDistance = new Map<string, SignalApproachDistance>();
  const intersectionExitOccupancy = new Map<string, SignalDirectionalOccupancy>();
  const proximityBuckets: VehicleProximityBuckets = new Map();
  const vehicleSimulationSamples: LocalVehicleSimulationSample[] = [];
  let hotspotDemandMapsDirty = true;

  let signalById = new Map<string, SignalData>();
  let signalByKey = new Map<string, SignalData>();
  let dispatchPlanner: ReturnType<typeof ACTIVE_DISPATCH_PLANNER.createSession> | null =
    null;

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

  const buildDispatchDemandSnapshotFromMaps = (
    pickupDemandMap: Map<string, number>,
    dropoffDemandMap: Map<string, number>,
  ): DispatchDemandSnapshot => ({
    elapsedTimeSeconds,
    completedTrips,
    hotspotCount: staticContext?.hotspotPool.length ?? 0,
    activePickupsByHotspotId: pickupDemandMap,
    activeDropoffsByHotspotId: dropoffDemandMap,
  });

  const rebuildHotspotDemandMaps = (
    pickupDemandMap: Map<string, number>,
    dropoffDemandMap: Map<string, number>,
    excludedVehicleId?: string | null,
  ) => {
    pickupDemandMap.clear();
    dropoffDemandMap.clear();

    for (let index = 0; index < vehicles.length; index += 1) {
      const vehicle = vehicles[index]!;
      if (vehicle.kind !== "taxi" || vehicle.id === excludedVehicleId) {
        continue;
      }

      if (!vehicle.isOccupied && vehicle.pickupHotspot) {
        incrementDemandCount(pickupDemandMap, vehicle.pickupHotspot.id);
      }
      if (vehicle.isOccupied && vehicle.dropoffHotspot) {
        incrementDemandCount(dropoffDemandMap, vehicle.dropoffHotspot.id);
      }
    }
  };

  const syncActiveHotspotDemandMaps = () => {
    rebuildHotspotDemandMaps(activePickupsByHotspot, activeDropoffsByHotspot);
    hotspotDemandMapsDirty = false;
    hotspotActivityAccumulator = 0;
  };

  const createDispatchDemandSnapshot = (excludedVehicleId?: string | null) => {
    if (hotspotDemandMapsDirty) {
      syncActiveHotspotDemandMaps();
    }

    const pickupDemandMap = new Map(activePickupsByHotspot);
    const dropoffDemandMap = new Map(activeDropoffsByHotspot);
    const excludedVehicle = excludedVehicleId
      ? taxiById.get(excludedVehicleId) ?? null
      : null;

    if (excludedVehicle) {
      if (!excludedVehicle.isOccupied && excludedVehicle.pickupHotspot) {
        decrementDemandCount(pickupDemandMap, excludedVehicle.pickupHotspot.id);
      }
      if (excludedVehicle.isOccupied && excludedVehicle.dropoffHotspot) {
        decrementDemandCount(dropoffDemandMap, excludedVehicle.dropoffHotspot.id);
      }
    }

    return buildDispatchDemandSnapshotFromMaps(
      pickupDemandMap,
      dropoffDemandMap,
    );
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
    completedTrips,
    pedestrians: 0,
    pickups: completedPickups,
    dropoffs: completedTrips,
    activeCalls: demandMapTotal(activePickupsByHotspot),
    avgPickupWaitSeconds:
      completedPickups > 0 ? totalPickupWaitSeconds / completedPickups : 0,
    avgRideSeconds: completedTrips > 0 ? totalRideSeconds / completedTrips : 0,
  });

  const routeBuilder = (
    start: string,
    end: string,
    id: string,
    label: string | null,
  ) => {
    if (!staticContext) {
      return null;
    }
    const cacheKey = `${start}|${end}`;
    if (routeCache.has(cacheKey)) {
      return routeCache.get(cacheKey) ?? null;
    }
    const route = buildShortestRoute(
      staticContext.graph,
      signalByKey,
      start,
      end,
      id,
      label,
    );
    routeCache.set(cacheKey, route);
    return route;
  };

  const rebuildDispatchPlanner = () => {
    if (!staticContext || !staticContext.hotspotPool.length) {
      dispatchPlanner = null;
      return;
    }

    dispatchPlanner = ACTIVE_DISPATCH_PLANNER.createSession({
      hotspots: staticContext.hotspotPool,
      graph: staticContext.graph,
      routeBuilder,
    });
  };

  const pickNextTrafficRoute = (currentRouteId: string, vehicleIndex: number) => {
    if (!staticContext?.trafficRoutePool.length) {
      return null;
    }

    const seed =
      Math.floor(elapsedTimeSeconds * 0.6) + vehicleIndex * 7 + completedTrips * 3;
    for (
      let offset = 0;
      offset < staticContext.trafficRoutePool.length;
      offset += 1
    ) {
      const route =
        staticContext.trafficRoutePool[
          (seed + offset + staticContext.trafficRoutePool.length) %
            staticContext.trafficRoutePool.length
        ]!;
      if (
        staticContext.trafficRoutePool.length === 1 ||
        route.id !== currentRouteId
      ) {
        return route;
      }
    }

    return staticContext.trafficRoutePool[
      seed % staticContext.trafficRoutePool.length
    ]!;
  };

  const resetMetrics = () => {
    completedTrips = 0;
    completedPickups = 0;
    totalPickupWaitSeconds = 0;
    totalRideSeconds = 0;
    statsAccumulator = 0;
    hotspotActivityAccumulator = HOTSPOT_ACTIVITY_REFRESH_INTERVAL;
    latestStats = buildStatsSnapshot(0, 0);
  };

  const clearVehicleLayer = () => {
    vehicles.length = 0;
    taxiVehicles.length = 0;
    trafficVehicles.length = 0;
    taxiById.clear();
    activePickupsByHotspot.clear();
    activeDropoffsByHotspot.clear();
    clearVehicleSampleBuckets(proximityBuckets);
    vehicleSimulationSamples.length = 0;
    hotspotDemandMapsDirty = false;
    routeCache.clear();
    resetMetrics();
  };

  const castVehicleForMotion = (vehicle: LocalVehicle) =>
    vehicle as unknown as Vehicle;

  const rebuildVehicleLayer = (nextTaxiCount: number, nextTrafficCount: number) => {
    if (!staticContext || !dispatchPlanner || !staticContext.hotspotPool.length) {
      clearVehicleLayer();
      return;
    }

    clearVehicleLayer();

    const bootstrapPickupDemandMap = new Map<string, number>();
    const bootstrapDropoffDemandMap = new Map<string, number>();

    for (let index = 0; index < nextTaxiCount; index += 1) {
      const spawnHotspot =
        staticContext.hotspotPool[(index * 2) % staticContext.hotspotPool.length]!;
      const vehicleId = `taxi-${index}`;
      const job = dispatchPlanner.planJob({
        startKey: spawnHotspot.nodeKey,
        seed: index + 1,
        vehicleId,
        demandSnapshot: buildDispatchDemandSnapshotFromMaps(
          bootstrapPickupDemandMap,
          bootstrapDropoffDemandMap,
        ),
      });
      if (!job) {
        continue;
      }

      const vehicle: LocalVehicle = {
        id: vehicleId,
        kind: "taxi",
        route: job.pickupRoute,
        baseSpeed: 7.1 + (index % 4) * 0.55,
        speed: 0,
        distance: 0,
        safeGap: 7.8,
        length: 4.6,
        currentSignalId: null,
        roadName: job.pickupRoute.name,
        palette: TAXI_PALETTE,
        isOccupied: false,
        pickupHotspot: job.pickupHotspot,
        dropoffHotspot: job.dropoffHotspot,
        jobAssignedAt: elapsedTimeSeconds,
        pickupStartedAt: null,
        serviceTimer: 0,
        planMode: "pickup",
        previousMotion: createVehicleMotionState(),
        motion: createVehicleMotionState(),
        renderMotion: createVehicleMotionState(),
        renderSeed: index,
      };
      vehicle.motion.nextStopIndex = resolveNextStop(job.pickupRoute, 0, 0).index;
      updateVehicleMotionState(castVehicleForMotion(vehicle));
      copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
      copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
      vehicles.push(vehicle);
      taxiVehicles.push(vehicle);
      taxiById.set(vehicle.id, vehicle);
      incrementDemandCount(bootstrapPickupDemandMap, job.pickupHotspot.id);
    }

    for (let index = 0; index < nextTrafficCount; index += 1) {
      const route =
        staticContext.trafficRoutePool[index % staticContext.trafficRoutePool.length]!;
      const vehicle: LocalVehicle = {
        id: `traffic-${index}`,
        kind: "traffic",
        route,
        baseSpeed: 5.6 + (index % 5) * 0.4,
        speed: 0,
        distance: (route.totalLength / Math.max(nextTrafficCount, 1)) * index,
        safeGap: 6.4,
        length: 4.2,
        currentSignalId: null,
        roadName: route.name,
        palette: TRAFFIC_PALETTES[index % TRAFFIC_PALETTES.length]!,
        isOccupied: false,
        pickupHotspot: null,
        dropoffHotspot: null,
        jobAssignedAt: 0,
        pickupStartedAt: null,
        serviceTimer: 0,
        planMode: "traffic",
        previousMotion: createVehicleMotionState(),
        motion: createVehicleMotionState(),
        renderMotion: createVehicleMotionState(),
        renderSeed: index,
      };
      vehicle.motion.segmentIndex = routeSegmentIndexAtDistance(
        route,
        vehicle.distance,
        0,
      );
      vehicle.motion.nextStopIndex = resolveNextStop(
        route,
        vehicle.distance,
        0,
      ).index;
      updateVehicleMotionState(castVehicleForMotion(vehicle));
      copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
      copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
      vehicles.push(vehicle);
      trafficVehicles.push(vehicle);
    }

    replaceDemandMapContents(activePickupsByHotspot, bootstrapPickupDemandMap);
    replaceDemandMapContents(activeDropoffsByHotspot, bootstrapDropoffDemandMap);
    hotspotDemandMapsDirty = false;
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

        if (vehicle.serviceTimer === 0 && vehicle.kind === "taxi") {
          if (!vehicle.isOccupied && vehicle.pickupHotspot) {
            completedPickups += 1;
            totalPickupWaitSeconds += Math.max(
              0,
              elapsedTimeSeconds - vehicle.jobAssignedAt,
            );
            vehicle.pickupStartedAt = elapsedTimeSeconds;
            const completedPickupHotspotId = vehicle.pickupHotspot.id;
            vehicle.isOccupied = true;
            vehicle.pickupHotspot = null;
            decrementDemandCount(activePickupsByHotspot, completedPickupHotspotId);
            incrementDemandCount(activeDropoffsByHotspot, vehicle.dropoffHotspot?.id);
            hotspotDemandMapsDirty = false;
            hotspotActivityAccumulator = 0;
            vehicle.planMode = "dropoff";
            const dropRoute = routeBuilder(
              vehicle.route.endKey,
              vehicle.dropoffHotspot?.nodeKey ?? vehicle.route.endKey,
              `${vehicle.id}-dropoff-${completedTrips}`,
              vehicle.dropoffHotspot?.roadName ?? vehicle.dropoffHotspot?.label ?? null,
            );
            if (dropRoute) {
              assignVehicleRoute(castVehicleForMotion(vehicle), dropRoute, 0);
              nextStopState = resolveNextStopInto(vehicle.route, vehicle.distance, nextStopState, 0);
              vehicle.motion.nextStopIndex = nextStopState.index;
            }
          } else if (vehicle.isOccupied && vehicle.dropoffHotspot) {
            totalRideSeconds += Math.max(
              0,
              elapsedTimeSeconds - (vehicle.pickupStartedAt ?? elapsedTimeSeconds),
            );
            vehicle.pickupStartedAt = null;
            completedTrips += 1;
            if (!dispatchPlanner || !staticContext.hotspotPool.length) {
              continue;
            }

            const completedDropoffHotspotId = vehicle.dropoffHotspot.id;
            decrementDemandCount(activeDropoffsByHotspot, completedDropoffHotspotId);
            hotspotDemandMapsDirty = false;
            hotspotActivityAccumulator = 0;
            const nextJob = dispatchPlanner.planJob({
              startKey: vehicle.route.endKey,
              seed: completedTrips + vehicleIndex + 1,
              vehicleId: vehicle.id,
              demandSnapshot: createDispatchDemandSnapshot(vehicle.id),
            });
            if (nextJob) {
              vehicle.pickupHotspot = nextJob.pickupHotspot;
              vehicle.dropoffHotspot = nextJob.dropoffHotspot;
              vehicle.planMode = "pickup";
              vehicle.isOccupied = false;
              vehicle.jobAssignedAt = elapsedTimeSeconds;
              incrementDemandCount(activePickupsByHotspot, nextJob.pickupHotspot.id);
              hotspotDemandMapsDirty = false;
              hotspotActivityAccumulator = 0;
              assignVehicleRoute(castVehicleForMotion(vehicle), nextJob.pickupRoute, 0);
              nextStopState = resolveNextStopInto(vehicle.route, vehicle.distance, nextStopState, 0);
              vehicle.motion.nextStopIndex = nextStopState.index;
            }
          }
        }
      }

      if (!holdPosition) {
        const maxInteractionDistance =
          vehicle.safeGap + VEHICLE_FOLLOW_LOOKAHEAD_BUFFER;
        const searchCellRadius = Math.max(
          1,
          Math.ceil(maxInteractionDistance / VEHICLE_PROXIMITY_CELL_SIZE),
        );
        const currentCellX = vehicleProximityCellCoord(
          current.motion.lanePosition.x,
        );
        const currentCellZ = vehicleProximityCellCoord(
          current.motion.lanePosition.z,
        );

        searchNearbyVehicles: for (
          let cellX = currentCellX - searchCellRadius;
          cellX <= currentCellX + searchCellRadius;
          cellX += 1
        ) {
          for (
            let cellZ = currentCellZ - searchCellRadius;
            cellZ <= currentCellZ + searchCellRadius;
            cellZ += 1
          ) {
            const bucket = proximityBuckets.get(cellX)?.get(cellZ);
            if (!bucket) {
              continue;
            }

            for (let bucketIndex = 0; bucketIndex < bucket.length; bucketIndex += 1) {
              const other = bucket[bucketIndex]!;
              if (other.vehicle === vehicle) {
                continue;
              }

              const alignment = current.motion.heading.dot(other.motion.heading);
              if (alignment < 0.35) {
                continue;
              }

              const deltaX =
                other.motion.lanePosition.x - current.motion.lanePosition.x;
              const deltaZ =
                other.motion.lanePosition.z - current.motion.lanePosition.z;
              const longitudinal =
                deltaX * current.motion.heading.x +
                deltaZ * current.motion.heading.z;
              if (
                longitudinal <= 0 ||
                longitudinal > maxInteractionDistance
              ) {
                continue;
              }

              const lateral = Math.abs(
                deltaX * current.motion.right.x + deltaZ * current.motion.right.z,
              );
              const laneTolerance =
                Math.max(vehicle.route.roadWidth, other.vehicle.route.roadWidth) *
                0.48;
              if (lateral > laneTolerance) {
                continue;
              }

              const gapLimit = Math.max(
                0,
                (longitudinal - other.vehicle.length * 0.65 - 0.9) * 1.1,
              );
              targetSpeed = Math.min(targetSpeed, gapLimit);
              if (targetSpeed <= 0.001) {
                targetSpeed = 0;
                break searchNearbyVehicles;
              }
            }
          }
        }
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
        if (destinationGap < HOTSPOT_SLOWDOWN_DISTANCE) {
          const curbGap = Math.max(0, destinationGap - 0.65);
          targetSpeed = Math.min(targetSpeed, Math.max(0, curbGap * 1.4));
          if (destinationGap < HOTSPOT_TRIGGER_DISTANCE) {
            if (vehicle.kind === "traffic") {
              const nextRoute = pickNextTrafficRoute(vehicle.route.id, vehicleIndex);
              if (nextRoute) {
                const entryDistance = Math.min(
                  nextRoute.totalLength * 0.12,
                  TRAFFIC_ROUTE_REENTRY_DISTANCE + (vehicleIndex % 4) * 1.1,
                );
                assignVehicleRoute(castVehicleForMotion(vehicle), nextRoute, entryDistance);
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
            } else {
              vehicle.serviceTimer = SERVICE_STOP_DURATION;
              targetSpeed = 0;
              holdPosition = true;
              waitingVehicles += 1;
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
        updateVehicleMotionState(castVehicleForMotion(vehicle));
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
      previousPose: clonePose(vehicle.previousMotion),
      pose: clonePose(vehicle.motion),
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
    if (!staticContext) {
      return [];
    }
    if (hotspotDemandMapsDirty) {
      syncActiveHotspotDemandMaps();
    }

    const pickupTaxiNumbersByHotspot = new Map<string, number[]>();
    const dropoffTaxiNumbersByHotspot = new Map<string, number[]>();
    for (let index = 0; index < taxiVehicles.length; index += 1) {
      const vehicle = taxiVehicles[index]!;
      const taxiNumber = taxiDisplayNumber(vehicle.id);
      if (!taxiNumber) {
        continue;
      }

      if (!vehicle.isOccupied && vehicle.pickupHotspot) {
        const activeTaxiNumbers =
          pickupTaxiNumbersByHotspot.get(vehicle.pickupHotspot.id) ?? [];
        activeTaxiNumbers.push(taxiNumber);
        pickupTaxiNumbersByHotspot.set(vehicle.pickupHotspot.id, activeTaxiNumbers);
      }
      if (vehicle.isOccupied && vehicle.dropoffHotspot) {
        const activeTaxiNumbers =
          dropoffTaxiNumbersByHotspot.get(vehicle.dropoffHotspot.id) ?? [];
        activeTaxiNumbers.push(taxiNumber);
        dropoffTaxiNumbersByHotspot.set(vehicle.dropoffHotspot.id, activeTaxiNumbers);
      }
    }

    return staticContext.hotspotPool.map((hotspot) => {
      const pickupCalls = activePickupsByHotspot.get(hotspot.id) ?? 0;
      const dropoffCalls = activeDropoffsByHotspot.get(hotspot.id) ?? 0;
      const mode =
        pickupCalls > 0 ? "pickup" : dropoffCalls > 0 ? "dropoff" : "idle";

      return {
        id: hotspot.id,
        label: hotspot.label,
        roadName: hotspot.roadName,
        position: hotspot.position.clone(),
        mode,
        pickupCalls,
        dropoffCalls,
        assignedTaxiNumbers:
          mode === "pickup"
            ? [...(pickupTaxiNumbersByHotspot.get(hotspot.id) ?? [])]
            : mode === "dropoff"
              ? [...(dropoffTaxiNumbersByHotspot.get(hotspot.id) ?? [])]
              : [],
      };
    });
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
      const nextClock = nextConfig.clock ?? DEFAULT_CLOCK;
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
      signalById = new Map(
        nextStaticContext.signals.map((signal) => [signal.id, signal] as const),
      );
      signalByKey = new Map(
        nextStaticContext.signals.map((signal) => [signal.key, signal] as const),
      );
      syncEnvironmentMultiplier();
      rebuildDispatchPlanner();

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
      hotspotActivityAccumulator += deltaSeconds;
      if (!vehicles.length) {
        activePickupsByHotspot.clear();
        activeDropoffsByHotspot.clear();
        hotspotDemandMapsDirty = false;
      } else if (
        hotspotDemandMapsDirty ||
        hotspotActivityAccumulator >= HOTSPOT_ACTIVITY_REFRESH_INTERVAL
      ) {
        syncActiveHotspotDemandMaps();
      }
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
