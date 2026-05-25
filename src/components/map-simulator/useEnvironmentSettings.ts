import * as THREE from "three";
import type { CameraMode } from "@/components/map-simulator/camera-types";
import { updatePrecipitationVisuals } from "@/components/map-simulator/map-scene-precipitation";
import type { EnvironmentVisuals } from "@/components/map-simulator/map-scene-environment-visuals";
import { precipitationDrawRatioFor } from "@/components/map-simulator/render-budget-utils";
import {
  buildEnvironmentState,
  daylightFactor,
  mixHexColor,
  sunsetFactor,
  type WeatherMode,
} from "@/components/map-simulator/simulation-environment";

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

  const applyEnvironment = (
    dateIso: string,
    minutes: number,
    nextWeatherMode: WeatherMode,
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
    const background = scene.background as THREE.Color | null;

    background?.setHex(environment.skyColor);
    sceneFog.color.setHex(environment.fogColor);
    sceneFog.near = environment.fogNear;
    sceneFog.far = environment.fogFar;

    ambientLight.color.setHex(environment.ambientColor);
    ambientLight.intensity = environment.ambientIntensity;
    hemisphereLight.color.setHex(environment.hemiSkyColor);
    hemisphereLight.groundColor.setHex(environment.hemiGroundColor);
    hemisphereLight.intensity = environment.hemiIntensity;
    renderer.toneMappingExposure = environment.exposure;

    sun.color.setHex(environment.sunColor);
    sun.intensity = environment.sunIntensity;

    groundMaterial.color.setHex(environment.groundColor);
    groundMaterial.roughness = nextWeatherMode === "heavy-rain" ? 0.42 : 0.94;
    groundMaterial.metalness = nextWeatherMode === "heavy-rain" ? 0.08 : 0.01;
    roadMaterials.arterial.color.setHex(environment.roadColors.arterial);
    roadMaterials.connector.color.setHex(environment.roadColors.connector);
    roadMaterials.local.color.setHex(environment.roadColors.local);
    [
      roadMaterials.arterial,
      roadMaterials.connector,
      roadMaterials.local,
    ].forEach((material) => {
      material.roughness = environment.roadRoughness;
      material.metalness = environment.roadMetalness;
    });

    laneMarkerMaterial.color.setHex(environment.laneMarkerColor);
    laneMarkerMaterial.emissive.setHex(environment.laneMarkerEmissive);
    laneMarkerMaterial.emissiveIntensity = environment.laneMarkerIntensity;
    buildingMaterial.color.setHex(environment.buildingTint);
    buildingMaterial.emissive.setHex(environment.buildingEmissive);
    buildingMaterial.emissiveIntensity = environment.buildingEmissiveIntensity;
    buildingMaterial.roughness = nextWeatherMode === "heavy-rain" ? 0.84 : 0.98;
    buildingMaterial.metalness = nextWeatherMode === "heavy-rain" ? 0.06 : 0.02;
    roadSheenMaterial.color.setHex(
      mixHexColor(
        0xdfe8ef,
        nextWeatherMode === "heavy-rain" ? 0x8fb7df : 0xc5d2de,
        rainFactor * 0.76 + nightFactor * 0.16,
      ),
    );
    roadSheenMaterial.opacity = THREE.MathUtils.clamp(
      rainFactor * 0.22 + nightFactor * 0.05 + sunset * 0.04,
      0.02,
      0.26,
    );
    roadSheenMaterial.roughness =
      nextWeatherMode === "heavy-rain" ? 0.08 : 0.24 + daylight * 0.1;
    roadSheenMaterial.metalness =
      nextWeatherMode === "heavy-rain" ? 0.14 : 0.05;
    buildingRoofMaterial.color.setHex(
      mixHexColor(
        0xdce8f0,
        nextWeatherMode === "heavy-rain" ? 0x6b7886 : 0xaeb9c4,
        nightFactor * 0.48 + rainFactor * 0.24,
      ),
    );
    buildingRoofMaterial.emissive.setHex(
      mixHexColor(0x121924, 0xffcf8c, nightFactor * 0.22),
    );
    buildingRoofMaterial.emissiveIntensity = 0.08 + nightFactor * 0.1;
    buildingRoofMaterial.opacity = THREE.MathUtils.clamp(
      0.42 + sunset * 0.06 + nightFactor * 0.1 + rainFactor * 0.04,
      0.38,
      0.58,
    );
    if (crosswalkMaterial) {
      crosswalkMaterial.color.setHex(environment.crosswalkColor);
      crosswalkMaterial.emissive.setHex(environment.crosswalkEmissive);
      crosswalkMaterial.emissiveIntensity = environment.crosswalkIntensity;
    }
    if (stopLineMaterial) {
      stopLineMaterial.color.setHex(environment.stopLineColor);
      stopLineMaterial.emissive.setHex(environment.stopLineEmissive);
      stopLineMaterial.emissiveIntensity = environment.stopLineIntensity;
    }

    const skyDirection = environment.sunPosition.clone().normalize();
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
      .addScaledVector(skyDirection, environmentVisuals.celestialRadius);
    environmentVisuals.sunDisc.position.copy(sunAnchor);
    environmentVisuals.sunHalo.position.copy(sunAnchor);
    environmentVisuals.sunsetGlow.position.copy(
      centerPoint
        .clone()
        .addScaledVector(
          new THREE.Vector3(
            skyDirection.x,
            Math.max(0.12, skyDirection.y * 0.48),
            skyDirection.z,
          ).normalize(),
          environmentVisuals.celestialRadius * 0.84,
        ),
    );

    const moonDirection = skyDirection.clone().multiplyScalar(-1);
    moonDirection.y = Math.max(0.2, moonDirection.y * 0.76 + 0.22);
    moonDirection.normalize();
    environmentVisuals.moon.position.copy(
      centerPoint
        .clone()
        .addScaledVector(moonDirection, environmentVisuals.celestialRadius * 0.92),
    );

    environmentVisuals.sunDiscMaterial.color.setHex(
      sunset > 0.18 ? 0xffc78b : 0xfff1c9,
    );
    environmentVisuals.sunDiscMaterial.opacity =
      THREE.MathUtils.clamp(daylight * 0.34 + sunset * 0.52, 0, 0.86) *
      (0.88 + cloudVisibility * 0.12);
    environmentVisuals.sunHaloMaterial.opacity =
      THREE.MathUtils.clamp(daylight * 0.1 + sunset * 0.22, 0, 0.24) *
      cloudVisibility;
    environmentVisuals.sunsetGlowMaterial.opacity =
      THREE.MathUtils.clamp(sunset * 0.24, 0, 0.22) *
      (0.86 + cloudVisibility * 0.14);
    environmentVisuals.moonMaterial.opacity =
      THREE.MathUtils.clamp((0.22 - daylight) / 0.22, 0, 0.88) *
      (nextWeatherMode === "heavy-rain"
        ? 0.34
        : nextWeatherMode === "cloudy"
          ? 0.72
          : 0.84);
    activeStarOpacity =
      THREE.MathUtils.clamp((0.2 - daylight) / 0.2, 0, 0.78) *
      (nextWeatherMode === "heavy-rain"
        ? 0.12
        : nextWeatherMode === "cloudy"
          ? 0.46
          : nextWeatherMode === "heavy-snow"
            ? 0.58
            : 0.88);
    const cloudOpacityBase =
      nextWeatherMode === "clear"
        ? 0.08
        : nextWeatherMode === "cloudy"
          ? 0.4
          : nextWeatherMode === "heavy-rain"
            ? 0.54
            : 0.48;
    const cloudColor =
      nextWeatherMode === "heavy-rain"
        ? 0xa9b7c6
        : nextWeatherMode === "heavy-snow"
          ? 0xe7eff6
          : 0xe2eaf2;
    environmentVisuals.cloudMaterial.color.setHex(cloudColor);
    environmentVisuals.cloudMaterial.emissive.setHex(
      nextWeatherMode === "heavy-rain" ? 0x293948 : 0x243443,
    );
    environmentVisuals.cloudMaterial.opacity =
      nextWeatherMode === "heavy-rain"
        ? 0.2
        : cloudOpacityBase * (daylight > 0.08 ? 1.04 : 0.9);
    environmentVisuals.cloudClusters.forEach(({ cluster }) => {
      cluster.visible =
        nextWeatherMode !== "heavy-rain" && cloudOpacityBase > 0.01;
    });
    const stormCloudOpacity = nextWeatherMode === "heavy-rain" ? 0.62 : 0;
    environmentVisuals.stormCloudMaterial.opacity = stormCloudOpacity;
    environmentVisuals.stormCloudMaterial.color.setHex(
      nextWeatherMode === "heavy-rain" ? 0x66798d : 0x73879a,
    );
    environmentVisuals.stormCloudClusters.forEach(({ cluster }) => {
      cluster.visible = stormCloudOpacity > 0.01;
    });

    environmentVisuals.rainLayer.points.visible =
      environment.precipitation === "rain";
    environmentVisuals.rainLayer.material.opacity =
      environment.precipitationOpacity;
    environmentVisuals.rainLayer.material.size =
      0.22 + environment.precipitationIntensity * 0.1;
    environmentVisuals.snowLayer.points.visible =
      environment.precipitation === "snow";
    environmentVisuals.snowLayer.material.opacity =
      environment.precipitationOpacity;
    environmentVisuals.snowLayer.material.size =
      0.58 + environment.precipitationIntensity * 0.18;

    renderer.toneMappingExposure = environment.exposure;
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
  };
}
