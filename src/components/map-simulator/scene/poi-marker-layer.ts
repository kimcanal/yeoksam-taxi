import * as THREE from "three";
import { poiMarkerColor } from "@/components/map-simulator/demand";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import { projectPoint } from "@/components/map-simulator/utils";

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

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1.0, 32),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    marker.add(ring);

    const beamHeight = 1.2 + Math.min(contextScore, 1) * 0.4;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, beamHeight, 8),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.5,
      })
    );
    beam.position.y = beamHeight / 2;
    marker.add(beam);

    const diamondSize = 0.6;
    const diamondY = beamHeight + 0.15 + (diamondSize * 1.4);
    
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(diamondSize, 0),
      new THREE.MeshStandardMaterial({
        color: 0x05101a,
        emissive: accent,
        emissiveIntensity: 0.45,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85,
      })
    );
    diamond.position.y = diamondY;
    diamond.scale.set(1, 1.4, 1);
    marker.add(diamond);

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(diamondSize * 0.45, 0),
      new THREE.MeshBasicMaterial({
        color: accent,
      })
    );
    core.position.y = diamondY;
    core.scale.set(1, 1.4, 1);
    marker.add(core);

    group.add(marker);
  });

  return { group, clickTargets, poiByCode };
}
