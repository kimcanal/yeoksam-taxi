import type { Stats } from "@/components/map-simulator/map-simulator-types";

export function statsEqual(left: Stats, right: Stats) {
  return (
    left.taxis === right.taxis &&
    left.traffic === right.traffic &&
    left.waiting === right.waiting &&
    left.signals === right.signals &&
    left.activeTrips === right.activeTrips &&
    left.completedTrips === right.completedTrips &&
    left.pedestrians === right.pedestrians &&
    left.pickups === right.pickups &&
    left.dropoffs === right.dropoffs &&
    left.activeCalls === right.activeCalls &&
    left.avgPickupWaitSeconds === right.avgPickupWaitSeconds &&
    left.avgRideSeconds === right.avgRideSeconds
  );
}
