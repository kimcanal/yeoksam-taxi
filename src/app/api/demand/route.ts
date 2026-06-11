import { NextResponse } from "next/server";
import { proxyBackendGet, toBackendDate } from "@/lib/backend-proxy";

export const runtime = "nodejs";

const CANONICAL_DEMAND_BACKEND_BASE_URL = "https://163.239.77.92:2222";
const CONFIGURED_DEMAND_BACKEND_BASE_URL =
  process.env.BACKEND_DEMAND_BASE_URL || CANONICAL_DEMAND_BACKEND_BASE_URL;
const DEFAULT_DEMAND_BACKEND_BASE_URL = isTemporarySupplyUrlString(
  CONFIGURED_DEMAND_BACKEND_BASE_URL,
)
  ? CANONICAL_DEMAND_BACKEND_BASE_URL
  : CONFIGURED_DEMAND_BACKEND_BASE_URL;
const DEFAULT_DEMAND_HOURLY_API_URL = `${DEFAULT_DEMAND_BACKEND_BASE_URL.replace(/\/$/, "")}/api/demand/hourly`;
const DEFAULT_DEMAND_DAILY_API_URL = `${DEFAULT_DEMAND_BACKEND_BASE_URL.replace(/\/$/, "")}/api/demand/daily`;
const LOCAL_DEMAND_FALLBACK_BASE_URL =
  process.env.BACKEND_DEMAND_FALLBACK_BASE_URL || "http://localhost:2223";
const BACKEND_DEMAND_API_URL =
  process.env.BACKEND_DEMAND_API_URL || DEFAULT_DEMAND_HOURLY_API_URL;
const BACKEND_DEMAND_DAILY_API_URL =
  process.env.BACKEND_DEMAND_DAILY_API_URL ||
  BACKEND_DEMAND_API_URL?.replace(/\/hourly\/?$/, "/daily") ||
  DEFAULT_DEMAND_DAILY_API_URL;
const DEMAND_PROXY_CACHE_TTL_MS = positiveIntegerEnv(
  "DEMAND_PROXY_CACHE_TTL_MS",
  60_000,
);

function positiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function isTemporarySupplyUrlString(value: string) {
  try {
    return isTemporarySupplyHost(new URL(value));
  } catch {
    return false;
  }
}

function demandPathForScope(scope: string) {
  return scope === "daily" ? "/api/demand/daily" : "/api/demand/hourly";
}

function isTemporarySupplyHost(url: URL) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  return (
    ((hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "163.239.77.91") &&
      url.port === "2223") ||
    url.pathname === "/api/demand/dong-daily"
  );
}

function demandBackendUrlForScope(configuredUrl: string, scope: string) {
  const fallbackUrl =
    scope === "daily" ? DEFAULT_DEMAND_DAILY_API_URL : DEFAULT_DEMAND_HOURLY_API_URL;
  let targetUrl: URL;
  try {
    targetUrl = new URL(configuredUrl || fallbackUrl);
  } catch {
    targetUrl = new URL(fallbackUrl);
  }

  if (isTemporarySupplyHost(targetUrl)) {
    const canonicalUrl = new URL(CANONICAL_DEMAND_BACKEND_BASE_URL);
    canonicalUrl.pathname = demandPathForScope(scope);
    canonicalUrl.search = "";
    return canonicalUrl;
  }

  if (scope === "daily" && targetUrl.pathname === "/api/demand/dong-daily") {
    targetUrl.pathname = "/api/demand/daily";
  }
  return targetUrl;
}

function localDemandFallbackUrlForScope(scope: string) {
  const fallbackUrl = new URL(LOCAL_DEMAND_FALLBACK_BASE_URL);
  fallbackUrl.pathname =
    scope === "daily" ? "/api/demand/dong-daily" : "/api/demand/hourly";
  fallbackUrl.search = "";
  return fallbackUrl;
}

async function fetchDemandResponse({
  targetUrl,
  fallbackUrl,
  scope,
}: {
  targetUrl: URL;
  fallbackUrl: URL;
  scope: string;
}) {
  const primaryResponse = await proxyBackendGet({
    targetUrl,
    logLabel: "API",
    cacheTtlMs: DEMAND_PROXY_CACHE_TTL_MS,
  });

  if (primaryResponse.ok) {
    primaryResponse.headers.set("X-Demand-Backend", targetUrl.origin);
    primaryResponse.headers.set("X-Demand-Fallback", "NONE");
    return primaryResponse;
  }

  console.warn(
    `[DEMAND API] Primary demand backend failed (${primaryResponse.status}); falling back to ${fallbackUrl.origin} for ${scope}.`,
  );
  const fallbackResponse = await proxyBackendGet({
    targetUrl: fallbackUrl,
    logLabel: "LOCAL DEMAND",
    cacheTtlMs: 0,
    errorCacheTtlMs: 0,
    timeoutMs: 75_000,
  });
  if (fallbackResponse.ok) {
    fallbackResponse.headers.set("X-Demand-Backend", fallbackUrl.origin);
    fallbackResponse.headers.set("X-Demand-Fallback", "LOCAL-2223");
  }
  return fallbackResponse;
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

  const activeUrl =
    scope === "daily" ? BACKEND_DEMAND_DAILY_API_URL : BACKEND_DEMAND_API_URL;
  if (!activeUrl) {
    console.error(`[DEMAND API] Backend demand URL is not configured (scope: ${scope})`);
    return NextResponse.json(
      { error: "Internal server error: Backend demand URL is not configured" },
      { status: 500 },
    );
  }

  const targetUrl = demandBackendUrlForScope(activeUrl, scope);
  const fallbackUrl = localDemandFallbackUrlForScope(scope);

  if (scope !== "daily") {
    targetUrl.searchParams.set("dong", dong);
    fallbackUrl.searchParams.set("dong", dong);
  }
  targetUrl.searchParams.set("date", backendDate);
  fallbackUrl.searchParams.set("date", backendDate);

  const response = await fetchDemandResponse({
    targetUrl,
    fallbackUrl,
    scope,
  });

  if (response.ok && scope === "daily") {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}
