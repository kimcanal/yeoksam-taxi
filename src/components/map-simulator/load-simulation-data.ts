import type { SimulationData } from "@/components/map-simulator/core";
import { deserializeSimulationData } from "@/components/map-simulator/simulation-data-serialization";

type LoadSimulationDataOptions = {
  onAssetProgress?: (loaded: number, total: number) => void;
  onStageChange?: (detail: string, progress: number) => void;
};

type WorkerMessage =
  | { type: "asset-progress"; loaded: number; total: number }
  | { type: "stage"; detail: string; progress: number }
  | { type: "done"; data: Parameters<typeof deserializeSimulationData>[0] }
  | { type: "error"; message: string };

export async function loadSimulationData({
  onAssetProgress,
  onStageChange,
}: LoadSimulationDataOptions = {}): Promise<SimulationData> {
  return new Promise<SimulationData>((resolve, reject) => {
    const worker = new Worker(
      new URL("./load-simulation-data.worker.ts", import.meta.url),
      { type: "module" },
    );

    const cleanup = () => {
      worker.terminate();
    };

    worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      switch (message.type) {
        case "asset-progress":
          onAssetProgress?.(message.loaded, message.total);
          break;
        case "stage":
          onStageChange?.(message.detail, message.progress);
          break;
        case "done":
          cleanup();
          resolve(deserializeSimulationData(message.data));
          break;
        case "error":
          cleanup();
          reject(new Error(message.message));
          break;
        default:
          break;
      }
    });

    worker.addEventListener("error", (error) => {
      cleanup();
      reject(error);
    });

    worker.postMessage({ type: "load" });
  });
}
