"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

export interface DispatchDecision {
  dong_name: string;
  predicted_demand_score: number;
  supply_proxy_score: number;
  imbalance_score: number;
  action: string;
  action_level: "high" | "medium" | "watch" | "low" | string;
  coverage_units?: number;
  recommended_taxis?: number;
  incentive_multiplier: number;
  congestion_score: number | null;
  avg_speed_kmh: number | null;
  link_count?: number;
}

export interface DispatchPlan {
  generated_at: string;
  forecast_target_datetime: string;
  forecast_strategy: "pattern" | "exact" | string | null;
  decisions: DispatchDecision[];
}

/**
 * Polls /dispatch-plan.json once a minute.
 * Returns null when the dispatch plan is absent or malformed.
 */
export function useDispatchPlan(): DispatchPlan | null {
  const [plan, setPlan] = useState<DispatchPlan | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/dispatch-plan.json", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setPlan(null);
          return;
        }
        const json = (await res.json()) as DispatchPlan | null;
        if (!cancelled && Array.isArray(json?.decisions) && json.decisions.length > 0) {
          setPlan(json);
        } else if (!cancelled) {
          setPlan(null);
        }
      } catch {
        if (!cancelled) setPlan(null);
      }
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return plan;
}
