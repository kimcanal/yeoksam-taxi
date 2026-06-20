import { NextResponse } from "next/server";
import {
  cacheTtlForBackendDate,
  positiveIntegerEnv,
  proxyBackendGet,
  toBackendDate,
} from "@/lib/backend-proxy";

export const runtime = "nodejs";

const BACKEND_SUPPLY_BASE_URL =
  process.env.BACKEND_SUPPLY_BASE_URL || "http://localhost:2223/api/supply";
const SUPPLY_TODAY_CACHE_TTL_MS = positiveIntegerEnv(
  "SUPPLY_TODAY_CACHE_TTL_MS",
  5 * 60_000,
);
const SUPPLY_PAST_CACHE_TTL_MS = positiveIntegerEnv(
  "SUPPLY_PAST_CACHE_TTL_MS",
  6 * 60 * 60_000,
);
const SUPPLY_WEIGHTS_CACHE_TTL_MS = positiveIntegerEnv(
  "SUPPLY_WEIGHTS_CACHE_TTL_MS",
  60 * 60_000,
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "daily"; // daily, hourly, dong-hourly, weights
  const date = searchParams.get("date") || "";
  const backendDate = toBackendDate(date);

  if (!backendDate && scope !== "weights") {
    return NextResponse.json(
      { error: "Missing required date query parameter" },
      { status: 400 },
    );
  }

  // Construct target URL: e.g. http://localhost:2223/api/supply/daily or /hourly or /dong-hourly or /weights
  const targetUrl = new URL(`${BACKEND_SUPPLY_BASE_URL}/${scope}`);

  // Forward all query parameters
  searchParams.forEach((value, key) => {
    if (key === "date") {
      targetUrl.searchParams.set("date", backendDate);
    } else if (key !== "scope") {
      targetUrl.searchParams.set(key, value);
    }
  });

  const cacheTtlMs =
    scope === "weights"
      ? SUPPLY_WEIGHTS_CACHE_TTL_MS
      : cacheTtlForBackendDate(backendDate, {
          todayMs: SUPPLY_TODAY_CACHE_TTL_MS,
          pastMs: SUPPLY_PAST_CACHE_TTL_MS,
        });

  return proxyBackendGet({
    targetUrl,
    logLabel: "SUPPLY",
    timeoutMs: 60_000,
    cacheTtlMs,
  });
}
