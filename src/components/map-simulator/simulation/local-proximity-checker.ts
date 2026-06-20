import {
  VEHICLE_FOLLOW_LOOKAHEAD_BUFFER,
  VEHICLE_PROXIMITY_CELL_SIZE,
} from "@/components/map-simulator/scene";
import { vehicleProximityCellCoord } from "@/components/map-simulator/road";
import type {
  LocalVehicle,
  LocalVehicleProximityBuckets,
  LocalVehicleSimulationSample,
} from "@/components/map-simulator/simulation";

type LimitSpeedForNearbyVehiclesParams = {
  vehicle: LocalVehicle;
  current: LocalVehicleSimulationSample;
  proximityBuckets: LocalVehicleProximityBuckets;
  targetSpeed: number;
};

type LimitTravelDistanceForNearbyVehiclesParams = {
  vehicle: LocalVehicle;
  current: LocalVehicleSimulationSample;
  proximityBuckets: LocalVehicleProximityBuckets;
  requestedDistance: number;
};

const RADIAL_CLEARANCE_PADDING = 1.05;
const RADIAL_TRAVEL_BUFFER = 0.75;
const OVERLAP_REAR_YIELD_RATIO = 0.35;
const SIDE_PASS_LATERAL_RATIO = 0.62;
const SOFT_CONFLICT_CRAWL_RATIO = 0.42;
const SOFT_CONFLICT_CRAWL_MAX_DISTANCE = 0.28;

function vehicleRadialClearance(left: LocalVehicle, right: LocalVehicle) {
  return (
    Math.max(left.length, right.length) * 0.52 +
    Math.max(RADIAL_CLEARANCE_PADDING, left.safeGap * 0.1)
  );
}

function vehicleRelation({
  current,
  other,
  vehicle,
}: {
  current: LocalVehicleSimulationSample;
  other: LocalVehicleSimulationSample;
  vehicle: LocalVehicle;
}) {
  const deltaX =
    other.motion.lanePosition.x - current.motion.lanePosition.x;
  const deltaZ =
    other.motion.lanePosition.z - current.motion.lanePosition.z;
  const longitudinal =
    deltaX * current.motion.heading.x +
    deltaZ * current.motion.heading.z;
  const lateral = Math.abs(
    deltaX * current.motion.right.x + deltaZ * current.motion.right.z,
  );
  const alignment = current.motion.heading.dot(other.motion.heading);
  const laneTolerance = Math.min(
    2.4,
    Math.max(vehicle.route.roadWidth, other.vehicle.route.roadWidth) * 0.36,
  );
  const sidePassTolerance = Math.max(1.05, laneTolerance * SIDE_PASS_LATERAL_RATIO);

  return {
    alignment,
    deltaX,
    deltaZ,
    laneTolerance,
    lateral,
    longitudinal,
    sidePassTolerance,
  };
}

function softConflictCrawlDistance(requestedDistance: number) {
  return Math.min(
    requestedDistance * SOFT_CONFLICT_CRAWL_RATIO,
    SOFT_CONFLICT_CRAWL_MAX_DISTANCE,
  );
}

function shouldYieldForOverlap({
  clearance,
  current,
  other,
  vehicle,
}: {
  clearance: number;
  current: LocalVehicleSimulationSample;
  other: LocalVehicleSimulationSample;
  vehicle: LocalVehicle;
}) {
  const { alignment, lateral, longitudinal, sidePassTolerance } =
    vehicleRelation({
      current,
      other,
      vehicle,
    });

  if (alignment > 0.35 && lateral > sidePassTolerance) {
    return false;
  }

  if (alignment > 0.35) {
    return longitudinal > -clearance * OVERLAP_REAR_YIELD_RATIO;
  }

  return vehicle.renderSeed > other.vehicle.renderSeed;
}

function nearbyVehicleSamples({
  current,
  proximityBuckets,
  searchDistance,
  onSample,
}: {
  current: LocalVehicleSimulationSample;
  proximityBuckets: LocalVehicleProximityBuckets;
  searchDistance: number;
  onSample: (other: LocalVehicleSimulationSample) => boolean;
}) {
  const searchCellRadius = Math.max(
    1,
    Math.ceil(searchDistance / VEHICLE_PROXIMITY_CELL_SIZE),
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
        if (other === current || other.vehicle === current.vehicle) {
          continue;
        }
        if (!onSample(other)) {
          break searchNearbyVehicles;
        }
      }
    }
  }
}

function nearbyLeadVehicleConstraints({
  vehicle,
  current,
  proximityBuckets,
  onLeadVehicle,
}: {
  vehicle: LocalVehicle;
  current: LocalVehicleSimulationSample;
  proximityBuckets: LocalVehicleProximityBuckets;
  onLeadVehicle: (
    other: LocalVehicleSimulationSample,
    longitudinal: number,
    requiredClearance: number,
  ) => boolean;
}) {
  const maxInteractionDistance =
    vehicle.safeGap + VEHICLE_FOLLOW_LOOKAHEAD_BUFFER;
  nearbyVehicleSamples({
    current,
    proximityBuckets,
    searchDistance: maxInteractionDistance,
    onSample: (other) => {
      const relation = vehicleRelation({
        current,
        other,
        vehicle,
      });
      if (relation.alignment < 0.35) {
        return true;
      }

      if (
        relation.longitudinal <= 0 ||
        relation.longitudinal > maxInteractionDistance
      ) {
        return true;
      }

      if (relation.lateral > relation.sidePassTolerance) {
        return true;
      }

      const requiredClearance =
        vehicle.length * 0.5 +
        other.vehicle.length * 0.5 +
        Math.max(2.2, vehicle.safeGap * 0.38);

      return onLeadVehicle(other, relation.longitudinal, requiredClearance);
    },
  });
}

export function limitSpeedForNearbyVehicles({
  vehicle,
  current,
  targetSpeed,
  proximityBuckets,
}: LimitSpeedForNearbyVehiclesParams) {
  let nextTargetSpeed = targetSpeed;

  nearbyLeadVehicleConstraints({
    vehicle,
    current,
    proximityBuckets,
    onLeadVehicle: (other, longitudinal, requiredClearance) => {
      const openGap = longitudinal - requiredClearance;
      const gapLimit = Math.max(
        0,
        Math.min(other.vehicle.speed, targetSpeed) + openGap * 0.92,
      );
      nextTargetSpeed = Math.min(nextTargetSpeed, gapLimit);
      if (nextTargetSpeed <= 0.001) {
        nextTargetSpeed = 0;
        return false;
      }
      return true;
    },
  });

  return nextTargetSpeed;
}

export function limitTravelDistanceForNearbyVehicles({
  vehicle,
  current,
  requestedDistance,
  proximityBuckets,
}: LimitTravelDistanceForNearbyVehiclesParams) {
  let nextDistance = Math.max(0, requestedDistance);

  nearbyLeadVehicleConstraints({
    vehicle,
    current,
    proximityBuckets,
    onLeadVehicle: (_other, longitudinal, requiredClearance) => {
      const remainingGap = longitudinal - requiredClearance - 0.35;
      nextDistance = Math.min(nextDistance, Math.max(0, remainingGap));
      return nextDistance > 0.001;
    },
  });

  const searchDistance =
    Math.max(
      VEHICLE_FOLLOW_LOOKAHEAD_BUFFER,
      vehicle.safeGap + requestedDistance + RADIAL_TRAVEL_BUFFER,
    );
  nearbyVehicleSamples({
    current,
    proximityBuckets,
    searchDistance,
    onSample: (other) => {
      const clearance = vehicleRadialClearance(vehicle, other.vehicle);
      const relation = vehicleRelation({
        current,
        other,
        vehicle,
      });
      if (
        relation.deltaX * relation.deltaX + relation.deltaZ * relation.deltaZ <
        clearance * clearance
      ) {
        if (
          shouldYieldForOverlap({
            clearance,
            current,
            other,
            vehicle,
          })
        ) {
          nextDistance = Math.min(
            nextDistance,
            softConflictCrawlDistance(requestedDistance),
          );
          return false;
        }
        return true;
      }
      const predictedX =
        current.motion.lanePosition.x + current.motion.heading.x * nextDistance;
      const predictedZ =
        current.motion.lanePosition.z + current.motion.heading.z * nextDistance;
      const deltaX = other.motion.lanePosition.x - predictedX;
      const deltaZ = other.motion.lanePosition.z - predictedZ;
      if (deltaX * deltaX + deltaZ * deltaZ >= clearance * clearance) {
        return true;
      }

      if (
        relation.alignment > 0.35 &&
        (relation.lateral > relation.sidePassTolerance ||
          relation.longitudinal < -clearance * OVERLAP_REAR_YIELD_RATIO)
      ) {
        return true;
      }

      nextDistance = Math.min(
        nextDistance,
        softConflictCrawlDistance(requestedDistance),
      );
      return false;
    },
  });

  return nextDistance;
}
