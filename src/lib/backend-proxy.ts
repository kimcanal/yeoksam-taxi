import { NextResponse } from "next/server";

// TODO(security): TLS verification is NOT disabled in code. The self-signed
// backend certificate must be trusted at runtime via the NODE_EXTRA_CA_CERTS
// environment variable (e.g., NODE_EXTRA_CA_CERTS=/path/to/cert.pem).
// Do NOT set NODE_TLS_REJECT_UNAUTHORIZED=0 in source code.

/** Default timeout for backend proxy requests in milliseconds. */
const BACKEND_PROXY_TIMEOUT_MS = 15_000;

type CachedProxyPayload = {
  data: unknown;
  expiresAt: number;
};

type CachedProxyError = {
  body: string;
  expiresAt: number;
  status: number;
};

const proxyResponseCache = new Map<string, CachedProxyPayload>();
const proxyInflightRequests = new Map<string, Promise<unknown>>();
const proxyErrorCache = new Map<string, CachedProxyError>();

class ProxyBackendError extends Error {
  body: string;
  status: number;

  constructor(status: number, body: string) {
    super(body);
    this.name = "ProxyBackendError";
    this.status = status;
    this.body = body;
  }
}

function proxyErrorResponse(error: ProxyBackendError) {
  return new NextResponse(error.body, {
    status: error.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Proxy-Cache": "ERROR",
    },
  });
}

/**
 * Convert a frontend date string (YYYY-MM-DD or YYYYMMDD) to the backend's
 * YYYYMMDD format. Returns an empty string for invalid inputs, performing
 * strict calendar validation (month bounds and correct days per month,
 * including leap years).
 */
export function toBackendDate(date: string): string {
  let y = 0;
  let m = 0;
  let d = 0;
  let formatted = "";

  if (/^\d{8}$/.test(date)) {
    y = parseInt(date.slice(0, 4), 10);
    m = parseInt(date.slice(4, 6), 10);
    d = parseInt(date.slice(6, 8), 10);
    formatted = date;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parts = date.split("-");
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    d = parseInt(parts[2], 10);
    formatted = date.replaceAll("-", "");
  } else {
    return "";
  }

  if (m < 1 || m > 12) {
    return "";
  }
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d < 1 || d > daysInMonth) {
    return "";
  }

  return formatted;
}

export type BackendProxyOptions = {
  /** The full backend URL (including query params) to proxy to. */
  targetUrl: URL;
  /** A human-readable label for log messages (e.g., "DEMAND", "WEATHER"). */
  logLabel: string;
  /** Optional timeout in milliseconds. Defaults to 15 seconds. */
  timeoutMs?: number;
  /** Optional in-memory cache TTL in milliseconds. Disabled by default. */
  cacheTtlMs?: number;
  /** Optional failed-response cache TTL in milliseconds. Defaults to 10s. */
  errorCacheTtlMs?: number;
};

/**
 * Proxy a GET request to the backend, with:
 * - Configurable timeout (default 15s) to avoid hanging requests
 * - Optional in-memory response caching and in-flight request dedupe
 * - Automatic HTTPS → HTTP fallback on fetch failure
 * - Structured error responses
 *
 * Returns a NextResponse suitable for returning from a Next.js API route.
 */
export async function proxyBackendGet({
  targetUrl,
  logLabel,
  timeoutMs = BACKEND_PROXY_TIMEOUT_MS,
  cacheTtlMs = 0,
  errorCacheTtlMs = 10_000,
}: BackendProxyOptions): Promise<NextResponse> {
  const tag = `[${logLabel} PROXY]`;
  const cacheKey = targetUrl.toString();
  const now = Date.now();

  if (cacheTtlMs > 0) {
    const cached = proxyResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      console.log(`${tag} Cache hit: ${cacheKey}`);
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "no-store",
          "X-Proxy-Cache": "HIT",
        },
      });
    }
    if (cached) {
      proxyResponseCache.delete(cacheKey);
    }
  }

  if (errorCacheTtlMs > 0) {
    const cachedError = proxyErrorCache.get(cacheKey);
    if (cachedError && cachedError.expiresAt > now) {
      console.warn(`${tag} Cached backend error: ${cacheKey}`);
      return new NextResponse(cachedError.body, {
        status: cachedError.status,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
          "X-Proxy-Cache": "ERROR-HIT",
        },
      });
    }
    if (cachedError) {
      proxyErrorCache.delete(cacheKey);
    }
  }

  const existingInflight = proxyInflightRequests.get(cacheKey);
  if (existingInflight) {
    console.log(`${tag} Reusing in-flight backend request: ${cacheKey}`);
    try {
      const data = await existingInflight;
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store",
          "X-Proxy-Cache": "INFLIGHT",
        },
      });
    } catch (error: unknown) {
      if (error instanceof ProxyBackendError) {
        return proxyErrorResponse(error);
      }
      return NextResponse.json(
        {
          error: `${logLabel} proxy fetch error`,
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 502 },
      );
    }
  }

  console.log(`${tag} Proxying request to backend: ${cacheKey}`);

  const fetchOptions: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  };

  async function fetchBackendJson() {
    let response: Response;
    try {
      response = await fetch(cacheKey, fetchOptions);
    } catch (fetchError: unknown) {
      let message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      if (fetchError instanceof Error && "cause" in fetchError && fetchError.cause) {
        const causeMsg = fetchError.cause instanceof Error ? fetchError.cause.message : String(fetchError.cause);
        message += ` (Underlying cause: ${causeMsg})`;
      }

      // If the original request was HTTPS, retry over HTTP as a fallback.
      if (targetUrl.protocol === "https:") {
        console.warn(
          `${tag} HTTPS fetch failed, retrying with HTTP... Reason: ${message}`,
        );
        const httpUrl = cacheKey.replace(/^https:/, "http:");
        try {
          response = await fetch(httpUrl, fetchOptions);
        } catch (retryError: unknown) {
          let retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
          if (retryError instanceof Error && "cause" in retryError && retryError.cause) {
            const retryCauseMsg = retryError.cause instanceof Error ? retryError.cause.message : String(retryError.cause);
            retryMessage += ` (Underlying cause: ${retryCauseMsg})`;
          }
          throw new ProxyBackendError(
            502,
            JSON.stringify({
              error: `${logLabel} proxy: both HTTPS and HTTP failed`,
              message: retryMessage,
            }),
          );
        }
      } else {
        throw new ProxyBackendError(
          502,
          JSON.stringify({
            error: `${logLabel} proxy fetch error`,
            message,
          }),
        );
      }
    }

    if (response.ok) {
      return response.json() as Promise<unknown>;
    }

    const errorText = await response.text();
    throw new ProxyBackendError(
      response.status,
      JSON.stringify({
        error: `Backend ${logLabel} API returned error`,
        statusCode: response.status,
        details: errorText,
      }),
    );
  }

  const requestPromise = fetchBackendJson();
  proxyInflightRequests.set(cacheKey, requestPromise);

  try {
    const data = await requestPromise;
    if (cacheTtlMs > 0) {
      proxyResponseCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + cacheTtlMs,
      });
    }
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
        "X-Proxy-Cache": "MISS",
      },
    });
  } catch (error: unknown) {
    if (error instanceof ProxyBackendError) {
      if (errorCacheTtlMs > 0) {
        proxyErrorCache.set(cacheKey, {
          body: error.body,
          expiresAt: Date.now() + errorCacheTtlMs,
          status: error.status,
        });
      }
      return proxyErrorResponse(error);
    }

    let message = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && "cause" in error && error.cause) {
      const causeMsg = error.cause instanceof Error ? error.cause.message : String(error.cause);
      message += ` (Underlying cause: ${causeMsg})`;
    }
    return NextResponse.json(
      {
        error: `${logLabel} proxy fetch error`,
        message,
      },
      { status: 502 },
    );
  } finally {
    if (proxyInflightRequests.get(cacheKey) === requestPromise) {
      proxyInflightRequests.delete(cacheKey);
    }
  }
}
