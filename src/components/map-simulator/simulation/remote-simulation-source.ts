import * as THREE from "three";
import type {
  SimulationSnapshot,
  SimulationSource,
} from "@/components/map-simulator/simulation";

/**
 * A protocol-agnostic simulation source for backend integration.
 * It expects backend to push data via `pushSnapshot()`.
 * Internally, it interpolates vehicle movements smoothly between 
 * the last two received snapshots (typically arriving at 1Hz) 
 * so the renderer can display at 60 FPS without teleporting.
 */
export class RemoteSimulationSource implements SimulationSource {
  public readonly id = "remote";

  private currentSnapshot: SimulationSnapshot | null = null;
  private targetSnapshot: SimulationSnapshot | null = null;
  private interpolatedSnapshot: SimulationSnapshot | null = null;

  private snapshotDurationSeconds = 1.0;
  private currentProgressSeconds = 0;

  public reset(): void {
    this.currentSnapshot = null;
    this.targetSnapshot = null;
    this.interpolatedSnapshot = null;
    this.currentProgressSeconds = 0;
  }

  /**
   * Called by the networking layer (WebSocket, SSE, or Polling) 
   * whenever a new snapshot arrives from the backend.
   */
  public pushSnapshot(snapshot: SimulationSnapshot): void {
    if (!this.currentSnapshot || !this.targetSnapshot) {
      this.currentSnapshot = snapshot;
      this.targetSnapshot = snapshot;
      this.interpolatedSnapshot = snapshot;
      return;
    }

    // Shift the buffer forward
    this.currentSnapshot = this.targetSnapshot;
    this.targetSnapshot = snapshot;
    this.currentProgressSeconds = 0;

    // Estimate the time gap between snapshots for smooth interpolation
    // Fallback to 1.0s if time is identical or invalid
    const duration =
      this.targetSnapshot.clock.elapsedTimeSeconds -
      this.currentSnapshot.clock.elapsedTimeSeconds;
    this.snapshotDurationSeconds = duration > 0 ? duration : 1.0;
  }

  public step(deltaSeconds: number): void {
    if (!this.currentSnapshot || !this.targetSnapshot) return;

    this.currentProgressSeconds += deltaSeconds;
    const t = Math.min(1.0, this.currentProgressSeconds / this.snapshotDurationSeconds);

    // Lerp clock and vehicles. We copy other data directly from target snapshot.
    this.interpolatedSnapshot = {
      ...this.targetSnapshot,
      clock: {
        ...this.currentSnapshot.clock,
        elapsedTimeSeconds:
          this.currentSnapshot.clock.elapsedTimeSeconds +
          this.snapshotDurationSeconds * t,
      },
      vehicles: this.targetSnapshot.vehicles.map((targetVehicle) => {
        const currentVehicle = this.currentSnapshot!.vehicles.find(
          (v) => v.id === targetVehicle.id
        );

        if (!currentVehicle) {
          // New vehicle appeared in this tick
          return targetVehicle;
        }

        // Linear interpolation for position
        const position = new THREE.Vector3()
          .copy(currentVehicle.pose.position)
          .lerp(targetVehicle.pose.position, t);

        // Spherical linear interpolation (SLERP) for heading
        const currentHeading = currentVehicle.pose.heading.clone().normalize();
        const targetHeading = targetVehicle.pose.heading.clone().normalize();

        const zAxis = new THREE.Vector3(0, 0, 1);
        const currentQuat = new THREE.Quaternion().setFromUnitVectors(zAxis, currentHeading);
        const targetQuat = new THREE.Quaternion().setFromUnitVectors(zAxis, targetHeading);

        const interpolatedQuat = currentQuat.slerp(targetQuat, t);
        const interpolatedHeading = zAxis.applyQuaternion(interpolatedQuat);

        return {
          ...targetVehicle,
          pose: {
            ...targetVehicle.pose,
            position,
            heading: interpolatedHeading,
          },
        };
      }),
    };
  }

  public getSnapshot(): SimulationSnapshot {
    if (!this.interpolatedSnapshot) {
      // Fallback empty state if no data received yet
      return {
        clock: {
          elapsedTimeSeconds: 0,
          dateIso: new Date().toISOString(),
          minutes: 0,
          weatherMode: "clear",
        },
        vehicles: [],
        signals: [],
        hotspots: [],
        stats: {
          taxis: 0,
          traffic: 0,
          waiting: 0,
          signals: 0,
          activeTrips: 0,
          completedTrips: 0,
          pedestrians: 0,
          pickups: 0,
          dropoffs: 0,
          activeCalls: 0,
          avgPickupWaitSeconds: 0,
          avgRideSeconds: 0,
        },
      };
    }
    return this.interpolatedSnapshot;
  }
}
