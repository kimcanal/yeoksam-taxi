import * as THREE from "three";
import { poiMarkerColor } from "@/components/map-simulator/demand-anchor-utils";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand-types";
import { projectPoint } from "@/components/map-simulator/map-geometry-utils";

type PoiMarkerLayerOptions = {
  center: { lat: number; lon: number };
  poiRows: MapPoiFeatureRow[];
  maxMarkers?: number;
};

export function createPoiMarkerLayer({
  center,
  poiRows,
  maxMarkers = 10,
}: PoiMarkerLayerOptions) {
  const group = new THREE.Group();
  group.name = "context-poi-marker-layer";
  const clickTargets: THREE.Object3D[] = [];
  const poiByCode = new Map<string, MapPoiFeatureRow>();
  const hitGeometry = new THREE.CylinderGeometry(1.65, 1.65, 2.8, 24);
  const hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  hitMaterial.colorWrite = false;

  const markers = poiRows
    .filter((poi) => Number.isFinite(poi.lon) && Number.isFinite(poi.lat))
    .sort((left, right) => right.context_score - left.context_score)
    .slice(0, maxMarkers);

  markers.forEach((poi) => {
    poiByCode.set(poi.poi_code, poi);
    const projected = projectPoint([poi.lon as number, poi.lat as number], center);
    const contextScore = poi.context_score;
    const accent = new THREE.Color(poiMarkerColor(poi.category));
    const marker = new THREE.Group();
    marker.name = `poi-marker-${poi.poi_code}`;
    marker.position.set(projected.x, 0.08, projected.z);

    const hitTarget = new THREE.Mesh(hitGeometry, hitMaterial);
    hitTarget.name = `poi-hit-${poi.poi_code}`;
    hitTarget.position.y = 1.12;
    hitTarget.userData.poiCode = poi.poi_code;
    marker.add(hitTarget);
    clickTargets.push(hitTarget);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.35, 0.16, 28),
      new THREE.MeshStandardMaterial({
        color: 0x08111d,
        emissive: accent,
        emissiveIntensity: 0.14,
        roughness: 0.72,
        metalness: 0.08,
        transparent: true,
        opacity: 0.86,
      }),
    );
    base.position.y = 0.05;
    marker.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.02, 0.055, 10, 32),
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.26,
        roughness: 0.5,
        transparent: true,
        opacity: 0.82,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    marker.add(ring);

    const stemHeight = 0.44 + Math.min(contextScore, 1) * 0.18;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.095, stemHeight, 12),
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.22,
        roughness: 0.44,
        transparent: true,
        opacity: 0.9,
      }),
    );
    stem.position.y = 0.22 + stemHeight / 2;
    marker.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 18, 18),
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.3,
        roughness: 0.36,
      }),
    );
    cap.position.y = 0.32 + stemHeight;
    marker.add(cap);

    group.add(marker);
  });

  return { group, clickTargets, poiByCode };
}
