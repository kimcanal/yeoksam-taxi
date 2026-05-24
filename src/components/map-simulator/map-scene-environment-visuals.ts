import * as THREE from "three";
import {
  createPrecipitationLayer,
  type PrecipitationLayer,
} from "@/components/map-simulator/map-scene-precipitation";

export type CloudCluster = {
  cluster: THREE.Group;
  anchor: THREE.Vector3;
  phase: number;
};

export type EnvironmentVisuals = {
  celestialRadius: number;
  sunDiscMaterial: THREE.MeshBasicMaterial;
  sunDisc: THREE.Mesh;
  sunHaloMaterial: THREE.MeshBasicMaterial;
  sunHalo: THREE.Mesh;
  sunsetGlowMaterial: THREE.MeshBasicMaterial;
  sunsetGlow: THREE.Mesh;
  moonMaterial: THREE.MeshBasicMaterial;
  moon: THREE.Mesh;
  starsGeometry: THREE.BufferGeometry;
  starsMaterial: THREE.PointsMaterial;
  stars: THREE.Points;
  cloudPuffGeometry: THREE.SphereGeometry;
  cloudMaterial: THREE.MeshLambertMaterial;
  cloudClusters: CloudCluster[];
  stormCloudMaterial: THREE.MeshLambertMaterial;
  stormCloudClusters: CloudCluster[];
  rainLayer: PrecipitationLayer;
  snowLayer: PrecipitationLayer;
};

const CLOUD_PUFFS = [
  { x: -7.5, y: 0.4, z: 0, sx: 7.2, sy: 2.8, sz: 3.6 },
  { x: -2.2, y: 1.2, z: 1.1, sx: 6.1, sy: 2.5, sz: 3.1 },
  { x: 3.8, y: 0.8, z: -0.4, sx: 7.8, sy: 3.1, sz: 3.7 },
  { x: 8.4, y: 0.1, z: 0.7, sx: 5.8, sy: 2.2, sz: 2.8 },
] as const;

const STORM_CLOUD_PUFFS = [
  { x: -10.5, y: 0.2, z: 0.5, sx: 10.8, sy: 3.8, sz: 5.2 },
  { x: -3.2, y: 1.1, z: -1.2, sx: 9.6, sy: 3.4, sz: 4.7 },
  { x: 5.4, y: 0.9, z: 0.3, sx: 11.2, sy: 4.2, sz: 5.6 },
  { x: 13.2, y: 0.1, z: -0.4, sx: 8.2, sy: 3.1, sz: 4.4 },
] as const;

export function createEnvironmentVisuals({
  scene,
  mapSize,
  centerPoint,
}: {
  scene: THREE.Scene;
  mapSize: THREE.Vector3;
  centerPoint: THREE.Vector3;
}): EnvironmentVisuals {
  const celestialRadius = Math.max(mapSize.x, mapSize.z) + 320;
  const sunDiscMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd9a8,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(9.4, 20, 20),
    sunDiscMaterial,
  );
  scene.add(sunDisc);

  const sunHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb66c,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(17.6, 20, 20),
    sunHaloMaterial,
  );
  scene.add(sunHalo);

  const sunsetGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8b47,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const sunsetGlow = new THREE.Mesh(
    new THREE.SphereGeometry(27, 20, 20),
    sunsetGlowMaterial,
  );
  scene.add(sunsetGlow);

  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xe9f2ff,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(6.6, 18, 18),
    moonMaterial,
  );
  scene.add(moon);

  const starPositions = new Float32Array(280 * 3);
  for (let index = 0; index < 280; index += 1) {
    const azimuth = Math.random() * Math.PI * 2;
    const elevation = THREE.MathUtils.lerp(0.24, 1.14, Math.random());
    const radius = celestialRadius + Math.random() * 120;
    const offset = index * 3;
    starPositions[offset] =
      centerPoint.x + Math.cos(azimuth) * Math.cos(elevation) * radius;
    starPositions[offset + 1] = Math.sin(elevation) * radius * 0.82 + 110;
    starPositions[offset + 2] =
      centerPoint.z + Math.sin(azimuth) * Math.cos(elevation) * radius;
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3),
  );
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xf4f8ff,
    size: 1.9,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  const cloudPuffGeometry = new THREE.SphereGeometry(1, 14, 14);
  const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xdfe8f2,
    emissive: 0x243344,
    emissiveIntensity: 0.05,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const cloudClusters = createCloudClusters({
    scene,
    centerPoint,
    celestialRadius,
    material: cloudMaterial,
    geometry: cloudPuffGeometry,
    count: 5,
    puffs: CLOUD_PUFFS,
    phaseStep: 0.9,
    azimuthDivisor: 8,
    evenAzimuthOffset: 0.22,
    oddAzimuthOffset: -0.16,
    elevationMin: 0.24,
    elevationMax: 0.5,
    elevationModulo: 5,
    radiusMin: 0.56,
    radiusMax: 0.72,
    heightScale: 0.76,
    heightBase: 72,
    heightStep: 10,
    heightModulo: 3,
  });

  const stormCloudMaterial = new THREE.MeshLambertMaterial({
    color: 0x7a8da0,
    emissive: 0x1e2a36,
    emissiveIntensity: 0.08,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const stormCloudClusters = createCloudClusters({
    scene,
    centerPoint,
    celestialRadius,
    material: stormCloudMaterial,
    geometry: cloudPuffGeometry,
    count: 4,
    puffs: STORM_CLOUD_PUFFS,
    phaseStep: 1.2,
    azimuthDivisor: 6,
    evenAzimuthOffset: 0.34,
    oddAzimuthOffset: -0.22,
    elevationMin: 0.16,
    elevationMax: 0.28,
    elevationModulo: 3,
    radiusMin: 0.48,
    radiusMax: 0.62,
    heightScale: 0.62,
    heightBase: 56,
    heightStep: 7,
    heightModulo: 2,
    hiddenByDefault: true,
  });

  const rainLayer = createPrecipitationLayer({
    scene,
    count: 480,
    material: new THREE.PointsMaterial({
      color: 0xb8ddff,
      size: 0.28,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    minHeight: 12,
    maxHeight: 76,
    mapSize,
    centerPoint,
  });
  const snowLayer = createPrecipitationLayer({
    scene,
    count: 360,
    material: new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.68,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
    minHeight: 10,
    maxHeight: 70,
    mapSize,
    centerPoint,
  });

  return {
    celestialRadius,
    sunDiscMaterial,
    sunDisc,
    sunHaloMaterial,
    sunHalo,
    sunsetGlowMaterial,
    sunsetGlow,
    moonMaterial,
    moon,
    starsGeometry,
    starsMaterial,
    stars,
    cloudPuffGeometry,
    cloudMaterial,
    cloudClusters,
    stormCloudMaterial,
    stormCloudClusters,
    rainLayer,
    snowLayer,
  };
}

function createCloudClusters({
  scene,
  centerPoint,
  celestialRadius,
  material,
  geometry,
  count,
  puffs,
  phaseStep,
  azimuthDivisor,
  evenAzimuthOffset,
  oddAzimuthOffset,
  elevationMin,
  elevationMax,
  elevationModulo,
  radiusMin,
  radiusMax,
  heightScale,
  heightBase,
  heightStep,
  heightModulo,
  hiddenByDefault = false,
}: {
  scene: THREE.Scene;
  centerPoint: THREE.Vector3;
  celestialRadius: number;
  material: THREE.Material;
  geometry: THREE.BufferGeometry;
  count: number;
  puffs: readonly {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
  }[];
  phaseStep: number;
  azimuthDivisor: number;
  evenAzimuthOffset: number;
  oddAzimuthOffset: number;
  elevationMin: number;
  elevationMax: number;
  elevationModulo: number;
  radiusMin: number;
  radiusMax: number;
  heightScale: number;
  heightBase: number;
  heightStep: number;
  heightModulo: number;
  hiddenByDefault?: boolean;
}): CloudCluster[] {
  return Array.from({ length: count }, (_, index) => {
    const cluster = new THREE.Group();
    const azimuth =
      (index / azimuthDivisor) * Math.PI * 2 +
      (index % 2 === 0 ? evenAzimuthOffset : oddAzimuthOffset);
    const elevation = THREE.MathUtils.lerp(
      elevationMin,
      elevationMax,
      (index % elevationModulo) / elevationModulo,
    );
    const radius =
      celestialRadius *
      THREE.MathUtils.lerp(radiusMin, radiusMax, (index % 4) / 4);
    const anchor = new THREE.Vector3(
      centerPoint.x + Math.cos(azimuth) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius * heightScale +
        heightBase +
        (index % heightModulo) * heightStep,
      centerPoint.z + Math.sin(azimuth) * Math.cos(elevation) * radius,
    );

    puffs.forEach((puff) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(puff.x, puff.y, puff.z);
      mesh.scale.set(puff.sx, puff.sy, puff.sz);
      cluster.add(mesh);
    });

    cluster.position.copy(anchor);
    cluster.visible = !hiddenByDefault;
    scene.add(cluster);
    return { cluster, anchor, phase: index * phaseStep };
  });
}
