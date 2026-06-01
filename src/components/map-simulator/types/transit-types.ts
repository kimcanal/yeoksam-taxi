import type * as THREE from "three";
import type { FeatureCollection, Point } from "geojson";
import type { RoadProperties } from "./road-types";

export type TransitCategory = "bus_stop" | "subway_station";
export type TransitProperties = { category: TransitCategory; name: string | null; operator: string | null; network: string | null; ref: string | null; sourceType: string | null; importance: number; };
export type TaxiStandProperties = { stand_id: string; old_id: string; jcd_id: string; stand_type: string; facility_type: string; installed_at: string; powered: string; district: string; dong_name: string; lot_address: string; road_address: string; adjacent_road: string; location_name: string; is_target_dong: boolean; };
export type TransitFeatureCollection = FeatureCollection<Point, TransitProperties>;
export type TaxiStandFeatureCollection = FeatureCollection<Point, TaxiStandProperties>;
export type TransitLandmark = { id: string; category: TransitCategory; name: string | null; position: THREE.Vector3; heading: THREE.Vector3; sideSign: 1 | -1; yaw: number; importance: number; roadClass: RoadProperties["roadClass"] | null; isMajor: boolean; };
export type TaxiStandLandmark = { id: string; standId: string; name: string; dongName: string; roadAddress: string; position: THREE.Vector3; heading: THREE.Vector3; sideSign: 1 | -1; yaw: number; isShelter: boolean; };
