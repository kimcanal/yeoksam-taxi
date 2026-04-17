import * as THREE from "three";
import {
  TRAFFIC_PALETTES,
  resolveNextStop,
  routeSegmentIndexAtDistance,
  sampleRouteInto,
  createVehicleMotionState,
  copyVehicleMotionState,
  writeRightVector,
  signalState,
  taxiDisplayNumber,
  type RouteTemplate,
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

type ReplayVehicle = {
  id: string;
  kind: "taxi" | "traffic";
  route: RouteTemplate;
  distance: number;
  speed: number;
  baseSpeed: number;
  length: number;
  safeGap: number;
  palette: { body: number; cabin: number; sign: number | null };
  planMode: "traffic" | "pickup" | "dropoff";
  isOccupied: boolean;
  renderSeed: number;
  previousMotion: ReturnType<typeof createVehicleMotionState>;
  motion: ReturnType<typeof createVehicleMotionState>;
};

function clonePose(motion: ReplayVehicle["motion"]): VehiclePoseSnapshot {
  return {
    position: motion.position.clone(),
    lanePosition: motion.lanePosition.clone(),
    heading: motion.heading.clone(),
    right: motion.right.clone(),
    yaw: motion.yaw,
    segmentIndex: motion.segmentIndex,
    nextStopIndex: motion.nextStopIndex,
  };
}

export function createSumoReplaySource(): SimulationSource {
  let staticContext: SceneStaticContext | null = null;
  let configState: SimulationConfig = {
    taxiCount: 0,
    trafficCount: 0,
    clock: {
      dateIso: "2026-01-01",
      minutes: 12 * 60,
      weatherMode: "clear",
    },
  };
  let elapsedTimeSeconds = 0;
  let snapshot: SimulationSnapshot = {
    clock: {
      elapsedTimeSeconds: 0,
      ...configState.clock,
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
  const vehicles: ReplayVehicle[] = [];

  const rebuildVehicles = () => {
    vehicles.length = 0;
    if (!staticContext) {
      return;
    }

    for (let index = 0; index < configState.taxiCount; index += 1) {
      const route =
        staticContext.taxiRoutePool[index % staticContext.taxiRoutePool.length]!;
      const vehicle: ReplayVehicle = {
        id: `taxi-${index}`,
        kind: "taxi",
        route,
        distance: (route.totalLength / Math.max(configState.taxiCount, 1)) * index,
        speed: 0,
        baseSpeed: 7 + (index % 3) * 0.35,
        length: 4.6,
        safeGap: 7.4,
        palette: {
          body: 0xffcc4d,
          cabin: 0x1e252e,
          sign: 0xffd970,
        },
        planMode: index % 2 === 0 ? "pickup" : "dropoff",
        isOccupied: index % 2 === 1,
        renderSeed: index,
        previousMotion: createVehicleMotionState(),
        motion: createVehicleMotionState(),
      };
      vehicle.motion.segmentIndex = routeSegmentIndexAtDistance(route, vehicle.distance, 0);
      vehicle.motion.nextStopIndex = resolveNextStop(route, vehicle.distance, 0).index;
      sampleRouteInto(route, vehicle.distance, vehicle.motion, vehicle.motion.segmentIndex);
      writeRightVector(vehicle.motion.heading, vehicle.motion.right);
      vehicle.motion.lanePosition.copy(vehicle.motion.position).addScaledVector(
        vehicle.motion.right,
        route.laneOffset,
      );
      vehicle.motion.yaw = Math.atan2(vehicle.motion.heading.x, vehicle.motion.heading.z);
      copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
      vehicles.push(vehicle);
    }

    for (let index = 0; index < configState.trafficCount; index += 1) {
      const route =
        staticContext.trafficRoutePool[
          index % staticContext.trafficRoutePool.length
        ]!;
      const vehicle: ReplayVehicle = {
        id: `traffic-${index}`,
        kind: "traffic",
        route,
        distance:
          (route.totalLength / Math.max(configState.trafficCount, 1)) * index,
        speed: 0,
        baseSpeed: 5.2 + (index % 4) * 0.28,
        length: 4.2,
        safeGap: 6.1,
        palette: TRAFFIC_PALETTES[index % TRAFFIC_PALETTES.length]!,
        planMode: "traffic",
        isOccupied: false,
        renderSeed: index,
        previousMotion: createVehicleMotionState(),
        motion: createVehicleMotionState(),
      };
      vehicle.motion.segmentIndex = routeSegmentIndexAtDistance(route, vehicle.distance, 0);
      vehicle.motion.nextStopIndex = resolveNextStop(route, vehicle.distance, 0).index;
      sampleRouteInto(route, vehicle.distance, vehicle.motion, vehicle.motion.segmentIndex);
      writeRightVector(vehicle.motion.heading, vehicle.motion.right);
      vehicle.motion.lanePosition.copy(vehicle.motion.position).addScaledVector(
        vehicle.motion.right,
        route.laneOffset,
      );
      vehicle.motion.yaw = Math.atan2(vehicle.motion.heading.x, vehicle.motion.heading.z);
      copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
      vehicles.push(vehicle);
    }
  };

  const rebuildSnapshot = () => {
    const signals: SignalSnapshot[] = staticContext
      ? staticContext.signals.map((signal) => {
          const flow = signalState(signal, elapsedTimeSeconds);
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
              occupancy: { ns: 0, ew: 0 },
              demand: {
                north: { left: 0, straight: 0, right: 0 },
                east: { left: 0, straight: 0, right: 0 },
                south: { left: 0, straight: 0, right: 0 },
                west: { left: 0, straight: 0, right: 0 },
              },
              distance: {
                north: Number.POSITIVE_INFINITY,
                east: Number.POSITIVE_INFINITY,
                south: Number.POSITIVE_INFINITY,
                west: Number.POSITIVE_INFINITY,
              },
              exitOccupancy: {
                north: 0,
                east: 0,
                south: 0,
                west: 0,
              },
            },
          };
        })
      : [];

    const hotspotAssignments = new Map<string, number[]>();
    vehicles.forEach((vehicle) => {
      if (vehicle.kind !== "taxi" || !staticContext?.hotspotPool.length) {
        return;
      }
      const hotspot =
        staticContext.hotspotPool[
          (vehicle.renderSeed + Math.floor(elapsedTimeSeconds / 8)) %
            staticContext.hotspotPool.length
        ]!;
      const taxiNumber = taxiDisplayNumber(vehicle.id);
      if (!taxiNumber) {
        return;
      }
      const taxiNumbers = hotspotAssignments.get(hotspot.id) ?? [];
      taxiNumbers.push(taxiNumber);
      hotspotAssignments.set(hotspot.id, taxiNumbers);
    });

    const hotspots: HotspotSnapshot[] = staticContext
      ? staticContext.hotspotPool.map((hotspot, index) => {
          const cycle = Math.floor(elapsedTimeSeconds / 6 + index) % 3;
          const mode = cycle === 0 ? "idle" : cycle === 1 ? "pickup" : "dropoff";
          const assignedTaxiNumbers = hotspotAssignments.get(hotspot.id) ?? [];
          return {
            id: hotspot.id,
            label: hotspot.label,
            roadName: hotspot.roadName,
            position: hotspot.position.clone(),
            mode,
            pickupCalls: mode === "pickup" ? assignedTaxiNumbers.length : 0,
            dropoffCalls: mode === "dropoff" ? assignedTaxiNumbers.length : 0,
            assignedTaxiNumbers,
          };
        })
      : [];

    const vehicleSnapshots: VehicleSnapshot[] = vehicles.map((vehicle) => ({
      id: vehicle.id,
      kind: vehicle.kind,
      routeId: vehicle.route.id,
      roadName: vehicle.route.name,
      baseSpeed: vehicle.baseSpeed,
      speed: vehicle.speed,
      length: vehicle.length,
      safeGap: vehicle.safeGap,
      palette: vehicle.palette,
      planMode: vehicle.planMode,
      isOccupied: vehicle.isOccupied,
      pickupHotspotId: null,
      dropoffHotspotId: null,
      renderSeed: vehicle.renderSeed,
      previousPose: clonePose(vehicle.previousMotion),
      pose: clonePose(vehicle.motion),
    }));

    snapshot = {
      clock: {
        elapsedTimeSeconds,
        ...configState.clock,
      },
      vehicles: vehicleSnapshots,
      signals,
      hotspots,
      stats: {
        taxis: configState.taxiCount,
        traffic: configState.trafficCount,
        waiting: 0,
        signals: signals.length,
        activeTrips: Math.floor(configState.taxiCount / 2),
        completedTrips: Math.floor(elapsedTimeSeconds / 12),
        pedestrians: 0,
        pickups: Math.floor(elapsedTimeSeconds / 18),
        dropoffs: Math.floor(elapsedTimeSeconds / 22),
        activeCalls: hotspots.reduce((sum, hotspot) => sum + hotspot.pickupCalls, 0),
        avgPickupWaitSeconds: 72,
        avgRideSeconds: 286,
      },
    };
  };

  return {
    id: "sumo-replay-stub",
    reset(nextConfig, nextStaticContext) {
      configState = nextConfig;
      staticContext = nextStaticContext;
      if (!nextConfig.preserveState) {
        elapsedTimeSeconds = 0;
      }
      rebuildVehicles();
      rebuildSnapshot();
    },
    step(deltaSeconds) {
      elapsedTimeSeconds += deltaSeconds;
      vehicles.forEach((vehicle) => {
        copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
        vehicle.speed = THREE.MathUtils.damp(
          vehicle.speed,
          vehicle.baseSpeed * (vehicle.kind === "taxi" ? 0.96 : 1),
          2.8,
          deltaSeconds,
        );
        vehicle.distance =
          vehicle.route.totalLength <= 0
            ? 0
            : ((vehicle.distance + vehicle.speed * deltaSeconds) %
                vehicle.route.totalLength +
                vehicle.route.totalLength) %
              vehicle.route.totalLength;
        vehicle.motion.segmentIndex = routeSegmentIndexAtDistance(
          vehicle.route,
          vehicle.distance,
          vehicle.motion.segmentIndex,
        );
        vehicle.motion.nextStopIndex = resolveNextStop(
          vehicle.route,
          vehicle.distance,
          vehicle.motion.nextStopIndex,
        ).index;
        sampleRouteInto(
          vehicle.route,
          vehicle.distance,
          vehicle.motion,
          vehicle.motion.segmentIndex,
        );
        writeRightVector(vehicle.motion.heading, vehicle.motion.right);
        vehicle.motion.lanePosition
          .copy(vehicle.motion.position)
          .addScaledVector(vehicle.motion.right, vehicle.route.laneOffset);
        vehicle.motion.yaw = Math.atan2(
          vehicle.motion.heading.x,
          vehicle.motion.heading.z,
        );
      });
      rebuildSnapshot();
    },
    getSnapshot() {
      return snapshot;
    },
  };
}
