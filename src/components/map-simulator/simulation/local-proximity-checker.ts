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
        if (longitudinal <= 0 || longitudinal > maxInteractionDistance) {
          continue;
        }

        const lateral = Math.abs(
          deltaX * current.motion.right.x + deltaZ * current.motion.right.z,
        );
        const laneTolerance = Math.min(
          2.4,
          Math.max(vehicle.route.roadWidth, other.vehicle.route.roadWidth) *
            0.36,
        );
        if (lateral > laneTolerance) {
          continue;
        }

        const requiredClearance =
          vehicle.length * 0.5 +
          other.vehicle.length * 0.5 +
          Math.max(2.2, vehicle.safeGap * 0.38);

        if (!onLeadVehicle(other, longitudinal, requiredClearance)) {
          break searchNearbyVehicles;
        }
      }
    }
  }
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

  return nextDistance;
}
