import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { createCallerGroup } from "@/components/map-simulator/actor-group-factory";
import type {
  Hotspot,
  HotspotVisual,
  RouteTemplate,
} from "@/components/map-simulator/map-simulator-types";
import { hotspotCallElement } from "@/components/map-simulator/scene-label-elements";
import { CURBSIDE_SIDEWALK_OFFSET } from "@/components/map-simulator/scene-constants";
import {
  curbsideLaneOffset,
  offsetToRight,
  sampleRoute,
} from "@/components/map-simulator/route-motion-utils";
import { HOTSPOT_IDLE_COLORS } from "@/components/map-simulator/hotspot-presentation";

type HotspotVisualLayerOptions = {
  hotspots: Hotspot[];
  taxiRouteById: ReadonlyMap<string, RouteTemplate>;
};

export function createHotspotVisualLayer({
  hotspots,
  taxiRouteById,
}: HotspotVisualLayerOptions) {
  const layer = new THREE.Group();
  layer.name = "hotspot-visual-layer";

  const hotspotVisuals = hotspots.map((hotspot, index) => {
    const group = new THREE.Group();
    const baseColor = HOTSPOT_IDLE_COLORS[index % HOTSPOT_IDLE_COLORS.length]!;
    const hotspotRoute = taxiRouteById.get(hotspot.routeId);
    const hotspotSample = hotspotRoute
      ? sampleRoute(hotspotRoute, hotspot.distance)
      : {
        position: hotspot.position.clone(),
        heading: new THREE.Vector3(0, 0, 1),
      };

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.96, 1.12, 0.12, 20),
      new THREE.MeshStandardMaterial({
        color: 0x2c2f33,
        emissive: baseColor,
        emissiveIntensity: 0.05,
        roughness: 0.82,
        metalness: 0.04,
      }),
    );
    const baseMaterial = base.material as THREE.MeshStandardMaterial;
    base.position.y = 0.08;
    base.scale.setScalar(0.72);
    baseMaterial.emissiveIntensity = 0.025;
    group.add(base);

    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.66, 0.78, 0.08, 18),
      new THREE.MeshStandardMaterial({
        color: 0xd2cbc0,
        emissive: baseColor,
        emissiveIntensity: 0.08,
        transparent: true,
        opacity: 0.18,
        roughness: 0.56,
      }),
    );
    const glowMaterial = glow.material as THREE.MeshStandardMaterial;
    glow.position.y = 0.18;
    glow.scale.setScalar(0.62);
    glowMaterial.emissiveIntensity = 0.035;
    glowMaterial.opacity = 0.1;
    group.add(glow);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 18, 18),
      new THREE.MeshStandardMaterial({
        color: 0xd9d4cb,
        emissive: baseColor,
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.22,
        roughness: 0.4,
      }),
    );
    const beaconMaterial = beacon.material as THREE.MeshStandardMaterial;
    beacon.position.y = 0.34;
    beacon.scale.setScalar(0.56);
    beaconMaterial.emissiveIntensity = 0.045;
    beaconMaterial.opacity = 0.12;
    group.add(beacon);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.05, 10, 28),
      new THREE.MeshStandardMaterial({
        color: 0xcfc4ad,
        emissive: baseColor,
        emissiveIntensity: 0.08,
        roughness: 0.68,
      }),
    );
    const ringMaterial = ring.material as THREE.MeshStandardMaterial;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.18;
    ring.scale.setScalar(0.68);
    ringMaterial.emissiveIntensity = 0.03;
    group.add(ring);

    const caller = createCallerGroup(index);
    const hotspotSideSign = hotspot.sideSign ?? 1;
    const curbOffset = hotspotRoute
      ? curbsideLaneOffset(hotspotRoute) + CURBSIDE_SIDEWALK_OFFSET
      : 2.15;
    const callerAnchor = offsetToRight(
      hotspotSample.position,
      hotspotSample.heading,
      curbOffset * hotspotSideSign,
    ).addScaledVector(hotspotSample.heading, -0.3);
    caller.group.position.set(
      callerAnchor.x - hotspot.position.x,
      0.04,
      callerAnchor.z - hotspot.position.z,
    );
    caller.group.rotation.y = Math.atan2(
      hotspotSample.position.x - callerAnchor.x,
      hotspotSample.position.z - callerAnchor.z,
    );
    caller.group.visible = false;
    caller.waveArmPivot.rotation.z = -0.72;
    caller.hailCube.scale.setScalar(0.62);
    (caller.hailCube.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.03;
    group.add(caller.group);

    const callBadge = new CSS2DObject(hotspotCallElement());
    const badgeElement = callBadge.element as HTMLDivElement;
    callBadge.position.set(0, 1.92, 0);
    callBadge.visible = false;
    group.add(callBadge);

    group.position.copy(hotspot.position);
    layer.add(group);

    return {
      hotspot,
      base,
      baseMaterial,
      glow,
      glowMaterial,
      beacon,
      beaconMaterial,
      ring,
      ringMaterial,
      callerGroup: caller.group,
      waveArmPivot: caller.waveArmPivot,
      hailCube: caller.hailCube,
      hailMaterial: caller.hailCube.material as THREE.MeshStandardMaterial,
      callBadge,
      badgeElement,
      lastMarkerMode: "idle",
      lastAccentColor: baseColor,
      lastBadgeText: "",
    } satisfies HotspotVisual;
  });

  return { group: layer, hotspotVisuals };
}
