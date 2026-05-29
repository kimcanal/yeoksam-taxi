import { NextResponse } from "next/server";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";

export const runtime = "nodejs";

const BACKEND_CA_CERT_PATH =
  process.env.BACKEND_CA_CERT_PATH || path.join(process.cwd(), "cert.pem");
const BACKEND_WEATHER_API_URL =
  process.env.BACKEND_WEATHER_API_URL ||
  "https://163.239.77.92:2222/api/weather";
const BACKEND_REQUEST_TIMEOUT_MS = Number(
  process.env.BACKEND_REQUEST_TIMEOUT_MS ?? 20000,
);

function getHttpsAgent(): https.Agent {
  try {
    const resolvedPath = path.isAbsolute(BACKEND_CA_CERT_PATH)
      ? BACKEND_CA_CERT_PATH
      : path.join(process.cwd(), BACKEND_CA_CERT_PATH);

    if (fs.existsSync(resolvedPath)) {
      return new https.Agent({
        ca: fs.readFileSync(resolvedPath),
        keepAlive: true,
      });
    }
  } catch (error) {
    console.error("[WEATHER API PROXY] Error reading CA certificate:", error);
  }

  return new https.Agent({ keepAlive: true, rejectUnauthorized: false });
}

interface BackendResponse {
  statusCode: number;
  body: string;
}

function backendWeatherDate(date: string) {
  if (/^\d{8}$/.test(date)) {
    return date;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date.replaceAll("-", "");
  }
  return "";
}

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

    req.on("error", reject);
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
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "";
    const hour = searchParams.get("hour") || "";
    const hourNumber = Number(hour);
    const backendDate = backendWeatherDate(date);

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

    const targetUrl = new URL(BACKEND_WEATHER_API_URL);
    targetUrl.searchParams.set("date", backendDate);
    targetUrl.searchParams.set("hour", String(hourNumber));

    const { statusCode, body } = await secureGet(
      targetUrl.toString(),
      getHttpsAgent(),
    );

    if (statusCode >= 200 && statusCode < 300) {
      return NextResponse.json(JSON.parse(body), {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    let parsedError: unknown = body;
    try {
      parsedError = JSON.parse(body);
    } catch {}

    return NextResponse.json(
      {
        error: "Backend weather API returned error",
        statusCode,
        details: parsedError,
      },
      { status: statusCode },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WEATHER API PROXY] Internal proxy error:", message);
    return NextResponse.json(
      {
        error: "Internal weather proxy error",
        message,
      },
      { status: 502 },
    );
  }
}
