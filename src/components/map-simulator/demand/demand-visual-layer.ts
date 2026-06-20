import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  buildDemandAnchors,
  type DemandAnchor,
} from "@/components/map-simulator/demand";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import { dongShapeFromRing } from "@/components/map-simulator/utils";
import type {
  DongRegion,
  TaxiStandLandmark,
} from "@/components/map-simulator/types";

export type DemandVisualLayer = {
  group: THREE.Group;
  dongFloorGroup: THREE.Group;
  demandAnchors: DemandAnchor[];
  demandAnchorColumnMaterial: THREE.MeshBasicMaterial;
  demandAnchorColumnMesh: THREE.InstancedMesh;
  demandAnchorRingMaterial: THREE.MeshBasicMaterial;
  demandAnchorRingMesh: THREE.InstancedMesh;
  demandPulseGroup: THREE.Group;
  demandPulseMaterial: THREE.MeshBasicMaterial;
  demandPulseCoreMaterial: THREE.MeshBasicMaterial;
  demandPulseRing: THREE.Mesh;
  demandPulseCore: THREE.Mesh;
  demandBadgeElement: HTMLDivElement;
  demandBadgeLabel: CSS2DObject;
  dongRegions: DongRegion[];
  color: THREE.Color;
  anchorColor: THREE.Color;
  baseColor: THREE.Color;
  peakColor: THREE.Color;
  standColor: THREE.Color;
  lastBadgeText: string;
};

type CreateDemandVisualLayerParams = {
  center: { lat: number; lon: number };
  dongRegions: DongRegion[];
  poiFeatureRows: MapPoiFeatureRow[];
  taxiStandLandmarks: TaxiStandLandmark[];
};

const DONG_PICK_Y = 0.028;

export type DemandVisualLayerState = {
  selectedDongName: string;
  hasDemandData: boolean;
  demandScore: number;
  fiveMinuteDemand: number;
  visualUnits: number;
  elapsedTime: number;
};

export function createDemandVisualLayer({
  center,
  dongRegions,
  poiFeatureRows,
  taxiStandLandmarks,
}: CreateDemandVisualLayerParams): DemandVisualLayer {
  const dummy = new THREE.Object3D();
  const group = new THREE.Group();
  group.name = "demand-visual-layer";
  const dongFloorGroup = new THREE.Group();
  dongFloorGroup.name = "dong-pick-layer";
  const dongPickMaterial = new THREE.MeshBasicMaterial();

  dongRegions.forEach((dong) => {
    dong.rings.forEach((ring) => {
      const shape = dongShapeFromRing(ring);
      if (!shape) {
        return;
      }

      const fill = new THREE.Mesh(new THREE.ShapeGeometry(shape), dongPickMaterial);
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = DONG_PICK_Y;
      fill.userData.dongName = dong.name;
      fill.updateMatrixWorld(true);
      dongFloorGroup.add(fill);
    });
  });
  dongFloorGroup.updateMatrixWorld(true);

  const demandPulseGroup = new THREE.Group();
  demandPulseGroup.name = "demand-pulse-layer";
  demandPulseGroup.visible = false;
  const demandPulseMaterial = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const demandPulseRing = new THREE.Mesh(
    new THREE.RingGeometry(10, 12.5, 96),
    demandPulseMaterial,
  );
  demandPulseRing.rotation.x = -Math.PI / 2;
  demandPulseRing.position.y = 0.48;
  demandPulseRing.renderOrder = 42;
  demandPulseRing.visible = false;
  demandPulseGroup.add(demandPulseRing);

  const demandPulseCoreMaterial = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const demandPulseCore = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 64),
    demandPulseCoreMaterial,
  );
  demandPulseCore.rotation.x = -Math.PI / 2;
  demandPulseCore.position.y = 0.5;
  demandPulseCore.renderOrder = 41;
  demandPulseCore.visible = false;
  demandPulseGroup.add(demandPulseCore);

  const demandBadgeElement = document.createElement("div");
  demandBadgeElement.className = "scene-label scene-label-demand";
  demandBadgeElement.style.pointerEvents = "none";
  demandBadgeElement.style.border = "1.5px solid #22d3ee";
  demandBadgeElement.style.background = "rgba(8,18,29,0.82)";
  demandBadgeElement.style.color = "#d8f7ff";
  demandBadgeElement.style.boxShadow =
    "0 0 0 1px rgba(34,211,238,0.18), 0 10px 24px rgba(0,0,0,0.45)";
  demandBadgeElement.style.fontWeight = "650";
  demandBadgeElement.style.fontSize = "11px";
  demandBadgeElement.style.letterSpacing = "0";
  demandBadgeElement.style.padding = "5px 10px";
  demandBadgeElement.style.borderRadius = "999px";
  demandBadgeElement.style.whiteSpace = "nowrap";
  const demandBadgeLabel = new CSS2DObject(demandBadgeElement);
  demandBadgeLabel.position.set(0, 4.4, 0);
  demandBadgeLabel.visible = false;
  demandPulseGroup.add(demandBadgeLabel);
  group.add(demandPulseGroup);

  const demandAnchors = buildDemandAnchors({
    poiFeatureRows,
    taxiStandLandmarks,
    dongRegions,
    center,
  });
  const demandAnchorColumnMaterial = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const demandAnchorColumnMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.5, 0.76, 1, 24),
    demandAnchorColumnMaterial,
    demandAnchors.length,
  );
  const demandAnchorRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const demandAnchorRingMesh = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.9, 1.14, 44),
    demandAnchorRingMaterial,
    demandAnchors.length,
  );
  demandAnchors.forEach((anchor, index) => {
    dummy.position.set(anchor.position.x, -20, anchor.position.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0.001, 0.001, 0.001);
    dummy.updateMatrix();
    demandAnchorColumnMesh.setMatrixAt(index, dummy.matrix);
    demandAnchorColumnMesh.setColorAt(index, new THREE.Color(0x38bdf8));

    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    demandAnchorRingMesh.setMatrixAt(index, dummy.matrix);
    demandAnchorRingMesh.setColorAt(index, new THREE.Color(0x38bdf8));
  });
  demandAnchorColumnMesh.instanceMatrix.needsUpdate = true;
  demandAnchorRingMesh.instanceMatrix.needsUpdate = true;
  if (demandAnchorColumnMesh.instanceColor) {
    demandAnchorColumnMesh.instanceColor.needsUpdate = true;
  }
  if (demandAnchorRingMesh.instanceColor) {
    demandAnchorRingMesh.instanceColor.needsUpdate = true;
  }
  demandAnchorColumnMesh.renderOrder = 45;
  demandAnchorRingMesh.renderOrder = 44;
  group.add(demandAnchorRingMesh);
  group.add(demandAnchorColumnMesh);

  return {
    group,
    dongFloorGroup,
    demandAnchors,
    demandAnchorColumnMaterial,
    demandAnchorColumnMesh,
    demandAnchorRingMaterial,
    demandAnchorRingMesh,
    demandPulseGroup,
    demandPulseMaterial,
    demandPulseCoreMaterial,
    demandPulseRing,
    demandPulseCore,
    demandBadgeElement,
    demandBadgeLabel,
    dongRegions,
    color: new THREE.Color(),
    anchorColor: new THREE.Color(),
    baseColor: new THREE.Color(0x38bdf8),
    peakColor: new THREE.Color(0xfb7185),
    standColor: new THREE.Color(0xfacc15),
    lastBadgeText: "",
  };
}

export function updateDemandVisualLayer(
  layer: DemandVisualLayer,
  {
    selectedDongName,
    hasDemandData,
    demandScore,
    fiveMinuteDemand,
    visualUnits,
    elapsedTime,
  }: DemandVisualLayerState,
) {
  const dummy = new THREE.Object3D();
  const activeDong = layer.dongRegions.find(
    (dong) => dong.name === selectedDongName,
  );
  const isVisible = Boolean(activeDong && hasDemandData);
  const pulse = (Math.sin(elapsedTime * 2.4) + 1) * 0.5;

  layer.color.copy(layer.baseColor).lerp(layer.peakColor, demandScore);

  layer.demandAnchorColumnMaterial.opacity = isVisible
    ? 0.14 + demandScore * 0.2
    : 0;
  layer.demandAnchorRingMaterial.opacity = isVisible
    ? 0.12 + demandScore * 0.18
    : 0;
  layer.demandAnchors.forEach((anchor, index) => {
    const isActive = isVisible && anchor.dongNames.includes(selectedDongName);
    if (isActive) {
      const anchorIntensity =
        (0.45 + demandScore * 0.55) * (0.58 + anchor.score * 0.42);
      const height =
        0.48 + anchorIntensity * 2.15 + Math.min(visualUnits, 14) * 0.08;
      const radius =
        1.18 + anchor.score * 0.58 + demandScore * 0.62 + pulse * 0.08;

      layer.anchorColor
        .copy(anchor.kind === "stand" ? layer.standColor : layer.color)
        .lerp(layer.peakColor, demandScore * 0.34);

      dummy.position.set(anchor.position.x, height / 2 + 0.16, anchor.position.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(
        0.56 + anchor.score * 0.18,
        height,
        0.56 + anchor.score * 0.18,
      );
      dummy.updateMatrix();
      layer.demandAnchorColumnMesh.setMatrixAt(index, dummy.matrix);
      layer.demandAnchorColumnMesh.setColorAt(index, layer.anchorColor);

      dummy.position.set(anchor.position.x, 0.38, anchor.position.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(radius, radius, 1);
      dummy.updateMatrix();
      layer.demandAnchorRingMesh.setMatrixAt(index, dummy.matrix);
      layer.demandAnchorRingMesh.setColorAt(index, layer.anchorColor);
      return;
    }

    dummy.position.set(anchor.position.x, -20, anchor.position.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0.001, 0.001, 0.001);
    dummy.updateMatrix();
    layer.demandAnchorColumnMesh.setMatrixAt(index, dummy.matrix);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    layer.demandAnchorRingMesh.setMatrixAt(index, dummy.matrix);
  });
  layer.demandAnchorColumnMesh.instanceMatrix.needsUpdate = true;
  layer.demandAnchorRingMesh.instanceMatrix.needsUpdate = true;
  if (layer.demandAnchorColumnMesh.instanceColor) {
    layer.demandAnchorColumnMesh.instanceColor.needsUpdate = true;
  }
  if (layer.demandAnchorRingMesh.instanceColor) {
    layer.demandAnchorRingMesh.instanceColor.needsUpdate = true;
  }

  layer.demandPulseGroup.visible = isVisible;
  layer.demandBadgeLabel.visible = isVisible;
  if (!isVisible || !activeDong) {
    return;
  }

  layer.demandPulseGroup.position.set(
    activeDong.position.x,
    0,
    activeDong.position.z,
  );
  const ringScale =
    1.02 + demandScore * 0.62 + Math.min(visualUnits, 12) * 0.025 + pulse * 0.045;
  const coreScale = 0.82 + demandScore * 0.34 + pulse * 0.035;
  layer.demandPulseRing.scale.set(ringScale, ringScale, 1);
  layer.demandPulseCore.scale.set(coreScale, coreScale, 1);
  layer.demandPulseMaterial.color.copy(layer.color);
  layer.demandPulseCoreMaterial.color.copy(layer.color);
  layer.demandPulseMaterial.opacity = 0.12 + demandScore * 0.18 + pulse * 0.035;
  layer.demandPulseCoreMaterial.opacity =
    0.04 + demandScore * 0.1 + pulse * 0.02;

  const nextBadgeText = `${selectedDongName} · 수요 ${Math.round(fiveMinuteDemand).toLocaleString("ko-KR")}건/h`;
  if (nextBadgeText !== layer.lastBadgeText) {
    layer.demandBadgeElement.textContent = nextBadgeText;
    layer.lastBadgeText = nextBadgeText;
  }
}
