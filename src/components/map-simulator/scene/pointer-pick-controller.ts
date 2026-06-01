import * as THREE from "three";
import type { Vehicle } from "@/components/map-simulator/types";

export function createMapPointerPickController({
  camera,
  dongFloorGroup,
  getShowTransit,
  pointerNdc,
  poiClickTargets,
  raycaster,
  taxiById,
  taxiClickTargets,
  transitHoverTargets,
}: {
  camera: THREE.Camera;
  dongFloorGroup: THREE.Group;
  getShowTransit: () => boolean;
  pointerNdc: THREE.Vector2;
  poiClickTargets: THREE.Object3D[];
  raycaster: THREE.Raycaster;
  taxiById: ReadonlyMap<string, Vehicle>;
  taxiClickTargets: THREE.Object3D[];
  transitHoverTargets: THREE.Object3D[];
}) {
  const taxiPointerHits: THREE.Intersection[] = [];
  const transitPointerHits: THREE.Intersection[] = [];
  const poiPointerHits: THREE.Intersection[] = [];
  const dongFloorPointerHits: THREE.Intersection[] = [];

  const resolveTaxiFromPointerRay = () => {
    if (!taxiClickTargets.length) {
      return null;
    }

    taxiPointerHits.length = 0;
    raycaster.intersectObjects(taxiClickTargets, false, taxiPointerHits);
    const hit = taxiPointerHits[0];
    if (!hit) {
      return null;
    }

    const hitVehicleId = (hit.object.userData?.vehicleId ??
      hit.object.parent?.userData?.vehicleId) as string | undefined;
    if (!hitVehicleId) {
      return null;
    }
    return taxiById.get(hitVehicleId) ?? null;
  };

  const findTaxiFromPointer = () => {
    raycaster.setFromCamera(pointerNdc, camera);
    return resolveTaxiFromPointerRay();
  };

  const resolveTransitNameFromPointerRay = () => {
    if (!getShowTransit() || !transitHoverTargets.length) {
      return null;
    }

    transitPointerHits.length = 0;
    raycaster.intersectObjects(
      transitHoverTargets,
      false,
      transitPointerHits,
    );
    const hit = transitPointerHits[0];
    const transitName = hit?.object.userData?.transitName as
      | string
      | undefined;
    return transitName ?? null;
  };

  const resolvePoiCodeFromPointerRay = () => {
    if (!poiClickTargets.length) {
      return null;
    }

    poiPointerHits.length = 0;
    raycaster.intersectObjects(poiClickTargets, false, poiPointerHits);
    const hit = poiPointerHits[0];
    const poiCode = hit?.object.userData?.poiCode as string | undefined;
    return poiCode ?? null;
  };

  const findPoiCodeFromPointer = () => {
    raycaster.setFromCamera(pointerNdc, camera);
    return resolvePoiCodeFromPointerRay();
  };

  const resolveDongNameFromPointerRay = () => {
    dongFloorPointerHits.length = 0;
    raycaster.intersectObjects(
      dongFloorGroup.children,
      false,
      dongFloorPointerHits,
    );
    const hit = dongFloorPointerHits[0];
    const dongName = hit?.object.userData?.dongName as string | undefined;
    return dongName ?? null;
  };

  const findDongFromPointer = () => {
    raycaster.setFromCamera(pointerNdc, camera);
    return resolveDongNameFromPointerRay();
  };

  return {
    findDongFromPointer,
    findPoiCodeFromPointer,
    findTaxiFromPointer,
    resolvePoiCodeFromPointerRay,
    resolveTaxiFromPointerRay,
    resolveTransitNameFromPointerRay,
  };
}
