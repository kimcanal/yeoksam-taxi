import type {
  NonRoadFeatureCollection,
  TaxiStandFeatureCollection,
  TrafficSignalFeatureCollection,
} from "@/components/map-simulator/map-simulator-types";

export const EMPTY_NON_ROAD_FEATURE_COLLECTION: NonRoadFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export const EMPTY_TRAFFIC_SIGNAL_FEATURE_COLLECTION: TrafficSignalFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export const EMPTY_TAXI_STAND_FEATURE_COLLECTION: TaxiStandFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};
