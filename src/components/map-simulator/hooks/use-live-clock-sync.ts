import { useEffect, useRef } from "react";
import type { CircumstanceMode } from "@/components/map-simulator/types";
import { currentSimulationClock } from "@/components/map-simulator/environment";

const ONE_HOUR_MS = 60 * 60 * 1000;

function millisecondsUntilNextHour(date = new Date()) {
  const elapsedInHourMs =
    date.getMinutes() * 60_000 +
    date.getSeconds() * 1000 +
    date.getMilliseconds();

  return Math.max(1000, ONE_HOUR_MS - elapsedInHourMs + 250);
}

type LiveClockSyncParams = {
  initialMode: CircumstanceMode;
  circumstanceMode: CircumstanceMode;
  setCircumstanceMode: (mode: CircumstanceMode) => void;
  setSimulationDate: (date: string) => void;
  setSimulationTimeMinutes: (minutes: number) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
};

export function useLiveClockSync({
  initialMode,
  circumstanceMode,
  setCircumstanceMode,
  setSimulationDate,
  setSimulationTimeMinutes,
  setIsSidebarCollapsed,
}: LiveClockSyncParams) {
  const appliedInitialModeRef = useRef<CircumstanceMode | null>(null);

  useEffect(() => {
    if (appliedInitialModeRef.current === initialMode) {
      return;
    }
    appliedInitialModeRef.current = initialMode;

    if (initialMode === "live") {
      const clock = currentSimulationClock();
      setSimulationDate(clock.dateIso);
      setSimulationTimeMinutes(clock.minutes);
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
    setCircumstanceMode(initialMode);
  }, [
    initialMode,
    setCircumstanceMode,
    setIsSidebarCollapsed,
    setSimulationDate,
    setSimulationTimeMinutes,
  ]);

  useEffect(() => {
    if (circumstanceMode !== "live") {
      return;
    }

    function syncCurrentClock() {
      const clock = currentSimulationClock();
      setSimulationDate(clock.dateIso);
      setSimulationTimeMinutes(clock.minutes);
    }

    let timeoutId: number | undefined;
    function scheduleNextHourSync() {
      timeoutId = window.setTimeout(() => {
        syncCurrentClock();
        scheduleNextHourSync();
      }, millisecondsUntilNextHour());
    }

    syncCurrentClock();
    scheduleNextHourSync();
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    circumstanceMode,
    setSimulationDate,
    setSimulationTimeMinutes,
  ]);
}
