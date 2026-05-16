import { getRealtimeSnapshot } from "@/lib/server/realtime-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getRealtimeSnapshot();
  if (snapshot.ok) {
    return Response.json(snapshot.body);
  }

  if (snapshot.fallbackBody) {
    return Response.json(snapshot.fallbackBody, { status: snapshot.status });
  }

  return Response.json({ error: snapshot.error }, { status: snapshot.status });
}
