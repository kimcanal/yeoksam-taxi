import * as THREE from "three";
import {
  MAP_SCENE_GRID_DIVISIONS,
  MAP_SCENE_GRID_OPACITY,
  MAP_SCENE_GRID_PRIMARY_COLOR,
  MAP_SCENE_GRID_SECONDARY_COLOR,
  MAP_SCENE_GROUND_MARGIN,
  MAP_SCENE_OUTER_MASK_COLOR,
  MAP_SCENE_OUTER_MASK_OPACITY,
  MAP_SCENE_OUTER_MASK_WORLD_SIZE,
  MAP_SCENE_OUTER_MASK_Y,
} from "@/components/map-simulator/constants/map-constants";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import { createBuildingCulledLayer } from "@/components/map-simulator/scene";
import { createDemandVisualLayer } from "@/components/map-simulator/demand";
import { createDongBoundaryLayer } from "@/components/map-simulator/scene";
import { createRoadCulledLayer } from "@/components/map-simulator/scene";
import { createNonRoadSurfaceLayer } from "@/components/map-simulator/scene";
import type { SimulationData } from "@/components/map-simulator/types";

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
    new THREE.PlaneGeometry(
      mapSize.x + MAP_SCENE_GROUND_MARGIN,
      mapSize.z + MAP_SCENE_GROUND_MARGIN,
    ),
    groundMaterial,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(centerPoint.x, 0, centerPoint.z);
  ground.receiveShadow = true;

  const gridWidth = mapSize.x + MAP_SCENE_GROUND_MARGIN;
  const gridDepth = mapSize.z + MAP_SCENE_GROUND_MARGIN;
  const cellSize = Math.max(gridWidth, gridDepth) / MAP_SCENE_GRID_DIVISIONS;

  const halfW = gridWidth / 2;
  const halfD = gridDepth / 2;

  const gridGeom = new THREE.BufferGeometry();
  const gridPositions: number[] = [];
  const gridColors: number[] = [];

  const primaryGridColor = new THREE.Color(MAP_SCENE_GRID_PRIMARY_COLOR);
  const secondaryGridColor = new THREE.Color(MAP_SCENE_GRID_SECONDARY_COLOR);

  for (let x = -halfW; x <= halfW; x += cellSize) {
    const isCenter = Math.abs(x) < cellSize / 2;
    const color = isCenter ? primaryGridColor : secondaryGridColor;
    gridPositions.push(x, 0, -halfD, x, 0, halfD);
    gridColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  }

  for (let z = -halfD; z <= halfD; z += cellSize) {
    const isCenter = Math.abs(z) < cellSize / 2;
    const color = isCenter ? primaryGridColor : secondaryGridColor;
    gridPositions.push(-halfW, 0, z, halfW, 0, z);
    gridColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  }

  gridGeom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(gridPositions, 3),
  );
  gridGeom.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(gridColors, 3),
  );

  const gridMaterial = new THREE.LineBasicMaterial({
    opacity: MAP_SCENE_GRID_OPACITY,
    transparent: true,
    vertexColors: true,
  });
  const gridHelper = new THREE.LineSegments(gridGeom, gridMaterial);
  gridHelper.position.set(centerPoint.x, 0.002, centerPoint.z);

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

  const outerShape = new THREE.Shape();
  const worldSize = MAP_SCENE_OUTER_MASK_WORLD_SIZE;
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

  const maskGeometry = new THREE.ShapeGeometry(outerShape);

  const maskMaterial = new THREE.MeshBasicMaterial({
    color: MAP_SCENE_OUTER_MASK_COLOR,
    transparent: true,
    opacity: MAP_SCENE_OUTER_MASK_OPACITY,
  });

  const maskMesh = new THREE.Mesh(maskGeometry, maskMaterial);
  maskMesh.rotation.x = -Math.PI / 2;
  maskMesh.position.y = MAP_SCENE_OUTER_MASK_Y;
  maskMesh.renderOrder = 4;
  maskMesh.visible = false;

  const staticRoadLayer = createRoadCulledLayer(data.projectedRoadSegments);
  const buildingMassLayer = createBuildingCulledLayer(data.buildingMasses);

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
