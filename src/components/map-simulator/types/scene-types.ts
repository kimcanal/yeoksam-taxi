import type * as THREE from "three";
import type { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { FeatureCollection, Point } from "geojson";
import type { SignalAxis, SignalData } from "./signal-types";
import type { Hotspot } from "./simulation-types";

export type TrafficSignalProperties = { name: string | null; signalType: string | null; direction: string | null; crossing: string | null; buttonOperated: boolean; turns: string | null; };
export type TrafficSignalFeatureCollection = FeatureCollection<Point, TrafficSignalProperties>;
export type SceneLabelKind = "district" | "building" | "transit" | "road";
export type SceneLabelEntry = { label: CSS2DObject; kind: SceneLabelKind; priority: number; name: string | null; };
export type LabelDistanceEntry = { entry: SceneLabelEntry; distanceSq: number; };
export type SignalLampVisual = { mesh: THREE.Mesh; axis: SignalAxis; };
export type SignalVisual = SignalData & { group: THREE.Group; reds: SignalLampVisual[]; yellows: SignalLampVisual[]; greens: SignalLampVisual[]; leftArrows: SignalLampVisual[]; pedestrianLamps: SignalLampVisual[]; lastVisualSignature: string; };
export type PedestrianVisual = { signalId: string; axis: SignalAxis; group: THREE.Group; phaseOffset: number; speed: number; lateralOffset: number; direction: 1 | -1; };
export type HotspotMarkerMode = "pickup" | "dropoff" | "idle";
export type HotspotPresentation = { accentColor: number; badgeLabel: string; badgeBorderColor: string; badgeBackground: string; badgeTextColor: string; showsCaller: boolean; };
export type HotspotVisual = { hotspot: Hotspot; base: THREE.Mesh; baseMaterial: THREE.MeshStandardMaterial; glow: THREE.Mesh; glowMaterial: THREE.MeshStandardMaterial; beacon: THREE.Mesh; beaconMaterial: THREE.MeshStandardMaterial; ring: THREE.Mesh; ringMaterial: THREE.MeshStandardMaterial; callerGroup: THREE.Group; waveArmPivot: THREE.Group; hailCube: THREE.Mesh; hailMaterial: THREE.MeshStandardMaterial; callBadge: CSS2DObject; badgeElement: HTMLDivElement; lastMarkerMode: HotspotMarkerMode; lastAccentColor: number; lastBadgeText: string; };
