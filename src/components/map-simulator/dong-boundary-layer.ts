import * as THREE from "three";
import type { DongBoundarySegment } from "@/components/map-simulator/map-simulator-types";

export function createDongBoundaryLayer({
  boundarySegments,
  wallHeight,
}: {
  boundarySegments: DongBoundarySegment[];
  wallHeight: number;
}) {
  const dummy = new THREE.Object3D();
  const group = new THREE.Group();
  group.name = "dong-boundary-layer";

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x6dbb9b,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const glowMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.035, 1),
    glowMaterial,
    boundarySegments.length,
  );

  boundarySegments.forEach((segment, index) => {
    dummy.position.set(segment.center.x, 0.26, segment.center.z);
    dummy.rotation.set(0, segment.angle, 0);
    dummy.scale.set(2.1, 1, segment.length + 1.1);
    dummy.updateMatrix();
    glowMesh.setMatrixAt(index, dummy.matrix);
    glowMesh.setColorAt(index, new THREE.Color(0x87cbb0));
  });

  glowMesh.instanceMatrix.needsUpdate = true;
  if (glowMesh.instanceColor) {
    glowMesh.instanceColor.needsUpdate = true;
  }
  glowMesh.renderOrder = 35;
  group.add(glowMesh);

  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0x87d2b0,
    transparent: true,
    opacity: 0.88,
  });
  const lineMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.05, 1),
    lineMaterial,
    boundarySegments.length,
  );

  boundarySegments.forEach((segment, index) => {
    dummy.position.set(segment.center.x, 0.315, segment.center.z);
    dummy.rotation.set(0, segment.angle, 0);
    dummy.scale.set(1.28, 1.4, segment.length + 0.44);
    dummy.updateMatrix();
    lineMesh.setMatrixAt(index, dummy.matrix);
    lineMesh.setColorAt(index, new THREE.Color(0x91d6b5));
  });

  lineMesh.instanceMatrix.needsUpdate = true;
  if (lineMesh.instanceColor) {
    lineMesh.instanceColor.needsUpdate = true;
  }
  lineMesh.renderOrder = 36;
  group.add(lineMesh);

  const wallMaterial = new THREE.MeshBasicMaterial({
    color: 0x87cbb0,
    transparent: true,
    opacity: 0.001,
    depthWrite: false,
  });
  const wallMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    wallMaterial,
    boundarySegments.length,
  );

  boundarySegments.forEach((segment, index) => {
    dummy.position.set(segment.center.x, wallHeight / 2, segment.center.z);
    dummy.rotation.set(0, segment.angle, 0);
    dummy.scale.set(0.42, wallHeight, segment.length + 0.16);
    dummy.updateMatrix();
    wallMesh.setMatrixAt(index, dummy.matrix);
    wallMesh.setColorAt(index, new THREE.Color(0x8bffb7));
  });

  wallMesh.instanceMatrix.needsUpdate = true;
  if (wallMesh.instanceColor) {
    wallMesh.instanceColor.needsUpdate = true;
  }
  wallMesh.renderOrder = 24;
  group.add(wallMesh);

  return {
    group,
    glowMaterial,
    lineMaterial,
    wallMaterial,
    wallMesh,
  };
}
