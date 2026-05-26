import * as THREE from "three";

export type VehicleTrailPoint = {
  id: string;
  position: THREE.Vector3;
  color: number;
};

type TrailSample = {
  position: THREE.Vector3;
  timestampMs: number;
};

type TrailVisual = {
  head: THREE.Mesh;
  headMaterial: THREE.MeshBasicMaterial;
  line: THREE.Line<THREE.BufferGeometry, THREE.ShaderMaterial>;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  positions: Float32Array;
  colors: Float32Array;
  alphas: Float32Array;
  points: TrailSample[];
  color: THREE.Color;
  lastSamplePosition: THREE.Vector3 | null;
  lastSampleAtMs: number;
  lastUpdateAtMs: number;
};

type VehicleTrailLayerOptions = {
  yOffset?: number;
  maxPoints?: number;
  minSampleDistance?: number;
  minSampleIntervalMs?: number;
  tailDurationMs?: number;
  staleAfterMs?: number;
  opacity?: number;
  headScale?: number;
};

const VERTEX_SHADER = `
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = alpha;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

export function createVehicleTrailLayer({
  yOffset = 0.2,
  maxPoints = 36,
  minSampleDistance = 1.4,
  minSampleIntervalMs = 90,
  tailDurationMs = 4_800,
  staleAfterMs = 2_400,
  opacity = 0.8,
  headScale = 0.58,
}: VehicleTrailLayerOptions = {}) {
  const group = new THREE.Group();
  group.name = "vehicle-trail-layer";
  const trailById = new Map<string, TrailVisual>();

  const createTrailVisual = (id: string, color: number) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxPoints * 3);
    const colors = new Float32Array(maxPoints * 3);
    const alphas = new Float32Array(maxPoints);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      "alpha",
      new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = 41;
    line.name = `trail-${id}`;

    const headMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(headScale, 12, 12),
      headMaterial,
    );
    head.visible = false;
    head.frustumCulled = false;
    head.renderOrder = 42;

    group.add(line);
    group.add(head);

    const visual: TrailVisual = {
      head,
      headMaterial,
      line,
      geometry,
      material,
      positions,
      colors,
      alphas,
      points: [],
      color: new THREE.Color(color),
      lastSamplePosition: null,
      lastSampleAtMs: 0,
      lastUpdateAtMs: 0,
    };
    trailById.set(id, visual);
    return visual;
  };

  const updateTrailGeometry = (visual: TrailVisual, nowMs: number) => {
    const livePoints = visual.points
      .filter((point) => nowMs - point.timestampMs <= tailDurationMs)
      .slice(-maxPoints);
    visual.points = livePoints;

    const positionAttribute = visual.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const colorAttribute = visual.geometry.getAttribute(
      "color",
    ) as THREE.BufferAttribute;
    const alphaAttribute = visual.geometry.getAttribute(
      "alpha",
    ) as THREE.BufferAttribute;

    if (livePoints.length < 2) {
      visual.geometry.setDrawRange(0, 0);
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      alphaAttribute.needsUpdate = true;
      visual.line.visible = false;
      return;
    }

    livePoints.forEach((point, index) => {
      const offset = index * 3;
      visual.positions[offset] = point.position.x;
      visual.positions[offset + 1] = point.position.y + yOffset;
      visual.positions[offset + 2] = point.position.z;

      visual.colors[offset] = visual.color.r;
      visual.colors[offset + 1] = visual.color.g;
      visual.colors[offset + 2] = visual.color.b;

      const ageRatio = THREE.MathUtils.clamp(
        (nowMs - point.timestampMs) / tailDurationMs,
        0,
        1,
      );
      visual.alphas[index] = Math.max(
        0,
        (1 - ageRatio) * opacity * (0.36 + (index / Math.max(1, livePoints.length - 1)) * 0.64),
      );
    });

    visual.geometry.setDrawRange(0, livePoints.length);
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    alphaAttribute.needsUpdate = true;
    visual.line.visible = true;
  };

  const sync = (points: VehicleTrailPoint[], nowMs: number) => {
    const seenIds = new Set<string>();

    points.forEach((point) => {
      seenIds.add(point.id);
      const visual = trailById.get(point.id) ?? createTrailVisual(point.id, point.color);
      visual.color.setHex(point.color);
      visual.headMaterial.color.setHex(point.color);
      visual.lastUpdateAtMs = nowMs;

      const shouldSample =
        !visual.lastSamplePosition ||
        visual.lastSamplePosition.distanceToSquared(point.position) >=
          minSampleDistance * minSampleDistance ||
        nowMs - visual.lastSampleAtMs >= minSampleIntervalMs;

      if (shouldSample) {
        visual.points.push({
          position: point.position.clone(),
          timestampMs: nowMs,
        });
        visual.lastSamplePosition = point.position.clone();
        visual.lastSampleAtMs = nowMs;
      }

      visual.head.position.copy(point.position);
      visual.head.position.y += yOffset;
      visual.head.visible = true;
      updateTrailGeometry(visual, nowMs);
    });

    trailById.forEach((visual, id) => {
      if (seenIds.has(id)) {
        return;
      }
      updateTrailGeometry(visual, nowMs);
    });
  };

  const fade = (nowMs: number) => {
    const staleIds: string[] = [];

    trailById.forEach((visual, id) => {
      const staleForMs = nowMs - visual.lastUpdateAtMs;
      updateTrailGeometry(visual, nowMs);
      if (staleForMs > staleAfterMs) {
        const fadeRatio = THREE.MathUtils.clamp(
          1 - (staleForMs - staleAfterMs) / tailDurationMs,
          0,
          1,
        );
        visual.headMaterial.opacity = opacity * fadeRatio;
        visual.head.visible = fadeRatio > 0.02 && visual.points.length > 0;
      } else {
        visual.headMaterial.opacity = opacity;
      }
      if (staleForMs > staleAfterMs + tailDurationMs && visual.points.length === 0) {
        staleIds.push(id);
      }
    });

    staleIds.forEach((id) => {
      const visual = trailById.get(id);
      if (!visual) {
        return;
      }
      group.remove(visual.line);
      group.remove(visual.head);
      visual.geometry.dispose();
      visual.material.dispose();
      visual.head.geometry.dispose();
      visual.headMaterial.dispose();
      trailById.delete(id);
    });
  };

  const clear = () => {
    trailById.forEach((visual) => {
      group.remove(visual.line);
      group.remove(visual.head);
      visual.geometry.dispose();
      visual.material.dispose();
      visual.head.geometry.dispose();
      visual.headMaterial.dispose();
    });
    trailById.clear();
  };

  return {
    group,
    sync,
    fade,
    clear,
  };
}
