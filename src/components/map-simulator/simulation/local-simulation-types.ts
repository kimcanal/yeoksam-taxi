import type {
  Vehicle,
  VehicleProximityBuckets,
  VehicleSimulationSample,
} from "@/components/map-simulator/types";

export type LocalVehicle = Omit<
  Vehicle,
  "group" | "bodyMaterial" | "signMaterial"
> & {
  renderSeed: number;
};

export type LocalVehicleSimulationSample =
  VehicleSimulationSample<LocalVehicle>;
export type LocalVehicleProximityBuckets = VehicleProximityBuckets<LocalVehicle>;

export const castLocalVehicleForMotion = (vehicle: LocalVehicle) =>
  vehicle as unknown as Vehicle;
