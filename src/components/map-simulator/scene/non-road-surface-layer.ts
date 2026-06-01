import * as THREE from "three";
import type { NonRoadFeatureCollection } from "@/components/map-simulator/types";
import { shapesOfNonRoadFeature } from "@/components/map-simulator/utils";
import { NON_ROAD_LAYER_Y } from "@/components/map-simulator/scene";

const NON_ROAD_CATEGORIES = [
  "facility",
  "green",
  "pedestrian",
  "parking",
] as const;

export function createNonRoadSurfaceLayer({
  center,
  nonRoad,
}: {
  center: { lat: number; lon: number };
  nonRoad: NonRoadFeatureCollection;
}) {
  const shapesByCategory = {
    facility: [] as THREE.Shape[],
    green: [] as THREE.Shape[],
    pedestrian: [] as THREE.Shape[],
    parking: [] as THREE.Shape[],
  };

  nonRoad.features.forEach((feature) => {
    shapesOfNonRoadFeature(feature, center).forEach((shape) => {
      const targetArray = shapesByCategory[feature.properties.category as keyof typeof shapesByCategory];
      if (targetArray) {
        targetArray.push(shape);
      }
    });
  });

  const materials = {
    facility: new THREE.MeshBasicMaterial({
      color: 0x1e2428,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    }),
    green: new THREE.MeshBasicMaterial({
      color: 0x253d2c,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -3,
    }),
    pedestrian: new THREE.MeshBasicMaterial({
      color: 0x2c2a26,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    }),
    parking: new THREE.MeshBasicMaterial({
      color: 0x22211f,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -5,
    }),
    water: new THREE.MeshBasicMaterial({
      color: 0x153d56,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  };

  const group = new THREE.Group();
  group.name = "non-road-surfaces";

  const categoryRenderOrder: Record<typeof NON_ROAD_CATEGORIES[number], number> = {
    facility: 2,
    parking: 3,
    pedestrian: 4,
    green: 5,
  };

  NON_ROAD_CATEGORIES.forEach((category) => {
    const shapes = shapesByCategory[category];
    if (!shapes.length) {
      return;
    }

    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shapes),
      materials[category],
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = NON_ROAD_LAYER_Y[category];
    mesh.renderOrder = categoryRenderOrder[category];
    group.add(mesh);
  });

  return group;
}
