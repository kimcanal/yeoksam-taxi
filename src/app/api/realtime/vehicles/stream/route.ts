import { DEFAULT_MAP_CENTER } from "@/components/map-simulator/core";
import {
  vehicleTelemetryFrameSchema,
  type VehicleTelemetryFrame,
} from "@/components/map-simulator/vehicle-telemetry-contract";

export const dynamic = "force-dynamic";

const DEMO_STREAM_INTERVAL_MS = 900;
const HEARTBEAT_INTERVAL_MS = 15_000;
const UPSTREAM_SSE_URL =
  process.env.NYC_TAXI_SSE_URL?.trim() ||
  process.env.TAXI_TELEMETRY_SSE_URL?.trim() ||
  "";
const UPSTREAM_AUTH_TOKEN =
  process.env.NYC_TAXI_SSE_BEARER?.trim() ||
  process.env.TAXI_TELEMETRY_SSE_BEARER?.trim() ||
  "";
const DEMO_CENTER = {
  lat: DEFAULT_MAP_CENTER.lat - 0.0013,
  lon: DEFAULT_MAP_CENTER.lon + 0.0004,
};
const DEG_PER_M_LAT = 1 / 111_320;
const DEG_PER_M_LON =
  1 / (111_320 * Math.cos((DEMO_CENTER.lat * Math.PI) / 180));

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function createDemoTelemetryFrame(nowMs: number): VehicleTelemetryFrame {
  const time = nowMs / 1000;
  const vehicles = Array.from({ length: 32 }, (_, index) => {
    const laneSeed = index * 0.47;
    const outerRadius = 120 + (index % 6) * 18;
    const innerRadius = 82 + (index % 5) * 14;
    const angularSpeed = 0.11 + (index % 7) * 0.008;
    const angle = time * angularSpeed + laneSeed;
    const nextAngle = (time + 0.4) * angularSpeed + laneSeed;
    const xMeters =
      Math.cos(angle) * outerRadius +
      Math.sin(angle * 1.7) * 24 +
      Math.cos(angle * 0.4 + laneSeed) * 12;
    const zMeters =
      Math.sin(angle) * innerRadius +
      Math.cos(angle * 1.2) * 18 +
      Math.sin(angle * 0.6 + laneSeed) * 16;
    const nextXMeters =
      Math.cos(nextAngle) * outerRadius +
      Math.sin(nextAngle * 1.7) * 24 +
      Math.cos(nextAngle * 0.4 + laneSeed) * 12;
    const nextZMeters =
      Math.sin(nextAngle) * innerRadius +
      Math.cos(nextAngle * 1.2) * 18 +
      Math.sin(nextAngle * 0.6 + laneSeed) * 16;
    const headingDeg =
      (Math.atan2(nextXMeters - xMeters, nextZMeters - zMeters) * 180) /
      Math.PI;
    const speedKmh = 18 + ((index * 7) % 24);

    return {
      id: `demo-taxi-${index}`,
      fleet: "taxi" as const,
      lon: DEMO_CENTER.lon + xMeters * DEG_PER_M_LON,
      lat: DEMO_CENTER.lat + zMeters * DEG_PER_M_LAT,
      heading_deg: headingDeg,
      speed_kmh: speedKmh,
      occupancy: index % 3 === 0 ? "occupied" as const : "vacant" as const,
      timestamp: new Date(nowMs).toISOString(),
      source: "demo-gangnam-loop",
    };
  });

  return vehicleTelemetryFrameSchema.parse({
    city: "gangnam-demo",
    source: "demo-sse-fallback",
    snapshot_at: new Date(nowMs).toISOString(),
    is_demo: true,
    vehicles,
  });
}

async function tryProxyUpstream(request: Request) {
  if (!UPSTREAM_SSE_URL) {
    return null;
  }

  try {
    const upstream = await fetch(UPSTREAM_SSE_URL, {
      headers: {
        Accept: "text/event-stream",
        ...(UPSTREAM_AUTH_TOKEN
          ? { Authorization: `Bearer ${UPSTREAM_AUTH_TOKEN}` }
          : {}),
      },
      cache: "no-store",
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      return null;
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const upstreamResponse = await tryProxyUpstream(request);
  if (upstreamResponse) {
    return upstreamResponse;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let streamInterval: ReturnType<typeof setInterval> | null = null;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        if (streamInterval) {
          clearInterval(streamInterval);
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        controller.close();
      };

      const pushFrame = () => {
        controller.enqueue(
          encoder.encode(
            encodeEvent("snapshot", createDemoTelemetryFrame(Date.now())),
          ),
        );
      };

      pushFrame();
      streamInterval = setInterval(pushFrame, DEMO_STREAM_INTERVAL_MS);
      heartbeatInterval = setInterval(() => {
        controller.enqueue(
          encoder.encode(
            encodeEvent("heartbeat", {
              timestamp: new Date().toISOString(),
              source: "demo-sse-fallback",
            }),
          ),
        );
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
