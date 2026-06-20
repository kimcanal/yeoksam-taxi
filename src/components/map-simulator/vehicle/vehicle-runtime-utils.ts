import * as THREE from "three";
import {
  copyVehicleMotionState,
  curbsideApproachBlend,
  curbsideLaneOffset,
  resolveNextStop,
  routeSegmentIndexAtDistance,
  sampleRouteInto,
  wrapAngle,
  writeRightVector,
} from "@/components/map-simulator/road";
import type {
  RouteTemplate,
  Vehicle,
} from "@/components/map-simulator/types";
import { ROAD_LAYER_Y, ROAD_SURFACE_THICKNESS } from "@/components/map-simulator/scene";

export function setTaxiAppearance(vehicle: Vehicle) {
  if (vehicle.kind !== "taxi") {
    return;
  }
  if (vehicle.planMode === "dropoff" || vehicle.isOccupied) {
    vehicle.bodyMaterial.color.setHex(0xf08d1a);
    vehicle.bodyMaterial.emissive.setHex(0x472300);
    vehicle.bodyMaterial.emissiveIntensity = 0.18;
    vehicle.signMaterial?.color.setHex(0xc7ffd1);
    vehicle.signMaterial?.emissive.setHex(0x00c853);
    if (vehicle.signMaterial) {
      vehicle.signMaterial.emissiveIntensity = 0.96;
    }
    return;
  }

  vehicle.bodyMaterial.color.setHex(vehicle.palette.body);
  vehicle.bodyMaterial.emissive.setHex(0x321500);
  vehicle.bodyMaterial.emissiveIntensity = 0.1;
  vehicle.signMaterial?.color.setHex(0xffc7cc);
  vehicle.signMaterial?.emissive.setHex(0xff3048);
  if (vehicle.signMaterial) {
    vehicle.signMaterial.emissiveIntensity = 1.02;
  }
}

export function updateVehicleMotionState(vehicle: Vehicle) {
  sampleRouteInto(
    vehicle.route,
    vehicle.distance,
    vehicle.motion,
    vehicle.motion.segmentIndex,
  );
  writeRightVector(vehicle.motion.heading, vehicle.motion.right);
  const pullOverBlend = curbsideApproachBlend(vehicle);
  const baseLaneOffset = vehicle.route.laneOffset + (vehicle.laneOffsetBias ?? 0);
  const laneOffset =
    pullOverBlend > 0
      ? THREE.MathUtils.lerp(
        baseLaneOffset,
        curbsideLaneOffset(vehicle.route),
        pullOverBlend,
      )
      : baseLaneOffset;
  vehicle.motion.lanePosition
    .copy(vehicle.motion.position)
    .addScaledVector(vehicle.motion.right, laneOffset);
  const roadClass = vehicle.route.roadClass;
  const roadSurfaceY = ROAD_LAYER_Y[roadClass] + ROAD_SURFACE_THICKNESS / 2;
  vehicle.motion.lanePosition.y = roadSurfaceY;

  vehicle.motion.yaw = Math.atan2(
    vehicle.motion.heading.x,
    vehicle.motion.heading.z,
  );
}

export function syncVehicleTransform(vehicle: Vehicle, alpha = 1) {
  const nextAlpha = THREE.MathUtils.clamp(alpha, 0, 1);
  const { previousMotion, motion, renderMotion } = vehicle;

  if (nextAlpha >= 0.999) {
    copyVehicleMotionState(renderMotion, motion);
  } else {
    renderMotion.position.copy(previousMotion.position).lerp(motion.position, nextAlpha);
    renderMotion.heading.copy(previousMotion.heading).lerp(motion.heading, nextAlpha);
    if (renderMotion.heading.lengthSq() < 0.0001) {
      renderMotion.heading.copy(motion.heading);
    } else {
      renderMotion.heading.normalize();
    }
    renderMotion.segmentIndex = motion.segmentIndex;
    renderMotion.lanePosition
      .copy(previousMotion.lanePosition)
      .lerp(motion.lanePosition, nextAlpha);
    renderMotion.right.copy(previousMotion.right).lerp(motion.right, nextAlpha);
    if (renderMotion.right.lengthSq() < 0.0001) {
      renderMotion.right.copy(motion.right);
    } else {
      renderMotion.right.normalize();
    }
    renderMotion.yaw =
      previousMotion.yaw +
      wrapAngle(motion.yaw - previousMotion.yaw) * nextAlpha;
    renderMotion.nextStopIndex = motion.nextStopIndex;
  }

  const roadClass = vehicle.route.roadClass;
  const roadSurfaceY = ROAD_LAYER_Y[roadClass] + ROAD_SURFACE_THICKNESS / 2;
  renderMotion.lanePosition.y = roadSurfaceY;

  vehicle.group.position.copy(renderMotion.lanePosition);
  vehicle.group.rotation.y = renderMotion.yaw;
}

export function assignVehicleRoute(
  vehicle: Vehicle,
  route: RouteTemplate,
  distance = 0,
) {
  vehicle.route = route;
  vehicle.distance = distance;
  vehicle.roadName = route.name;
  vehicle.motion.segmentIndex = routeSegmentIndexAtDistance(route, distance, 0);
  vehicle.motion.nextStopIndex = resolveNextStop(route, distance, 0).index;
  updateVehicleMotionState(vehicle);
  copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
  copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
}
