import * as THREE from "three";

export type PrecipitationLayer = {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;
  seeds: Float32Array;
  minHeight: number;
  maxHeight: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function createRainTexture(): THREE.Texture {
  if (typeof document === "undefined") {
    return new THREE.Texture();
  }
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 16, 64);
    // Sophisticated soft vertical streak gradient
    const grad = ctx.createLinearGradient(8, 0, 8, 64);
    grad.addColorStop(0, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.15, "rgba(200, 230, 255, 0.08)");
    grad.addColorStop(0.5, "rgba(220, 240, 255, 0.72)");
    grad.addColorStop(0.85, "rgba(200, 230, 255, 0.08)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    // Draw a thin vertical line aligned at the center
    ctx.fillRect(7, 0, 2, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.format = THREE.RGBAFormat;
  texture.premultiplyAlpha = true;
  texture.needsUpdate = true;
  return texture;
}

export function createSnowTexture(): THREE.Texture {
  if (typeof document === "undefined") {
    return new THREE.Texture();
  }
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 32, 32);
    // Beautiful fluffy radial soft snowball
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.88)");
    grad.addColorStop(0.34, "rgba(255, 255, 255, 0.54)");
    grad.addColorStop(0.72, "rgba(255, 255, 255, 0.14)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.format = THREE.RGBAFormat;
  texture.premultiplyAlpha = true;
  texture.needsUpdate = true;
  return texture;
}

export function createPrecipitationLayer({
  scene,
  count,
  material,
  minHeight,
  maxHeight,
  mapSize,
  centerPoint,
}: {
  scene: THREE.Scene;
  count: number;
  material: THREE.PointsMaterial;
  minHeight: number;
  maxHeight: number;
  mapSize: THREE.Vector3;
  centerPoint: THREE.Vector3;
}): PrecipitationLayer {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const spanX = mapSize.x + 180;
  const spanZ = mapSize.z + 180;
  const minX = centerPoint.x - spanX / 2;
  const maxX = centerPoint.x + spanX / 2;
  const minZ = centerPoint.z - spanZ / 2;
  const maxZ = centerPoint.z + spanZ / 2;

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = THREE.MathUtils.lerp(minX, maxX, Math.random());
    positions[offset + 1] = THREE.MathUtils.lerp(
      minHeight,
      maxHeight,
      Math.random(),
    );
    positions[offset + 2] = THREE.MathUtils.lerp(minZ, maxZ, Math.random());
    seeds[index] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, count);

  const points = new THREE.Points(geometry, material);
  points.visible = false;
  scene.add(points);

  return {
    geometry,
    material,
    points,
    seeds,
    minHeight,
    maxHeight,
    minX,
    maxX,
    minZ,
    maxZ,
  };
}

export function updatePrecipitationVisuals({
  activeRainSeedCount,
  activeSnowSeedCount,
  delta,
  elapsedTime,
  rainLayer,
  snowLayer,
}: {
  activeRainSeedCount: number;
  activeSnowSeedCount: number;
  delta: number;
  elapsedTime: number;
  rainLayer: PrecipitationLayer;
  snowLayer: PrecipitationLayer;
}) {
  const rainPositions = rainLayer.geometry.attributes.position
    .array as Float32Array;
  const snowPositions = snowLayer.geometry.attributes.position
    .array as Float32Array;

  if (rainLayer.points.visible) {
    for (let index = 0; index < activeRainSeedCount; index += 1) {
      const offset = index * 3;
      const seed = rainLayer.seeds[index];
      // Organic wind shear/slant speed variations based on seed
      const slantX = 0.4 + seed * 0.4;
      const slantZ = 1.4 + seed * 0.8;
      const fallSpeed = 38 + seed * 16;

      rainPositions[offset] += delta * slantX;
      rainPositions[offset + 1] -= delta * fallSpeed;
      rainPositions[offset + 2] += delta * slantZ;

      if (rainPositions[offset] > rainLayer.maxX) {
        rainPositions[offset] = rainLayer.minX;
      }
      if (rainPositions[offset + 2] > rainLayer.maxZ) {
        rainPositions[offset + 2] = rainLayer.minZ;
      }
      if (rainPositions[offset + 1] < rainLayer.minHeight) {
        rainPositions[offset] = THREE.MathUtils.lerp(
          rainLayer.minX,
          rainLayer.maxX,
          Math.random(),
        );
        rainPositions[offset + 1] = rainLayer.maxHeight;
        rainPositions[offset + 2] = THREE.MathUtils.lerp(
          rainLayer.minZ,
          rainLayer.maxZ,
          Math.random(),
        );
      }
    }
    rainLayer.geometry.attributes.position.needsUpdate = true;
  }

  if (snowLayer.points.visible) {
    for (let index = 0; index < activeSnowSeedCount; index += 1) {
      const offset = index * 3;
      const seed = snowLayer.seeds[index];

      // Highly cinematic 3D spiral turbulence (helical/spiral path)
      const radius = 0.38 + seed * 0.58;
      const speed = 1.5 + seed * 2.5;
      const angle = elapsedTime * speed + seed * Math.PI * 2;
      const currentSwayX = Math.sin(angle) * radius;
      const currentSwayZ = Math.cos(angle) * radius;

      const prevAngle = (elapsedTime - delta) * speed + seed * Math.PI * 2;
      const prevSwayX = Math.sin(prevAngle) * radius;
      const prevSwayZ = Math.cos(prevAngle) * radius;

      // Extract raw displacement of spiral rotation
      const rotationStepX = currentSwayX - prevSwayX;
      const rotationStepZ = currentSwayZ - prevSwayZ;
      const fallSpeed = 6.2 + seed * 3.2;

      // Combine helical rotation with light ambient wind
      snowPositions[offset] += rotationStepX + delta * 0.22;
      snowPositions[offset + 1] -= delta * fallSpeed;
      snowPositions[offset + 2] += rotationStepZ + delta * 0.38;

      if (snowPositions[offset] > snowLayer.maxX) {
        snowPositions[offset] = snowLayer.minX;
      }
      if (snowPositions[offset] < snowLayer.minX) {
        snowPositions[offset] = snowLayer.maxX;
      }
      if (snowPositions[offset + 2] > snowLayer.maxZ) {
        snowPositions[offset + 2] = snowLayer.minZ;
      }
      if (snowPositions[offset + 1] < snowLayer.minHeight) {
        snowPositions[offset] = THREE.MathUtils.lerp(
          snowLayer.minX,
          snowLayer.maxX,
          Math.random(),
        );
        snowPositions[offset + 1] = snowLayer.maxHeight;
        snowPositions[offset + 2] = THREE.MathUtils.lerp(
          snowLayer.minZ,
          snowLayer.maxZ,
          Math.random(),
        );
      }
    }
    snowLayer.geometry.attributes.position.needsUpdate = true;
  }
}
