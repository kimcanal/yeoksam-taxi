import { NextResponse } from "next/server";
import {
  cacheTtlForBackendDate,
  positiveIntegerEnv,
  proxyBackendGet,
  toBackendDate,
} from "@/lib/backend-proxy";

export const runtime = "nodejs";

const DEFAULT_DEMAND_API_URL = "http://localhost:2223/api/demand/hourly";
const DEFAULT_DEMAND_DAILY_API_URL =
  "http://localhost:2223/api/demand/dong-daily";

const BACKEND_DEMAND_API_URL =
  process.env.BACKEND_DEMAND_API_URL || DEFAULT_DEMAND_API_URL;
const BACKEND_DEMAND_DAILY_API_URL =
  process.env.BACKEND_DEMAND_DAILY_API_URL ||
  DEFAULT_DEMAND_DAILY_API_URL;
const DEMAND_PROXY_CACHE_TTL_MS = positiveIntegerEnv(
  "DEMAND_PROXY_CACHE_TTL_MS",
  60_000,
);
const DEMAND_DAILY_TODAY_CACHE_TTL_MS = positiveIntegerEnv(
  "DEMAND_DAILY_TODAY_CACHE_TTL_MS",
  5 * 60_000,
);
const DEMAND_DAILY_PAST_CACHE_TTL_MS = positiveIntegerEnv(
  "DEMAND_DAILY_PAST_CACHE_TTL_MS",
  6 * 60 * 60_000,
);

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

  const activeUrl = scope === "daily" ? BACKEND_DEMAND_DAILY_API_URL : BACKEND_DEMAND_API_URL;
  if (!activeUrl) {
    console.error(`[DEMAND API] Backend demand URL is not configured (scope: ${scope})`);
    return NextResponse.json(
      { error: "Internal server error: Backend demand URL is not configured" },
      { status: 500 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(activeUrl);
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

  const cacheTtlMs =
    scope === "daily"
      ? cacheTtlForBackendDate(backendDate, {
          todayMs: DEMAND_DAILY_TODAY_CACHE_TTL_MS,
          pastMs: DEMAND_DAILY_PAST_CACHE_TTL_MS,
        })
      : DEMAND_PROXY_CACHE_TTL_MS;

  const response = await proxyBackendGet({
    targetUrl,
    logLabel: "API",
    cacheTtlMs,
  });

  return response;
}
