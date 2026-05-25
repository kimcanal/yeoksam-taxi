import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type {
  SceneLabelEntry,
  TaxiStandLandmark,
  TransitLandmark,
} from "@/components/map-simulator/map-simulator-types";
import { labelElement } from "@/components/map-simulator/scene-label-elements";
import { createSubwayStationStructure } from "@/components/map-simulator/transit-structure-factory";
import {
  createTaxiStandMarker,
  createTaxiStandMarkerMaterials,
} from "@/components/map-simulator/taxi-stand-marker-factory";

export function createTransitLandmarkLayer({
  showLabels,
  taxiStandLandmarks,
  transitHoverMaterial,
  transitLandmarks,
}: {
  showLabels: boolean;
  taxiStandLandmarks: TaxiStandLandmark[];
  transitHoverMaterial: THREE.MeshBasicMaterial;
  transitLandmarks: TransitLandmark[];
}) {
  const group = new THREE.Group();
  group.name = "transit-landmark-layer";
  const hoverTargets: THREE.Object3D[] = [];
  const labelObjects: CSS2DObject[] = [];
  const optionalLabelObjects: CSS2DObject[] = [];
  const optionalLabelEntries: SceneLabelEntry[] = [];

  transitLandmarks
    .filter((landmark) => landmark.category === "subway_station")
    .forEach((landmark, index) => {
      const structure = createSubwayStationStructure(
        index,
        landmark.sideSign,
        landmark.isMajor,
      );
      structure.position.copy(landmark.position);
      structure.rotation.y = landmark.yaw;
      structure.scale.setScalar(landmark.isMajor ? 1.14 : 0.94);

      const hoverTarget = new THREE.Mesh(
        new THREE.BoxGeometry(
          landmark.isMajor ? 3.8 : 3.2,
          landmark.isMajor ? 3.5 : 3,
          landmark.isMajor ? 3.6 : 3,
        ),
        transitHoverMaterial,
      );
      hoverTarget.position.set(0, landmark.isMajor ? 1.56 : 1.36, 0);
      hoverTarget.userData.transitName = landmark.name ?? "지하철역";
      structure.add(hoverTarget);
      hoverTargets.push(hoverTarget);
      group.add(structure);

      if (!landmark.name) {
        return;
      }

      const label = new CSS2DObject(labelElement(landmark.name, "transit"));
      label.position.set(
        landmark.position.x,
        landmark.isMajor ? 3.5 : 3.15,
        landmark.position.z,
      );
      label.visible = showLabels;
      labelObjects.push(label);
      optionalLabelObjects.push(label);
      optionalLabelEntries.push({
        label,
        kind: "transit",
        priority: landmark.isMajor ? 0 : 1,
        name: landmark.name,
      });
      group.add(label);
    });

  const taxiStandMarkerMaterials = createTaxiStandMarkerMaterials();
  taxiStandLandmarks.forEach((stand, index) => {
    group.add(createTaxiStandMarker(stand, index, taxiStandMarkerMaterials));
  });

  return {
    group,
    hoverTargets,
    labelObjects,
    optionalLabelObjects,
    optionalLabelEntries,
  };
}
