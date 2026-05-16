import { getRealtimeSnapshot } from "@/lib/server/realtime-service";

export const dynamic = "force-dynamic";

const STREAM_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
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

      const pushSnapshot = async () => {
        const snapshot = await getRealtimeSnapshot();
        if (!snapshot.ok) {
          controller.enqueue(
            encoder.encode(
              encodeEvent("snapshot-error", {
                message: snapshot.error,
                status: snapshot.status,
              }),
            ),
          );
          return;
        }

        controller.enqueue(
          encoder.encode(
            encodeEvent("snapshot", snapshot.body),
          ),
        );
      };

      void pushSnapshot();
      streamInterval = setInterval(() => {
        void pushSnapshot();
      }, STREAM_INTERVAL_MS);
      heartbeatInterval = setInterval(() => {
        controller.enqueue(
          encoder.encode(
            encodeEvent("heartbeat", {
              timestamp: new Date().toISOString(),
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
