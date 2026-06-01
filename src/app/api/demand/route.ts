/**
 * /api/demand - Taxi demand proxy
 * 1. Try real backend at https://163.239.77.92:2222 using certs/backend.pem
 * 2. Fall back to living-population mock data if backend unreachable
 */

import { type NextRequest, NextResponse } from "next/server";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const BACKEND_BASE = "https://163.239.77.92:2222";
const CERT_PATH = path.join(process.cwd(), "certs", "backend.pem");

function makeHttpsAgent(): https.Agent {
  try {
    const ca = fs.readFileSync(CERT_PATH);
    // cert를 CA로 등록하고, 검증 실패 시에도 연결 허용 (로컬 개발용)
    return new https.Agent({ ca, rejectUnauthorized: false });
  } catch {
    return new https.Agent({ rejectUnauthorized: false });
  }
}

const httpsAgent = makeHttpsAgent();

function fetchBackend(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: httpsAgent }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Backend ${res.statusCode}`));
        res.resume();
        return;
      }
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => { raw += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error("Invalid JSON from backend")); }
      });
    });
    req.on("error", reject);
    req.setTimeout(6000, () => { req.destroy(new Error("Timeout")); });
  });
}


// ---------------------------------------------------------------------------
// 39개월 평균 생활인구 (living_pop_rate 역산용)
// ---------------------------------------------------------------------------

const DONG_AVG_POPULATION: Record<string, number> = {
  "역삼1동": 52000,
  "역삼2동": 44000,
  "논현1동": 38000,
  "논현2동": 42000,
  "삼성1동": 58000,
  "삼성2동": 46000,
  "신사동": 40000,
  "청담동": 34000,
  "대치4동": 50000,
};

// ---------------------------------------------------------------------------
// Mock fallback profiles
// ---------------------------------------------------------------------------

type DongType = "office" | "mixed" | "entertainment" | "residential";

const DONG_PROFILES: Record<string, { type: DongType; basePop: number; taxiRate: number }> = {
  "역삼1동": { type: "office", basePop: 82000, taxiRate: 0.0028 },
  "역삼2동": { type: "office", basePop: 71000, taxiRate: 0.0025 },
  "논현1동": { type: "mixed", basePop: 48000, taxiRate: 0.0032 },
  "논현2동": { type: "mixed", basePop: 52000, taxiRate: 0.003 },
  "삼성1동": { type: "office", basePop: 94000, taxiRate: 0.0022 },
  "삼성2동": { type: "office", basePop: 63000, taxiRate: 0.0024 },
  "신사동": { type: "entertainment", basePop: 57000, taxiRate: 0.0038 },
  "청담동": { type: "entertainment", basePop: 42000, taxiRate: 0.0042 },
  "대치4동": { type: "residential", basePop: 68000, taxiRate: 0.0018 },
};

const HOUR_PROFILES: Record<DongType, number[]> = {
  office:        [0.08,0.06,0.05,0.05,0.07,0.15, 0.30,0.62,0.86,0.98,1.00,0.97, 0.88,0.94,0.98,0.96,0.90,0.95, 0.82,0.65,0.48,0.36,0.24,0.14],
  mixed:         [0.22,0.18,0.14,0.13,0.14,0.20, 0.32,0.56,0.76,0.88,0.92,0.90, 0.84,0.88,0.90,0.88,0.86,0.92, 0.95,0.90,0.84,0.78,0.66,0.46],
  entertainment: [0.38,0.30,0.22,0.16,0.13,0.12, 0.14,0.20,0.32,0.44,0.58,0.70, 0.78,0.82,0.88,0.93,0.96,1.00, 1.00,0.98,0.94,0.90,0.80,0.60],
  residential:   [0.84,0.80,0.77,0.76,0.78,0.86, 0.94,1.00,0.95,0.86,0.83,0.85, 0.90,0.86,0.83,0.86,0.92,1.00, 0.98,0.94,0.90,0.87,0.85,0.84],
};

const TAXI_HOUR_MULTIPLIERS: number[] = [
  0.55,0.40,0.30,0.28,0.38,0.72,
  1.30,1.85,1.55,1.20,1.00,1.08,
  1.28,1.10,1.02,1.05,1.15,1.68,
  1.90,1.55,1.32,1.42,1.62,1.38,
];

type WeekdayKey = "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday";
const WEEKDAY_FACTORS: Record<WeekdayKey, Record<DongType, number>> = {
  monday:    { office:1.00, mixed:0.90, entertainment:0.68, residential:1.00 },
  tuesday:   { office:1.00, mixed:0.90, entertainment:0.70, residential:1.00 },
  wednesday: { office:1.00, mixed:0.95, entertainment:0.80, residential:1.00 },
  thursday:  { office:1.00, mixed:0.95, entertainment:0.86, residential:1.00 },
  friday:    { office:0.96, mixed:1.00, entertainment:1.12, residential:1.00 },
  saturday:  { office:0.44, mixed:0.90, entertainment:1.32, residential:0.95 },
  sunday:    { office:0.34, mixed:0.84, entertainment:1.22, residential:0.90 },
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

function buildMockPoints(dong: string, date: string, weekday: WeekdayKey) {
  const fallback = DONG_PROFILES["office_fallback"] ?? { type: "office" as DongType, basePop: 60000, taxiRate: 0.0026 };
  const profile = DONG_PROFILES[dong] ?? fallback;
  const hourProfile = HOUR_PROFILES[profile.type];
  const weekdayRow = WEEKDAY_FACTORS[weekday] ?? WEEKDAY_FACTORS.friday;
  const weekdayFactor = weekdayRow[profile.type];
  const rng = makeRng(hashString(dong + ":" + date));

  return Array.from({ length: 24 }, (_, hour) => {
    const popMult = hourProfile[hour]!;
    const popNoise = 0.94 + rng() * 0.12;
    const population_pred = Math.max(100, Math.round(profile.basePop * popMult * weekdayFactor * popNoise));
    const taxiMult = TAXI_HOUR_MULTIPLIERS[hour]!;
    const demandNoise = 0.90 + rng() * 0.20;
    const demand_count = Math.max(1, Math.round(population_pred * profile.taxiRate * taxiMult * demandNoise));
    return { hour, demand_count, population_pred };
  });
}

// ---------------------------------------------------------------------------
// Normalize backend response
// ---------------------------------------------------------------------------

type NormalizedPoint = { hour: number; demand_count: number; population_pred: number };

function normalizeBackendPoints(payload: unknown, dong: string): NormalizedPoint[] | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const raw = Array.isArray(obj["points"]) ? obj["points"]
    : Array.isArray(obj["data"]) ? obj["data"]
    : Array.isArray(payload) ? (payload as unknown[])
    : null;
  if (!raw || !raw.length) return null;

  const avgPop = DONG_AVG_POPULATION[dong] ?? 45000;

  const points = raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const p = item as Record<string, unknown>;
    const hour = Number(p["hour"] ?? p["h"]);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return [];
    const demand_count = Math.max(1, Math.round(
      Number(p["predicted_calls"] ?? p["demand_count"] ?? p["demand"] ?? p["calls"] ?? 0),
    ));
    let population_pred: number;
    if (p["living_pop"] != null)        population_pred = Math.max(100, Math.round(Number(p["living_pop"])));
    else if (p["population_pred"] != null) population_pred = Math.max(100, Math.round(Number(p["population_pred"])));
    else if (p["living_pop_rate"] != null) population_pred = Math.max(100, Math.round(Number(p["living_pop_rate"]) * avgPop));
    else population_pred = 0;
    return [{ hour, demand_count, population_pred }] satisfies NormalizedPoint[];
  });

  if (!points.length) return null;
  return points.sort((a, b) => a.hour - b.hour);
}

// ---------------------------------------------------------------------------
// GET /api/demand
// ---------------------------------------------------------------------------

/** YYYY-MM-DD → YYYYMMDD (백엔드 요구 형식) */
function toBackendDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

/** DailyDemandResponse: { demand: { [dong]: { [hour]: demand_count } } } 파싱 */
function parseDailyResponse(payload: unknown, dong: string): NormalizedPoint[] | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const demand = obj["demand"];
  if (!demand || typeof demand !== "object") return null;
  const dongData = (demand as Record<string, unknown>)[dong];
  if (!dongData || typeof dongData !== "object") return null;

  const points: NormalizedPoint[] = [];
  for (const [hourStr, val] of Object.entries(dongData as Record<string, unknown>)) {
    const hour = Number(hourStr);
    const demand_count = Math.max(1, Math.round(Number(val)));
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isFinite(demand_count)) {
      points.push({ hour, demand_count, population_pred: 0 });
    }
  }
  return points.length ? points.sort((a, b) => a.hour - b.hour) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dong = searchParams.get("dong") ?? "역삼1동";
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const weekday = (searchParams.get("weekday") ?? "friday") as WeekdayKey;
  const hour = searchParams.get("hour") ?? "0";
  const timezone = searchParams.get("timezone") ?? "Asia/Seoul";
  const backendDate = toBackendDate(date); // YYYYMMDD

  try {
    // 1. daily 엔드포인트: date만 필요, 모든 동 반환
    const dailyPayload = await fetchBackend(
      BACKEND_BASE + "/api/demand/daily?date=" + encodeURIComponent(backendDate),
    );
    const dailyPoints = parseDailyResponse(dailyPayload, dong);
    if (dailyPoints && dailyPoints.length > 0) {
      return NextResponse.json({ dong, date, hour: Number(hour), timezone, source: "backend-daily", points: dailyPoints });
    }

    // 2. hourly: dong + date
    const hourlyPayload = await fetchBackend(
      BACKEND_BASE + "/api/demand/hourly?dong=" + encodeURIComponent(dong)
        + "&date=" + encodeURIComponent(backendDate),
    );
    const hourlyPoints = normalizeBackendPoints(hourlyPayload, dong);
    if (hourlyPoints && hourlyPoints.length > 0) {
      return NextResponse.json({ dong, date, hour: Number(hour), timezone, source: "backend-hourly", points: hourlyPoints });
    }

    return NextResponse.json(
      { error: "Backend returned empty response", dong, date },
      { status: 503 },
    );
  } catch (err) {
    const message = (err as Error).message;
    console.error("[/api/demand] Backend error:", message);
    return NextResponse.json(
      { error: "Backend unavailable", reason: message, dong, date },
      { status: 503 },
    );
  }
}
