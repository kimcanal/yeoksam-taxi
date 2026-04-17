import { formatKstDateTime } from "@/components/map-simulator/simulation-environment";
import { SHOW_DONG_BOUNDARIES } from "@/components/map-simulator/scene-constants";
import {
  ACTIVE_DISPATCH_PLANNER_ID,
  DEFAULT_MAP_CENTER,
  DEFAULT_TAXI_COUNT,
  EMPTY_NON_ROAD_FEATURE_COLLECTION,
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
  buildTrafficRoutes,
  buildTransitLandmarks,
  deserializeRoadGraph,
  featureCollectionCenter,
  fetchGeoJsonAsset,
  fetchOptionalGeoJsonAsset,
  fetchRoadNetworkAsset,
  type BuildingFeatureCollection,
  type DongFeatureCollection,
  type NonRoadFeatureCollection,
  type RoadFeatureCollection,
  type SimulationData,
  type TrafficSignalFeatureCollection,
  type TransitFeatureCollection,
} from "@/components/map-simulator/core";

type LoadSimulationDataOptions = {
  onAssetProgress?: (loaded: number, total: number) => void;
  onStageChange?: (detail: string, progress: number) => void;
};

export async function loadSimulationData({
  onAssetProgress,
  onStageChange,
}: LoadSimulationDataOptions = {}): Promise<SimulationData> {
  let assetsLoaded = 0;
  const totalAssets = 7;
  const trackAsset = async <T,>(promise: Promise<T>) => {
    const result = await promise;
    assetsLoaded += 1;
    onAssetProgress?.(assetsLoaded, totalAssets);
    return result;
  };

  const [
    nonRoadAsset,
    roadsAsset,
    buildingsAsset,
    dongsAsset,
    transitAsset,
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
      fetchOptionalGeoJsonAsset<TrafficSignalFeatureCollection>(
        "/traffic-signals.geojson",
        "traffic-signals",
      ),
    ),
    trackAsset(fetchRoadNetworkAsset("/road-network.json")),
  ]);

  onStageChange?.("도로 세그먼트와 공간 인덱스 준비 중", 50);

  const nonRoad = nonRoadAsset?.data ?? EMPTY_NON_ROAD_FEATURE_COLLECTION;
  const roads = roadsAsset.data;
  const buildings = buildingsAsset.data;
  const dongs = dongsAsset.data;
  const transit = transitAsset.data;
  const trafficSignals =
    trafficSignalsAsset?.data ?? EMPTY_TRAFFIC_SIGNAL_FEATURE_COLLECTION;
  const roadNetwork = roadNetworkAsset?.data ?? null;
  const assetTimes = [
    nonRoadAsset?.meta.lastModified ?? null,
    roadsAsset.meta.lastModified,
    buildingsAsset.meta.lastModified,
    dongsAsset.meta.lastModified,
    transitAsset.meta.lastModified,
    trafficSignalsAsset?.meta.lastModified ?? null,
    roadNetworkAsset?.meta.lastModified ?? null,
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

  onStageChange?.("도로 그래프와 신호 체계 준비 중", 58);

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
  const signalByKey = new Map(
    signals.map((signal) => [signal.key, signal] as const),
  );
  const loopRoutes = buildLoopRoutes(roads, center, signalByKey);
  const trafficRoutes = buildTrafficRoutes(roads, center, signalByKey);
  const taxiRoutePool = loopRoutes
    .filter((route) => route.roadClass !== "local")
    .slice(0, Math.max(MAX_TAXI_COUNT, DEFAULT_TAXI_COUNT));
  const trafficRoutePool = trafficRoutes.slice(0, Math.max(MAX_TRAFFIC_COUNT, 20));
  if (!taxiRoutePool.length || !trafficRoutePool.length) {
    throw new Error("No drivable routes available for vehicle simulation");
  }

  onStageChange?.("배차 경로와 승차 포인트 준비 중", 65);

  const hotspotPool = buildTaxiHotspots(
    taxiRoutePool,
    buildingMasses,
    graph,
    signalByKey,
  );
  if (!hotspotPool.length) {
    throw new Error("No dispatch hotspots available for taxi simulation");
  }

  return {
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
      dispatchPlannerId: ACTIVE_DISPATCH_PLANNER_ID,
      latestAssetUpdatedAt: assetTimes.at(-1) ?? null,
      loadedAt: formatKstDateTime(new Date()) ?? "unknown",
      assets: {
        nonRoad: nonRoadAsset?.meta ?? null,
        roads: roadsAsset.meta,
        buildings: buildingsAsset.meta,
        dongs: dongsAsset.meta,
        transit: transitAsset.meta,
        trafficSignals: trafficSignalsAsset?.meta ?? null,
        roadNetwork: roadNetworkAsset?.meta ?? null,
      },
    },
  };
}
