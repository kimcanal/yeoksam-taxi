import * as THREE from "three";
import { lineStringsOfRoad } from "@/components/map-simulator/map-geometry-utils";
import {
  buildCumulative,
  buildSegmentHeadings,
  buildSegmentLengthsFromCumulative,
  distanceXZ,
} from "@/components/map-simulator/route-motion-utils";
import { ROAD_WIDTH_SCALE } from "@/components/map-simulator/scene-constants";
import {
  classifyTurn,
  roadRank,
} from "@/components/map-simulator/road-query-utils";
import {
  type GraphEdge,
  type RoadFeatureCollection,
  type RoadProperties,
  type RoadGraph,
  type RouteNode,
  type RouteTemplate,
  type SerializedRoadNetwork,
  type SignalData,
  type StopMarker,
  type TurnRestriction,
} from "@/components/map-simulator/core";
import { dominantAxis } from "@/components/map-simulator/signal-controller";

function roadTravelCost(roadClass: RoadProperties["roadClass"]) {
  switch (roadClass) {
    case "arterial":
      return 0.9;
    case "connector":
      return 1;
    default:
      return 1.18;
  }
}

function edgeTravelCost(
  length: number,
  roadClass: RoadProperties["roadClass"],
) {
  return length * roadTravelCost(roadClass);
}

function annotateRoadGraphNodes(
  nodes: Map<string, RouteNode>,
  adjacency: Map<string, GraphEdge[]>,
  edgeById: Map<string, GraphEdge>,
) {
  const neighborSets = new Map<string, Set<string>>();

  edgeById.forEach((edge) => {
    const fromNeighbors = neighborSets.get(edge.from) ?? new Set<string>();
    fromNeighbors.add(edge.to);
    neighborSets.set(edge.from, fromNeighbors);

    const toNeighbors = neighborSets.get(edge.to) ?? new Set<string>();
    toNeighbors.add(edge.from);
    neighborSets.set(edge.to, toNeighbors);
  });

  nodes.forEach((node, key) => {
    const neighborCount = neighborSets.get(key)?.size ?? 0;
    const outDegree = adjacency.get(key)?.length ?? 0;
    node.neighborCount = neighborCount;
    node.outDegree = outDegree;
    node.isIntersection = neighborCount >= 3;
    node.isTerminal = neighborCount <= 1;
  });
}

function indexTurnRestrictionsByViaKey(
  restrictions: TurnRestriction[],
  nodes: Map<string, RouteNode>,
  edgeById: Map<string, GraphEdge>,
) {
  const wayIds = new Set(
    [...edgeById.values()]
      .map((edge) => edge.wayId)
      .filter((wayId): wayId is string => Boolean(wayId)),
  );
  const byViaKey = new Map<string, TurnRestriction[]>();

  restrictions.forEach((restriction) => {
    if (
      !nodes.has(restriction.viaKey) ||
      !wayIds.has(restriction.fromWayId) ||
      !wayIds.has(restriction.toWayId)
    ) {
      return;
    }

    const current = byViaKey.get(restriction.viaKey) ?? [];
    current.push(restriction);
    byViaKey.set(restriction.viaKey, current);
  });

  return byViaKey;
}

export function buildRoadGraph(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
): RoadGraph {
  const nodes = new Map<string, RouteNode>();
  const adjacency = new Map<string, GraphEdge[]>();
  const edgeById = new Map<string, GraphEdge>();
  const pushEdge = (edge: GraphEdge) => {
    const edges = adjacency.get(edge.from) ?? [];
    edges.push(edge);
    adjacency.set(edge.from, edges);
    edgeById.set(edge.id, edge);
  };

  roads.features.forEach((feature, featureIndex) => {
    lineStringsOfRoad(feature, center).forEach((line, lineIndex) => {
      line.forEach((node) => {
        if (!nodes.has(node.key)) {
          nodes.set(node.key, { key: node.key, point: node.point.clone() });
        }
      });

      for (let index = 0; index < line.length - 1; index += 1) {
        const from = line[index];
        const to = line[index + 1];
        const length = distanceXZ(from.point, to.point);
        if (length < 1) {
          continue;
        }

        const roadWidth = feature.properties.width * ROAD_WIDTH_SCALE;
        const baseId = `${feature.id ?? featureIndex}-${lineIndex}-${index}`;
        const baseEdge = {
          roadClass: feature.properties.roadClass,
          roadWidth,
          length,
          travelCost: edgeTravelCost(length, feature.properties.roadClass),
          name: feature.properties.name,
          wayId: feature.properties.sourceWayId,
        } satisfies Omit<GraphEdge, "id" | "from" | "to">;

        const forward: GraphEdge = {
          id: `${baseId}-f`,
          from: from.key,
          to: to.key,
          ...baseEdge,
        };
        const backward: GraphEdge = {
          id: `${baseId}-r`,
          from: to.key,
          to: from.key,
          ...baseEdge,
        };

        if (feature.properties.oneway === "forward") {
          pushEdge(forward);
        } else if (feature.properties.oneway === "backward") {
          pushEdge(backward);
        } else {
          pushEdge(forward);
          pushEdge(backward);
        }
      }
    });
  });

  annotateRoadGraphNodes(nodes, adjacency, edgeById);

  return {
    nodes,
    adjacency,
    edgeById,
    turnRestrictionsByViaKey: indexTurnRestrictionsByViaKey(
      roads.routing?.turnRestrictions ?? [],
      nodes,
      edgeById,
    ),
  };
}

export function deserializeRoadGraph(data: SerializedRoadNetwork): RoadGraph {
  const nodes = new Map<string, RouteNode>(
    data.nodes.map((node) => [
      node.key,
      {
        key: node.key,
        point: new THREE.Vector3(node.x, 0, node.z),
        outDegree: node.outDegree,
        neighborCount: node.neighborCount,
        isIntersection: node.isIntersection,
        isTerminal: node.isTerminal,
      },
    ]),
  );
  const adjacency = new Map<string, GraphEdge[]>();
  const edgeById = new Map<string, GraphEdge>();
  const pushEdge = (edge: GraphEdge) => {
    const edges = adjacency.get(edge.from) ?? [];
    edges.push(edge);
    adjacency.set(edge.from, edges);
    edgeById.set(edge.id, edge);
  };

  data.segments.forEach((segment) => {
    if (data.version >= 2) {
      pushEdge({
        id: segment.id,
        from: segment.from,
        to: segment.to,
        roadClass: segment.roadClass,
        roadWidth: segment.roadWidth,
        length: segment.length,
        travelCost:
          segment.travelCost ??
          edgeTravelCost(segment.length, segment.roadClass),
        name: segment.name,
        wayId: segment.wayId ?? null,
      });
      return;
    }

    const base = {
      roadClass: segment.roadClass,
      roadWidth: segment.roadWidth,
      length: segment.length,
      travelCost:
        segment.travelCost ??
        edgeTravelCost(segment.length, segment.roadClass),
      name: segment.name,
      wayId: segment.wayId ?? null,
    } satisfies Omit<GraphEdge, "id" | "from" | "to">;

    pushEdge({
      id: `${segment.id}-f`,
      from: segment.from,
      to: segment.to,
      ...base,
    });
    pushEdge({
      id: `${segment.id}-r`,
      from: segment.to,
      to: segment.from,
      ...base,
    });
  });

  annotateRoadGraphNodes(nodes, adjacency, edgeById);

  return {
    nodes,
    adjacency,
    edgeById,
    turnRestrictionsByViaKey: indexTurnRestrictionsByViaKey(
      data.turnRestrictions ?? [],
      nodes,
      edgeById,
    ),
  };
}

function buildRoadRouteFromNodes(
  id: string,
  name: string | null,
  roadClass: RoadProperties["roadClass"],
  roadWidth: number,
  nodes: RouteNode[],
  signalByKey: Map<string, SignalData>,
  isLoop: boolean,
) {
  if (nodes.length < 2) {
    return null;
  }

  const points = nodes.map((node) => node.point);
  const cumulative = buildCumulative(points);
  const segmentLengths = buildSegmentLengthsFromCumulative(cumulative);
  const segmentHeadings = buildSegmentHeadings(points);
  const totalLength = cumulative[cumulative.length - 1] ?? 0;
  if (totalLength < 2) {
    return null;
  }

  const stops: StopMarker[] = [];
  for (let index = 1; index < nodes.length - 1; index += 1) {
    const signal = signalByKey.get(nodes[index].key);
    if (!signal) {
      continue;
    }

    const previousStop = stops[stops.length - 1];
    if (previousStop?.signalId === signal.id) {
      continue;
    }

    stops.push({
      signalId: signal.id,
      signal,
      distance: Math.max(0, cumulative[index] - 2.8),
      axis: dominantAxis(nodes[index - 1].point, nodes[index].point),
      turn: classifyTurn(
        nodes[index - 1].point,
        nodes[index].point,
        nodes[index + 1].point,
      ),
    });
  }

  return {
    id,
    name,
    roadClass,
    roadWidth,
    laneOffset: THREE.MathUtils.clamp(roadWidth * 0.22, 0.45, 0.95),
    nodes,
    cumulative,
    segmentLengths,
    segmentHeadings,
    totalLength,
    stops,
    startKey: nodes[0].key,
    endKey: nodes[nodes.length - 1].key,
    isLoop,
  } satisfies RouteTemplate;
}

function compareRoadRouteCandidates(
  left: {
    name: string | null;
    roadClass: RoadProperties["roadClass"];
    length?: number;
    totalLength?: number;
  },
  right: {
    name: string | null;
    roadClass: RoadProperties["roadClass"];
    length?: number;
    totalLength?: number;
  },
) {
  const leftLength = left.length ?? left.totalLength ?? 0;
  const rightLength = right.length ?? right.totalLength ?? 0;
  const nameGap = Number(Boolean(right.name)) - Number(Boolean(left.name));
  if (nameGap !== 0) {
    return nameGap;
  }
  const rankGap = roadRank(right.roadClass) - roadRank(left.roadClass);
  if (rankGap !== 0) {
    return rankGap;
  }
  return rightLength - leftLength;
}

export function buildLoopRoutes(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
  signalByKey: Map<string, SignalData>,
) {
  const candidates = roads.features
    .filter((feature) => feature.properties.oneway === "no")
    .flatMap((feature, featureIndex) =>
      lineStringsOfRoad(feature, center).map((line, lineIndex) => {
        const points = line.map((node) => node.point);
        return {
          id: `${feature.id ?? featureIndex}-${lineIndex}`,
          name: feature.properties.name,
          roadClass: feature.properties.roadClass,
          roadWidth: feature.properties.width * ROAD_WIDTH_SCALE,
          nodes: line,
          length: buildCumulative(points).at(-1) ?? 0,
        };
      }),
    )
    .filter(
      (candidate) => candidate.nodes.length >= 2 && candidate.length >= 34,
    );

  return candidates
    .sort(compareRoadRouteCandidates)
    .map((candidate) => {
      const roundTripNodes = [
        ...candidate.nodes,
        ...candidate.nodes
          .slice(0, -1)
          .reverse()
          .map((node) => ({
            key: node.key,
            point: node.point.clone(),
          })),
      ];
      return buildRoadRouteFromNodes(
        candidate.id,
        candidate.name,
        candidate.roadClass,
        candidate.roadWidth,
        roundTripNodes,
        signalByKey,
        true,
      );
    })
    .filter((route): route is RouteTemplate => Boolean(route && route.totalLength >= 40));
}

export function buildTrafficRoutes(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
  signalByKey: Map<string, SignalData>,
) {
  return roads.features
    .flatMap((feature, featureIndex) =>
      lineStringsOfRoad(feature, center).flatMap((line, lineIndex) => {
        const nodes = line.map((node) => ({
          key: node.key,
          point: node.point.clone(),
        }));
        const length = buildCumulative(nodes.map((node) => node.point)).at(-1) ?? 0;
        if (nodes.length < 2 || length < 34) {
          return [];
        }

        const baseId = `${feature.id ?? featureIndex}-${lineIndex}`;
        const roadWidth = feature.properties.width * ROAD_WIDTH_SCALE;
        const routes = [] as RouteTemplate[];

        if (feature.properties.oneway !== "backward") {
          const forwardRoute = buildRoadRouteFromNodes(
            `${baseId}-forward`,
            feature.properties.name,
            feature.properties.roadClass,
            roadWidth,
            nodes,
            signalByKey,
            false,
          );
          if (forwardRoute) {
            routes.push(forwardRoute);
          }
        }

        if (feature.properties.oneway !== "forward") {
          const reversedNodes = [...nodes].reverse().map((node) => ({
            key: node.key,
            point: node.point.clone(),
          }));
          const reverseRoute = buildRoadRouteFromNodes(
            `${baseId}-reverse`,
            feature.properties.name,
            feature.properties.roadClass,
            roadWidth,
            reversedNodes,
            signalByKey,
            false,
          );
          if (reverseRoute) {
            routes.push(reverseRoute);
          }
        }

        return routes;
      }),
    )
    .sort(compareRoadRouteCandidates)
    .filter((route) => route.totalLength >= 40);
}
