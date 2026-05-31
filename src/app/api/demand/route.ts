import { NextResponse } from "next/server";
import { proxyBackendGet, toBackendDate } from "@/lib/backend-proxy";

export const runtime = "nodejs";

const BACKEND_DEMAND_API_URL =
  process.env.BACKEND_DEMAND_API_URL ||
  "https://163.239.77.92:2222/api/demand/hourly";
const BACKEND_DEMAND_DAILY_API_URL =
  process.env.BACKEND_DEMAND_DAILY_API_URL ||
  BACKEND_DEMAND_API_URL.replace(/\/hourly\/?$/, "/daily");
const DEMAND_PROXY_CACHE_TTL_MS = positiveIntegerEnv(
  "DEMAND_PROXY_CACHE_TTL_MS",
  60_000,
);

function positiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "hourly";
  const dong = searchParams.get("dong") || "";
  const date = searchParams.get("date") || "";
  const backendDate = toBackendDate(date);

  if (!backendDate || (scope !== "daily" && !dong)) {
    return NextResponse.json(
      {
        error: "Missing required demand query parameters",
        required: scope === "daily" ? ["date"] : ["dong", "date"],
      },
      { status: 400 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(
      scope === "daily" ? BACKEND_DEMAND_DAILY_API_URL : BACKEND_DEMAND_API_URL,
    );
  } catch (urlError) {
    console.error(`[DEMAND API] Invalid backend URL configured:`, urlError);
    return NextResponse.json(
      { error: "Internal server error: Invalid backend URL configuration" },
      { status: 500 },
    );
  }

  if (scope !== "daily") {
    targetUrl.searchParams.set("dong", dong);
  }
  targetUrl.searchParams.set("date", backendDate);

  return proxyBackendGet({
    targetUrl,
    logLabel: "API",
    cacheTtlMs: DEMAND_PROXY_CACHE_TTL_MS,
  });
}
