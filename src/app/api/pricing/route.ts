import { NextResponse } from "next/server";
import {
  cacheTtlForBackendDate,
  positiveIntegerEnv,
  proxyBackendGet,
  toBackendDate,
} from "@/lib/backend-proxy";

export const runtime = "nodejs";

const BACKEND_PRICING_BASE_URL =
  process.env.BACKEND_PRICING_BASE_URL || "http://localhost:2223/api/pricing";
const PRICING_TODAY_CACHE_TTL_MS = positiveIntegerEnv(
  "PRICING_TODAY_CACHE_TTL_MS",
  5 * 60_000,
);
const PRICING_PAST_CACHE_TTL_MS = positiveIntegerEnv(
  "PRICING_PAST_CACHE_TTL_MS",
  6 * 60 * 60_000,
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "hourly"; // hourly, dong-hourly
  const date = searchParams.get("date") || "";
  const backendDate = toBackendDate(date);

  if (!backendDate) {
    return NextResponse.json(
      { error: "Missing required date query parameter" },
      { status: 400 },
    );
  }

  const targetUrl = new URL(`${BACKEND_PRICING_BASE_URL}/${scope}`);

  searchParams.forEach((value, key) => {
    if (key === "date") {
      targetUrl.searchParams.set("date", backendDate);
    } else if (key !== "scope") {
      targetUrl.searchParams.set(key, value);
    }
  });

  return proxyBackendGet({
    targetUrl,
    logLabel: "PRICING",
    timeoutMs: 60_000,
    cacheTtlMs: cacheTtlForBackendDate(backendDate, {
      todayMs: PRICING_TODAY_CACHE_TTL_MS,
      pastMs: PRICING_PAST_CACHE_TTL_MS,
    }),
  });
}
