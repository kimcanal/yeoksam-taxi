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
  sunDiscMaterial: THREE.SpriteMaterial;
  sunDisc: THREE.Sprite;
  sunHaloMaterial: THREE.SpriteMaterial;
  sunHalo: THREE.Sprite;
  sunsetGlowMaterial: THREE.SpriteMaterial;
  sunsetGlow: THREE.Sprite;
  moonMaterial: THREE.SpriteMaterial;
  moon: THREE.Sprite;
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

type GradientStop = {
  offset: number;
  color: string;
};

function createCanvasTexture(
  size: number,
  draw: (context: CanvasRenderingContext2D) => void,
) {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createRadialTexture(size: number, stops: GradientStop[]) {
  return createCanvasTexture(size, (context) => {
    const center = size / 2;
    const gradient = context.createRadialGradient(
      center,
      center,
      size * 0.035,
      center,
      center,
      center,
    );
    stops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function createMoonTexture() {
  return createCanvasTexture(512, (context) => {
    const size = 512;
    const center = size / 2;
    const radius = 228;

    context.clearRect(0, 0, size, size);
    context.save();
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.clip();

    const base = context.createRadialGradient(186, 158, 32, center, center, radius);
    base.addColorStop(0, "#f8fbff");
    base.addColorStop(0.42, "#dce5ef");
    base.addColorStop(0.78, "#aebccc");
    base.addColorStop(1, "#708092");
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);

    const maria = [
      { x: 176, y: 186, r: 82, alpha: 0.2 },
      { x: 326, y: 238, r: 70, alpha: 0.18 },
      { x: 224, y: 332, r: 78, alpha: 0.16 },
      { x: 354, y: 342, r: 44, alpha: 0.12 },
    ];
    maria.forEach((plain) => {
      context.fillStyle = `rgba(82, 96, 113, ${plain.alpha})`;
      context.beginPath();
      context.ellipse(
        plain.x,
        plain.y,
        plain.r * 1.08,
        plain.r * 0.74,
        -0.24,
        0,
        Math.PI * 2,
      );
      context.fill();
    });

    const craters = [
      { x: 128, y: 138, r: 17 },
      { x: 390, y: 176, r: 14 },
      { x: 318, y: 374, r: 21 },
      { x: 146, y: 354, r: 11 },
      { x: 248, y: 104, r: 13 },
      { x: 228, y: 226, r: 9 },
    ];
    craters.forEach((crater) => {
      const craterShade = context.createRadialGradient(
        crater.x - crater.r * 0.32,
        crater.y - crater.r * 0.36,
        crater.r * 0.22,
        crater.x,
        crater.y,
        crater.r,
      );
      craterShade.addColorStop(0, "rgba(255,255,255,0.42)");
      craterShade.addColorStop(0.48, "rgba(132,146,164,0.22)");
      craterShade.addColorStop(1, "rgba(48,60,76,0.24)");
      context.fillStyle = craterShade;
      context.beginPath();
      context.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
      context.fill();
    });

    for (let index = 0; index < 620; index += 1) {
      const x = seededNoise(index + 3) * size;
      const y = seededNoise(index + 17) * size;
      const dx = x - center;
      const dy = y - center;
      if (dx * dx + dy * dy > radius * radius) {
        continue;
      }
      const dotRadius = 0.35 + seededNoise(index + 41) * 1.15;
      const alpha = 0.035 + seededNoise(index + 73) * 0.06;
      context.fillStyle =
        seededNoise(index + 109) > 0.5
          ? `rgba(255,255,255,${alpha})`
          : `rgba(48,60,76,${alpha})`;
      context.beginPath();
      context.arc(x, y, dotRadius, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();

    const edge = context.createRadialGradient(center, center, radius * 0.72, center, center, radius);
    edge.addColorStop(0, "rgba(255,255,255,0)");
    edge.addColorStop(0.72, "rgba(255,255,255,0)");
    edge.addColorStop(1, "rgba(5,10,18,0.28)");
    context.fillStyle = edge;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fill();
  });
}

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

  const sunTexture = createRadialTexture(384, [
    { offset: 0, color: "rgba(255,255,255,1)" },
    { offset: 0.2, color: "rgba(255,248,215,1)" },
    { offset: 0.44, color: "rgba(255,215,126,0.86)" },
    { offset: 0.68, color: "rgba(255,178,92,0.28)" },
    { offset: 1, color: "rgba(255,160,72,0)" },
  ]);
  const sunHaloTexture = createRadialTexture(384, [
    { offset: 0, color: "rgba(255,230,180,0.58)" },
    { offset: 0.34, color: "rgba(255,190,112,0.18)" },
    { offset: 1, color: "rgba(255,160,72,0)" },
  ]);
  const sunsetGlowTexture = createRadialTexture(384, [
    { offset: 0, color: "rgba(255,178,112,0.52)" },
    { offset: 0.36, color: "rgba(255,118,74,0.2)" },
    { offset: 1, color: "rgba(255,84,38,0)" },
  ]);

  const sunDiscMaterial = new THREE.SpriteMaterial({
    color: 0xfff9e6,
    map: sunTexture || undefined,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const sunDisc = new THREE.Sprite(sunDiscMaterial);
  sunDisc.scale.set(46, 46, 1);
  scene.add(sunDisc);

  const sunHaloMaterial = new THREE.SpriteMaterial({
    color: 0xffb66c,
    map: sunHaloTexture || undefined,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sunHalo = new THREE.Sprite(sunHaloMaterial);
  sunHalo.scale.set(92, 92, 1);
  scene.add(sunHalo);

  const sunsetGlowMaterial = new THREE.SpriteMaterial({
    color: 0xff8b47,
    map: sunsetGlowTexture || undefined,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sunsetGlow = new THREE.Sprite(sunsetGlowMaterial);
  sunsetGlow.scale.set(150, 150, 1);
  scene.add(sunsetGlow);

  const moonTexture = createMoonTexture();

  const moonMaterial = new THREE.SpriteMaterial({
    color: 0xffffff,
    map: moonTexture || undefined,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const moon = new THREE.Sprite(moonMaterial);
  moon.scale.set(36, 36, 1);
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
