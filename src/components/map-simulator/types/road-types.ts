import type * as THREE from "three";
import type { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import type { StopMarker } from "./signal-types";

export type RoadProperties = { roadClass: "arterial" | "connector" | "local"; width: number; name: string | null; highway: string | null; sourceWayId: string | null; oneway: "no" | "forward" | "backward"; };
export type TurnRestrictionMode = "no" | "only";
export type TurnRestriction = { id: string; viaKey: string; fromWayId: string; toWayId: string; kind: string; mode: TurnRestrictionMode; };
export type RoadFeature = Feature<LineString | MultiLineString, RoadProperties>;
export type RoadFeatureCollection = FeatureCollection<LineString | MultiLineString, RoadProperties> & { routing?: { turnRestrictions?: TurnRestriction[]; }; };
export type SerializedRoadNetworkNode = { key: string; x: number; z: number; outDegree?: number; neighborCount?: number; isIntersection?: boolean; isTerminal?: boolean; };
export type SerializedRoadNetworkSegment = { id: string; from: string; to: string; roadClass: RoadProperties["roadClass"]; roadWidth: number; length: number; name: string | null; wayId?: string | null; travelCost?: number; };
export type SerializedRoadNetwork = { version: number; center: { lat: number; lon: number }; nodes: SerializedRoadNetworkNode[]; segments: SerializedRoadNetworkSegment[]; turnRestrictions?: TurnRestriction[]; stats: { nodeCount: number; segmentCount: number; directedEdgeCount: number; turnRestrictionCount?: number; }; };
export type RouteNode = { key: string; point: THREE.Vector3; outDegree?: number; neighborCount?: number; isIntersection?: boolean; isTerminal?: boolean; };
export type RouteTemplate = { id: string; name: string | null; roadClass: RoadProperties["roadClass"]; roadWidth: number; laneOffset: number; nodes: RouteNode[]; cumulative: number[]; segmentLengths: number[]; segmentHeadings: THREE.Vector3[]; totalLength: number; stops: StopMarker[]; startKey: string; endKey: string; isLoop: boolean; };
export type ProjectedRoadSegment = { roadClass: RoadProperties["roadClass"]; width: number; start: THREE.Vector3; end: THREE.Vector3; name: string | null; };
export type RoadSegmentSpatialIndex = { cellSize: number; columns: Map<number, Map<number, number[]>>; };
export type NearestRoadContext = { closest: THREE.Vector3; heading: THREE.Vector3; width: number; roadClass: RoadProperties["roadClass"]; name: string | null; distance: number; };
export type GraphEdge = { id: string; from: string; to: string; roadClass: RoadProperties["roadClass"]; roadWidth: number; length: number; travelCost: number; name: string | null; wayId: string | null; };
export type RoadGraph = { nodes: Map<string, RouteNode>; adjacency: Map<string, GraphEdge[]>; edgeById: Map<string, GraphEdge>; turnRestrictionsByViaKey: Map<string, TurnRestriction[]>; };
