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
    base.scale.setScalar(0.72);
    baseMaterial.emissiveIntensity = 0.08;
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
    glow.position.y = 0.32;
    glow.scale.setScalar(0.62);
    glowMaterial.emissiveIntensity = 0.12;
    glowMaterial.opacity = 0.18;
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
    beacon.position.y = 0.48;
    beacon.scale.setScalar(0.56);
    beaconMaterial.emissiveIntensity = 0.16;
    beaconMaterial.opacity = 0.22;
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
    ring.position.y = 0.32;
    ring.scale.setScalar(0.68);
    ringMaterial.emissiveIntensity = 0.1;
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
    callBadge.position.set(0, 2.06, 0);
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

// 수요 강도별 초록 글로우 색상 (낮음→높음)
const DEMAND_GLOW_LOW  = 0x2d6e4a; // 연한 초록
const DEMAND_GLOW_MID  = 0x22c55e; // 초록
const DEMAND_GLOW_HIGH = 0x4ade80; // 밝은 연두

function demandGlowColor(score: number): number {
  if (score >= 0.85) return DEMAND_GLOW_HIGH;
  if (score >= 0.55) return DEMAND_GLOW_MID;
  return DEMAND_GLOW_LOW;
}

export function updateHotspotVisualLayer({
  elapsedTime,
  hotspotSnapshots,
  hotspotVisuals,
  demandScore = 0,
  hasDemandData = false,
}: {
  elapsedTime: number;
  hotspotSnapshots: HotspotSnapshot[];
  hotspotVisuals: HotspotVisual[];
  demandScore?: number;
  hasDemandData?: boolean;
}) {
  if (!hotspotVisuals.length) {
    return;
  }

  const hotspotSnapshotById = new globalThis.Map(
    hotspotSnapshots.map(
      (hotspotSnapshot) => [hotspotSnapshot.id, hotspotSnapshot] as const,
    ),
  );

  for (let index = 0; index < hotspotVisuals.length; index += 1) {
    const visual = hotspotVisuals[index]!;
    const hotspotSnapshot = hotspotSnapshotById.get(visual.hotspot.id);
    const markerMode: HotspotMarkerMode = hotspotSnapshot?.mode ?? "idle";
    const isActive = markerMode !== "idle";
    const markerPresentation = HOTSPOT_PRESENTATION[markerMode];
    const accentColor = markerPresentation.accentColor;

    // idle 상태에서 수요가 충분히 높으면 초록 글로우 색으로 덮어쓴다
    const isHighDemandIdle =
      hasDemandData && markerMode === "idle" && demandScore >= 0.25;
    const effectiveAccent = isHighDemandIdle
      ? demandGlowColor(demandScore)
      : accentColor;

    if (visual.lastAccentColor !== effectiveAccent) {
      visual.lastAccentColor = effectiveAccent;
      visual.baseMaterial.color.setHex(
        mixHexColor(0x2c2f33, effectiveAccent, markerMode === "idle" ? 0.16 : 0.3),
      );
      visual.baseMaterial.emissive.setHex(effectiveAccent);
      visual.glowMaterial.color.setHex(
        mixHexColor(0xd2cbc0, effectiveAccent, markerMode === "pickup" ? 0.18 : 0.1),
      );
      visual.glowMaterial.emissive.setHex(effectiveAccent);
      visual.beaconMaterial.color.setHex(
        mixHexColor(0xd9d4cb, effectiveAccent, markerMode === "pickup" ? 0.14 : 0.08),
      );
      visual.beaconMaterial.emissive.setHex(effectiveAccent);
      visual.ringMaterial.color.setHex(
        mixHexColor(0xcfc4ad, effectiveAccent, markerMode === "pickup" ? 0.16 : 0.08),
      );
      visual.ringMaterial.emissive.setHex(effectiveAccent);
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
        // 수요 강도에 따라 idle 글로우 세기 조절
        const idleBoost = isHighDemandIdle ? demandScore * 0.55 : 0;
        visual.base.scale.setScalar(0.72 + idleBoost * 0.06);
        visual.glow.scale.setScalar(0.62 + idleBoost * 0.08);
        visual.beacon.scale.setScalar(0.56 + idleBoost * 0.08);
        visual.ring.scale.setScalar(0.68 + idleBoost * 0.06);
        visual.ring.rotation.z = index * 0.2;
        visual.baseMaterial.emissiveIntensity = 0.08 + idleBoost * 0.28;
        visual.glowMaterial.emissiveIntensity = 0.12 + idleBoost * 0.36;
        visual.glowMaterial.opacity = 0.18 + idleBoost * 0.22;
        visual.beaconMaterial.emissiveIntensity = 0.16 + idleBoost * 0.38;
        visual.beaconMaterial.opacity = 0.22 + idleBoost * 0.24;
        visual.ringMaterial.emissiveIntensity = 0.10 + idleBoost * 0.30;
        visual.hailMaterial.emissiveIntensity = 0.05;
        visual.callerGroup.position.y = 0.07;
        visual.waveArmPivot.rotation.z = -0.72;
        visual.hailCube.scale.setScalar(0.62);
        visual.callBadge.position.y = 2.06;
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

    if (isActive) {
      const pulse = 0.72 + Math.sin(elapsedTime * 2.2 + index * 0.7) * 0.12;
      visual.base.scale.setScalar(0.8 + pulse * 0.04);
      visual.glow.scale.setScalar(0.82 + pulse * 0.08);
      visual.beacon.scale.setScalar(0.72 + pulse * 0.1);
      visual.ring.scale.setScalar(0.84 + pulse * 0.08);
      visual.ring.rotation.z = elapsedTime * 0.24 + index * 0.12;
      visual.baseMaterial.emissiveIntensity = 0.35 + pulse * 0.15;
      visual.glowMaterial.emissiveIntensity = 0.42 + pulse * 0.18;
      visual.glowMaterial.opacity = 0.38 + pulse * 0.12;
      visual.beaconMaterial.emissiveIntensity = 0.48 + pulse * 0.22;
      visual.beaconMaterial.opacity = 0.46 + pulse * 0.18;
      visual.ringMaterial.emissiveIntensity = 0.38 + pulse * 0.18;
      visual.hailMaterial.emissiveIntensity =
        markerMode === "pickup" ? 0.35 + pulse * 0.15 : 0.05;
      visual.callerGroup.position.y =
        0.07 + (markerMode === "pickup" ? Math.sin(elapsedTime * 2.5 + index) * 0.025 : 0);
      visual.waveArmPivot.rotation.z =
        markerMode === "pickup"
          ? -0.78 - Math.sin(elapsedTime * 4.2 + index * 0.8) * 0.18
          : -0.72;
      visual.hailCube.scale.setScalar(markerMode === "pickup" ? 0.72 + pulse * 0.08 : 0.62);
      visual.callBadge.position.y = 2.06 + Math.sin(elapsedTime * 2.2 + index) * 0.04;
    } else if (isHighDemandIdle) {
      const slowPulse = 0.5 + Math.sin(elapsedTime * 1.1 + index * 0.9) * 0.5;
      const boost = demandScore * 0.55;
      visual.baseMaterial.emissiveIntensity = 0.08 + boost * (0.18 + slowPulse * 0.12);
      visual.glowMaterial.emissiveIntensity = 0.12 + boost * (0.24 + slowPulse * 0.18);
      visual.glowMaterial.opacity = 0.18 + boost * (0.14 + slowPulse * 0.10);
      visual.beaconMaterial.emissiveIntensity = 0.16 + boost * (0.26 + slowPulse * 0.22);
      visual.beaconMaterial.opacity = 0.22 + boost * (0.16 + slowPulse * 0.12);
      visual.ringMaterial.emissiveIntensity = 0.10 + boost * (0.20 + slowPulse * 0.14);
      visual.ring.rotation.z = elapsedTime * 0.12 + index * 0.2;
    }
  }
}
