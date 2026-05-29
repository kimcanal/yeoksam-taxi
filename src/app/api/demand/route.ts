import { NextResponse } from "next/server";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";

export const runtime = "nodejs";

// Fallback to local workspace copy and default backend URL
const BACKEND_CA_CERT_PATH =
  process.env.BACKEND_CA_CERT_PATH || path.join(process.cwd(), "cert.pem");
const BACKEND_DEMAND_API_URL =
  process.env.BACKEND_DEMAND_API_URL ||
  "https://163.239.77.92:2222/api/demand/hourly";
const BACKEND_DEMAND_DAILY_API_URL =
  process.env.BACKEND_DEMAND_DAILY_API_URL ||
  BACKEND_DEMAND_API_URL.replace(/\/hourly\/?$/, "/daily");
const BACKEND_REQUEST_TIMEOUT_MS = Number(
  process.env.BACKEND_REQUEST_TIMEOUT_MS ?? 20000,
);

/**
 * Creates a Node.js https.Agent configured with the custom certificate,
 * or fallback to rejectUnauthorized: false if the certificate isn't found.
 */
function getHttpsAgent(): https.Agent {
  try {
    // Safely resolve relative paths using process.cwd()
    const resolvedPath = path.isAbsolute(BACKEND_CA_CERT_PATH)
      ? BACKEND_CA_CERT_PATH
      : path.join(process.cwd(), BACKEND_CA_CERT_PATH);

    if (fs.existsSync(resolvedPath)) {
      const ca = fs.readFileSync(resolvedPath);
      console.log(
        `[API PROXY] Successfully loaded custom CA cert from ${resolvedPath}`,
      );
      return new https.Agent({
        ca,
        keepAlive: true,
      });
    } else {
      console.warn(
        `[API PROXY] Certificate file not found at ${resolvedPath}. Falling back to rejectUnauthorized: false`,
      );
    }
  } catch (error) {
    console.error(`[API PROXY] Error reading custom CA certificate:`, error);
  }

  // Fallback dev agent for private/self-signed certificates when path is missing or invalid.
  return new https.Agent({ keepAlive: true, rejectUnauthorized: false });
}

interface BackendResponse {
  statusCode: number;
  body: string;
}

function backendDemandDate(date: string) {
  if (/^\d{8}$/.test(date)) {
    return date;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date.replaceAll("-", "");
  }
  return "";
}

/**
 * Performs an HTTP or HTTPS GET request based on the protocol.
 */
function secureGet(url: string, agent: https.Agent): Promise<BackendResponse> {
  const targetUrl = new URL(url);
  const isHttps = targetUrl.protocol === "https:";
  const transport = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions | http.RequestOptions = {
      timeout: BACKEND_REQUEST_TIMEOUT_MS,
    };
    if (isHttps) {
      options.agent = agent;
    }

    const req = transport.get(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 500,
          body,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(
        new Error(
          `Request to backend timed out after ${BACKEND_REQUEST_TIMEOUT_MS}ms`,
        ),
      );
    });
  });
}

export async function GET(request: Request) {
  try {
    // 1. Parse incoming query parameters
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "hourly";
    const dong = searchParams.get("dong") || "";
    const date = searchParams.get("date") || "";
    const backendDate = backendDemandDate(date);

    if (!backendDate || (scope !== "daily" && !dong)) {
      return NextResponse.json(
        {
          error: "Missing required demand query parameters",
          required: scope === "daily" ? ["date"] : ["dong", "date"],
        },
        { status: 400 },
      );
    }

    // 2. Build target backend API URL with forwarded parameters.
    const targetUrl = new URL(
      scope === "daily" ? BACKEND_DEMAND_DAILY_API_URL : BACKEND_DEMAND_API_URL,
    );
    if (scope !== "daily") {
      targetUrl.searchParams.set("dong", dong);
    }
    targetUrl.searchParams.set("date", backendDate);

    console.log(
      `[API PROXY] Proxying request to backend: ${targetUrl.toString()}`,
    );

    // 3. Perform secure HTTPS request using Node https agent
    const agent = getHttpsAgent();
    const { statusCode, body } = await secureGet(targetUrl.toString(), agent);

    if (statusCode >= 200 && statusCode < 300) {
      // Success: Return backend payload directly
      const jsonPayload = JSON.parse(body);
      return NextResponse.json(jsonPayload, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } else {
      // Backend returned an error status (e.g. 404, 422, 500). Forward it directly.
      console.error(
        `[API PROXY] Backend returned error status ${statusCode}: ${body}`,
      );
      let parsedError = body;
      try {
        parsedError = JSON.parse(body);
      } catch {}

      return NextResponse.json(
        {
          error: "Backend API returned error",
          statusCode,
          details: parsedError,
        },
        { status: statusCode },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API PROXY] Internal proxy error:", message);
    return NextResponse.json(
      {
        error: "Internal proxy server error",
        message,
      },
      { status: 502 },
    );
  }
}
