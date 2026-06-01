import type { SimulationData } from "@/components/map-simulator/types";
import { deserializeSimulationData } from "@/components/map-simulator/simulation";

type LoadSimulationDataOptions = {
  signal?: AbortSignal;
  onAssetProgress?: (loaded: number, total: number) => void;
  onStageChange?: (detail: string, progress: number) => void;
};

type WorkerMessage =
  | { type: "asset-progress"; loaded: number; total: number }
  | { type: "stage"; detail: string; progress: number }
  | { type: "done"; data: Parameters<typeof deserializeSimulationData>[0] }
  | { type: "error"; message: string };

export async function loadSimulationData({
  signal,
  onAssetProgress,
  onStageChange,
}: LoadSimulationDataOptions = {}): Promise<SimulationData> {
  return new Promise<SimulationData>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Simulation data load aborted.", "AbortError"));
      return;
    }

    const worker = new Worker(
      new URL("./load-simulation-data.worker.ts", import.meta.url),
      { type: "module" },
    );

    let settled = false;
    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };
    const resolveOnce = (data: SimulationData) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(data);
    };
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => {
      rejectOnce(new DOMException("Simulation data load aborted.", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
      if (settled) {
        return;
      }
      const message = event.data;
      switch (message.type) {
        case "asset-progress":
          onAssetProgress?.(message.loaded, message.total);
          break;
        case "stage":
          onStageChange?.(message.detail, message.progress);
          break;
        case "done":
          resolveOnce(deserializeSimulationData(message.data));
          break;
        case "error":
          rejectOnce(new Error(message.message));
          break;
        default:
          break;
      }
    });

    worker.addEventListener("error", (error) => {
      rejectOnce(error);
    });

    worker.postMessage({ type: "load" });
  });
}
