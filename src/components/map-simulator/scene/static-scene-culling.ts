import * as THREE from "three";
import {
  ROAD_LAYER_Y,
  ROAD_SURFACE_DECAL_THICKNESS,
  ROAD_SURFACE_DECAL_Y_OFFSET,
  ROAD_SURFACE_THICKNESS,
} from "@/components/map-simulator/scene/scene-constants";
import { distanceXZ } from "@/components/map-simulator/road";
import {
  type BuildingMass,
  type ProjectedRoadSegment,
} from "@/components/map-simulator/types";

type StaticCulledLayer = {
  group: THREE.Group;
  getVisibilityStats: () => StaticCullingStats;
  updateVisibility: (camera: THREE.Camera) => void;
};

export type StaticCullingStats = {
  total: number;
  visible: number;
};

type ChunkBounds = {
  sphere: THREE.Sphere;
};

type BuildingChunk = ChunkBounds & {
  group: THREE.Group;
};

type RoadChunk = ChunkBounds & {
  group: THREE.Group;
};

const BUILDING_CHUNK_SIZE = 112;
const BUILDING_CHUNK_VISIBILITY_PADDING = 44;
const ROAD_CHUNK_SIZE = 144;
const ROAD_CHUNK_VISIBILITY_PADDING = 72;

function chunkKey(x: number, z: number, size: number) {
  return `${Math.floor(x / size)}:${Math.floor(z / size)}`;
}

function computeChunkSphere(points: THREE.Vector3[], padding = 0) {
  const bounds = new THREE.Box3();
  points.forEach((point) => bounds.expandByPoint(point));
  bounds.expandByScalar(padding);
  return bounds.getBoundingSphere(new THREE.Sphere());
}

function updateFrustum(
  camera: THREE.Camera,
  projectionMatrix: THREE.Matrix4,
  frustum: THREE.Frustum,
) {
  const isCameraValid = camera.projectionMatrix.elements[0] !== 0;
  if (!isCameraValid) {
    return false;
  }

  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  projectionMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  frustum.setFromProjectionMatrix(projectionMatrix);
  return true;
}

function createBuildingChunkMesh(
  buildings: BuildingMass[],
  buildingMaterial: THREE.MeshStandardMaterial,
  buildingRoofMaterial: THREE.MeshStandardMaterial,
) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();

  const buildingMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    buildingMaterial,
    buildings.length,
  );
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;
  buildingMesh.frustumCulled = false;

  const buildingRoofMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    buildingRoofMaterial,
    buildings.length,
  );
  buildingRoofMesh.castShadow = true;
  buildingRoofMesh.receiveShadow = true;
  buildingRoofMesh.frustumCulled = false;

  buildings.forEach((building, index) => {
    dummy.position.set(
      building.position.x,
      building.height / 2,
      building.position.z,
    );
    dummy.rotation.set(0, building.rotationY, 0);
    dummy.scale.set(building.width, building.height, building.depth);
    dummy.updateMatrix();
    buildingMesh.setMatrixAt(index, dummy.matrix);
    buildingMesh.setColorAt(index, new THREE.Color(building.color));

    dummy.position.set(
      building.position.x,
      building.height + 0.12,
      building.position.z,
    );
    dummy.rotation.set(0, building.rotationY, 0);
    dummy.scale.set(
      Math.max(0.72, building.width * 0.92),
      0.24,
      Math.max(0.72, building.depth * 0.92),
    );
    dummy.updateMatrix();
    buildingRoofMesh.setMatrixAt(index, dummy.matrix);
  });

  buildingMesh.instanceMatrix.needsUpdate = true;
  if (buildingMesh.instanceColor) {
    buildingMesh.instanceColor.needsUpdate = true;
  }
  buildingRoofMesh.instanceMatrix.needsUpdate = true;
  buildingRoofMesh.renderOrder = 8;

  group.add(buildingMesh);
  group.add(buildingRoofMesh);
  return group;
}

function roadAngle(segment: ProjectedRoadSegment) {
  return Math.atan2(
    segment.end.x - segment.start.x,
    segment.end.z - segment.start.z,
  );
}

function createRoadMesh(
  segments: ProjectedRoadSegment[],
  material: THREE.MeshStandardMaterial,
  roadClass: "arterial" | "connector" | "local",
) {
  if (!segments.length) {
    return null;
  }

  const dummy = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, ROAD_SURFACE_THICKNESS, 1),
    material,
    segments.length,
  );
  mesh.frustumCulled = false;

  segments.forEach((segment, index) => {
    const length = distanceXZ(segment.start, segment.end);
    const center = segment.start.clone().lerp(segment.end, 0.5);
    dummy.position.set(center.x, ROAD_LAYER_Y[roadClass], center.z);
    dummy.rotation.set(0, roadAngle(segment), 0);
    dummy.scale.set(segment.width, 1, length + 1.2);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.renderOrder =
    roadClass === "arterial" ? 20 : roadClass === "connector" ? 10 : 0;
  return mesh;
}

function createRoadSheenMesh(
  segments: ProjectedRoadSegment[],
  material: THREE.MeshStandardMaterial,
) {
  const filtered = segments.filter(
    (segment) =>
      segment.roadClass !== "local" &&
      distanceXZ(segment.start, segment.end) >= 10,
  );
  if (!filtered.length) {
    return null;
  }

  const dummy = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.0005, 1),
    material,
    filtered.length,
  );
  mesh.frustumCulled = false;

  filtered.forEach((segment, index) => {
    const length = distanceXZ(segment.start, segment.end);
    const center = segment.start.clone().lerp(segment.end, 0.5);
    const widthScale = segment.roadClass === "arterial" ? 0.62 : 0.54;
    dummy.position.set(
      center.x,
      ROAD_LAYER_Y[segment.roadClass] + ROAD_SURFACE_THICKNESS / 2 + 0.0005,
      center.z,
    );
    dummy.rotation.set(0, roadAngle(segment), 0);
    dummy.scale.set(segment.width * widthScale, 1, length + 0.8);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.renderOrder = 22;
  return mesh;
}

function createLaneMarkerMesh(
  segments: ProjectedRoadSegment[],
  material: THREE.MeshStandardMaterial,
) {
  const markers = segments.flatMap((segment) => {
    if (segment.roadClass === "local") {
      return [];
    }
    const length = distanceXZ(segment.start, segment.end);
    if (length < 12) {
      return [];
    }
    const dashLength = segment.roadClass === "arterial" ? 4.8 : 3.7;
    const gapLength = segment.roadClass === "arterial" ? 4.2 : 3.5;
    const markerCount = Math.max(
      1,
      Math.floor((length - 4) / (dashLength + gapLength)),
    );

    return Array.from({ length: markerCount }, (_, markerIndex) => {
      const dashCenter = Math.min(
        length - dashLength * 0.5 - 2,
        2 + markerIndex * (dashLength + gapLength) + dashLength * 0.5,
      );
      return {
        center: segment.start.clone().lerp(segment.end, dashCenter / length),
        angle: roadAngle(segment),
        length: dashLength,
        roadClass: segment.roadClass,
      };
    });
  });

  if (!markers.length) {
    return null;
  }

  const dummy = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, ROAD_SURFACE_DECAL_THICKNESS, 1),
    material,
    markers.length,
  );
  mesh.frustumCulled = false;

  markers.forEach((marker, index) => {
    dummy.position.set(
      marker.center.x,
      ROAD_LAYER_Y[marker.roadClass] +
        ROAD_SURFACE_THICKNESS / 2 +
        ROAD_SURFACE_DECAL_Y_OFFSET,
      marker.center.z,
    );
    dummy.rotation.set(0, marker.angle, 0);
    dummy.scale.set(1, 1, marker.length);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function createBuildingCulledLayer(
  buildingMasses: BuildingMass[],
): StaticCulledLayer & {
  buildingMaterial: THREE.MeshStandardMaterial;
  buildingRoofMaterial: THREE.MeshStandardMaterial;
} {
  const root = new THREE.Group();
  root.name = "building-culled-layer";

  const buildingMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.98,
    metalness: 0.02,
    emissive: 0x171b20,
    emissiveIntensity: 0.025,
  });

  const buildingRoofMaterial = new THREE.MeshStandardMaterial({
    color: 0xdce8f0,
    emissive: 0x1a2a3a,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.52,
    roughness: 0.62,
    metalness: 0.08,
    depthWrite: false,
  });

  const chunked = new Map<string, BuildingMass[]>();
  buildingMasses.forEach((building) => {
    const key = chunkKey(
      building.position.x,
      building.position.z,
      BUILDING_CHUNK_SIZE,
    );
    const items = chunked.get(key) ?? [];
    items.push(building);
    chunked.set(key, items);
  });

  const chunks: BuildingChunk[] = [...chunked.values()].map((buildings) => {
    const group = createBuildingChunkMesh(
      buildings,
      buildingMaterial,
      buildingRoofMaterial,
    );
    const boundingPoints = buildings.flatMap((b) => [
      b.position,
      new THREE.Vector3(b.position.x, b.height, b.position.z),
    ]);
    const sphere = computeChunkSphere(
      boundingPoints,
      BUILDING_CHUNK_VISIBILITY_PADDING,
    );
    root.add(group);
    return { group, sphere };
  });

  const projectionMatrix = new THREE.Matrix4();
  const frustum = new THREE.Frustum();
  const visibilityStats: StaticCullingStats = {
    total: chunks.length,
    visible: chunks.length,
  };

  return {
    group: root,
    buildingMaterial,
    buildingRoofMaterial,
    getVisibilityStats() {
      return visibilityStats;
    },
    updateVisibility(camera) {
      if (!updateFrustum(camera, projectionMatrix, frustum)) {
        return;
      }

      let visible = 0;
      chunks.forEach((chunk) => {
        const isVisible = frustum.intersectsSphere(chunk.sphere);
        chunk.group.visible = isVisible;
        if (isVisible) {
          visible += 1;
        }
      });
      visibilityStats.visible = visible;
    },
  };
}

export function createRoadCulledLayer(
  roadSegments: ProjectedRoadSegment[],
): StaticCulledLayer & {
  roadMaterials: Record<"arterial" | "connector" | "local", THREE.MeshStandardMaterial>;
  roadSheenMaterial: THREE.MeshStandardMaterial;
  laneMarkerMaterial: THREE.MeshStandardMaterial;
} {
  const root = new THREE.Group();
  root.name = "road-culled-layer";

  const roadMaterials = {
    arterial: new THREE.MeshStandardMaterial({
      color: 0x8fa0ad,
      roughness: 0.88,
      metalness: 0.02,
      emissive: 0x111e29,
      emissiveIntensity: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    connector: new THREE.MeshStandardMaterial({
      color: 0x6b7d89,
      roughness: 0.92,
      metalness: 0.01,
      emissive: 0x0c1620,
      emissiveIntensity: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    local: new THREE.MeshStandardMaterial({
      color: 0x465261,
      roughness: 0.97,
      metalness: 0.01,
      polygonOffset: true,
      polygonOffsetFactor: 0,
      polygonOffsetUnits: 0,
    }),
  };

  const roadSheenMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8e2ec,
    transparent: true,
    opacity: 0,
    roughness: 0.16,
    metalness: 0.1,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  roadSheenMaterial.visible = false;

  const laneMarkerMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3e9cf,
    emissive: 0x4c412d,
    emissiveIntensity: 0.06,
    roughness: 0.82,
    depthWrite: false,
    depthTest: false,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -6,
  });

  const chunked = new Map<string, ProjectedRoadSegment[]>();
  roadSegments.forEach((segment) => {
    const center = segment.start.clone().lerp(segment.end, 0.5);
    const key = chunkKey(center.x, center.z, ROAD_CHUNK_SIZE);
    const items = chunked.get(key) ?? [];
    items.push(segment);
    chunked.set(key, items);
  });

  const chunks: RoadChunk[] = [...chunked.values()].map((segments) => {
    const group = new THREE.Group();
    const byClass = {
      arterial: segments.filter((segment) => segment.roadClass === "arterial"),
      connector: segments.filter((segment) => segment.roadClass === "connector"),
      local: segments.filter((segment) => segment.roadClass === "local"),
    };
    const arterial = createRoadMesh(
      byClass.arterial,
      roadMaterials.arterial,
      "arterial",
    );
    const connector = createRoadMesh(
      byClass.connector,
      roadMaterials.connector,
      "connector",
    );
    const local = createRoadMesh(byClass.local, roadMaterials.local, "local");
    const roadSheen = createRoadSheenMesh(segments, roadSheenMaterial);
    const laneMarkers = createLaneMarkerMesh(segments, laneMarkerMaterial);

    if (arterial) group.add(arterial);
    if (connector) group.add(connector);
    if (local) group.add(local);
    if (roadSheen) group.add(roadSheen);
    if (laneMarkers) group.add(laneMarkers);

    const sphere = computeChunkSphere(
      segments.flatMap((segment) => [segment.start, segment.end]),
      ROAD_CHUNK_VISIBILITY_PADDING,
    );
    root.add(group);
    return { group, sphere };
  });

  const projectionMatrix = new THREE.Matrix4();
  const frustum = new THREE.Frustum();
  const visibilityStats: StaticCullingStats = {
    total: chunks.length,
    visible: chunks.length,
  };

  return {
    group: root,
    roadMaterials,
    roadSheenMaterial,
    laneMarkerMaterial,
    getVisibilityStats() {
      return visibilityStats;
    },
    updateVisibility(camera) {
      if (!updateFrustum(camera, projectionMatrix, frustum)) {
        return;
      }

      let visible = 0;
      chunks.forEach((chunk) => {
        const isVisible = frustum.intersectsSphere(chunk.sphere);
        chunk.group.visible = isVisible;
        if (isVisible) {
          visible += 1;
        }
      });
      visibilityStats.visible = visible;
    },
  };
}
