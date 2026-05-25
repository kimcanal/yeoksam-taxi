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
