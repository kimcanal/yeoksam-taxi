import * as THREE from "three";
import type { CameraMode } from "@/components/map-simulator/camera";
import { updatePrecipitationVisuals } from "@/components/map-simulator/environment";
import type { EnvironmentVisuals } from "@/components/map-simulator/environment";
import { precipitationDrawRatioFor } from "@/components/map-simulator/utils";
import {
  buildEnvironmentState,
  daylightFactor,
  mixHexColor,
  sunsetFactor,
  type WeatherMode,
  type EnvironmentState,
} from "@/components/map-simulator/environment";

type RoadMaterialSet = {
  arterial: THREE.MeshStandardMaterial;
  connector: THREE.MeshStandardMaterial;
  local: THREE.MeshStandardMaterial;
};

type EnvironmentSettingsControllerOptions = {
  ambientLight: THREE.AmbientLight;
  buildingMaterial: THREE.MeshStandardMaterial;
  buildingRoofMaterial: THREE.MeshStandardMaterial;
  centerPoint: THREE.Vector3;
  crosswalkMaterial: THREE.MeshStandardMaterial | null;
  environmentVisuals: EnvironmentVisuals;
  getIsPageHidden: () => boolean;
  groundMaterial: THREE.MeshStandardMaterial;
  hemisphereLight: THREE.HemisphereLight;
  laneMarkerMaterial: THREE.MeshStandardMaterial;
  renderer: THREE.WebGLRenderer;
  roadMaterials: RoadMaterialSet;
  roadSheenMaterial: THREE.MeshStandardMaterial;
  scene: THREE.Scene;
  sceneFog: THREE.Fog;
  simulationCenter: { lat: number; lon: number };
  stopLineMaterial: THREE.MeshStandardMaterial | null;
  sun: THREE.DirectionalLight;
};

export interface TransitionEnvironmentState extends EnvironmentState {
  weatherMode: WeatherMode;
  daylight: number;
  sunset: number;
  nightFactor: number;
  rainFactor: number;
  cloudVisibility: number;
}

export function createEnvironmentSettingsController({
  ambientLight,
  buildingMaterial,
  buildingRoofMaterial,
  centerPoint,
  crosswalkMaterial,
  environmentVisuals,
  getIsPageHidden,
  groundMaterial,
  hemisphereLight,
  laneMarkerMaterial,
  renderer,
  roadMaterials,
  roadSheenMaterial,
  scene,
  sceneFog,
  simulationCenter,
  stopLineMaterial,
  sun,
}: EnvironmentSettingsControllerOptions) {
  let activeRainSeedCount = environmentVisuals.rainLayer.seeds.length;
  let activeSnowSeedCount = environmentVisuals.snowLayer.seeds.length;
  let activeStarOpacity = 0;
  let appliedPrecipitationDensitySignature = "";

  const syncPrecipitationDensity = (mode: CameraMode) => {
    const drawRatio = precipitationDrawRatioFor(mode, getIsPageHidden());
    const rainDrawCount = Math.round(
      environmentVisuals.rainLayer.seeds.length * drawRatio,
    );
    const snowDrawCount = Math.round(
      environmentVisuals.snowLayer.seeds.length * drawRatio,
    );
    const nextSignature = `${mode}:${getIsPageHidden() ? "hidden" : "visible"}:${rainDrawCount}:${snowDrawCount}`;
    if (nextSignature === appliedPrecipitationDensitySignature) {
      return;
    }

    appliedPrecipitationDensitySignature = nextSignature;
    activeRainSeedCount = rainDrawCount;
    activeSnowSeedCount = snowDrawCount;
    environmentVisuals.rainLayer.geometry.setDrawRange(0, rainDrawCount);
    environmentVisuals.snowLayer.geometry.setDrawRange(0, snowDrawCount);
  };

  let targetState: TransitionEnvironmentState | null = null;
  let currentState: TransitionEnvironmentState | null = null;

  const applyStateToScene = (state: TransitionEnvironmentState, forcePrecipitationToggle = false) => {
    const background = scene.background as THREE.Color | null;

    background?.setHex(state.skyColor);
    sceneFog.color.setHex(state.fogColor);
    sceneFog.near = state.fogNear;
    sceneFog.far = state.fogFar;

    ambientLight.color.setHex(state.ambientColor);
    ambientLight.intensity = state.ambientIntensity;
    hemisphereLight.color.setHex(state.hemiSkyColor);
    hemisphereLight.groundColor.setHex(state.hemiGroundColor);
    hemisphereLight.intensity = state.hemiIntensity;

    sun.color.setHex(state.sunColor);
    sun.intensity = state.sunIntensity;

    groundMaterial.color.setHex(state.groundColor);
    groundMaterial.roughness = state.weatherMode === "heavy-rain" ? 0.42 : 0.94;
    groundMaterial.metalness = state.weatherMode === "heavy-rain" ? 0.08 : 0.01;

    roadMaterials.arterial.color.setHex(state.roadColors.arterial);
    roadMaterials.connector.color.setHex(state.roadColors.connector);
    roadMaterials.local.color.setHex(state.roadColors.local);
    [
      roadMaterials.arterial,
      roadMaterials.connector,
      roadMaterials.local,
    ].forEach((material) => {
      material.roughness = Number.isFinite(state.roadRoughness) ? state.roadRoughness : 0.82;
      material.metalness = Number.isFinite(state.roadMetalness) ? state.roadMetalness : 0.01;
    });

    laneMarkerMaterial.color.setHex(state.laneMarkerColor);
    laneMarkerMaterial.emissive.setHex(state.laneMarkerEmissive);
    laneMarkerMaterial.emissiveIntensity = state.laneMarkerIntensity;
    buildingMaterial.color.setHex(state.buildingTint);
    buildingMaterial.emissive.setHex(state.buildingEmissive);
    buildingMaterial.emissiveIntensity = state.buildingEmissiveIntensity;
    buildingMaterial.roughness = state.weatherMode === "heavy-rain" ? 0.84 : 0.98;
    buildingMaterial.metalness = state.weatherMode === "heavy-rain" ? 0.06 : 0.02;

    const rawSheenFactor = state.rainFactor * 0.76 + state.nightFactor * 0.16;
    const sheenColor = mixHexColor(
      0xdfe8ef,
      state.weatherMode === "heavy-rain" ? 0x8fb7df : 0xc5d2de,
      Number.isFinite(rawSheenFactor) ? rawSheenFactor : 0.06,
    );
    roadSheenMaterial.color.setHex(sheenColor);

    // Elegant wetness sheen guard: completely disable separate sheen mesh to prevent any blocky/patchy white film on roads.
    // Instead, realistic wet/shiny effects are directly applied to the base road material roughness/metalness.
    roadSheenMaterial.opacity = 0;
    roadSheenMaterial.visible = false;

    const rawRoofFactor = state.nightFactor * 0.48 + state.rainFactor * 0.24;
    const roofColor = mixHexColor(
      0xdce8f0,
      state.weatherMode === "heavy-rain" ? 0x6b7886 : 0xaeb9c4,
      Number.isFinite(rawRoofFactor) ? rawRoofFactor : 0.08,
    );
    buildingRoofMaterial.color.setHex(roofColor);

    const rawRoofEmissiveFactor = state.nightFactor * 0.22;
    const roofEmissive = mixHexColor(
      0x121924,
      0xffcf8c,
      Number.isFinite(rawRoofEmissiveFactor) ? rawRoofEmissiveFactor : 0,
    );
    buildingRoofMaterial.emissive.setHex(roofEmissive);
    buildingRoofMaterial.emissiveIntensity = 0.08 + (Number.isFinite(state.nightFactor) ? state.nightFactor * 0.1 : 0);

    const rawRoofOpacity = 0.42 + state.sunset * 0.06 + state.nightFactor * 0.1 + state.rainFactor * 0.04;
    buildingRoofMaterial.opacity = Number.isFinite(rawRoofOpacity)
      ? THREE.MathUtils.clamp(rawRoofOpacity, 0.38, 0.58)
      : 0.42;

    if (crosswalkMaterial) {
      crosswalkMaterial.color.setHex(state.crosswalkColor);
      crosswalkMaterial.emissive.setHex(state.crosswalkEmissive);
      crosswalkMaterial.emissiveIntensity = state.crosswalkIntensity;
    }
    if (stopLineMaterial) {
      stopLineMaterial.color.setHex(state.stopLineColor);
      stopLineMaterial.emissive.setHex(state.stopLineEmissive);
      stopLineMaterial.emissiveIntensity = state.stopLineIntensity;
    }

    const skyDirection = state.sunPosition.clone().normalize();
    const keyLightDirection =
      skyDirection.y > 0.06
        ? skyDirection
        : skyDirection
          .clone()
          .multiplyScalar(-1)
          .setY(Math.abs(skyDirection.y) * 0.72 + 0.2)
          .normalize();
    sun.position.copy(
      centerPoint
        .clone()
        .addScaledVector(
          keyLightDirection,
          environmentVisuals.celestialRadius * 0.56,
        ),
    );
    sun.target.position.copy(centerPoint);
    sun.target.updateMatrixWorld();

    const sunAnchor = centerPoint
      .clone()
      .addScaledVector(skyDirection, environmentVisuals.celestialRadius * 0.72);
    environmentVisuals.sunDisc.position.copy(sunAnchor);
    environmentVisuals.sunHalo.position.copy(sunAnchor);
    environmentVisuals.sunsetGlow.position.copy(sunAnchor);

    const moonDirection = skyDirection.clone().multiplyScalar(-1);
    moonDirection.y = Math.max(0.2, moonDirection.y * 0.76 + 0.22);
    moonDirection.normalize();
    environmentVisuals.moon.position.copy(
      centerPoint
        .clone()
        .addScaledVector(moonDirection, environmentVisuals.celestialRadius * 0.72),
    );

    const sunDiscCol = state.sunset > 0.18 ? 0xffc78b : 0xfff1c9;
    environmentVisuals.sunDiscMaterial.color.setHex(sunDiscCol);
    environmentVisuals.sunDiscMaterial.opacity =
      THREE.MathUtils.clamp(state.daylight * 0.34 + state.sunset * 0.52, 0, 0.86) *
      (0.88 + state.cloudVisibility * 0.12);
    environmentVisuals.sunHaloMaterial.opacity =
      THREE.MathUtils.clamp(state.daylight * 0.1 + state.sunset * 0.22, 0, 0.24) *
      state.cloudVisibility;
    environmentVisuals.sunsetGlowMaterial.opacity =
      THREE.MathUtils.clamp(state.sunset * 0.24, 0, 0.22) *
      (0.86 + state.cloudVisibility * 0.14);

    const moonOpacityTarget = THREE.MathUtils.clamp((0.22 - state.daylight) / 0.22, 0, 0.88) *
      (state.weatherMode === "heavy-rain"
        ? 0.34
        : state.weatherMode === "cloudy"
          ? 0.72
          : 0.84);
    environmentVisuals.moonMaterial.opacity = moonOpacityTarget;

    activeStarOpacity =
      THREE.MathUtils.clamp((0.2 - state.daylight) / 0.2, 0, 0.78) *
      (state.weatherMode === "heavy-rain"
        ? 0.12
        : state.weatherMode === "cloudy"
          ? 0.46
          : state.weatherMode === "heavy-snow"
            ? 0.58
            : 0.88);

    const cloudOpacityBase =
      state.weatherMode === "clear"
        ? 0
        : state.weatherMode === "cloudy"
          ? 0.4
          : state.weatherMode === "heavy-rain"
            ? 0.54
            : 0.48;
    const cloudColor =
      state.weatherMode === "heavy-rain"
        ? 0xa9b7c6
        : state.weatherMode === "heavy-snow"
          ? 0xe7eff6
          : 0xe2eaf2;

    environmentVisuals.cloudMaterial.color.setHex(cloudColor);
    environmentVisuals.cloudMaterial.emissive.setHex(
      state.weatherMode === "heavy-rain" ? 0x293948 : 0x243443,
    );
    environmentVisuals.cloudMaterial.opacity =
      state.weatherMode === "heavy-rain"
        ? 0.2
        : cloudOpacityBase * (state.daylight > 0.08 ? 1.04 : 0.9);

    environmentVisuals.cloudClusters.forEach(({ cluster }) => {
      cluster.visible =
        state.weatherMode !== "heavy-rain" && cloudOpacityBase > 0.15;
    });

    const stormCloudOpacity = state.weatherMode === "heavy-rain" ? 0.62 : 0;
    environmentVisuals.stormCloudMaterial.opacity = stormCloudOpacity;
    environmentVisuals.stormCloudMaterial.color.setHex(
      state.weatherMode === "heavy-rain" ? 0x66798d : 0x73879a,
    );
    environmentVisuals.stormCloudClusters.forEach(({ cluster }) => {
      cluster.visible = stormCloudOpacity > 0.01;
    });

    if (forcePrecipitationToggle) {
      environmentVisuals.rainLayer.points.visible = state.precipitation === "rain";
      environmentVisuals.snowLayer.points.visible = state.precipitation === "snow";
    } else {
      if (targetState?.precipitation === "rain") {
        environmentVisuals.rainLayer.points.visible = true;
      }
      if (targetState?.precipitation === "snow") {
        environmentVisuals.snowLayer.points.visible = true;
      }
    }

    environmentVisuals.rainLayer.material.opacity = state.precipitationOpacity;
    environmentVisuals.rainLayer.material.size =
      0.82 + state.precipitationIntensity * 0.1;

    environmentVisuals.snowLayer.material.opacity = state.precipitationOpacity;
    environmentVisuals.snowLayer.material.size =
      1.02 + state.precipitationIntensity * 0.18;

    renderer.toneMappingExposure = state.exposure;
  };

  const applyEnvironment = (
    dateIso: string,
    minutes: number,
    nextWeatherMode: WeatherMode,
    forceInstant = false,
  ) => {
    const environment = buildEnvironmentState(
      dateIso,
      minutes,
      nextWeatherMode,
      simulationCenter,
    );
    const daylight = daylightFactor(dateIso, minutes, simulationCenter);
    const sunset = sunsetFactor(dateIso, minutes, simulationCenter);
    const nightFactor = THREE.MathUtils.clamp((0.24 - daylight) / 0.24, 0, 1);
    const rainFactor =
      nextWeatherMode === "heavy-rain"
        ? 1
        : nextWeatherMode === "cloudy"
          ? 0.08
          : nextWeatherMode === "heavy-snow"
            ? 0.18
            : 0.06;
    const cloudVisibility =
      nextWeatherMode === "clear"
        ? 1
        : nextWeatherMode === "cloudy"
          ? 0.78
          : nextWeatherMode === "heavy-rain"
            ? 0.42
            : 0.58;

    // Create next target state packet
    const nextTarget = {
      ...environment,
      weatherMode: nextWeatherMode,
      daylight,
      sunset,
      nightFactor,
      rainFactor,
      cloudVisibility,
    };

    targetState = nextTarget;

    if (forceInstant || !currentState) {
      // Perform deep-copy of targets to state
      currentState = JSON.parse(JSON.stringify(nextTarget)) as TransitionEnvironmentState;
      currentState.sunPosition = nextTarget.sunPosition.clone();
      applyStateToScene(currentState, true);
    }
  };

  const updateEnvironmentTransition = (delta: number) => {
    const current = currentState;
    const target = targetState;
    if (!current || !target) {
      return;
    }

    // Easing scale for 1.2s transition
    const t = 1 - Math.exp(-6 * delta);

    const lerpScalar = (curr: number, tgt: number) => THREE.MathUtils.lerp(curr, tgt, t);

    current.fogNear = lerpScalar(current.fogNear, target.fogNear);
    current.fogFar = lerpScalar(current.fogFar, target.fogFar);
    current.ambientIntensity = lerpScalar(current.ambientIntensity, target.ambientIntensity);
    current.hemiIntensity = lerpScalar(current.hemiIntensity, target.hemiIntensity);
    current.sunIntensity = lerpScalar(current.sunIntensity, target.sunIntensity);
    current.roadRoughness = lerpScalar(current.roadRoughness, target.roadRoughness);
    current.roadMetalness = lerpScalar(current.roadMetalness, target.roadMetalness);
    current.laneMarkerIntensity = lerpScalar(current.laneMarkerIntensity, target.laneMarkerIntensity);
    current.crosswalkIntensity = lerpScalar(current.crosswalkIntensity, target.crosswalkIntensity);
    current.stopLineIntensity = lerpScalar(current.stopLineIntensity, target.stopLineIntensity);
    current.buildingEmissiveIntensity = lerpScalar(current.buildingEmissiveIntensity, target.buildingEmissiveIntensity);
    current.precipitationOpacity = lerpScalar(current.precipitationOpacity, target.precipitationOpacity);
    current.precipitationIntensity = lerpScalar(current.precipitationIntensity, target.precipitationIntensity);
    current.exposure = lerpScalar(current.exposure, target.exposure);

    current.daylight = lerpScalar(current.daylight, target.daylight);
    current.sunset = lerpScalar(current.sunset, target.sunset);
    current.nightFactor = lerpScalar(current.nightFactor, target.nightFactor);
    current.rainFactor = lerpScalar(current.rainFactor, target.rainFactor);
    current.cloudVisibility = lerpScalar(current.cloudVisibility, target.cloudVisibility);

    const lerpColorHex = (currHex: number, tgtHex: number) => {
      const c = new THREE.Color(currHex).lerp(new THREE.Color(tgtHex), t);
      return c.getHex();
    };

    current.skyColor = lerpColorHex(current.skyColor, target.skyColor);
    current.fogColor = lerpColorHex(current.fogColor, target.fogColor);
    current.ambientColor = lerpColorHex(current.ambientColor, target.ambientColor);
    current.hemiSkyColor = lerpColorHex(current.hemiSkyColor, target.hemiSkyColor);
    current.hemiGroundColor = lerpColorHex(current.hemiGroundColor, target.hemiGroundColor);
    current.sunColor = lerpColorHex(current.sunColor, target.sunColor);
    current.groundColor = lerpColorHex(current.groundColor, target.groundColor);
    current.laneMarkerColor = lerpColorHex(current.laneMarkerColor, target.laneMarkerColor);
    current.laneMarkerEmissive = lerpColorHex(current.laneMarkerEmissive, target.laneMarkerEmissive);
    current.crosswalkColor = lerpColorHex(current.crosswalkColor, target.crosswalkColor);
    current.crosswalkEmissive = lerpColorHex(current.crosswalkEmissive, target.crosswalkEmissive);
    current.stopLineColor = lerpColorHex(current.stopLineColor, target.stopLineColor);
    current.stopLineEmissive = lerpColorHex(current.stopLineEmissive, target.stopLineEmissive);
    current.buildingTint = lerpColorHex(current.buildingTint, target.buildingTint);
    current.buildingEmissive = lerpColorHex(current.buildingEmissive, target.buildingEmissive);

    current.roadColors.arterial = lerpColorHex(current.roadColors.arterial, target.roadColors.arterial);
    current.roadColors.connector = lerpColorHex(current.roadColors.connector, target.roadColors.connector);
    current.roadColors.local = lerpColorHex(current.roadColors.local, target.roadColors.local);

    current.sunPosition.lerp(target.sunPosition, t);

    current.weatherMode = target.weatherMode;
    current.precipitation = target.precipitation;

    applyStateToScene(current, false);

    if (target.precipitation !== "rain" && current.precipitationOpacity < 0.015) {
      environmentVisuals.rainLayer.points.visible = false;
    }
    if (target.precipitation !== "snow" && current.precipitationOpacity < 0.015) {
      environmentVisuals.snowLayer.points.visible = false;
    }
  };

  const updatePrecipitation = (delta: number, elapsedTime: number) => {
    updatePrecipitationVisuals({
      activeRainSeedCount,
      activeSnowSeedCount,
      delta,
      elapsedTime,
      rainLayer: environmentVisuals.rainLayer,
      snowLayer: environmentVisuals.snowLayer,
    });
  };

  return {
    applyEnvironment,
    getActiveStarOpacity: () => activeStarOpacity,
    syncPrecipitationDensity,
    updatePrecipitation,
    updateEnvironmentTransition,
  };
}
