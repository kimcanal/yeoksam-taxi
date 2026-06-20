import * as THREE from "three";
import type {
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import {
  METERS_PER_DEGREE_LATITUDE,
  METERS_PER_DEGREE_LONGITUDE_AT_EQUATOR,
} from "@/components/map-simulator/constants/map-constants";
import { DEFAULT_MAP_CENTER } from "@/components/map-simulator/utils/map-defaults";
import {
  POSITION_SCALE,
  ROAD_SEGMENT_INDEX_CELL_SIZE,
  ROAD_WIDTH_SCALE,
} from "@/components/map-simulator/scene/scene-constants";
import type {
  BuildingFeature,
  DongFeature,
  NonRoadFeature,
  ProjectedRoadSegment,
  RoadFeature,
  RoadFeatureCollection,
  RoadSegmentSpatialIndex,
} from "@/components/map-simulator/types";

export function geoKey(position: Position) {
  return `${position[0].toFixed(5)}:${position[1].toFixed(5)}`;
}

export function visitGeometryPositions(
  geometry: LineString | MultiLineString | Polygon | MultiPolygon,
  visit: (position: Position) => void,
) {
  if (geometry.type === "LineString") {
    geometry.coordinates.forEach(visit);
    return;
  }

  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    geometry.coordinates.forEach((line) => line.forEach(visit));
    return;
  }

  geometry.coordinates.forEach((polygon) =>
    polygon.forEach((ring) => ring.forEach(visit)),
  );
}

export function featureCollectionCenter(
  featureCollection: FeatureCollection<
    LineString | MultiLineString | Polygon | MultiPolygon
  >,
) {
  let south = Number.POSITIVE_INFINITY;
  let west = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;

  featureCollection.features.forEach((feature) => {
    visitGeometryPositions(feature.geometry, ([lon, lat]) => {
      south = Math.min(south, lat);
      west = Math.min(west, lon);
      north = Math.max(north, lat);
      east = Math.max(east, lon);
    });
  });

  if (!Number.isFinite(south)) {
    return DEFAULT_MAP_CENTER;
  }

  return {
    lat: (south + north) / 2,
    lon: (west + east) / 2,
  };
}

export function projectPoint(
  position: Position,
  center: { lat: number; lon: number },
) {
  const latFactor = METERS_PER_DEGREE_LATITUDE * POSITION_SCALE;
  const lonFactor =
    METERS_PER_DEGREE_LONGITUDE_AT_EQUATOR *
    Math.cos((center.lat * Math.PI) / 180) *
    POSITION_SCALE;
  return new THREE.Vector3(
    (position[0] - center.lon) * lonFactor,
    0,
    -(position[1] - center.lat) * latFactor,
  );
}

export function lineStringsOfRoad(
  feature: RoadFeature,
  center: { lat: number; lon: number },
) {
  if (feature.geometry.type === "LineString") {
    return [
      feature.geometry.coordinates.map((coordinate) => ({
        key: geoKey(coordinate),
        point: projectPoint(coordinate, center),
      })),
    ];
  }

  return feature.geometry.coordinates.map((line) =>
    line.map((coordinate) => ({
      key: geoKey(coordinate),
      point: projectPoint(coordinate, center),
    })),
  );
}

export function buildProjectedRoadSegments(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
) {
  return roads.features.flatMap((feature) =>
    lineStringsOfRoad(feature, center).flatMap((line) =>
      line.slice(1).map((node, index) => ({
        roadClass: feature.properties.roadClass,
        width: feature.properties.width * ROAD_WIDTH_SCALE,
        start: line[index].point,
        end: node.point,
        name: feature.properties.name,
      })),
    ),
  );
}

export type ProjectedRoadSegmentBounds = {
  center: THREE.Vector3;
  size: THREE.Vector3;
};

export function computeProjectedRoadSegmentBounds(
  roadSegments: ProjectedRoadSegment[],
  fallbackSize = new THREE.Vector3(320, 0, 320),
): ProjectedRoadSegmentBounds {
  const bounds = new THREE.Box3();

  roadSegments.forEach((segment) => {
    bounds.expandByPoint(segment.start);
    bounds.expandByPoint(segment.end);
  });

  if (bounds.isEmpty()) {
    return {
      center: new THREE.Vector3(),
      size: fallbackSize.clone(),
    };
  }

  return {
    center: bounds.getCenter(new THREE.Vector3()),
    size: bounds.getSize(new THREE.Vector3()),
  };
}

export function roadSegmentCellCoord(value: number, cellSize: number) {
  return Math.floor(value / cellSize);
}

export function buildRoadSegmentSpatialIndex(
  roadSegments: ProjectedRoadSegment[],
  cellSize = ROAD_SEGMENT_INDEX_CELL_SIZE,
): RoadSegmentSpatialIndex {
  const columns = new Map<number, Map<number, number[]>>();

  for (let segmentIndex = 0; segmentIndex < roadSegments.length; segmentIndex += 1) {
    const segment = roadSegments[segmentIndex]!;
    const minX = Math.min(segment.start.x, segment.end.x);
    const maxX = Math.max(segment.start.x, segment.end.x);
    const minZ = Math.min(segment.start.z, segment.end.z);
    const maxZ = Math.max(segment.start.z, segment.end.z);

    const startCellX = roadSegmentCellCoord(minX, cellSize);
    const endCellX = roadSegmentCellCoord(maxX, cellSize);
    const startCellZ = roadSegmentCellCoord(minZ, cellSize);
    const endCellZ = roadSegmentCellCoord(maxZ, cellSize);

    for (let cellX = startCellX; cellX <= endCellX; cellX += 1) {
      let column = columns.get(cellX);
      if (!column) {
        column = new Map<number, number[]>();
        columns.set(cellX, column);
      }

      for (let cellZ = startCellZ; cellZ <= endCellZ; cellZ += 1) {
        let bucket = column.get(cellZ);
        if (!bucket) {
          bucket = [];
          column.set(cellZ, bucket);
        }
        bucket.push(segmentIndex);
      }
    }
  }

  return {
    cellSize,
    columns,
  };
}

export function collectRoadSegmentCandidateIndices(
  point: THREE.Vector3,
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex | null,
  maxDistance: number,
) {
  if (!roadSegmentSpatialIndex || !Number.isFinite(maxDistance)) {
    return null;
  }

  const cellRadius = Math.max(
    1,
    Math.ceil(maxDistance / roadSegmentSpatialIndex.cellSize) + 1,
  );
  const centerCellX = roadSegmentCellCoord(point.x, roadSegmentSpatialIndex.cellSize);
  const centerCellZ = roadSegmentCellCoord(point.z, roadSegmentSpatialIndex.cellSize);
  const seen = new Set<number>();

  for (
    let cellX = centerCellX - cellRadius;
    cellX <= centerCellX + cellRadius;
    cellX += 1
  ) {
    const column = roadSegmentSpatialIndex.columns.get(cellX);
    if (!column) {
      continue;
    }

    for (
      let cellZ = centerCellZ - cellRadius;
      cellZ <= centerCellZ + cellRadius;
      cellZ += 1
    ) {
      const bucket = column.get(cellZ);
      if (!bucket) {
        continue;
      }

      for (let bucketIndex = 0; bucketIndex < bucket.length; bucketIndex += 1) {
        const segmentIndex = bucket[bucketIndex]!;
        if (segmentIndex >= 0 && segmentIndex < roadSegments.length) {
          seen.add(segmentIndex);
        }
      }
    }
  }

  return seen.size ? [...seen] : null;
}

export function outerRingOfBuilding(
  feature: BuildingFeature,
  center: { lat: number; lon: number },
) {
  const ring =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : (feature.geometry.coordinates[0]?.[0] ?? []);

  return ring.map((coordinate) => projectPoint(coordinate, center));
}

export function outerRingsOfDong(
  feature: DongFeature,
  center: { lat: number; lon: number },
) {
  if (feature.geometry.type === "Polygon") {
    const ring = feature.geometry.coordinates[0] ?? [];
    return ring.length
      ? [ring.map((coordinate) => projectPoint(coordinate, center))]
      : [];
  }

  return feature.geometry.coordinates
    .map((polygon) => polygon[0] ?? [])
    .filter((ring) => ring.length)
    .map((ring) => ring.map((coordinate) => projectPoint(coordinate, center)));
}

export function shapePointsFromCoordinates(
  ring: Position[],
  center: { lat: number; lon: number },
  clockwise: boolean,
) {
  const points = ring.map((coordinate) => {
    const point = projectPoint(coordinate, center);
    return new THREE.Vector2(point.x, -point.z);
  });

  if (
    points.length > 1 &&
    points[0].distanceTo(points[points.length - 1]) < 0.001
  ) {
    points.pop();
  }

  if (points.length < 3) {
    return null;
  }

  if (THREE.ShapeUtils.isClockWise(points) !== clockwise) {
    points.reverse();
  }

  return points;
}

export function shapeFromPolygonCoordinates(
  rings: Position[][],
  center: { lat: number; lon: number },
) {
  const outerPoints = shapePointsFromCoordinates(rings[0] ?? [], center, false);
  if (!outerPoints) {
    return null;
  }

  const shape = new THREE.Shape(outerPoints);
  rings.slice(1).forEach((ring) => {
    const holePoints = shapePointsFromCoordinates(ring, center, true);
    if (!holePoints) {
      return;
    }
    shape.holes.push(new THREE.Path(holePoints));
  });

  return shape;
}

export function dongShapeFromRing(ring: THREE.Vector3[]) {
  const points = ring.map((point) => new THREE.Vector2(point.x, -point.z));
  if (
    points.length > 1 &&
    points[0].distanceTo(points[points.length - 1]) < 0.001
  ) {
    points.pop();
  }
  if (points.length < 3) {
    return null;
  }
  if (THREE.ShapeUtils.isClockWise(points)) {
    points.reverse();
  }
  return new THREE.Shape(points);
}

export function shapesOfNonRoadFeature(
  feature: NonRoadFeature,
  center: { lat: number; lon: number },
) {
  if (feature.geometry.type === "Polygon") {
    const shape = shapeFromPolygonCoordinates(
      feature.geometry.coordinates,
      center,
    );
    return shape ? [shape] : [];
  }

  return feature.geometry.coordinates
    .map((polygon) => shapeFromPolygonCoordinates(polygon, center))
    .filter(Boolean) as THREE.Shape[];
}
