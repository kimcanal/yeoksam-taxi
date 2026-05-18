import * as THREE from "three";
import { ROAD_LAYER_Y } from "@/components/map-simulator/scene-constants";
import {
  distanceXZ,
  type BuildingMass,
  type ProjectedRoadSegment,
} from "@/components/map-simulator/core";

type StaticLodLayer = {
  root: THREE.Group;
  updateVisibility: (camera: THREE.Camera) => void;
};

type ChunkBounds = {
  center: THREE.Vector3;
  radius: number;
};

type BuildingChunk = ChunkBounds & {
  group: THREE.Group;
  high: THREE.InstancedMesh | null;
  medium: THREE.InstancedMesh | null;
  low: THREE.InstancedMesh | null;
};

type RoadChunk = ChunkBounds & {
  group: THREE.Group;
  arterial: THREE.InstancedMesh | null;
  connector: THREE.InstancedMesh | null;
  local: THREE.InstancedMesh | null;
  laneMarkers: THREE.InstancedMesh | null;
};

const BUILDING_CHUNK_SIZE = 84;
const ROAD_CHUNK_SIZE = 120;

function chunkKey(x: number, z: number, size: number) {
  return `${Math.floor(x / size)}:${Math.floor(z / size)}`;
}

function computeChunkBounds(points: THREE.Vector3[], padding = 0) {
  const bounds = new THREE.Box3();
  points.forEach((point) => bounds.expandByPoint(point));
  bounds.expandByScalar(padding);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  return {
    center: sphere.center.clone(),
    radius: sphere.radius,
  };
}

function createBuildingMesh(
  items: BuildingMass[],
  material: THREE.MeshStandardMaterial,
  filter: (item: BuildingMass, index: number) => boolean,
  scaleHeight = 1,
) {
  const selected = items.filter(filter);
  if (!selected.length) {
    return null;
  }

  const dummy = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    material,
    selected.length,
  );
  mesh.frustumCulled = false;

  selected.forEach((building, index) => {
    dummy.position.set(
      building.position.x,
      (building.height * scaleHeight) / 2,
      building.position.z,
    );
    dummy.rotation.set(0, building.rotationY, 0);
    dummy.scale.set(
      building.width,
      Math.max(4, building.height * scaleHeight),
      building.depth,
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, new THREE.Color(building.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }

  return mesh;
}

function createRoadMesh(
  segments: ProjectedRoadSegment[],
  material: THREE.MeshStandardMaterial,
  roadClass: keyof typeof ROAD_LAYER_Y,
) {
  if (!segments.length) {
    return null;
  }

  const dummy = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.25, 1),
    material,
    segments.length,
  );
  mesh.frustumCulled = false;

  segments.forEach((segment, index) => {
    const length = distanceXZ(segment.start, segment.end);
    const center = segment.start.clone().lerp(segment.end, 0.5);
    const angle = Math.atan2(
      segment.end.x - segment.start.x,
      segment.end.z - segment.start.z,
    );
    dummy.position.set(center.x, ROAD_LAYER_Y[roadClass], center.z);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(segment.width, 1, length + 1.2);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.renderOrder =
    roadClass === "arterial" ? 20 : roadClass === "connector" ? 10 : 0;
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
    const angle = Math.atan2(
      segment.end.x - segment.start.x,
      segment.end.z - segment.start.z,
    );
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
        angle,
        length: dashLength,
      };
    });
  });

  if (!markers.length) {
    return null;
  }

  const dummy = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 0.03, 1),
    material,
    markers.length,
  );
  mesh.frustumCulled = false;

  markers.forEach((marker, index) => {
    dummy.position.set(marker.center.x, 0.16, marker.center.z);
    dummy.rotation.set(0, marker.angle, 0);
    dummy.scale.set(1, 1, marker.length);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function createBuildingLodLayer(
  buildingMasses: BuildingMass[],
  material: THREE.MeshStandardMaterial,
): StaticLodLayer {
  const root = new THREE.Group();
  root.name = "building-lod-layer";
  const chunked = new Map<string, BuildingMass[]>();

  buildingMasses.forEach((building) => {
    const key = chunkKey(building.position.x, building.position.z, BUILDING_CHUNK_SIZE);
    const items = chunked.get(key) ?? [];
    items.push(building);
    chunked.set(key, items);
  });

  const chunks: BuildingChunk[] = [...chunked.values()].map((items) => {
    const group = new THREE.Group();
    const points = items.map((item) => item.position);
    const bounds = computeChunkBounds(points, 28);
    const high = createBuildingMesh(items, material, () => true, 1);
    const medium = createBuildingMesh(
      items,
      material,
      (item, index) => index % 2 === 0 || item.height > 22,
      0.94,
    );
    const low = createBuildingMesh(
      items,
      material,
      (item, index) => index % 4 === 0 || item.height > 34,
      0.86,
    );

    if (high) group.add(high);
    if (medium) {
      medium.visible = false;
      group.add(medium);
    }
    if (low) {
      low.visible = false;
      group.add(low);
    }
    root.add(group);

    return {
      ...bounds,
      group,
      high,
      medium,
      low,
    };
  });

  const projectionMatrix = new THREE.Matrix4();
  const frustum = new THREE.Frustum();

  return {
    root,
    updateVisibility(camera) {
      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      projectionMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(projectionMatrix);
      const visibility = chunks.map((chunk) =>
        frustum.intersectsSphere(new THREE.Sphere(chunk.center, chunk.radius + 12)),
      );
      const disableFrustumCulling = !visibility.some(Boolean);

      chunks.forEach((chunk, index) => {
        const inView = disableFrustumCulling || visibility[index]!;
        chunk.group.visible = inView;
        if (!inView) {
          return;
        }

        const distance = Math.max(
          0,
          camera.position.distanceTo(chunk.center) - chunk.radius,
        );
        const showHigh = distance < 180;
        const showMedium = !showHigh && distance < 360;
        const showLow = !showHigh && !showMedium && distance < 520;

        if (chunk.high) {
          chunk.high.visible = showHigh;
        }
        if (chunk.medium) {
          chunk.medium.visible = showMedium;
        }
        if (chunk.low) {
          chunk.low.visible = showLow;
        }
      });
    },
  };
}

export function createRoadLodLayer(
  roadSegments: ProjectedRoadSegment[],
  roadMaterials: Record<"arterial" | "connector" | "local", THREE.MeshStandardMaterial>,
  laneMarkerMaterial: THREE.MeshStandardMaterial,
): StaticLodLayer {
  const root = new THREE.Group();
  root.name = "road-lod-layer";
  const chunked = new Map<string, ProjectedRoadSegment[]>();

  roadSegments.forEach((segment) => {
    const center = segment.start.clone().lerp(segment.end, 0.5);
    const key = chunkKey(center.x, center.z, ROAD_CHUNK_SIZE);
    const items = chunked.get(key) ?? [];
    items.push(segment);
    chunked.set(key, items);
  });

  const chunks: RoadChunk[] = [...chunked.values()].map((items) => {
    const group = new THREE.Group();
    const points = items.flatMap((segment) => [segment.start, segment.end]);
    const bounds = computeChunkBounds(points, 36);
    const byClass = {
      arterial: items.filter((segment) => segment.roadClass === "arterial"),
      connector: items.filter((segment) => segment.roadClass === "connector"),
      local: items.filter((segment) => segment.roadClass === "local"),
    };
    const arterial = createRoadMesh(byClass.arterial, roadMaterials.arterial, "arterial");
    const connector = createRoadMesh(byClass.connector, roadMaterials.connector, "connector");
    const local = createRoadMesh(byClass.local, roadMaterials.local, "local");
    const laneMarkers = createLaneMarkerMesh(items, laneMarkerMaterial);

    if (arterial) group.add(arterial);
    if (connector) group.add(connector);
    if (local) group.add(local);
    if (laneMarkers) group.add(laneMarkers);
    root.add(group);

    return {
      ...bounds,
      group,
      arterial,
      connector,
      local,
      laneMarkers,
    };
  });

  const projectionMatrix = new THREE.Matrix4();
  const frustum = new THREE.Frustum();

  return {
    root,
    updateVisibility(camera) {
      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      projectionMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(projectionMatrix);
      const visibility = chunks.map((chunk) =>
        frustum.intersectsSphere(new THREE.Sphere(chunk.center, chunk.radius + 16)),
      );
      const disableFrustumCulling = !visibility.some(Boolean);

      chunks.forEach((chunk, index) => {
        const inView = disableFrustumCulling || visibility[index]!;
        chunk.group.visible = inView;
        if (!inView) {
          return;
        }

        const distance = Math.max(
          0,
          camera.position.distanceTo(chunk.center) - chunk.radius,
        );
        if (chunk.arterial) {
          chunk.arterial.visible = distance < 760;
        }
        if (chunk.connector) {
          chunk.connector.visible = distance < 420;
        }
        if (chunk.local) {
          chunk.local.visible = distance < 240;
        }
        if (chunk.laneMarkers) {
          chunk.laneMarkers.visible = distance < 220;
        }
      });
    },
  };
}
