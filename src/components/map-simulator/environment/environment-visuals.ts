import * as THREE from "three";
import {
  createPrecipitationLayer,
  createRainTexture,
  createSnowTexture,
  type PrecipitationLayer,
} from "@/components/map-simulator/environment";

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

  // Create procedural glowing sun canvas texture in memory
  const sunCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  let sunTexture: THREE.CanvasTexture | null = null;
  if (sunCanvas) {
    sunCanvas.width = 256;
    sunCanvas.height = 256;
    const sCtx = sunCanvas.getContext("2d");
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 20, 128, 128, 128);
      grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
      grad.addColorStop(0.15, "rgba(255, 250, 220, 1.0)");
      grad.addColorStop(0.4, "rgba(255, 215, 80, 0.9)");
      grad.addColorStop(0.7, "rgba(255, 110, 20, 0.4)");
      grad.addColorStop(1.0, "rgba(255, 50, 0, 0.0)");
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
      sunTexture = new THREE.CanvasTexture(sunCanvas);
    }
  }

  const sunDiscMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff9e6,
    map: sunTexture || undefined,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(22.0, 20, 20),
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
    new THREE.SphereGeometry(38.0, 20, 20),
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
    new THREE.SphereGeometry(55.0, 20, 20),
    sunsetGlowMaterial,
  );
  scene.add(sunsetGlow);

  // Create procedural moon crater canvas texture in memory
  const moonCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  let moonTexture: THREE.CanvasTexture | null = null;
  if (moonCanvas) {
    moonCanvas.width = 512;
    moonCanvas.height = 512;
    const mCtx = moonCanvas.getContext("2d");
    if (mCtx) {
      // Pearly moon base color
      mCtx.fillStyle = "#e2e8f0";
      mCtx.fillRect(0, 0, 512, 512);

      // Large basaltic plains (Maria)
      mCtx.fillStyle = "rgba(160, 174, 192, 0.5)";
      mCtx.beginPath(); mCtx.arc(160, 180, 110, 0, Math.PI * 2); mCtx.fill();
      mCtx.beginPath(); mCtx.arc(330, 240, 85, 0, Math.PI * 2); mCtx.fill();
      mCtx.beginPath(); mCtx.arc(200, 330, 95, 0, Math.PI * 2); mCtx.fill();

      // Craters
      const craters = [
        { x: 90, y: 140, r: 22 },
        { x: 380, y: 170, r: 18 },
        { x: 330, y: 360, r: 26 },
        { x: 130, y: 340, r: 14 },
        { x: 250, y: 90, r: 16 },
        { x: 210, y: 210, r: 11 },
      ];
      craters.forEach(c => {
        mCtx.fillStyle = "rgba(90, 100, 115, 0.65)";
        mCtx.beginPath(); mCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2); mCtx.fill();
        mCtx.fillStyle = "rgba(255, 255, 255, 0.75)";
        mCtx.beginPath(); mCtx.arc(c.x - c.r * 0.15, c.y - c.r * 0.15, c.r * 0.85, 0, Math.PI * 2); mCtx.fill();
        mCtx.fillStyle = "rgba(150, 160, 175, 0.7)";
        mCtx.beginPath(); mCtx.arc(c.x - c.r * 0.08, c.y - c.r * 0.08, c.r * 0.7, 0, Math.PI * 2); mCtx.fill();
      });

      // Procedural surface noise
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 2 + 0.5;
        mCtx.fillStyle = Math.random() > 0.5 ? "rgba(255, 255, 255, 0.3)" : "rgba(80, 95, 110, 0.15)";
        mCtx.beginPath(); mCtx.arc(x, y, r, 0, Math.PI * 2); mCtx.fill();
      }
      moonTexture = new THREE.CanvasTexture(moonCanvas);
    }
  }

  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: moonTexture || undefined,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(18.0, 18, 18),
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
      size: 0.88,
      transparent: true,
      opacity: 0.12,
      map: createRainTexture(),
      depthWrite: false,
      alphaTest: 0.01,
      blending: THREE.NormalBlending,
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
      size: 1.08,
      transparent: true,
      opacity: 0.22,
      map: createSnowTexture(),
      depthWrite: false,
      alphaTest: 0.01,
      blending: THREE.NormalBlending,
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
