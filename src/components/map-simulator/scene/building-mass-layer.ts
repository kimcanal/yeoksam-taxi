import * as THREE from "three";
import type { BuildingMass } from "@/components/map-simulator/types";

export function createBuildingMassLayer(buildings: BuildingMass[]) {
  const dummy = new THREE.Object3D();
  const group = new THREE.Group();
  group.name = "building-mass-layer";
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

  const buildingMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    buildingMaterial,
    buildings.length,
  );
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;

  const buildingRoofMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    buildingRoofMaterial,
    buildings.length,
  );
  buildingRoofMesh.castShadow = true;
  buildingRoofMesh.receiveShadow = true;

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

  return {
    group,
    buildingMaterial,
    buildingRoofMaterial,
  };
}
