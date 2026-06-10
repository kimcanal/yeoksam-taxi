"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas, addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import * as THREE from "three";
import { loadSimulationData } from "@/components/map-simulator/simulation/load-simulation-data";

import { useMapDemandState } from "@/components/map-simulator/demand/use-map-demand-state";
import { buildStaticPoiFeatureRows } from "@/components/map-simulator/demand/demand-minimap-renderer";
import { DemandMiniMapPanel } from "@/components/map-simulator/ui/DemandMiniMapPanel";
import { currentSimulationClock } from "@/components/map-simulator/environment";

// Dynamic import to avoid Turbopack utf-8 parse errors from r3f-perf's bundled font
const LazyPerf = lazy(() =>
  import("r3f-perf").then((mod) => ({ default: mod.Perf })),
);
import {
  ROAD_LAYER_Y,
  ROAD_SURFACE_THICKNESS,
} from "@/components/map-simulator/scene/scene-constants";
import type {
  BuildingMass,
  ProjectedRoadSegment,
  RouteTemplate,
  SimulationData,
  CircumstanceMode,
} from "@/components/map-simulator/types";

const BUILDING_CHUNK_SIZE = 112;
const ROAD_CHUNK_SIZE = 144;
const VEHICLE_Y = 0.52;

type BenchmarkStatus = "loading" | "ready" | "error";

type BuildingChunk = {
  id: string;
  items: BuildingMass[];
  sphere: THREE.Sphere;
};

type RoadChunk = {
  id: string;
  items: ProjectedRoadSegment[];
  sphere: THREE.Sphere;
};

type SceneBounds = {
  center: THREE.Vector3;
  size: THREE.Vector3;
};

type BenchmarkStats = {
  buildingChunksVisible: number;
  buildingChunksTotal: number;
  drawCalls: number;
  geometries: number;
  roadChunksVisible: number;
  roadChunksTotal: number;
  textures: number;
  triangles: number;
  vehicleInstances: number;
};

type BenchmarkSettings = {
  cullingEnabled: boolean;
  showPerf: boolean;
  vehicleCount: number;
};

type ChunkRegistry = {
  buildingGroups: MutableRefObject<Map<string, THREE.Group>>;
  roadGroups: MutableRefObject<Map<string, THREE.Group>>;
};

const initialStats: BenchmarkStats = {
  buildingChunksVisible: 0,
  buildingChunksTotal: 0,
  drawCalls: 0,
  geometries: 0,
  roadChunksVisible: 0,
  roadChunksTotal: 0,
  textures: 0,
  triangles: 0,
  vehicleInstances: 0,
};

function chunkKey(x: number, z: number, size: number) {
  return `${Math.floor(x / size)}:${Math.floor(z / size)}`;
}

function distanceXZ(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function roadAngle(segment: ProjectedRoadSegment) {
  return Math.atan2(
    segment.end.x - segment.start.x,
    segment.end.z - segment.start.z,
  );
}

function computeSceneBounds(roadSegments: ProjectedRoadSegment[]): SceneBounds {
  const bounds = new THREE.Box3();
  roadSegments.forEach((segment) => {
    bounds.expandByPoint(segment.start);
    bounds.expandByPoint(segment.end);
  });

  if (bounds.isEmpty()) {
    return {
      center: new THREE.Vector3(),
      size: new THREE.Vector3(320, 0, 320),
    };
  }

  return {
    center: bounds.getCenter(new THREE.Vector3()),
    size: bounds.getSize(new THREE.Vector3()),
  };
}

function computeSphere(points: THREE.Vector3[], padding: number) {
  const bounds = new THREE.Box3();
  points.forEach((point) => bounds.expandByPoint(point));
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  sphere.radius += padding;
  return sphere;
}

function buildBuildingChunks(buildings: BuildingMass[]) {
  const chunks = new Map<string, BuildingMass[]>();
  buildings.forEach((building) => {
    const key = chunkKey(
      building.position.x,
      building.position.z,
      BUILDING_CHUNK_SIZE,
    );
    const items = chunks.get(key) ?? [];
    items.push(building);
    chunks.set(key, items);
  });

  return [...chunks.entries()].map(([id, items]) => ({
    id,
    items,
    sphere: computeSphere(
      items.flatMap((building) => [
        building.position,
        new THREE.Vector3(
          building.position.x,
          building.height,
          building.position.z,
        ),
      ]),
      28,
    ),
  }));
}

function buildRoadChunks(roadSegments: ProjectedRoadSegment[]) {
  const chunks = new Map<string, ProjectedRoadSegment[]>();
  roadSegments.forEach((segment) => {
    const center = segment.start.clone().lerp(segment.end, 0.5);
    const key = chunkKey(center.x, center.z, ROAD_CHUNK_SIZE);
    const items = chunks.get(key) ?? [];
    items.push(segment);
    chunks.set(key, items);
  });

  return [...chunks.entries()].map(([id, items]) => ({
    id,
    items,
    sphere: computeSphere(
      items.flatMap((segment) => [segment.start, segment.end]),
      36,
    ),
  }));
}

function routePointAt(
  route: RouteTemplate,
  distance: number,
  target: THREE.Vector3,
  heading: THREE.Vector3,
) {
  if (!route.nodes.length || route.totalLength <= 0) {
    target.set(0, VEHICLE_Y, 0);
    heading.set(0, 0, 1);
    return;
  }

  let remaining = ((distance % route.totalLength) + route.totalLength) %
    route.totalLength;
  for (let index = 0; index < route.segmentLengths.length; index += 1) {
    const length = route.segmentLengths[index] ?? 0;
    if (remaining <= length || index === route.segmentLengths.length - 1) {
      const start = route.nodes[index]?.point ?? route.nodes[0]!.point;
      const end = route.nodes[index + 1]?.point ?? start;
      const alpha = length > 0 ? remaining / length : 0;
      target.copy(start).lerp(end, alpha);
      target.y = VEHICLE_Y;
      const nextHeading = route.segmentHeadings[index];
      if (nextHeading) {
        heading.copy(nextHeading);
      } else {
        heading.copy(end).sub(start);
      }
      if (heading.lengthSq() < 0.0001) {
        heading.set(0, 0, 1);
      }
      return;
    }
    remaining -= length;
  }
}

function useObjectRegistry() {
  const buildingGroups = useRef(new Map<string, THREE.Group>());
  const roadGroups = useRef(new Map<string, THREE.Group>());

  const registerBuildingGroup = useCallback(
    (id: string, group: THREE.Group | null) => {
      if (group) {
        buildingGroups.current.set(id, group);
      } else {
        buildingGroups.current.delete(id);
      }
    },
    [],
  );

  const registerRoadGroup = useCallback(
    (id: string, group: THREE.Group | null) => {
      if (group) {
        roadGroups.current.set(id, group);
      } else {
        roadGroups.current.delete(id);
      }
    },
    [],
  );

  return {
    buildingGroups,
    registerBuildingGroup,
    registerRoadGroup,
    roadGroups,
  };
}

function useChunkGroupRegistration(
  id: string,
  register: (id: string, group: THREE.Group | null) => void,
) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    register(id, groupRef.current);
    return () => register(id, null);
  }, [id, register]);

  return groupRef;
}

function BuildingChunkMesh({
  chunk,
  register,
}: {
  chunk: BuildingChunk;
  register: (id: string, group: THREE.Group | null) => void;
}) {
  const groupRef = useChunkGroupRegistration(chunk.id, register);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.98,
        metalness: 0.02,
        emissive: 0x171b20,
        emissiveIntensity: 0.025,
      }),
    [],
  );
  const roofMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xdce8f0,
        depthWrite: false,
        emissive: 0x1a2a3a,
        emissiveIntensity: 0.12,
        metalness: 0.08,
        opacity: 0.52,
        roughness: 0.62,
        transparent: true,
      }),
    [],
  );

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const roof = roofRef.current;
    if (!body || !roof) {
      return;
    }

    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    const items = chunk.items;
    for (let i = 0; i < items.length; i++) {
      const building = items[i]!;
      dummy.position.set(
        building.position.x,
        building.height / 2,
        building.position.z,
      );
      dummy.rotation.set(0, building.rotationY, 0);
      dummy.scale.set(building.width, building.height, building.depth);
      dummy.updateMatrix();
      body.setMatrixAt(i, dummy.matrix);
      body.setColorAt(i, tmpColor.set(building.color));

      dummy.position.set(
        building.position.x,
        building.height + 0.12,
        building.position.z,
      );
      dummy.scale.set(
        Math.max(0.72, building.width * 0.92),
        0.24,
        Math.max(0.72, building.depth * 0.92),
      );
      dummy.updateMatrix();
      roof.setMatrixAt(i, dummy.matrix);
    }

    body.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) {
      body.instanceColor.needsUpdate = true;
    }
    roof.instanceMatrix.needsUpdate = true;
  }, [chunk.items]);

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={bodyRef}
        args={[geometry, bodyMaterial, chunk.items.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={roofRef}
        args={[geometry, roofMaterial, chunk.items.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
    </group>
  );
}

function RoadInstances({
  material,
  roadClass,
  segments,
}: {
  material: THREE.Material;
  roadClass: ProjectedRoadSegment["roadClass"];
  segments: ProjectedRoadSegment[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(
    () => new THREE.BoxGeometry(1, ROAD_SURFACE_THICKNESS, 1),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const dummy = new THREE.Object3D();
    segments.forEach((segment, index) => {
      const length = distanceXZ(segment.start, segment.end);
      const center = segment.start.clone().lerp(segment.end, 0.5);
      dummy.position.set(center.x, ROAD_LAYER_Y[roadClass], center.z);
      dummy.rotation.set(0, roadAngle(segment), 0);
      dummy.scale.set(segment.width, 1, length + 1.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [roadClass, segments]);

  if (!segments.length) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, segments.length]}
      receiveShadow
      frustumCulled={false}
    />
  );
}

type RoadMaterials = {
  arterial: THREE.MeshStandardMaterial;
  connector: THREE.MeshStandardMaterial;
  local: THREE.MeshStandardMaterial;
};

function RoadChunkMesh({
  chunk,
  materials,
  register,
}: {
  chunk: RoadChunk;
  materials: RoadMaterials;
  register: (id: string, group: THREE.Group | null) => void;
}) {
  const groupRef = useChunkGroupRegistration(chunk.id, register);

  const byClass = useMemo(
    () => ({
      arterial: chunk.items.filter((item) => item.roadClass === "arterial"),
      connector: chunk.items.filter((item) => item.roadClass === "connector"),
      local: chunk.items.filter((item) => item.roadClass === "local"),
    }),
    [chunk.items],
  );

  return (
    <group ref={groupRef}>
      <RoadInstances
        material={materials.arterial}
        roadClass="arterial"
        segments={byClass.arterial}
      />
      <RoadInstances
        material={materials.connector}
        roadClass="connector"
        segments={byClass.connector}
      />
      <RoadInstances
        material={materials.local}
        roadClass="local"
        segments={byClass.local}
      />
    </group>
  );
}

function VehicleInstances({
  count,
  routes,
}: {
  count: number;
  routes: RouteTemplate[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1.1, 0.52, 2.4), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffd43b,
        emissive: 0x302200,
        emissiveIntensity: 0.18,
        metalness: 0.08,
        roughness: 0.48,
      }),
    [],
  );
  const elapsedRef = useRef(0);
  // Pre-allocate reusable objects once to avoid per-frame GC pressure
  const scratchRef = useRef({
    dummy: new THREE.Object3D(),
    position: new THREE.Vector3(),
    heading: new THREE.Vector3(),
  });

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !routes.length) {
      return;
    }

    elapsedRef.current += delta;
    const { dummy, position, heading } = scratchRef.current;

    for (let index = 0; index < count; index += 1) {
      const route = routes[index % routes.length]!;
      const speed = 4.6 + (index % 17) * 0.18;
      const offset = (index * 37.7) % Math.max(route.totalLength, 1);
      routePointAt(route, offset + elapsedRef.current * speed, position, heading);
      dummy.position.copy(position);
      dummy.rotation.set(0, Math.atan2(heading.x, heading.z), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!routes.length || count <= 0) {
    return null;
  }

  return (
    <instancedMesh
      key={count}
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
      frustumCulled
    />
  );
}

function R3FSceneStatsProbe({
  buildingChunks,
  cullingEnabled,
  onStats,
  registry,
  roadChunks,
  vehicleCount,
}: {
  buildingChunks: BuildingChunk[];
  cullingEnabled: boolean;
  onStats: (stats: BenchmarkStats) => void;
  registry: ChunkRegistry;
  roadChunks: RoadChunk[];
  vehicleCount: number;
}) {
  const { camera, gl } = useThree();
  const frustumRef = useRef(new THREE.Frustum());
  const projectionMatrixRef = useRef(new THREE.Matrix4());
  const statsAccumulatorRef = useRef(0);
  const renderInfoRef = useRef({
    calls: 0,
    geometries: 0,
    textures: 0,
    triangles: 0,
  });

  useEffect(
    () =>
      addAfterEffect(() => {
        renderInfoRef.current = {
          calls: gl.info.render.calls,
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures,
          triangles: gl.info.render.triangles,
        };
      }),
    [gl],
  );

  useFrame((_state, delta) => {
    camera.updateMatrixWorld();
    projectionMatrixRef.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustumRef.current.setFromProjectionMatrix(projectionMatrixRef.current);

    let buildingVisible = 0;
    buildingChunks.forEach((chunk) => {
      const group = registry.buildingGroups.current.get(chunk.id);
      const isVisible =
        !cullingEnabled || frustumRef.current.intersectsSphere(chunk.sphere);
      if (group) {
        group.visible = isVisible;
      }
      if (isVisible) {
        buildingVisible += 1;
      }
    });

    let roadVisible = 0;
    roadChunks.forEach((chunk) => {
      const group = registry.roadGroups.current.get(chunk.id);
      const isVisible =
        !cullingEnabled || frustumRef.current.intersectsSphere(chunk.sphere);
      if (group) {
        group.visible = isVisible;
      }
      if (isVisible) {
        roadVisible += 1;
      }
    });

    statsAccumulatorRef.current += delta;
    if (statsAccumulatorRef.current >= 0.5) {
      statsAccumulatorRef.current = 0;
      const renderInfo = renderInfoRef.current;
      onStats({
        buildingChunksVisible: buildingVisible,
        buildingChunksTotal: buildingChunks.length,
        drawCalls: renderInfo.calls,
        geometries: renderInfo.geometries,
        roadChunksVisible: roadVisible,
        roadChunksTotal: roadChunks.length,
        textures: renderInfo.textures,
        triangles: renderInfo.triangles,
        vehicleInstances: vehicleCount,
      });
    }
  });

  return null;
}

function BenchmarkScene({
  data,
  onStats,
  settings,
}: {
  data: SimulationData;
  onStats: (stats: BenchmarkStats) => void;
  settings: BenchmarkSettings;
}) {
  const sceneBounds = useMemo(
    () => computeSceneBounds(data.projectedRoadSegments),
    [data.projectedRoadSegments],
  );
  const buildingChunks = useMemo(
    () => buildBuildingChunks(data.buildingMasses),
    [data.buildingMasses],
  );
  const roadChunks = useMemo(
    () => buildRoadChunks(data.projectedRoadSegments),
    [data.projectedRoadSegments],
  );
  const routes = useMemo(
    () =>
      [...data.taxiRoutePool, ...data.trafficRoutePool].filter(
        (route) => route.totalLength > 2 && route.segmentLengths.length > 0,
      ),
    [data.taxiRoutePool, data.trafficRoutePool],
  );
  const registry = useObjectRegistry();
  const roadMaterials = useMemo<RoadMaterials>(
    () => ({
      arterial: new THREE.MeshStandardMaterial({
        color: 0x8fa0ad,
        emissive: 0x111e29,
        emissiveIntensity: 0.06,
        metalness: 0.02,
        roughness: 0.88,
      }),
      connector: new THREE.MeshStandardMaterial({
        color: 0x6b7d89,
        emissive: 0x0c1620,
        emissiveIntensity: 0.04,
        metalness: 0.01,
        roughness: 0.92,
      }),
      local: new THREE.MeshStandardMaterial({
        color: 0x465261,
        metalness: 0.01,
        roughness: 0.97,
      }),
    }),
    [],
  );
  useEffect(() => {
    return () => {
      roadMaterials.arterial.dispose();
      roadMaterials.connector.dispose();
      roadMaterials.local.dispose();
    };
  }, [roadMaterials]);
  const groundArgs = useMemo(
    () =>
      [
        Math.max(sceneBounds.size.x + 120, 360),
        Math.max(sceneBounds.size.z + 120, 360),
      ] as const,
    [sceneBounds.size.x, sceneBounds.size.z],
  );

  return (
    <>
      <color attach="background" args={["#07111c"]} />
      <fog attach="fog" args={["#07111c", 180, 820]} />
      <ambientLight intensity={0.58} />
      <hemisphereLight args={[0xc9eefc, 0x23313d, 1.5]} />
      <directionalLight
        castShadow
        intensity={2.1}
        position={[
          sceneBounds.center.x - 120,
          220,
          sceneBounds.center.z + 180,
        ]}
      />
      <mesh
        receiveShadow
        position={[sceneBounds.center.x, -0.02, sceneBounds.center.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={groundArgs} />
        <meshStandardMaterial color="#202327" roughness={0.98} />
      </mesh>
      {roadChunks.map((chunk) => (
        <RoadChunkMesh
          key={chunk.id}
          chunk={chunk}
          materials={roadMaterials}
          register={registry.registerRoadGroup}
        />
      ))}
      {buildingChunks.map((chunk) => (
        <BuildingChunkMesh
          key={chunk.id}
          chunk={chunk}
          register={registry.registerBuildingGroup}
        />
      ))}
      <VehicleInstances count={settings.vehicleCount} routes={routes} />
      <R3FSceneStatsProbe
        buildingChunks={buildingChunks}
        cullingEnabled={settings.cullingEnabled}
        onStats={onStats}
        registry={registry}
        roadChunks={roadChunks}
        vehicleCount={settings.vehicleCount}
      />
      <MapControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxDistance={620}
        maxPolarAngle={Math.PI * 0.48}
        minDistance={26}
        target={[
          sceneBounds.center.x,
          0,
          sceneBounds.center.z,
        ]}
      />
      {settings.showPerf ? (
        <Suspense fallback={null}>
          <LazyPerf position="top-left" />
        </Suspense>
      ) : null}
    </>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2"
      data-benchmark-metric={label.toLowerCase()}
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div
        className="mt-1 font-mono text-sm text-slate-100"
        data-benchmark-value
      >
        {value}
      </div>
    </div>
  );
}

export default function R3FMapBenchmark() {
  const [data, setData] = useState<SimulationData | null>(null);
  const [status, setStatus] = useState<BenchmarkStatus>("loading");
  const [statusDetail, setStatusDetail] = useState("지도 자산 불러오는 중");
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<BenchmarkStats>(initialStats);
  const [settings, setSettings] = useState<BenchmarkSettings>({
    cullingEnabled: true,
    showPerf: true,
    vehicleCount: 420,
  });

  const clock = useMemo(() => currentSimulationClock(), []);
  const [simulationDate, setSimulationDate] = useState(clock.dateIso);
  const [simulationTimeMinutes, setSimulationTimeMinutes] = useState(clock.minutes);
  const [circumstanceMode, setCircumstanceMode] = useState<CircumstanceMode>("live");
  const [selectedPoiCode, setSelectedPoiCode] = useState("");

  const sceneBounds = useMemo(
    () => (data ? computeSceneBounds(data.projectedRoadSegments) : null),
    [data],
  );

  const mapPoiFeatureRows = useMemo(() => buildStaticPoiFeatureRows(), []);
  const demandState = useMapDemandState({
    data,
    mapPoiFeatureRows,
    miniMapFocus: null,
    scenarioMapCenter: sceneBounds ? sceneBounds.center : null,
    activePoiCode: selectedPoiCode,
    circumstanceMode,
    simulationDate,
    normalizedSimulationTimeMinutes: circumstanceMode === "live" ? clock.minutes : simulationTimeMinutes,
  });

  useEffect(() => {
    const controller = new AbortController();
    loadSimulationData({
      signal: controller.signal,
      onAssetProgress: (loaded, total) => {
        setProgress(total > 0 ? Math.round((loaded / total) * 58) : 0);
      },
      onStageChange: (detail, nextProgress) => {
        setStatusDetail(detail);
        setProgress(Math.max(0, Math.min(100, Math.round(nextProgress))));
      },
    })
      .then((nextData) => {
        setData(nextData);
        setStatus("ready");
        setStatusDetail("R3F 벤치마크 준비 완료");
        setProgress(100);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setStatus("error");
        setStatusDetail(
          error instanceof Error
            ? error.message
            : "지도 자산을 불러오지 못했습니다.",
        );
      });

    return () => controller.abort();
  }, []);


  const cameraPosition = useMemo<[number, number, number]>(() => {
    if (!sceneBounds) {
      return [-120, 150, 190];
    }
    return [
      sceneBounds.center.x - 128,
      152,
      sceneBounds.center.z + 188,
    ];
  }, [sceneBounds]);

  const toggleCulling = useCallback(() => {
    setSettings((current) => ({
      ...current,
      cullingEnabled: !current.cullingEnabled,
    }));
  }, []);

  const togglePerf = useCallback(() => {
    setSettings((current) => ({
      ...current,
      showPerf: !current.showPerf,
    }));
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        {data && status === "ready" ? (
          <Canvas
            camera={{
              far: 1400,
              fov: 48,
              near: 0.1,
              position: cameraPosition,
            }}
            dpr={[1, 1.5]}
            gl={{
              antialias: false,
              powerPreference: "high-performance",
            }}
            shadows
          >
            <BenchmarkScene
              data={data}
              onStats={setStats}
              settings={settings}
            />
          </Canvas>
        ) : null}
      </div>

      <section
        className={`pointer-events-none absolute inset-x-4 z-10 flex flex-col gap-3 md:left-4 md:right-auto md:w-[360px] ${
          settings.showPerf ? "top-28" : "top-4"
        }`}
      >
        <div className="pointer-events-auto rounded-lg border border-white/10 bg-slate-950/88 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                R3F Perf Lab
              </div>
              <h1 className="mt-1 text-lg font-semibold text-slate-50">
                강남·역삼 지도 벤치마크
              </h1>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                status === "ready"
                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                  : status === "error"
                    ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                    : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
              }`}
            >
              {status}
            </span>
          </div>
          <div className="mt-3 text-xs leading-5 text-slate-400">
            {statusDetail}
          </div>
          {status === "loading" ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-300 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>

        {status === "ready" ? (
          <div className="pointer-events-auto rounded-lg border border-white/10 bg-slate-950/88 p-4 shadow-2xl backdrop-blur-md">
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="build chunks"
                value={`${stats.buildingChunksVisible}/${stats.buildingChunksTotal}`}
              />
              <Metric
                label="road chunks"
                value={`${stats.roadChunksVisible}/${stats.roadChunksTotal}`}
              />
              <Metric label="draw calls" value={String(stats.drawCalls)} />
              <Metric
                label="triangles"
                value={stats.triangles.toLocaleString("ko-KR")}
              />
              <Metric
                label="vehicles"
                value={stats.vehicleInstances.toLocaleString("ko-KR")}
              />
              <Metric
                label="memory"
                value={`${stats.geometries}g / ${stats.textures}t`}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleCulling}
                className={`h-9 rounded-lg border text-xs font-semibold transition ${
                  settings.cullingEnabled
                    ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-slate-900/80 text-slate-300"
                }`}
              >
                Culling {settings.cullingEnabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={togglePerf}
                className={`h-9 rounded-lg border text-xs font-semibold transition ${
                  settings.showPerf
                    ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
                    : "border-white/10 bg-slate-900/80 text-slate-300"
                }`}
              >
                r3f-perf {settings.showPerf ? "ON" : "OFF"}
              </button>
            </div>

            <div className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              수요 기준 시간 모드
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCircumstanceMode("live");
                  setSimulationDate(clock.dateIso);
                  setSimulationTimeMinutes(clock.minutes);
                  demandState.setHeatmapHour(Math.floor(clock.minutes / 60));
                }}
                className={`h-9 rounded-lg border text-xs font-semibold transition ${
                  circumstanceMode === "live"
                    ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-slate-900/80 text-slate-300"
                }`}
              >
                실시간 (Live)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCircumstanceMode("specific");
                }}
                className={`h-9 rounded-lg border text-xs font-semibold transition ${
                  circumstanceMode === "specific"
                    ? "border-amber-300/30 bg-amber-300/15 text-amber-100"
                    : "border-white/10 bg-slate-900/80 text-slate-300"
                }`}
              >
                조회 (Specific)
              </button>
            </div>

            <div className="mt-4">
              <label htmlFor="benchmark-date" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                수요 데이터 날짜
              </label>
              <select
                id="benchmark-date"
                value={simulationDate}
                onChange={(event) => {
                  setSimulationDate(event.target.value);
                }}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-300"
              >
                <option value={clock.dateIso}>오늘 ({clock.dateIso})</option>
                <option value="2026-01-01">과거 (2026-01-01)</option>
              </select>
            </div>

            <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Vehicle instances
            </label>
            <input
              type="range"
              min={0}
              max={1200}
              step={60}
              value={settings.vehicleCount}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  vehicleCount: Number(event.target.value),
                }));
              }}
              className="mt-2 h-1.5 w-full accent-cyan-300"
              aria-label="R3F 차량 인스턴스 수"
            />
          </div>
        ) : null}

        {status === "ready" ? (
          <div className="pointer-events-auto">
            <DemandMiniMapPanel
              demandMiniMap={demandState.demandMiniMap}
              heatmapFetchStatus={demandState.heatmapFetchStatus}
              heatmapHour={demandState.heatmapHour}
              heatmapMaxDemand={demandState.heatmapMaxDemand}
              selectedDongName={demandState.selectedDongName}
              setHeatmapHour={(hour) => {
                setCircumstanceMode("specific");
                setSimulationTimeMinutes(hour * 60);
                demandState.setHeatmapHour(hour);
              }}
              mapPoiFeatureRows={mapPoiFeatureRows}
              onPoiSelect={setSelectedPoiCode}
              onDongSelect={(dongName) => {
                demandState.setSelectedDongName(dongName);
              }}
              circumstanceMode={circumstanceMode}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
