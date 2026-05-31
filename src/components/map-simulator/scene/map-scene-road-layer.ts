import * as THREE from "three";
import type { ProjectedRoadSegment } from "@/components/map-simulator/types";
import {
  ROAD_LAYER_Y,
  ROAD_SURFACE_THICKNESS,
} from "@/components/map-simulator/scene";
import { distanceXZ } from "@/components/map-simulator/road";

const ROAD_CLASSES = ["arterial", "connector", "local"] as const;

function roadAngle(segment: ProjectedRoadSegment) {
  return Math.atan2(
    segment.end.x - segment.start.x,
    segment.end.z - segment.start.z,
  );
}

export function createStaticRoadLayer(roadSegments: ProjectedRoadSegment[]) {
  const dummy = new THREE.Object3D();
  const roadLayer = new THREE.Group();
  roadLayer.name = "static-road-layer";

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
  const laneMarkerMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3e9cf,
    emissive: 0x4c412d,
    emissiveIntensity: 0.06,
    roughness: 0.82,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -6,
  });

  const roadSegmentsByClass: Record<
    ProjectedRoadSegment["roadClass"],
    ProjectedRoadSegment[]
  > = {
    arterial: [],
    connector: [],
    local: [],
  };

  roadSegments.forEach((segment) => {
    if (distanceXZ(segment.start, segment.end) >= 1) {
      roadSegmentsByClass[segment.roadClass].push(segment);
    }
  });

  ROAD_CLASSES.forEach((roadClass) => {
    const segments = roadSegmentsByClass[roadClass];
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, ROAD_SURFACE_THICKNESS, 1),
      roadMaterials[roadClass],
      segments.length,
    );

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
    roadLayer.add(mesh);
  });

  const roadSheenSegments = roadSegments.filter(
    (segment) =>
      segment.roadClass !== "local" &&
      distanceXZ(segment.start, segment.end) >= 10,
  );
  const roadSheenMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.0005, 1),
    roadSheenMaterial,
    roadSheenSegments.length,
  );

  roadSheenSegments.forEach((segment, index) => {
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
    roadSheenMesh.setMatrixAt(index, dummy.matrix);
  });
  roadSheenMesh.instanceMatrix.needsUpdate = true;
  roadSheenMesh.renderOrder = 22;
  roadLayer.add(roadSheenMesh);

  const laneMarkers = roadSegments.flatMap((segment) => {
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
  const laneMarkerMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 0.0005, 1),
    laneMarkerMaterial,
    laneMarkers.length,
  );

  laneMarkers.forEach((marker, index) => {
    dummy.position.set(
      marker.center.x,
      ROAD_LAYER_Y[marker.roadClass] + ROAD_SURFACE_THICKNESS / 2 + 0.001,
      marker.center.z,
    );
    dummy.rotation.set(0, marker.angle, 0);
    dummy.scale.set(1, 1, marker.length);
    dummy.updateMatrix();
    laneMarkerMesh.setMatrixAt(index, dummy.matrix);
  });
  laneMarkerMesh.instanceMatrix.needsUpdate = true;
  roadLayer.add(laneMarkerMesh);

  return {
    group: roadLayer,
    roadMaterials,
    roadSheenMaterial,
    laneMarkerMaterial,
  };
}
