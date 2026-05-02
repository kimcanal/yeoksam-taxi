"use client";

import { useEffect, useState } from "react";
import type { ForecastResult } from "./forecast-contract";

const POLL_INTERVAL_MS = 60_000;

/**
 * Polls /forecast/latest.json once a minute.
 * Returns null when the file is absent, empty, or unparseable (sample mode).
 */
export function useForecastResult(): ForecastResult | null {
  const [result, setResult] = useState<ForecastResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/forecast/latest.json", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as ForecastResult | null;
        if (!cancelled && Array.isArray(json?.regions) && json.regions.length > 0) {
          setResult(json);
        }
      } catch {
        // file absent or malformed — stay in sample mode
      }
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return result;
}
