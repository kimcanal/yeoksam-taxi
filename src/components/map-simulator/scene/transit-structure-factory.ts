import * as THREE from "three";

const SUBWAY_STRUCTURE_ACCENTS = [0x78aaa0, 0x89b9ae, 0x6f978f];

export function createSubwayStationStructure(
  seed: number,
  sideSign: 1 | -1,
  isMajor: boolean,
) {
  const accent = SUBWAY_STRUCTURE_ACCENTS[seed % SUBWAY_STRUCTURE_ACCENTS.length]!;
  const group = new THREE.Group();

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(isMajor ? 1.18 : 0.98, isMajor ? 1.78 : 1.46, 28),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: isMajor ? 0.2 : 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.04;
  group.add(halo);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 2.6 : 2.1, 0.18, isMajor ? 2.1 : 1.72),
    new THREE.MeshStandardMaterial({ color: 0xdbe2e6, roughness: 0.92 }),
  );
  base.position.y = 0.09;
  base.receiveShadow = true;
  group.add(base);

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 2.15 : 1.8, 0.16, isMajor ? 1.22 : 1),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: isMajor ? 0.14 : 0.1,
      roughness: 0.42,
    }),
  );
  canopy.position.set(0.12 * sideSign, 1.58, -0.14);
  canopy.castShadow = true;
  group.add(canopy);

  const glassRoof = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 1.92 : 1.62, 0.08, isMajor ? 0.82 : 0.72),
    new THREE.MeshStandardMaterial({
      color: 0xe4ebe8,
      emissive: 0x1c312f,
      emissiveIntensity: 0.06,
      transparent: true,
      opacity: 0.74,
      roughness: 0.24,
      metalness: 0.08,
    }),
  );
  glassRoof.position.set(0.18 * sideSign, 1.4, -0.12);
  glassRoof.castShadow = true;
  group.add(glassRoof);

  const sidePanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.08, isMajor ? 0.94 : 0.78),
    new THREE.MeshStandardMaterial({
      color: 0xd4e1de,
      transparent: true,
      opacity: 0.62,
      roughness: 0.2,
      metalness: 0.08,
    }),
  );
  sidePanel.position.set(0.72 * sideSign, 0.86, -0.18);
  group.add(sidePanel);

  const sideRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.82, isMajor ? 1.12 : 0.92),
    new THREE.MeshStandardMaterial({ color: 0x768690, roughness: 0.52 }),
  );
  sideRail.position.set(-0.52 * sideSign, 0.64, 0.38);
  sideRail.castShadow = true;
  group.add(sideRail);

  const gateWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 1.24, isMajor ? 0.92 : 0.74),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8ea,
      roughness: 0.58,
      metalness: 0.04,
    }),
  );
  gateWall.position.set(0.94 * sideSign, 0.82, -0.22);
  gateWall.castShadow = true;
  group.add(gateWall);

  const totem = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, isMajor ? 2.48 : 2.18, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xe5ebed, roughness: 0.58 }),
  );
  totem.position.set(-0.92 * sideSign, isMajor ? 1.24 : 1.08, -0.68);
  totem.castShadow = true;
  group.add(totem);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 0.96 : 0.78, 0.48, 0.14),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: isMajor ? 0.18 : 0.14,
      roughness: 0.44,
    }),
  );
  sign.position.set(-0.92 * sideSign, isMajor ? 2.0 : 1.82, -0.68);
  group.add(sign);

  const stationMarker = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 0.4 : 0.34, isMajor ? 0.4 : 0.34, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0xf0f5f2,
      emissive: 0xe6f1ec,
      emissiveIntensity: isMajor ? 0.22 : 0.16,
      roughness: 0.3,
      metalness: 0.08,
    }),
  );
  stationMarker.position.set(-0.92 * sideSign, isMajor ? 2.02 : 1.84, -0.6);
  group.add(stationMarker);

  Array.from({ length: isMajor ? 5 : 4 }, (_, index) => index).forEach(
    (stepIndex) => {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.16, isMajor ? 1.14 : 0.98),
        new THREE.MeshStandardMaterial({ color: 0xb4c0c4, roughness: 0.86 }),
      );
      step.position.set(
        (0.78 - stepIndex * 0.18) * -sideSign,
        0.08 + stepIndex * 0.13,
        0.42,
      );
      step.castShadow = true;
      group.add(step);
    },
  );

  return group;
}
