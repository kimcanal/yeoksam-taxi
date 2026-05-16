import { z } from "zod";

export const vehicleTelemetryEntrySchema = z.object({
  id: z.string(),
  fleet: z.enum(["taxi", "traffic"]).default("taxi"),
  lon: z.number(),
  lat: z.number(),
  heading_deg: z.number().nullable().optional(),
  speed_kmh: z.number().nullable().optional(),
  occupancy: z.enum(["occupied", "vacant", "unknown"]).default("unknown"),
  timestamp: z.string(),
  source: z.string().optional(),
});

export const vehicleTelemetryFrameSchema = z.object({
  city: z.string(),
  source: z.string(),
  snapshot_at: z.string(),
  is_demo: z.boolean().optional(),
  vehicles: z.array(vehicleTelemetryEntrySchema),
});

export type VehicleTelemetryEntry = z.infer<typeof vehicleTelemetryEntrySchema>;
export type VehicleTelemetryFrame = z.infer<typeof vehicleTelemetryFrameSchema>;
