import * as THREE from "three";
import { markMeshResourceSharing } from "@/components/map-simulator/utils";

const CALLER_TOP_PALETTES = [0x8a7d70, 0x6f7d8a, 0x6d8376, 0x97846a, 0x7a7387];
const CALLER_BOTTOM_PALETTES = [0x25292d, 0x2b3035, 0x31353a, 0x2a2e32];

const PEDESTRIAN_BODY_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();
const CALLER_TORSO_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();
const CALLER_ARM_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();
const CALLER_BOTTOM_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();

let PEDESTRIAN_BODY_GEOMETRY: THREE.BoxGeometry | null = null;
let PEDESTRIAN_HEAD_GEOMETRY: THREE.SphereGeometry | null = null;
let CALLER_SHADOW_GEOMETRY: THREE.PlaneGeometry | null = null;
let CALLER_SHOES_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_LEGS_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_TORSO_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_HEAD_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_LEFT_ARM_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_WAVE_ARM_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_HAIL_CUBE_GEOMETRY: THREE.BoxGeometry | null = null;
let PEDESTRIAN_HEAD_MATERIAL: THREE.MeshStandardMaterial | null = null;
let CALLER_SHADOW_MATERIAL: THREE.MeshBasicMaterial | null = null;
let CALLER_SHOES_MATERIAL: THREE.MeshStandardMaterial | null = null;
let CALLER_HEAD_MATERIAL: THREE.MeshStandardMaterial | null = null;

function pedestrianBodyMaterialFor(color: number) {
  let material = PEDESTRIAN_BODY_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    PEDESTRIAN_BODY_MATERIALS.set(color, material);
  }
  return material;
}

function callerTorsoMaterialFor(color: number) {
  let material = CALLER_TORSO_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
    CALLER_TORSO_MATERIALS.set(color, material);
  }
  return material;
}

function callerArmMaterialFor(color: number) {
  let material = CALLER_ARM_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.84 });
    CALLER_ARM_MATERIALS.set(color, material);
  }
  return material;
}

function callerBottomMaterialFor(color: number) {
  let material = CALLER_BOTTOM_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
    CALLER_BOTTOM_MATERIALS.set(color, material);
  }
  return material;
}

function sharedPedestrianBodyGeometry() {
  PEDESTRIAN_BODY_GEOMETRY ??= new THREE.BoxGeometry(0.34, 0.82, 0.24);
  return PEDESTRIAN_BODY_GEOMETRY;
}

function sharedPedestrianHeadGeometry() {
  PEDESTRIAN_HEAD_GEOMETRY ??= new THREE.SphereGeometry(0.18, 10, 10);
  return PEDESTRIAN_HEAD_GEOMETRY;
}


function sharedPedestrianHeadMaterial() {
  PEDESTRIAN_HEAD_MATERIAL ??= new THREE.MeshStandardMaterial({
    color: 0xf4d9c2,
    roughness: 0.7,
  });
  return PEDESTRIAN_HEAD_MATERIAL;
}


function sharedCallerShadowGeometry() {
  CALLER_SHADOW_GEOMETRY ??= new THREE.PlaneGeometry(1.1, 0.72);
  return CALLER_SHADOW_GEOMETRY;
}

function sharedCallerShoesGeometry() {
  CALLER_SHOES_GEOMETRY ??= new THREE.BoxGeometry(0.36, 0.12, 0.24);
  return CALLER_SHOES_GEOMETRY;
}

function sharedCallerLegsGeometry() {
  CALLER_LEGS_GEOMETRY ??= new THREE.BoxGeometry(0.3, 0.52, 0.22);
  return CALLER_LEGS_GEOMETRY;
}

function sharedCallerTorsoGeometry() {
  CALLER_TORSO_GEOMETRY ??= new THREE.BoxGeometry(0.48, 0.62, 0.28);
  return CALLER_TORSO_GEOMETRY;
}

function sharedCallerHeadGeometry() {
  CALLER_HEAD_GEOMETRY ??= new THREE.BoxGeometry(0.3, 0.3, 0.3);
  return CALLER_HEAD_GEOMETRY;
}

function sharedCallerLeftArmGeometry() {
  CALLER_LEFT_ARM_GEOMETRY ??= new THREE.BoxGeometry(0.14, 0.56, 0.14);
  return CALLER_LEFT_ARM_GEOMETRY;
}

function sharedCallerWaveArmGeometry() {
  CALLER_WAVE_ARM_GEOMETRY ??= new THREE.BoxGeometry(0.14, 0.6, 0.14);
  return CALLER_WAVE_ARM_GEOMETRY;
}

function sharedCallerHailCubeGeometry() {
  CALLER_HAIL_CUBE_GEOMETRY ??= new THREE.BoxGeometry(0.24, 0.24, 0.16);
  return CALLER_HAIL_CUBE_GEOMETRY;
}

function sharedCallerShadowMaterial() {
  CALLER_SHADOW_MATERIAL ??= new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.14,
  });
  return CALLER_SHADOW_MATERIAL;
}

function sharedCallerShoesMaterial() {
  CALLER_SHOES_MATERIAL ??= new THREE.MeshStandardMaterial({
    color: 0x161c28,
    roughness: 0.94,
  });
  return CALLER_SHOES_MATERIAL;
}

function sharedCallerHeadMaterial() {
  CALLER_HEAD_MATERIAL ??= new THREE.MeshStandardMaterial({
    color: 0xf2d7bd,
    roughness: 0.75,
  });
  return CALLER_HEAD_MATERIAL;
}

export function createPedestrianGroup(seed: number) {
  const palette = [0xff8d71, 0x78c4ff, 0x79d58f, 0xffcb44, 0xc6a2ff][seed % 5];
  const group = new THREE.Group();

  // Torso
  const body = markMeshResourceSharing(
    new THREE.Mesh(
      sharedPedestrianBodyGeometry(),
      pedestrianBodyMaterialFor(palette),
    ),
    { material: true },
  );
  body.position.y = 0.74;
  group.add(body);

  // Head
  const head = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianHeadGeometry(), sharedPedestrianHeadMaterial()),
    { material: true },
  );
  head.position.y = 1.28;
  group.add(head);

  // Separate Legs (Left/Right) with Pivot Groups
  const legGeometry = new THREE.BoxGeometry(0.1, 0.44, 0.12);
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2733,
    roughness: 0.9,
  });

  const leftLegPivot = new THREE.Group();
  leftLegPivot.name = "leftLeg";
  leftLegPivot.position.set(-0.09, 0.46, 0); // Hip joint position
  const leftLegMesh = markMeshResourceSharing(new THREE.Mesh(legGeometry, legMaterial));
  leftLegMesh.position.y = -0.22; // Align top of geometry to pivot y
  leftLegPivot.add(leftLegMesh);
  group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.name = "rightLeg";
  rightLegPivot.position.set(0.09, 0.46, 0);
  const rightLegMesh = markMeshResourceSharing(new THREE.Mesh(legGeometry, legMaterial));
  rightLegMesh.position.y = -0.22;
  rightLegPivot.add(rightLegMesh);
  group.add(rightLegPivot);

  // Separate Arms (Left/Right) with Pivot Groups
  const armGeometry = new THREE.BoxGeometry(0.08, 0.42, 0.08);
  const armMaterial = new THREE.MeshStandardMaterial({
    color: palette,
    roughness: 0.8,
  });

  const leftArmPivot = new THREE.Group();
  leftArmPivot.name = "leftArm";
  leftArmPivot.position.set(-0.21, 1.02, 0); // Shoulder joint
  const leftArmMesh = markMeshResourceSharing(new THREE.Mesh(armGeometry, armMaterial));
  leftArmMesh.position.y = -0.21;
  leftArmPivot.add(leftArmMesh);
  group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.name = "rightArm";
  rightArmPivot.position.set(0.21, 1.02, 0);
  const rightArmMesh = markMeshResourceSharing(new THREE.Mesh(armGeometry, armMaterial));
  rightArmMesh.position.y = -0.21;
  rightArmPivot.add(rightArmMesh);
  group.add(rightArmPivot);

  // Soft Contact Foot Shadow
  const shadowGeo = new THREE.PlaneGeometry(0.48, 0.32);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.16,
  });
  const shadow = markMeshResourceSharing(new THREE.Mesh(shadowGeo, shadowMat));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

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
