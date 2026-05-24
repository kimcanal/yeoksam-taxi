import * as THREE from "three";
import {
  CALLER_BOTTOM_PALETTES,
  CALLER_TOP_PALETTES,
  callerArmMaterialFor,
  callerBottomMaterialFor,
  callerTorsoMaterialFor,
  markMeshResourceSharing,
  pedestrianBodyMaterialFor,
  sharedCallerHailCubeGeometry,
  sharedCallerHeadGeometry,
  sharedCallerHeadMaterial,
  sharedCallerLeftArmGeometry,
  sharedCallerLegsGeometry,
  sharedCallerShadowGeometry,
  sharedCallerShadowMaterial,
  sharedCallerShoesGeometry,
  sharedCallerShoesMaterial,
  sharedCallerTorsoGeometry,
  sharedCallerWaveArmGeometry,
  sharedPedestrianBodyGeometry,
  sharedPedestrianFeetGeometry,
  sharedPedestrianFeetMaterial,
  sharedPedestrianHeadGeometry,
  sharedPedestrianHeadMaterial,
} from "@/components/map-simulator/core";

export function createPedestrianGroup(seed: number) {
  const palette = [0xff8d71, 0x78c4ff, 0x79d58f, 0xffcb44, 0xc6a2ff][seed % 5];
  const group = new THREE.Group();

  const body = markMeshResourceSharing(
    new THREE.Mesh(
      sharedPedestrianBodyGeometry(),
      pedestrianBodyMaterialFor(palette),
    ),
    { material: true },
  );
  body.position.y = 0.74;
  group.add(body);

  const head = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianHeadGeometry(), sharedPedestrianHeadMaterial()),
    { material: true },
  );
  head.position.y = 1.34;
  group.add(head);

  const feet = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianFeetGeometry(), sharedPedestrianFeetMaterial()),
    { material: true },
  );
  feet.position.y = 0.12;
  group.add(feet);

  return group;
}

export function createCallerGroup(seed: number) {
  const topPalette = CALLER_TOP_PALETTES[seed % CALLER_TOP_PALETTES.length]!;
  const bottomPalette =
    CALLER_BOTTOM_PALETTES[seed % CALLER_BOTTOM_PALETTES.length]!;
  const group = new THREE.Group();

  const torsoMaterial = callerTorsoMaterialFor(topPalette);
  const armMaterial = callerArmMaterialFor(topPalette);
  const bottomMaterial = callerBottomMaterialFor(bottomPalette);
  const shadow = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerShadowGeometry(), sharedCallerShadowMaterial()),
    { material: true },
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const shoes = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerShoesGeometry(), sharedCallerShoesMaterial()),
    { material: true },
  );
  shoes.position.y = 0.06;
  group.add(shoes);

  const legs = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerLegsGeometry(), bottomMaterial),
    { material: true },
  );
  legs.position.y = 0.38;
  group.add(legs);

  const torso = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerTorsoGeometry(), torsoMaterial),
    { material: true },
  );
  torso.position.y = 0.94;
  group.add(torso);

  const head = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerHeadGeometry(), sharedCallerHeadMaterial()),
    { material: true },
  );
  head.position.y = 1.42;
  group.add(head);

  const leftArm = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerLeftArmGeometry(), armMaterial),
    { material: true },
  );
  leftArm.position.set(-0.34, 0.9, 0);
  leftArm.rotation.z = 0.18;
  group.add(leftArm);

  const waveArmPivot = new THREE.Group();
  waveArmPivot.position.set(0.32, 1.16, 0);
  group.add(waveArmPivot);

  const waveArm = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerWaveArmGeometry(), armMaterial),
    { material: true },
  );
  waveArm.position.set(0, -0.28, 0);
  waveArmPivot.add(waveArm);

  const hailCube = new THREE.Mesh(
    sharedCallerHailCubeGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0xb8c2c9,
      emissive: 0x21303c,
      emissiveIntensity: 0.08,
      roughness: 0.58,
    }),
  );
  hailCube.userData.skipGeometryDispose = true;
  hailCube.position.set(0.12, -0.62, 0.08);
  waveArmPivot.add(hailCube);

  return { group, waveArmPivot, hailCube };
}
