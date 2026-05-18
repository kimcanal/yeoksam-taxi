import { formatKstDateTime } from "@/components/map-simulator/simulation-environment";
import { SHOW_DONG_BOUNDARIES } from "@/components/map-simulator/scene-constants";
import {
  DEFAULT_MAP_CENTER,
  EMPTY_NON_ROAD_FEATURE_COLLECTION,
  EMPTY_TAXI_STAND_FEATURE_COLLECTION,
  EMPTY_TRAFFIC_SIGNAL_FEATURE_COLLECTION,
  MAX_TAXI_COUNT,
  MAX_TRAFFIC_COUNT,
  buildBuildingMasses,
  buildDongBoundarySegments,
  buildDongRegions,
  buildLoopRoutes,
  buildProjectedRoadSegments,
  buildRoadGraph,
  buildRoadSegmentSpatialIndex,
  buildSignals,
  buildTaxiHotspots,
  buildTaxiStandHotspots,
  buildTaxiStandLandmarks,
  buildTrafficRoutes,
  buildTransitLandmarks,
  deserializeRoadGraph,
  featureCollectionCenter,
  type BuildingFeatureCollection,
  type DongFeatureCollection,
  type NonRoadFeatureCollection,
  type RoadFeatureCollection,
  type SerializedRoadNetwork,
  type SimulationData,
  type TaxiStandFeatureCollection,
  type TrafficSignalFeatureCollection,
  type TransitFeatureCollection,
} from "@/components/map-simulator/core";
import { serializeSimulationData } from "@/components/map-simulator/simulation-data-serialization";
import { fetchCachedJsonAsset } from "@/components/map-simulator/static-asset-cache";

type WorkerRequest = {
  type: "load";
};

type WorkerProgressMessage =
  | { type: "asset-progress"; loaded: number; total: number }
  | { type: "stage"; detail: string; progress: number }
  | { type: "done"; data: ReturnType<typeof serializeSimulationData> }
  | { type: "error"; message: string };

const workerScope = self as typeof globalThis & {
  postMessage: (message: WorkerProgressMessage) => void;
  addEventListener: typeof globalThis.addEventListener;
};

function postMessage(message: WorkerProgressMessage) {
  workerScope.postMessage(message);
}

async function fetchGeoJsonAsset<Data extends { features: unknown[] }>(path: string) {
  return fetchCachedJsonAsset<Data>(
    path,
    (data) => (Array.isArray(data.features) ? data.features.length : 0),
  );
}

async function fetchOptionalGeoJsonAsset<Data extends { features: unknown[] }>(
  path: string,
  label: string,
) {
  try {
    return await fetchGeoJsonAsset<Data>(path);
  } catch (error) {
    console.warn(`Skipping optional ${label} asset.`, error);
    return null;
  }
}

async function fetchRoadNetworkAsset(path: string) {
  try {
    return await fetchCachedJsonAsset<SerializedRoadNetwork>(
      path,
      (data) => data.stats.segmentCount,
    );
  } catch (error) {
    console.warn("Falling back to worker-side road-graph build.", error);
    return null;
  }
}

function formatMetaLastModified(lastModified: string | null) {
  return lastModified ? formatKstDateTime(lastModified) : null;
}

async function loadSimulationData() {
  let assetsLoaded = 0;
  const totalAssets = 8;
  const trackAsset = async <Data,>(promise: Promise<Data>) => {
    const result = await promise;
    assetsLoaded += 1;
    postMessage({
      type: "asset-progress",
      loaded: assetsLoaded,
      total: totalAssets,
    });
    return result;
  };

  const [
    nonRoadAsset,
    roadsAsset,
    buildingsAsset,
    dongsAsset,
    transitAsset,
    taxiStandsAsset,
    trafficSignalsAsset,
    roadNetworkAsset,
  ] = await Promise.all([
    trackAsset(
      fetchOptionalGeoJsonAsset<NonRoadFeatureCollection>(
        "/non-road.geojson",
        "non-road",
      ),
    ),
    trackAsset(fetchGeoJsonAsset<RoadFeatureCollection>("/roads.geojson")),
    trackAsset(fetchGeoJsonAsset<BuildingFeatureCollection>("/buildings.geojson")),
    trackAsset(fetchGeoJsonAsset<DongFeatureCollection>("/dongs.geojson")),
    trackAsset(fetchGeoJsonAsset<TransitFeatureCollection>("/transit.geojson")),
    trackAsset(
      fetchOptionalGeoJsonAsset<TaxiStandFeatureCollection>(
        "/taxi-stands.geojson",
        "taxi-stands",
      ),
    ),
    trackAsset(
      fetchOptionalGeoJsonAsset<TrafficSignalFeatureCollection>(
        "/traffic-signals.geojson",
        "traffic-signals",
      ),
    ),
    trackAsset(fetchRoadNetworkAsset("/road-network.json")),
  ]);

  postMessage({
    type: "stage",
    detail: "도로 세그먼트와 공간 인덱스 준비 중",
    progress: 50,
  });

  const nonRoad = nonRoadAsset?.data ?? EMPTY_NON_ROAD_FEATURE_COLLECTION;
  const roads = roadsAsset.data;
  const buildings = buildingsAsset.data;
  const dongs = dongsAsset.data;
  const transit = transitAsset.data;
  const taxiStands = taxiStandsAsset?.data ?? EMPTY_TAXI_STAND_FEATURE_COLLECTION;
  const trafficSignals =
    trafficSignalsAsset?.data ?? EMPTY_TRAFFIC_SIGNAL_FEATURE_COLLECTION;
  const roadNetwork = roadNetworkAsset?.data ?? null;

  const assetTimes = [
    formatMetaLastModified(nonRoadAsset?.meta.lastModified ?? null),
    formatMetaLastModified(roadsAsset.meta.lastModified),
    formatMetaLastModified(buildingsAsset.meta.lastModified),
    formatMetaLastModified(dongsAsset.meta.lastModified),
    formatMetaLastModified(transitAsset.meta.lastModified),
    formatMetaLastModified(taxiStandsAsset?.meta.lastModified ?? null),
    formatMetaLastModified(trafficSignalsAsset?.meta.lastModified ?? null),
    formatMetaLastModified(roadNetworkAsset?.meta.lastModified ?? null),
  ]
    .filter(Boolean)
    .sort() as string[];

  const center =
    roadNetwork?.center ??
    (dongs.features.length ? featureCollectionCenter(dongs) : DEFAULT_MAP_CENTER);
  const projectedRoadSegments = buildProjectedRoadSegments(roads, center);
  const roadSegmentSpatialIndex = buildRoadSegmentSpatialIndex(projectedRoadSegments);
  const buildingMasses = buildBuildingMasses(buildings, center);
  const dongRegions = buildDongRegions(dongs, center);
  const dongBoundarySegments = SHOW_DONG_BOUNDARIES
    ? buildDongBoundarySegments(dongRegions)
    : [];
  const transitLandmarks = buildTransitLandmarks(
    transit,
    center,
    projectedRoadSegments,
    roadSegmentSpatialIndex,
  );
  const taxiStandLandmarks = buildTaxiStandLandmarks(
    taxiStands,
    center,
    projectedRoadSegments,
    roadSegmentSpatialIndex,
  );

  postMessage({
    type: "stage",
    detail: "도로 그래프와 신호 체계 준비 중",
    progress: 58,
  });

  const graph = roadNetwork
    ? deserializeRoadGraph(roadNetwork)
    : buildRoadGraph(roads, center);
  const signals = buildSignals(
    roads,
    center,
    graph,
    trafficSignals,
    projectedRoadSegments,
    roadSegmentSpatialIndex,
  );
  const signalByKey = new globalThis.Map(
    signals.map((signal) => [signal.key, signal] as const),
  );
  const loopRoutes = buildLoopRoutes(roads, center, signalByKey);
  const trafficRoutes = buildTrafficRoutes(roads, center, signalByKey);
  const taxiRoutePool = loopRoutes
    .filter((route) => route.roadClass !== "local")
    .slice(0, Math.max(MAX_TAXI_COUNT, 12));
  const trafficRoutePool = trafficRoutes.slice(0, Math.max(MAX_TRAFFIC_COUNT, 20));
  if (!taxiRoutePool.length || !trafficRoutePool.length) {
    throw new Error("No drivable routes available for vehicle simulation");
  }

  postMessage({
    type: "stage",
    detail: "주행 경로와 택시승차대 운영 포인트 준비 중",
    progress: 65,
  });

  const fallbackHotspotPool = buildTaxiHotspots(
    taxiRoutePool,
    buildingMasses,
    graph,
    signalByKey,
  );
  const taxiStandHotspotPool = buildTaxiStandHotspots(
    taxiStandLandmarks,
    taxiRoutePool,
  );
  const hotspotPool =
    taxiStandHotspotPool.length > 0 ? taxiStandHotspotPool : fallbackHotspotPool;
  if (!hotspotPool.length) {
    throw new Error("No taxi hotspots available for taxi simulation");
  }

  const simulationData: SimulationData = {
    center,
    nonRoad,
    roads,
    projectedRoadSegments,
    roadSegmentSpatialIndex,
    buildings,
    buildingMasses,
    dongs,
    dongRegions,
    dongBoundarySegments,
    transit,
    transitLandmarks,
    taxiStands,
    taxiStandLandmarks,
    trafficSignals,
    roadNetwork,
    graph,
    signals,
    loopRoutes,
    taxiRoutePool,
    trafficRoutePool,
    hotspotPool,
      meta: {
        source:
          "A-Eye Module 1 companion: OpenStreetMap + Overpass -> public/*.geojson + public/road-network.json",
        boundarySource: "OSM administrative relations (admin_level=8)",
        latestAssetUpdatedAt: assetTimes.at(-1) ?? null,
      loadedAt: formatKstDateTime(new Date()) ?? "unknown",
      assets: {
        nonRoad: nonRoadAsset
          ? {
            ...nonRoadAsset.meta,
            lastModified: formatMetaLastModified(nonRoadAsset.meta.lastModified),
          }
          : null,
        roads: {
          ...roadsAsset.meta,
          lastModified: formatMetaLastModified(roadsAsset.meta.lastModified),
        },
        buildings: {
          ...buildingsAsset.meta,
          lastModified: formatMetaLastModified(buildingsAsset.meta.lastModified),
        },
        dongs: {
          ...dongsAsset.meta,
          lastModified: formatMetaLastModified(dongsAsset.meta.lastModified),
        },
        transit: {
          ...transitAsset.meta,
          lastModified: formatMetaLastModified(transitAsset.meta.lastModified),
        },
        taxiStands: taxiStandsAsset
          ? {
            ...taxiStandsAsset.meta,
            lastModified: formatMetaLastModified(taxiStandsAsset.meta.lastModified),
          }
          : null,
        trafficSignals: trafficSignalsAsset
          ? {
            ...trafficSignalsAsset.meta,
            lastModified: formatMetaLastModified(
              trafficSignalsAsset.meta.lastModified,
            ),
          }
          : null,
        roadNetwork: roadNetworkAsset
          ? {
            ...roadNetworkAsset.meta,
            lastModified: formatMetaLastModified(roadNetworkAsset.meta.lastModified),
          }
          : null,
      },
    },
  };

  postMessage({
    type: "done",
    data: serializeSimulationData(simulationData, graph),
  });
}

workerScope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== "load") {
    return;
  }

  void loadSimulationData().catch((error) => {
    postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Failed to load simulation data",
    });
  });
});
