import {
  VEHICLE_FOLLOW_LOOKAHEAD_BUFFER,
  VEHICLE_PROXIMITY_CELL_SIZE,
} from "@/components/map-simulator/scene-constants";
import { vehicleProximityCellCoord } from "@/components/map-simulator/route-motion-utils";
import type {
  LocalVehicle,
  LocalVehicleProximityBuckets,
  LocalVehicleSimulationSample,
} from "@/components/map-simulator/local-simulation-types";

type LimitSpeedForNearbyVehiclesParams = {
  vehicle: LocalVehicle;
  current: LocalVehicleSimulationSample;
  targetSpeed: number;
  proximityBuckets: LocalVehicleProximityBuckets;
};

export function limitSpeedForNearbyVehicles({
  vehicle,
  current,
  targetSpeed,
  proximityBuckets,
}: LimitSpeedForNearbyVehiclesParams) {
  let nextTargetSpeed = targetSpeed;
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
        nextTargetSpeed = Math.min(nextTargetSpeed, gapLimit);
        if (nextTargetSpeed <= 0.001) {
          nextTargetSpeed = 0;
          break searchNearbyVehicles;
        }
      }
    }
  }

  return nextTargetSpeed;
}
