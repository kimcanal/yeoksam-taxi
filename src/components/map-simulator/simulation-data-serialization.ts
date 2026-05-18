import * as THREE from "three";
import {
  deserializeRoadGraph,
  type BuildingMass,
  type DongBoundarySegment,
  type DongRegion,
  type Hotspot,
  type ProjectedRoadSegment,
  type RoadGraph,
  type RoadSegmentSpatialIndex,
  type RouteNode,
  type RouteTemplate,
  type SerializedRoadNetwork,
  type SignalData,
  type SimulationData,
  type TaxiStandLandmark,
  type TransitLandmark,
  type TurnRestriction,
} from "@/components/map-simulator/core";

type PlainVector3 = { x: number; y: number; z: number };

type SerializedRouteNode = Omit<RouteNode, "point"> & { point: PlainVector3 };
type SerializedStopMarker = {
  signalId: string;
  distance: number;
  axis: SignalData["priorityAxis"];
  turn: "straight" | "left" | "right";
};

type SerializedRouteTemplate = Omit<
  RouteTemplate,
  "nodes" | "segmentHeadings" | "stops"
> & {
  nodes: SerializedRouteNode[];
  segmentHeadings: PlainVector3[];
  stops: SerializedStopMarker[];
};

type SerializedRoadSegmentSpatialIndex = {
  cellSize: number;
  columns: Array<[number, Array<[number, number[]]>]>;
};

type SerializedBuildingMass = Omit<BuildingMass, "position"> & {
  position: PlainVector3;
};

type SerializedDongRegion = Omit<DongRegion, "position" | "rings"> & {
  position: PlainVector3;
  rings: PlainVector3[][];
};

type SerializedDongBoundarySegment = Omit<
  DongBoundarySegment,
  "start" | "end" | "center"
> & {
  start: PlainVector3;
  end: PlainVector3;
  center: PlainVector3;
};

type SerializedProjectedRoadSegment = Omit<ProjectedRoadSegment, "start" | "end"> & {
  start: PlainVector3;
  end: PlainVector3;
};

type SerializedTransitLandmark = Omit<TransitLandmark, "position" | "heading"> & {
  position: PlainVector3;
  heading: PlainVector3;
};

type SerializedTaxiStandLandmark = Omit<
  TaxiStandLandmark,
  "position" | "heading"
> & {
  position: PlainVector3;
  heading: PlainVector3;
};

type SerializedSignalData = Omit<SignalData, "point" | "visualPoint"> & {
  point: PlainVector3;
  visualPoint: PlainVector3;
};

type SerializedHotspot = Omit<Hotspot, "position" | "point"> & {
  position: PlainVector3;
  point: PlainVector3;
};

export type SerializedSimulationData = Omit<
  SimulationData,
  | "projectedRoadSegments"
  | "roadSegmentSpatialIndex"
  | "buildingMasses"
  | "dongRegions"
  | "dongBoundarySegments"
  | "transitLandmarks"
  | "taxiStandLandmarks"
  | "graph"
  | "signals"
  | "loopRoutes"
  | "taxiRoutePool"
  | "trafficRoutePool"
  | "hotspotPool"
> & {
  projectedRoadSegments: SerializedProjectedRoadSegment[];
  roadSegmentSpatialIndex: SerializedRoadSegmentSpatialIndex;
  buildingMasses: SerializedBuildingMass[];
  dongRegions: SerializedDongRegion[];
  dongBoundarySegments: SerializedDongBoundarySegment[];
  transitLandmarks: SerializedTransitLandmark[];
  taxiStandLandmarks: SerializedTaxiStandLandmark[];
  roadNetwork: SerializedRoadNetwork;
  signals: SerializedSignalData[];
  loopRoutes: SerializedRouteTemplate[];
  taxiRoutePool: SerializedRouteTemplate[];
  trafficRoutePool: SerializedRouteTemplate[];
  hotspotPool: SerializedHotspot[];
};

function toPlainVector3(vector: THREE.Vector3): PlainVector3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function fromPlainVector3(vector: PlainVector3) {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}

function serializeRouteNode(node: RouteNode): SerializedRouteNode {
  return {
    ...node,
    point: toPlainVector3(node.point),
  };
}

function deserializeRouteNode(node: SerializedRouteNode): RouteNode {
  return {
    ...node,
    point: fromPlainVector3(node.point),
  };
}

function serializeRoute(route: RouteTemplate): SerializedRouteTemplate {
  return {
    ...route,
    nodes: route.nodes.map(serializeRouteNode),
    segmentHeadings: route.segmentHeadings.map(toPlainVector3),
    stops: route.stops.map((stop) => ({
      signalId: stop.signalId,
      distance: stop.distance,
      axis: stop.axis,
      turn: stop.turn,
    })),
  };
}

function deserializeRoute(
  route: SerializedRouteTemplate,
  signalById: Map<string, SignalData>,
): RouteTemplate {
  return {
    ...route,
    nodes: route.nodes.map(deserializeRouteNode),
    segmentHeadings: route.segmentHeadings.map(fromPlainVector3),
    stops: route.stops.flatMap((stop) => {
      const signal = signalById.get(stop.signalId);
      if (!signal) {
        return [];
      }
      return [
        {
          signalId: stop.signalId,
          signal,
          distance: stop.distance,
          axis: stop.axis,
          turn: stop.turn,
        },
      ];
    }),
  };
}

function serializeRoadSegmentSpatialIndex(
  index: RoadSegmentSpatialIndex,
): SerializedRoadSegmentSpatialIndex {
  return {
    cellSize: index.cellSize,
    columns: [...index.columns.entries()].map(([columnKey, column]) => [
      columnKey,
      [...column.entries()],
    ]),
  };
}

function deserializeRoadSegmentSpatialIndex(
  index: SerializedRoadSegmentSpatialIndex,
): RoadSegmentSpatialIndex {
  return {
    cellSize: index.cellSize,
    columns: new Map(
      index.columns.map(([columnKey, column]) => [
        columnKey,
        new Map(column),
      ]),
    ),
  };
}

function serializeRoadGraph(
  graph: RoadGraph,
  center: { lat: number; lon: number },
): SerializedRoadNetwork {
  const restrictions = new Map<string, TurnRestriction>();
  graph.turnRestrictionsByViaKey.forEach((items) => {
    items.forEach((item) => restrictions.set(item.id, item));
  });

  const segments = [...graph.edgeById.values()].map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    roadClass: edge.roadClass,
    roadWidth: edge.roadWidth,
    length: edge.length,
    name: edge.name,
    wayId: edge.wayId,
    travelCost: edge.travelCost,
  }));

  return {
    version: 3,
    center,
    nodes: [...graph.nodes.values()].map((node) => ({
      key: node.key,
      x: node.point.x,
      z: node.point.z,
      outDegree: node.outDegree,
      neighborCount: node.neighborCount,
      isIntersection: node.isIntersection,
      isTerminal: node.isTerminal,
    })),
    segments,
    turnRestrictions: [...restrictions.values()],
    stats: {
      nodeCount: graph.nodes.size,
      segmentCount: segments.length,
      directedEdgeCount: segments.length,
      turnRestrictionCount: restrictions.size,
    },
  };
}

export function serializeSimulationData(
  data: SimulationData,
  graphFallback?: RoadGraph,
): SerializedSimulationData {
  const roadNetwork = data.roadNetwork ?? serializeRoadGraph(
    graphFallback ?? data.graph,
    data.center,
  );

  return {
    center: data.center,
    nonRoad: data.nonRoad,
    roads: data.roads,
    buildings: data.buildings,
    dongs: data.dongs,
    transit: data.transit,
    taxiStands: data.taxiStands,
    trafficSignals: data.trafficSignals,
    meta: data.meta,
    projectedRoadSegments: data.projectedRoadSegments.map((segment) => ({
      ...segment,
      start: toPlainVector3(segment.start),
      end: toPlainVector3(segment.end),
    })),
    roadSegmentSpatialIndex: serializeRoadSegmentSpatialIndex(
      data.roadSegmentSpatialIndex,
    ),
    buildingMasses: data.buildingMasses.map((building) => ({
      ...building,
      position: toPlainVector3(building.position),
    })),
    dongRegions: data.dongRegions.map((region) => ({
      ...region,
      position: toPlainVector3(region.position),
      rings: region.rings.map((ring) => ring.map(toPlainVector3)),
    })),
    dongBoundarySegments: data.dongBoundarySegments.map((segment) => ({
      ...segment,
      start: toPlainVector3(segment.start),
      end: toPlainVector3(segment.end),
      center: toPlainVector3(segment.center),
    })),
    transitLandmarks: data.transitLandmarks.map((landmark) => ({
      ...landmark,
      position: toPlainVector3(landmark.position),
      heading: toPlainVector3(landmark.heading),
    })),
    taxiStandLandmarks: data.taxiStandLandmarks.map((landmark) => ({
      ...landmark,
      position: toPlainVector3(landmark.position),
      heading: toPlainVector3(landmark.heading),
    })),
    roadNetwork,
    signals: data.signals.map((signal) => ({
      ...signal,
      point: toPlainVector3(signal.point),
      visualPoint: toPlainVector3(signal.visualPoint),
    })),
    loopRoutes: data.loopRoutes.map(serializeRoute),
    taxiRoutePool: data.taxiRoutePool.map(serializeRoute),
    trafficRoutePool: data.trafficRoutePool.map(serializeRoute),
    hotspotPool: data.hotspotPool.map((hotspot) => ({
      ...hotspot,
      position: toPlainVector3(hotspot.position),
      point: toPlainVector3(hotspot.point),
    })),
  };
}

export function deserializeSimulationData(
  data: SerializedSimulationData,
): SimulationData {
  const roadNetwork = data.roadNetwork;
  const graph = deserializeRoadGraph(roadNetwork);
  const signals: SignalData[] = data.signals.map((signal) => ({
    ...signal,
    point: fromPlainVector3(signal.point),
    visualPoint: fromPlainVector3(signal.visualPoint),
  }));
  const signalById = new Map(signals.map((signal) => [signal.id, signal] as const));

  return {
    ...data,
    projectedRoadSegments: data.projectedRoadSegments.map((segment) => ({
      ...segment,
      start: fromPlainVector3(segment.start),
      end: fromPlainVector3(segment.end),
    })),
    roadSegmentSpatialIndex: deserializeRoadSegmentSpatialIndex(
      data.roadSegmentSpatialIndex,
    ),
    buildingMasses: data.buildingMasses.map((building) => ({
      ...building,
      position: fromPlainVector3(building.position),
    })),
    dongRegions: data.dongRegions.map((region) => ({
      ...region,
      position: fromPlainVector3(region.position),
      rings: region.rings.map((ring) => ring.map(fromPlainVector3)),
    })),
    dongBoundarySegments: data.dongBoundarySegments.map((segment) => ({
      ...segment,
      start: fromPlainVector3(segment.start),
      end: fromPlainVector3(segment.end),
      center: fromPlainVector3(segment.center),
    })),
    transitLandmarks: data.transitLandmarks.map((landmark) => ({
      ...landmark,
      position: fromPlainVector3(landmark.position),
      heading: fromPlainVector3(landmark.heading),
    })),
    taxiStandLandmarks: data.taxiStandLandmarks.map((landmark) => ({
      ...landmark,
      position: fromPlainVector3(landmark.position),
      heading: fromPlainVector3(landmark.heading),
    })),
    roadNetwork,
    graph,
    signals,
    loopRoutes: data.loopRoutes.map((route) => deserializeRoute(route, signalById)),
    taxiRoutePool: data.taxiRoutePool.map((route) => deserializeRoute(route, signalById)),
    trafficRoutePool: data.trafficRoutePool.map((route) => deserializeRoute(route, signalById)),
    hotspotPool: data.hotspotPool.map((hotspot) => ({
      ...hotspot,
      position: fromPlainVector3(hotspot.position),
      point: fromPlainVector3(hotspot.point),
    })),
  };
}
