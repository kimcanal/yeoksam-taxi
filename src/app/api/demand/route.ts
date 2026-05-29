import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Globally disable TLS verification in Node environments to bypass self-signed cert checks locally
if (typeof process !== "undefined") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const BACKEND_DEMAND_API_URL =
  process.env.BACKEND_DEMAND_API_URL ||
  "https://163.239.77.92:2222/api/demand/hourly";
const BACKEND_DEMAND_DAILY_API_URL =
  process.env.BACKEND_DEMAND_DAILY_API_URL ||
  BACKEND_DEMAND_API_URL.replace(/\/hourly\/?$/, "/daily");

function backendDemandDate(date: string) {
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
        { status: 400 }
      );
    }

    const targetUrl = new URL(
      scope === "daily" ? BACKEND_DEMAND_DAILY_API_URL : BACKEND_DEMAND_API_URL
    );
    if (scope !== "daily") {
      targetUrl.searchParams.set("dong", dong);
    }
    targetUrl.searchParams.set("date", backendDate);

    console.log(`[API PROXY] Proxying request to backend: ${targetUrl.toString()}`);

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
      console.warn(`[API PROXY] HTTPS fetch failed, retrying with HTTP... Reason:`, fetchError.message);
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
          error: "Backend API returned error",
          statusCode: response.status,
          details: errorText,
        },
        { status: response.status }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal proxy server error",
        message: error.message || String(error),
      },
      { status: 502 }
    );
  }
}
