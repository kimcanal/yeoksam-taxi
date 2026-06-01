import type * as THREE from "three";

type BenchmarkResult = {
  totalFrames: number;
  durationMs: number;
  avgFps: number;
  avgFrameMs: number;
  minFrameMs: number;
  maxFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
};

/**
 * Run a frame-time benchmark for `totalFrames` animation frames.
 * Collects per-frame timing via requestAnimationFrame and reads
 * renderer.info for GPU resource counts at the end.
 *
 * Returns a promise that resolves with the benchmark result and
 * prints a formatted table to the console.
 */
function runBenchmark(
  renderer: THREE.WebGLRenderer,
  totalFrames: number,
): Promise<BenchmarkResult> {
  return new Promise((resolve) => {
    const frameTimes: number[] = [];
    let lastTimestamp = 0;
    let collected = 0;

    const measure = (timestamp: number) => {
      if (lastTimestamp > 0) {
        frameTimes.push(timestamp - lastTimestamp);
        collected += 1;
      }
      lastTimestamp = timestamp;

      if (collected < totalFrames) {
        requestAnimationFrame(measure);
        return;
      }

      // Compute stats
      frameTimes.sort((a, b) => a - b);
      const totalMs = frameTimes.reduce((sum, t) => sum + t, 0);
      const p95Index = Math.floor(frameTimes.length * 0.95);
      const p99Index = Math.floor(frameTimes.length * 0.99);

      const result: BenchmarkResult = {
        totalFrames,
        durationMs: Math.round(totalMs),
        avgFps: Math.round((totalFrames / totalMs) * 1000),
        avgFrameMs: Math.round((totalMs / totalFrames) * 100) / 100,
        minFrameMs: Math.round(frameTimes[0] * 100) / 100,
        maxFrameMs:
          Math.round(frameTimes[frameTimes.length - 1] * 100) / 100,
        p95FrameMs: Math.round(frameTimes[p95Index] * 100) / 100,
        p99FrameMs: Math.round(frameTimes[p99Index] * 100) / 100,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };

      // eslint-disable-next-line no-console
      console.table({
        "Avg FPS": result.avgFps,
        "Avg Frame (ms)": result.avgFrameMs,
        "Min Frame (ms)": result.minFrameMs,
        "Max Frame (ms)": result.maxFrameMs,
        "P95 Frame (ms)": result.p95FrameMs,
        "P99 Frame (ms)": result.p99FrameMs,
        "Duration (ms)": result.durationMs,
        "Frames": result.totalFrames,
        "Draw Calls": result.drawCalls,
        "Triangles": result.triangles,
        "Geometries": result.geometries,
        "Textures": result.textures,
      });

      resolve(result);
    };

    // eslint-disable-next-line no-console
    console.log(
      `[PerfBenchmark] Starting ${totalFrames}-frame benchmark…`,
    );
    requestAnimationFrame(measure);
  });
}

// Extend the global Window to allow the benchmark helper
declare global {
  interface Window {
    __runPerfBenchmark?: (frames?: number) => Promise<BenchmarkResult>;
  }
}

/**
 * Install the `window.__runPerfBenchmark(frames?)` global helper.
 * Call from the browser console:
 *
 *     await window.__runPerfBenchmark(300)
 *
 * Returns a cleanup function that removes the global.
 */
export function initPerfBenchmark(renderer: THREE.WebGLRenderer): () => void {
  window.__runPerfBenchmark = (frames = 300) =>
    runBenchmark(renderer, frames);

  return () => {
    delete window.__runPerfBenchmark;
  };
}

/**
 * Remove the global helper (called during engine cleanup).
 * This is a no-op if initPerfBenchmark was never called.
 */
export function disposePerfBenchmark(): void {
  delete window.__runPerfBenchmark;
}
