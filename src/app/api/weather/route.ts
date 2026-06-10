import { NextResponse } from "next/server";
import { proxyBackendGet, toBackendDate } from "@/lib/backend-proxy";

export const runtime = "nodejs";

const BACKEND_WEATHER_API_URL = process.env.BACKEND_WEATHER_API_URL;
const WEATHER_PROXY_CACHE_TTL_MS = positiveIntegerEnv(
  "WEATHER_PROXY_CACHE_TTL_MS",
  5 * 60_000,
);

function positiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || "";
  const hour = searchParams.get("hour") || "";
  const hourNumber = Number(hour);
  const backendDate = toBackendDate(date);

  if (
    !backendDate ||
    !Number.isInteger(hourNumber) ||
    hourNumber < 0 ||
    hourNumber > 23
  ) {
    return NextResponse.json(
      {
        error: "Missing or invalid weather query parameters",
        required: ["date", "hour"],
      },
      { status: 400 },
    );
  }

  if (!BACKEND_WEATHER_API_URL) {
    console.error(`[WEATHER API] BACKEND_WEATHER_API_URL is not configured in env`);
    return NextResponse.json(
      { error: "Internal server error: Weather backend URL is not configured" },
      { status: 500 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(BACKEND_WEATHER_API_URL);
  } catch (urlError) {
    console.error(`[WEATHER API] Invalid backend URL configured:`, urlError);
    return NextResponse.json(
      { error: "Internal server error: Invalid backend URL configuration" },
      { status: 500 },
    );
  }

  targetUrl.searchParams.set("date", backendDate);
  targetUrl.searchParams.set("hour", String(hourNumber));

  return proxyBackendGet({
    targetUrl,
    logLabel: "WEATHER",
    cacheTtlMs: WEATHER_PROXY_CACHE_TTL_MS,
  });
}
