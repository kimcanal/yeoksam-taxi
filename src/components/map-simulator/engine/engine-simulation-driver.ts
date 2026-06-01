import * as THREE from "three";
import type { EngineSceneContext } from "@/components/map-simulator/engine/engine-scene-setup";
import type { WeatherMode } from "@/components/map-simulator/environment";
import type { Stats } from "@/components/map-simulator/types";
import {
  MAX_VEHICLE_SIMULATION_STEPS,
  VEHICLE_SIMULATION_STEP,
} from "@/components/map-simulator/scene";
import { statsEqual } from "@/components/map-simulator/utils";
import type {
  SimulationConfig,
  SimulationSnapshot,
} from "@/components/map-simulator/simulation";

export function createEngineSimulationDriver(ctx: EngineSceneContext) {
  const {
    simulationSource,
    staticContext,
    signalVisuals,
    vehicleRuntimeSync,
    props,
  } = ctx;

  const {
    appliedTaxiCountRef,
    appliedTrafficCountRef,
    simulationDateRef,
    simulationTimeRef,
    weatherModeRef,
    setStatus,
    setStatusDetail,
    setLoadingProgress,
    setStats,
  } = props;

  let vehicleSimulationAccumulator = 0;
  let latestSimulationSnapshot: SimulationSnapshot | null = null;
  let appliedDateIso: string | null = null;
  let appliedWeatherMode: WeatherMode | null = null;
  let appliedTimeMinutes = -1;
  let activePedestrians = 0;

  const buildSimulationConfig = (
    preserveState: boolean,
  ): SimulationConfig => ({
    taxiCount: appliedTaxiCountRef.current,
    trafficCount: appliedTrafficCountRef.current,
    clock: {
      dateIso: simulationDateRef.current,
      minutes: simulationTimeRef.current,
      weatherMode: weatherModeRef.current,
    },
    preserveState,
  });

  const commitStatsSnapshot = (nextStats: Stats) => {
    setStats((current) => (statsEqual(current, nextStats) ? current : nextStats));
  };

  const commitSourceStats = (snapshotStats: Stats) => {
    commitStatsSnapshot({
      ...snapshotStats,
      signals: signalVisuals.length,
      pedestrians: activePedestrians,
    });
  };

  const resetSimulationSource = (preserveState: boolean): SimulationSnapshot => {
    const nextConfig = buildSimulationConfig(preserveState);
    simulationSource.reset(nextConfig, staticContext);
    ctx.activeVehicleDensity.taxis = nextConfig.taxiCount;
    ctx.activeVehicleDensity.traffic = nextConfig.trafficCount;
    appliedDateIso = nextConfig.clock.dateIso;
    appliedTimeMinutes = nextConfig.clock.minutes;
    appliedWeatherMode = nextConfig.clock.weatherMode;
    vehicleSimulationAccumulator = 0;
    const snapshot = simulationSource.getSnapshot();
    latestSimulationSnapshot = snapshot;
    if (!ctx.sceneDisposed) {
      setLoadingProgress(100);
      setStatus("ready");
      setStatusDetail("주행 준비 완료");
    }
    return snapshot;
  };

  const hasConfigChanged = (): boolean => {
    const nextSimulationDate = simulationDateRef.current;
    const nextSimulationTime = simulationTimeRef.current;
    const nextWeatherMode = weatherModeRef.current;
    const nextTaxiCount = appliedTaxiCountRef.current;
    const nextTrafficCount = appliedTrafficCountRef.current;
    return (
      nextSimulationDate !== appliedDateIso ||
      nextSimulationTime !== appliedTimeMinutes ||
      nextWeatherMode !== appliedWeatherMode ||
      nextTaxiCount !== ctx.activeVehicleDensity.taxis ||
      nextTrafficCount !== ctx.activeVehicleDensity.traffic
    );
  };

  const syncVehicleDensity = () => {
    if (!vehicleRuntimeSync.isReady()) {
      return;
    }

    const nextTaxiCount = appliedTaxiCountRef.current;
    const nextTrafficCount = appliedTrafficCountRef.current;
    if (
      nextTaxiCount === ctx.activeVehicleDensity.taxis &&
      nextTrafficCount === ctx.activeVehicleDensity.traffic
    ) {
      return;
    }

    resetSimulationSource(true);
  };

  /**
   * Step the simulation forward by delta seconds using fixed-timestep accumulator.
   * Returns the snapshot and interpolation alpha.
   */
  const stepSimulation = (delta: number): {
    snapshot: SimulationSnapshot;
    interpolationAlpha: number;
  } => {
    vehicleSimulationAccumulator = Math.min(
      vehicleSimulationAccumulator + delta,
      VEHICLE_SIMULATION_STEP * MAX_VEHICLE_SIMULATION_STEPS,
    );
    let vehicleSimulationSteps = 0;
    while (
      vehicleSimulationAccumulator >= VEHICLE_SIMULATION_STEP &&
      vehicleSimulationSteps < MAX_VEHICLE_SIMULATION_STEPS
    ) {
      simulationSource.step(VEHICLE_SIMULATION_STEP);
      vehicleSimulationAccumulator -= VEHICLE_SIMULATION_STEP;
      vehicleSimulationSteps += 1;
    }
    if (
      vehicleSimulationSteps === MAX_VEHICLE_SIMULATION_STEPS &&
      vehicleSimulationAccumulator >= VEHICLE_SIMULATION_STEP
    ) {
      vehicleSimulationAccumulator %= VEHICLE_SIMULATION_STEP;
    }
    const interpolationAlpha = THREE.MathUtils.clamp(
      vehicleSimulationAccumulator / VEHICLE_SIMULATION_STEP,
      0,
      1,
    );
    const snapshot =
      vehicleSimulationSteps > 0 || !latestSimulationSnapshot
        ? simulationSource.getSnapshot()
        : latestSimulationSnapshot;
    latestSimulationSnapshot = snapshot;

    return { snapshot, interpolationAlpha };
  };

  const getLatestSnapshot = () => latestSimulationSnapshot;

  const setActivePedestrians = (count: number) => {
    activePedestrians = count;
  };

  const resetVehicleSimulationAccumulator = () => {
    vehicleSimulationAccumulator = 0;
  };

  return {
    resetSimulationSource,
    hasConfigChanged,
    syncVehicleDensity,
    stepSimulation,
    commitSourceStats,
    getLatestSnapshot,
    setActivePedestrians,
    resetVehicleSimulationAccumulator,
  };
}
