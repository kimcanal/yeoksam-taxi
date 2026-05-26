import * as THREE from "three";
import {
  disposeObject3DResources,
} from "@/components/map-simulator/object-resource-utils";
import {
  KAKAO_TAXI_ASSET_PATH,
  KAKAO_TRAFFIC_ASSET_SPECS,
  TAXI_ASSET_IDLE_TIMEOUT_MS,
  TAXI_ASSET_LOAD_DELAY_MS,
  TRAFFIC_ASSET_IDLE_TIMEOUT_MS,
  TRAFFIC_ASSET_LOAD_DELAY_MS,
  type TrafficVehicleModelKey,
  loadVehicleAssetTemplate,
  normalizeTaxiAssetTemplate,
  normalizeTrafficAssetTemplate,
} from "@/components/map-simulator/vehicle-asset-loader";
import type { EngineSceneContext } from "@/components/map-simulator/engine/engine-scene-setup";

export function createEngineAssetLoader(ctx: EngineSceneContext) {
  let taxiAssetTemplate: THREE.Group | null = null;
  let trafficAssetTemplates = new Map<TrafficVehicleModelKey, THREE.Group>();
  let taxiAssetLoadStarted = false;
  let trafficAssetLoadStarted = false;

  const isDisposed = () => ctx.sceneDisposed;

  const getTaxiAssetTemplate = () => taxiAssetTemplate;
  const getTrafficAssetTemplates = (): ReadonlyMap<TrafficVehicleModelKey, THREE.Group> =>
    trafficAssetTemplates;

  const disposeTrafficAssetTemplatesMap = (
    templates: ReadonlyMap<TrafficVehicleModelKey, THREE.Group>,
  ) => {
    templates.forEach((template) => {
      disposeObject3DResources(template);
    });
  };

  const loadTaxiAssetInBackground = () => {
    if (isDisposed() || taxiAssetTemplate || taxiAssetLoadStarted) {
      return;
    }

    taxiAssetLoadStarted = true;
    void (async () => {
      let loadedTemplate: THREE.Group | null = null;
      try {
        loadedTemplate = await loadVehicleAssetTemplate(KAKAO_TAXI_ASSET_PATH);
        if (isDisposed()) {
          disposeObject3DResources(loadedTemplate);
          return;
        }

        taxiAssetTemplate = normalizeTaxiAssetTemplate(loadedTemplate);
        loadedTemplate = null;
        if (isDisposed()) {
          disposeObject3DResources(taxiAssetTemplate);
          taxiAssetTemplate = null;
          return;
        }

        ctx.vehicleRuntimeSync.upgradeTaxiVehicleMeshes();
      } catch (error) {
        if (loadedTemplate) {
          disposeObject3DResources(loadedTemplate);
        }
        console.warn(
          "Failed to load Kakao taxi asset; keeping refined fallback taxi.",
          error,
        );
      }
    })();
  };

  const loadTrafficAssetsInBackground = () => {
    if (
      isDisposed() ||
      trafficAssetTemplates.size > 0 ||
      trafficAssetLoadStarted
    ) {
      return;
    }

    trafficAssetLoadStarted = true;
    void (async () => {
      const nextTemplates = new Map<TrafficVehicleModelKey, THREE.Group>();
      for (const spec of KAKAO_TRAFFIC_ASSET_SPECS) {
        let loadedTemplate: THREE.Group | null = null;
        try {
          loadedTemplate = await loadVehicleAssetTemplate(spec.path);
          if (isDisposed()) {
            disposeObject3DResources(loadedTemplate);
            loadedTemplate = null;
            break;
          }

          const normalizedTemplate = normalizeTrafficAssetTemplate(
            loadedTemplate,
            spec.targetLength,
          );
          loadedTemplate = null;
          nextTemplates.set(spec.key, normalizedTemplate);
        } catch (error) {
          if (loadedTemplate) {
            disposeObject3DResources(loadedTemplate);
          }
          console.warn(
            `Failed to load Kakao traffic asset: ${spec.path}`,
            error,
          );
        }
      }

      if (isDisposed()) {
        disposeTrafficAssetTemplatesMap(nextTemplates);
        return;
      }

      if (nextTemplates.size > 0) {
        disposeTrafficAssetTemplatesMap(trafficAssetTemplates);
        trafficAssetTemplates = nextTemplates;
        ctx.vehicleRuntimeSync.rebuildVehicleLayerFromLatestSnapshot();
      }
    })();
  };

  const scheduleLoads = () => {
    const { deferredAssetLoadScheduler } = ctx;
    const cancelTaxi = deferredAssetLoadScheduler.schedule(
      loadTaxiAssetInBackground,
      TAXI_ASSET_LOAD_DELAY_MS,
      TAXI_ASSET_IDLE_TIMEOUT_MS,
    );
    const cancelTraffic = deferredAssetLoadScheduler.schedule(
      loadTrafficAssetsInBackground,
      TRAFFIC_ASSET_LOAD_DELAY_MS,
      TRAFFIC_ASSET_IDLE_TIMEOUT_MS,
    );
    return { cancelTaxi, cancelTraffic };
  };

  return {
    getTaxiAssetTemplate,
    getTrafficAssetTemplates,
    scheduleLoads,
    get markUserInteraction() {
      return ctx.deferredAssetLoadScheduler.markUserInteraction;
    },
    dispose() {
      if (taxiAssetTemplate) {
        disposeObject3DResources(taxiAssetTemplate);
        taxiAssetTemplate = null;
      }
      disposeTrafficAssetTemplatesMap(trafficAssetTemplates);
    },
  };
}
