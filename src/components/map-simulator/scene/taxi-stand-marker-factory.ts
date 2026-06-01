import * as THREE from "three";
import type { TaxiStandLandmark } from "@/components/map-simulator/types";

export type TaxiStandMarkerMaterials = {
  base: THREE.MeshStandardMaterial;
  pole: THREE.MeshStandardMaterial;
  sign: THREE.MeshStandardMaterial;
};

export function createTaxiStandMarkerMaterials(): TaxiStandMarkerMaterials {
  return {
    base: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x6b4b00,
      emissiveIntensity: 0.16,
      roughness: 0.5,
      metalness: 0.04,
    }),
    pole: new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.58,
      metalness: 0.18,
    }),
    sign: new THREE.MeshStandardMaterial({
      color: 0xfee440,
      emissive: 0x7c4d00,
      emissiveIntensity: 0.2,
      roughness: 0.42,
    }),
  };
}

export function createTaxiStandMarker(
  stand: TaxiStandLandmark,
  index: number,
  materials: TaxiStandMarkerMaterials,
) {
  const group = new THREE.Group();
  group.name = `taxi-stand-${stand.standId || index}`;
  group.position.copy(stand.position);
  group.rotation.y = stand.yaw;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.52, 0.14, 20),
    materials.base,
  );
  base.position.y = 0.07;
  group.add(base);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, stand.isShelter ? 1.18 : 0.9, 10),
    materials.pole,
  );
  pole.position.y = stand.isShelter ? 0.73 : 0.6;
  group.add(pole);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(stand.isShelter ? 1.05 : 0.82, 0.38, 0.12),
    materials.sign,
  );
  sign.position.set(0.15 * stand.sideSign, stand.isShelter ? 1.32 : 1.05, 0);
  group.add(sign);

  const curbHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.035, 8, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  curbHalo.rotation.x = Math.PI / 2;
  curbHalo.position.y = 0.075;
  group.add(curbHalo);

  return group;
}
