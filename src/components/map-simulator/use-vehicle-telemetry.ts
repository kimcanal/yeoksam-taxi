"use client";

import {
  vehicleTelemetryFrameSchema,
  type VehicleTelemetryFrame,
} from "@/components/map-simulator/vehicle-telemetry-contract";
import { useEventSourceQuery, type QueryStatus } from "./query-cache";

type UseVehicleTelemetryResult = {
  telemetryFrame: VehicleTelemetryFrame | null;
  status: QueryStatus;
  errorMessage: string | null;
};

function parseTelemetryFrame(payload: unknown) {
  return vehicleTelemetryFrameSchema.parse(payload);
}

export function useVehicleTelemetry(): UseVehicleTelemetryResult {
  const snapshot = useEventSourceQuery<VehicleTelemetryFrame>(
    "vehicle-telemetry-stream",
    "/api/realtime/vehicles/stream",
    {
      parse: parseTelemetryFrame,
      retryDelayMs: 1_000,
      maxRetryDelayMs: 10_000,
    },
  );

  return {
    telemetryFrame: snapshot.data,
    status: snapshot.status,
    errorMessage: snapshot.errorMessage,
  };
}
