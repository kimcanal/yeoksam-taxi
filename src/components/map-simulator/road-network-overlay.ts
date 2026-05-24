import * as THREE from "three";
import {
  ROAD_LAYER_Y,
  ROAD_NETWORK_EDGE_Y_OFFSET,
  ROAD_NETWORK_NODE_Y,
} from "@/components/map-simulator/scene-constants";
import type { RoadGraph } from "@/components/map-simulator/core";

export function buildRoadNetworkOverlay(graph: RoadGraph) {
  const group = new THREE.Group();
  group.name = "road-network-overlay";

  const edgePositions = {
    arterial: [] as number[],
    connector: [] as number[],
    local: [] as number[],
  };
  const seenEdges = new Set<string>();

  graph.edgeById.forEach((edge) => {
    const fromNode = graph.nodes.get(edge.from);
    const toNode = graph.nodes.get(edge.to);
    if (!fromNode || !toNode) {
      return;
    }

    const canonicalKey =
      edge.from < edge.to
        ? `${edge.from}|${edge.to}`
        : `${edge.to}|${edge.from}`;
    if (seenEdges.has(canonicalKey)) {
      return;
    }
    seenEdges.add(canonicalKey);

    const y = ROAD_LAYER_Y[edge.roadClass] + ROAD_NETWORK_EDGE_Y_OFFSET;
    edgePositions[edge.roadClass].push(
      fromNode.point.x,
      y,
      fromNode.point.z,
      toNode.point.x,
      y,
      toNode.point.z,
    );
  });

  const edgeMaterials = {
    arterial: new THREE.LineBasicMaterial({
      color: 0x7cf9ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
    connector: new THREE.LineBasicMaterial({
      color: 0x4ed6ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
    local: new THREE.LineBasicMaterial({
      color: 0x3e87af,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  };

  (["arterial", "connector", "local"] as const).forEach((roadClass) => {
    const positions = edgePositions[roadClass];
    if (!positions.length) {
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const lines = new THREE.LineSegments(geometry, edgeMaterials[roadClass]);
    lines.renderOrder =
      roadClass === "arterial" ? 92 : roadClass === "connector" ? 91 : 90;
    group.add(lines);
  });

  const nodePositions = {
    intersection: [] as number[],
    endpoint: [] as number[],
    passthrough: [] as number[],
  };

  graph.adjacency.forEach((edges, key) => {
    const node = graph.nodes.get(key);
    if (!node) {
      return;
    }

    const degree = new Set(edges.map((edge) => edge.to)).size;
    const bucket =
      degree >= 3 ? "intersection" : degree === 1 ? "endpoint" : "passthrough";
    nodePositions[bucket].push(node.point.x, ROAD_NETWORK_NODE_Y, node.point.z);
  });

  const addNodePoints = (
    positions: number[],
    color: number,
    size: number,
    opacity: number,
    renderOrder: number,
  ) => {
    if (!positions.length) {
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color,
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    points.renderOrder = renderOrder;
    group.add(points);
  };

  addNodePoints(nodePositions.passthrough, 0xa9eaff, 0.6, 0.18, 93);
  addNodePoints(nodePositions.endpoint, 0xffb388, 1.35, 0.7, 94);
  addNodePoints(nodePositions.intersection, 0xfff1a5, 1.9, 0.92, 95);

  return group;
}
