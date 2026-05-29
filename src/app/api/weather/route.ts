import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Globally disable TLS verification in Node environments to bypass self-signed cert checks locally
if (typeof process !== "undefined") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const BACKEND_WEATHER_API_URL =
  process.env.BACKEND_WEATHER_API_URL ||
  "https://163.239.77.92:2222/api/weather";

function backendWeatherDate(date: string) {
  if (/^\d{8}$/.test(date)) {
    return date;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date.replaceAll("-", "");
  }
  return "";
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
        { status: 400 }
      );
    }

    const targetUrl = new URL(BACKEND_WEATHER_API_URL);
    targetUrl.searchParams.set("date", backendDate);
    targetUrl.searchParams.set("hour", String(hourNumber));

    console.log(`[WEATHER PROXY] Fetching backend: ${targetUrl.toString()}`);

    let response;
    try {
      response = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        cache: "no-store",
      });
    } catch (fetchError: any) {
      console.warn(`[WEATHER PROXY] HTTPS fetch failed, retrying with HTTP... Reason:`, fetchError.message);
      if (targetUrl.protocol === "https:") {
        const httpUrl = targetUrl.toString().replace(/^https:/, "http:");
        response = await fetch(httpUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
          cache: "no-store",
        });
      } else {
        throw fetchError;
      }
    }

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } else {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Backend weather API returned error",
          statusCode: response.status,
          details: errorText,
        },
        { status: response.status }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal weather proxy error",
        message: error.message || String(error),
      },
      { status: 502 }
    );
  }
}
