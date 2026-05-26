import * as THREE from "three";
import type { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { EnvironmentVisuals } from "@/components/map-simulator/environment";
import { disposeObject3DResources } from "@/components/map-simulator/utils";
import { createVehicleTrailLayer } from "@/components/map-simulator/vehicle";
import type { MapSceneGeometry } from "@/components/map-simulator/hooks";

type DisposableTrailLayer = {
  clear: () => void;
  group: THREE.Group;
};

export function attachMapSceneGeometryLayers({
  mapSceneGeometry,
  scene,
  showNonRoad,
}: {
  mapSceneGeometry: MapSceneGeometry;
  scene: THREE.Scene;
  showNonRoad: boolean;
}) {
  const {
    buildingMassLayer,
    demandVisualLayer,
    dongBoundaryLayer,
    gridHelper,
    ground,
    maskMesh,
    nonRoadGroup,
    staticRoadLayer,
  } = mapSceneGeometry;

  scene.add(ground, gridHelper, maskMesh, demandVisualLayer.group);
  nonRoadGroup.visible = showNonRoad;
  scene.add(nonRoadGroup);
  scene.add(
    dongBoundaryLayer.group,
    staticRoadLayer.group,
    buildingMassLayer.group,
  );

  return {
    buildingMassLayer,
    demandVisualLayer,
    dongBoundaryLayer,
    dongFloorGroup: demandVisualLayer.dongFloorGroup,
    nonRoadGroup,
    staticRoadLayer,
  };
}

export function createDefaultSimulationTrailLayer(scene: THREE.Scene) {
  const simulationTrailLayer = createVehicleTrailLayer({
    yOffset: 0.24,
    maxPoints: 34,
    minSampleDistance: 1.2,
    minSampleIntervalMs: 90,
    tailDurationMs: 4_400,
    staleAfterMs: 1_500,
    opacity: 0.72,
    headScale: 0.5,
  });
  scene.add(simulationTrailLayer.group);
  return simulationTrailLayer;
}

export function disposeEnvironmentVisualResources({
  cloudMaterial,
  cloudPuffGeometry,
  moonMaterial,
  rainLayer,
  snowLayer,
  starsGeometry,
  starsMaterial,
  stormCloudMaterial,
  sunDiscMaterial,
  sunHaloMaterial,
  sunsetGlowMaterial,
}: EnvironmentVisuals) {
  rainLayer.geometry.dispose();
  rainLayer.material.dispose();
  snowLayer.geometry.dispose();
  snowLayer.material.dispose();
  starsGeometry.dispose();
  starsMaterial.dispose();
  cloudPuffGeometry.dispose();
  cloudMaterial.dispose();
  stormCloudMaterial.dispose();
  sunDiscMaterial.dispose();
  sunHaloMaterial.dispose();
  sunsetGlowMaterial.dispose();
  moonMaterial.dispose();
}

export function disposeSimulatorSceneLayers({
  buildingMassGroup,
  demandVisualGroup,
  dongBoundaryGroup,
  hotspotVisualGroup,
  nonRoadGroup,
  pedestrianVisualGroup,
  poiMarkerGroup,
  roadNetworkOverlay,
  simulationTrailLayer,
  staticRoadGroup,
  trafficSignalGroup,
  transitGroup,
}: {
  buildingMassGroup: THREE.Group;
  demandVisualGroup: THREE.Group;
  dongBoundaryGroup: THREE.Group;
  hotspotVisualGroup: THREE.Group;
  nonRoadGroup: THREE.Group | null;
  pedestrianVisualGroup: THREE.Group;
  poiMarkerGroup: THREE.Group;
  roadNetworkOverlay: THREE.Group | null;
  simulationTrailLayer: DisposableTrailLayer;
  staticRoadGroup: THREE.Group;
  trafficSignalGroup: THREE.Group;
  transitGroup: THREE.Group;
}) {
  disposeOptionalGroup(nonRoadGroup);
  disposeOptionalGroup(roadNetworkOverlay);
  disposeRequiredGroup(trafficSignalGroup);
  disposeRequiredGroup(hotspotVisualGroup);
  disposeRequiredGroup(pedestrianVisualGroup);
  disposeRequiredGroup(transitGroup);
  simulationTrailLayer.clear();
  simulationTrailLayer.group.removeFromParent();
  disposeRequiredGroup(demandVisualGroup);
  disposeRequiredGroup(dongBoundaryGroup);
  disposeRequiredGroup(staticRoadGroup);
  disposeRequiredGroup(buildingMassGroup);
  disposeRequiredGroup(poiMarkerGroup);
}

export function removeSceneLabels(labelObjects: CSS2DObject[]) {
  labelObjects.forEach((label) => label.removeFromParent());
}

function disposeOptionalGroup(group: THREE.Group | null) {
  if (!group) {
    return;
  }
  disposeRequiredGroup(group);
}

function disposeRequiredGroup(group: THREE.Group) {
  group.removeFromParent();
  disposeObject3DResources(group);
}
