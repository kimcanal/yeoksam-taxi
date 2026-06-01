import type * as THREE from "three";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";

export type NonRoadCategory = "green" | "pedestrian" | "parking" | "water" | "facility";
export type NonRoadProperties = { category: NonRoadCategory; kind: string | null; name: string | null; sourceTag: string | null; area: number; };
export type BuildingProperties = { height: number; area: number; label: string | null; kind: string | null; address: string | null; };
export type DongProperties = { name: string; nameEn: string | null; };
export type NonRoadFeature = Feature<Polygon | MultiPolygon, NonRoadProperties>;
export type BuildingFeature = Feature<Polygon | MultiPolygon, BuildingProperties>;
export type DongFeature = Feature<Polygon | MultiPolygon, DongProperties>;
export type NonRoadFeatureCollection = FeatureCollection<Polygon | MultiPolygon, NonRoadProperties>;
export type BuildingFeatureCollection = FeatureCollection<Polygon | MultiPolygon, BuildingProperties>;
export type DongFeatureCollection = FeatureCollection<Polygon | MultiPolygon, DongProperties>;

export type BuildingMass = { id: string; label: string | null; height: number; position: THREE.Vector3; width: number; depth: number; rotationY: number; color: number; };
export type DongRegion = { id: string; name: string; nameEn: string | null; position: THREE.Vector3; rings: THREE.Vector3[][]; color: number; };
export type DongBoundarySegment = { id: string; start: THREE.Vector3; end: THREE.Vector3; center: THREE.Vector3; angle: number; length: number; leftDong: string | null; rightDong: string | null; };
