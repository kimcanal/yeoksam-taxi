import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { createCallerGroup } from "@/components/map-simulator/vehicle";
import { mixHexColor } from "@/components/map-simulator/environment";
import type {
  Hotspot,
  HotspotMarkerMode,
  HotspotVisual,
  RouteTemplate,
} from "@/components/map-simulator/types";
import type { HotspotSnapshot } from "@/components/map-simulator/simulation";
import { hotspotCallElement } from "@/components/map-simulator/scene";
import { CURBSIDE_SIDEWALK_OFFSET } from "@/components/map-simulator/scene";
import {
  curbsideLaneOffset,
  offsetToRight,
  sampleRoute,
} from "@/components/map-simulator/road";
import {
  HOTSPOT_IDLE_COLORS,
  HOTSPOT_PRESENTATION,
} from "@/components/map-simulator/scene";

type HotspotVisualLayerOptions = {
  hotspots: Hotspot[];
  taxiRouteById: ReadonlyMap<string, RouteTemplate>;
};

const HOTSPOT_BADGE_BASE_Y = 0.92;
const HOTSPOT_CALLER_BADGE_BASE_Y = 1.62;

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
    base.position.y = 0.22;
    base.scale.setScalar(0.66);
    baseMaterial.emissiveIntensity = 0.05;
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
    glow.position.y = 0.28;
    glow.scale.setScalar(0.56);
    glowMaterial.emissiveIntensity = 0.08;
    glowMaterial.opacity = 0.12;
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
    beacon.position.y = 0.42;
    beacon.scale.setScalar(0.46);
    beaconMaterial.emissiveIntensity = 0.12;
    beaconMaterial.opacity = 0.16;
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
    ring.position.y = 0.26;
    ring.scale.setScalar(0.6);
    ringMaterial.emissiveIntensity = 0.07;
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
      0.07,
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
    callBadge.position.set(0, HOTSPOT_BADGE_BASE_Y, 0);
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

const hotspotSnapshotById = new globalThis.Map<string, HotspotSnapshot>();
const _hotspotSphere = new THREE.Sphere();

export function updateHotspotVisualLayer({
  elapsedTime,
  hotspotSnapshots,
  hotspotVisuals,
  cameraFrustum,
}: {
  elapsedTime: number;
  hotspotSnapshots: HotspotSnapshot[];
  hotspotVisuals: HotspotVisual[];
  cameraFrustum?: THREE.Frustum | null;
}) {
  if (!hotspotVisuals.length) {
    return;
  }

  hotspotSnapshotById.clear();
  for (let i = 0; i < hotspotSnapshots.length; i += 1) {
    const snapshot = hotspotSnapshots[i]!;
    hotspotSnapshotById.set(snapshot.id, snapshot);
  }

  for (let index = 0; index < hotspotVisuals.length; index += 1) {
    const visual = hotspotVisuals[index]!;

    if (cameraFrustum) {
      _hotspotSphere.center.copy(visual.hotspot.position);
      _hotspotSphere.radius = 10.0;
      if (!cameraFrustum.intersectsSphere(_hotspotSphere)) {
        visual.base.visible = false;
        visual.glow.visible = false;
        visual.beacon.visible = false;
        visual.ring.visible = false;
        visual.callerGroup.visible = false;
        visual.callBadge.visible = false;
        continue;
      } else {
        visual.base.visible = true;
        visual.glow.visible = true;
        visual.beacon.visible = true;
        visual.ring.visible = true;
      }
    }

    const hotspotSnapshot = hotspotSnapshotById.get(visual.hotspot.id);
    const markerMode: HotspotMarkerMode = hotspotSnapshot?.mode ?? "idle";
    const isActive = markerMode !== "idle";
    const markerPresentation = HOTSPOT_PRESENTATION[markerMode];
    const accentColor = markerPresentation.accentColor;

    if (visual.lastAccentColor !== accentColor) {
      visual.lastAccentColor = accentColor;
      visual.baseMaterial.color.setHex(
        mixHexColor(0x2c2f33, accentColor, markerMode === "idle" ? 0.16 : 0.3),
      );
      visual.baseMaterial.emissive.setHex(accentColor);
      visual.glowMaterial.color.setHex(
        mixHexColor(0xd2cbc0, accentColor, markerMode === "pickup" ? 0.18 : 0.1),
      );
      visual.glowMaterial.emissive.setHex(accentColor);
      visual.beaconMaterial.color.setHex(
        mixHexColor(0xd9d4cb, accentColor, markerMode === "pickup" ? 0.14 : 0.08),
      );
      visual.beaconMaterial.emissive.setHex(accentColor);
      visual.ringMaterial.color.setHex(
        mixHexColor(0xcfc4ad, accentColor, markerMode === "pickup" ? 0.16 : 0.08),
      );
      visual.ringMaterial.emissive.setHex(accentColor);
    }

    const callCount =
      markerMode === "pickup"
        ? (hotspotSnapshot?.pickupCalls ?? 0)
        : markerMode === "dropoff"
          ? (hotspotSnapshot?.dropoffCalls ?? 0)
          : 0;

    const badgeText =
      markerMode === "idle"
        ? ""
        : `${markerPresentation.badgeLabel} ${callCount}건`;

    if (visual.lastMarkerMode !== markerMode) {
      visual.lastMarkerMode = markerMode;
      visual.callerGroup.visible = markerPresentation.showsCaller;

      if (!isActive) {
        visual.callBadge.visible = false;
        visual.base.scale.setScalar(0.66);
        visual.glow.scale.setScalar(0.56);
        visual.beacon.scale.setScalar(0.46);
        visual.ring.scale.setScalar(0.6);
        visual.ring.rotation.z = index * 0.2;
        visual.baseMaterial.emissiveIntensity = 0.05;
        visual.glowMaterial.emissiveIntensity = 0.08;
        visual.glowMaterial.opacity = 0.12;
        visual.beaconMaterial.emissiveIntensity = 0.12;
        visual.beaconMaterial.opacity = 0.16;
        visual.ringMaterial.emissiveIntensity = 0.07;
        visual.hailMaterial.emissiveIntensity = 0.05;
        visual.callerGroup.position.y = 0.07;
        visual.waveArmPivot.rotation.z = -0.72;
        visual.hailCube.scale.setScalar(0.62);
        visual.callBadge.position.y = HOTSPOT_BADGE_BASE_Y;
      } else {
        // 활성화 시 배지 스타일 지정
        visual.badgeElement.style.borderColor = markerPresentation.badgeBorderColor;
        visual.badgeElement.style.background = markerPresentation.badgeBackground;
        visual.badgeElement.style.color = markerPresentation.badgeTextColor;
      }
    }

    // 배지 가시성 및 텍스트 실시간 갱신
    if (isActive && callCount > 0) {
      if (visual.lastBadgeText !== badgeText) {
        visual.badgeElement.textContent = badgeText;
        visual.lastBadgeText = badgeText;
      }
      visual.callBadge.visible = true;
    } else {
      visual.callBadge.visible = false;
    }

    if (!isActive) {
      continue;
    }

    const pulse = 0.72 + Math.sin(elapsedTime * 1.8 + index * 0.7) * 0.08;
    visual.base.scale.setScalar(0.7 + pulse * 0.025);
    visual.glow.scale.setScalar(0.66 + pulse * 0.05);
    visual.beacon.scale.setScalar(0.54 + pulse * 0.06);
    visual.ring.scale.setScalar(0.68 + pulse * 0.045);
    visual.ring.rotation.z = elapsedTime * 0.14 + index * 0.12;

    visual.baseMaterial.emissiveIntensity = 0.16 + pulse * 0.07;
    visual.glowMaterial.emissiveIntensity = 0.2 + pulse * 0.08;
    visual.glowMaterial.opacity = 0.18 + pulse * 0.06;
    visual.beaconMaterial.emissiveIntensity = 0.22 + pulse * 0.08;
    visual.beaconMaterial.opacity = 0.22 + pulse * 0.08;
    visual.ringMaterial.emissiveIntensity = 0.18 + pulse * 0.08;
    visual.hailMaterial.emissiveIntensity =
      markerMode === "pickup" ? 0.35 + pulse * 0.15 : 0.05;
    visual.callerGroup.position.y =
      0.07 +
      (markerMode === "pickup"
        ? Math.sin(elapsedTime * 2.5 + index) * 0.025
        : 0);
    visual.waveArmPivot.rotation.z =
      markerMode === "pickup"
        ? -0.78 - Math.sin(elapsedTime * 4.2 + index * 0.8) * 0.18
        : -0.72;
    visual.hailCube.scale.setScalar(
      markerMode === "pickup" ? 0.72 + pulse * 0.08 : 0.62,
    );
    const badgeBaseY = markerPresentation.showsCaller
      ? HOTSPOT_CALLER_BADGE_BASE_Y
      : HOTSPOT_BADGE_BASE_Y;
    visual.callBadge.position.y =
      badgeBaseY + (isActive ? Math.sin(elapsedTime * 2.2 + index) * 0.03 : 0);
  }
}
