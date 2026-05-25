import * as THREE from "three";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand-types";
import { createBuildingMassLayer } from "@/components/map-simulator/building-mass-layer";
import { createDemandVisualLayer } from "@/components/map-simulator/demand-visual-layer";
import { createDongBoundaryLayer } from "@/components/map-simulator/dong-boundary-layer";
import { createStaticRoadLayer } from "@/components/map-simulator/map-scene-road-layer";
import { createNonRoadSurfaceLayer } from "@/components/map-simulator/non-road-surface-layer";
import type { SimulationData } from "@/components/map-simulator/map-simulator-types";

export type MapSceneGeometry = ReturnType<typeof createMapSceneGeometry>;

export function createMapSceneGeometry({
  centerPoint,
  data,
  dongBoundaryWallHeight,
  mapSize,
  poiFeatureRows,
}: {
  centerPoint: THREE.Vector3;
  data: SimulationData;
  dongBoundaryWallHeight: number;
  mapSize: THREE.Vector3;
  poiFeatureRows: MapPoiFeatureRow[];
}) {
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x202327,
    roughness: 0.98,
    metalness: 0.01,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(mapSize.x + 120, mapSize.z + 120),
    groundMaterial,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(centerPoint.x, 0, centerPoint.z);
  ground.receiveShadow = true;

  const gridHelper = new THREE.GridHelper(
    Math.max(mapSize.x, mapSize.z) + 120,
    180,
    0x3a4556,
    0x2a3546
  );
  gridHelper.position.set(centerPoint.x, 0.002, centerPoint.z);
  gridHelper.material.opacity = 0.45;
  gridHelper.material.transparent = true;

  const demandVisualLayer = createDemandVisualLayer({
    center: data.center,
    dongRegions: data.dongRegions,
    poiFeatureRows,
    taxiStandLandmarks: data.taxiStandLandmarks,
  });

  const nonRoadGroup = createNonRoadSurfaceLayer({
    center: data.center,
    nonRoad: data.nonRoad,
  });

  const dongBoundaryLayer = createDongBoundaryLayer({
    boundarySegments: data.dongBoundarySegments,
    wallHeight: dongBoundaryWallHeight,
  });

  // Create an inverted mask to hide areas outside the target dongs
  const outerShape = new THREE.Shape();
  const worldSize = 20000;
  outerShape.moveTo(-worldSize, -worldSize);
  outerShape.lineTo(worldSize, -worldSize);
  outerShape.lineTo(worldSize, worldSize);
  outerShape.lineTo(-worldSize, worldSize);
  outerShape.lineTo(-worldSize, -worldSize);

  data.dongRegions.forEach((dong) => {
    dong.rings.forEach((ring) => {
      const holePath = new THREE.Path();
      if (ring.length > 0) {
        holePath.moveTo(ring[0].x, ring[0].z);
        for (let i = 1; i < ring.length; i++) {
          holePath.lineTo(ring[i].x, ring[i].z);
        }
        outerShape.holes.push(holePath);
      }
    });
  });

  const maskGeometry = new THREE.ExtrudeGeometry(outerShape, {
    depth: 60,
    bevelEnabled: false,
  });
  
  const maskMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a1420, // Match the dark background aesthetic
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });

  const maskMesh = new THREE.Mesh(maskGeometry, maskMaterial);
  maskMesh.rotation.x = -Math.PI / 2; // Lay flat: Extrusion depth points to -Y
  maskMesh.position.y = 50; // Cover from Y=50 down to Y=-10
  maskMesh.renderOrder = 40;

  const staticRoadLayer = createStaticRoadLayer(data.projectedRoadSegments);
  const buildingMassLayer = createBuildingMassLayer(data.buildingMasses);

  return {
    ground,
    groundMaterial,
    gridHelper,
    maskMesh,
    demandVisualLayer,
    nonRoadGroup,
    dongBoundaryLayer,
    staticRoadLayer,
    buildingMassLayer,
  };
}
