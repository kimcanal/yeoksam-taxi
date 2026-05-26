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
      rainPositions[offset] += delta * 0.5;
      rainPositions[offset + 1] -= delta * (36 + rainLayer.seeds[index] * 16);
      rainPositions[offset + 2] += delta * 1.8;

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
      const sway =
        Math.sin(elapsedTime * 1.6 + snowLayer.seeds[index] * Math.PI * 2) *
        0.52;
      snowPositions[offset] += sway * delta;
      snowPositions[offset + 1] -= delta * (7 + snowLayer.seeds[index] * 3.2);
      snowPositions[offset + 2] +=
        delta * (1.1 + snowLayer.seeds[index] * 0.8);

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
