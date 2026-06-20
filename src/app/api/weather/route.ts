import { NextResponse } from "next/server";
import { proxyBackendGet, toBackendDate } from "@/lib/backend-proxy";

export const runtime = "nodejs";

const BACKEND_WEATHER_API_URL =
  process.env.BACKEND_WEATHER_API_URL || "http://localhost:2223/api/weather";
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
  const hasHour = hour !== "";
  const hourNumber = hasHour ? Number(hour) : null;
  const backendDate = toBackendDate(date);

  if (
    !backendDate ||
    (hasHour &&
      (!Number.isInteger(hourNumber) ||
        hourNumber === null ||
        hourNumber < 0 ||
        hourNumber > 23))
  ) {
    return NextResponse.json(
      {
        error: "Missing or invalid weather query parameters",
        required: hasHour ? ["date", "hour"] : ["date"],
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
  if (hasHour && hourNumber !== null) {
    targetUrl.searchParams.set("hour", String(hourNumber));
  }

  return proxyBackendGet({
    targetUrl,
    logLabel: "WEATHER",
    cacheTtlMs: WEATHER_PROXY_CACHE_TTL_MS,
  });
}
