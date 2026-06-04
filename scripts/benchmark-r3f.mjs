import { chromium } from "playwright";

const baseUrl = process.env.BENCHMARK_BASE_URL ?? "http://localhost:8000";
const sampleMs = Number(process.env.BENCHMARK_SAMPLE_MS ?? 5000);
const viewport = { width: 1440, height: 900 };
const caseTimeoutMs = 60_000;

function parseLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function nextValue(lines, label) {
  const index = lines.findIndex(
    (line) => line.toLowerCase() === label.toLowerCase(),
  );
  return index >= 0 ? lines[index + 1] ?? null : null;
}

async function measureRaf(page, durationMs = sampleMs) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const intervals = [];
        let first = 0;
        let previous = 0;
        let frames = 0;

        function frame(timestamp) {
          if (!first) {
            first = timestamp;
            previous = timestamp;
          } else {
            intervals.push(timestamp - previous);
            previous = timestamp;
          }
          frames += 1;

          if (timestamp - first < duration) {
            requestAnimationFrame(frame);
            return;
          }

          const elapsed = timestamp - first;
          const sorted = [...intervals].sort((a, b) => a - b);
          const percentile = (p) => {
            if (!sorted.length) return 0;
            const index = Math.min(
              sorted.length - 1,
              Math.floor(sorted.length * p),
            );
            return sorted[index];
          };

          resolve({
            avgFrameMs:
              Math.round(
                (intervals.reduce((sum, value) => sum + value, 0) /
                  Math.max(intervals.length, 1)) *
                  100,
              ) / 100,
            elapsedMs: Math.round(elapsed),
            fps: Math.round((frames / (elapsed / 1000)) * 10) / 10,
            frames,
            p50FrameMs: Math.round(percentile(0.5) * 100) / 100,
            p95FrameMs: Math.round(percentile(0.95) * 100) / 100,
          });
        }

        requestAnimationFrame(frame);
      }),
    durationMs,
  );
}

async function readMainHud(page) {
  const text = await page.evaluate(() => document.body.innerText);
  const lines = parseLines(text);
  return {
    buildChunks: nextValue(lines, "build chunks"),
    cap: lines.find((line) => /FPS$/.test(line)) ?? null,
    renderMs: nextValue(lines, "render"),
    roadChunks: nextValue(lines, "road chunks"),
    vehicles: nextValue(lines, "vehicles"),
  };
}

async function readR3fHud(page) {
  return page.evaluate(() => {
    const metrics = new Map(
      [...document.querySelectorAll("[data-benchmark-metric]")].map((node) => [
        node.getAttribute("data-benchmark-metric") ?? "",
        node.querySelector("[data-benchmark-value]")?.textContent?.trim() ??
          null,
      ]),
    );
    return {
      buildChunks: metrics.get("build chunks") ?? null,
      drawCalls: metrics.get("draw calls") ?? null,
      memory: metrics.get("memory") ?? null,
      roadChunks: metrics.get("road chunks") ?? null,
      triangles: metrics.get("triangles") ?? null,
      vehicles: metrics.get("vehicles") ?? null,
    };
  });
}

async function waitForR3fReady(page) {
  await page.waitForSelector("canvas", { timeout: 45_000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("R3F 벤치마크 준비 완료"),
    { timeout: 45_000 },
  );
  await page.waitForFunction(
    () => {
      const match = document.body.innerText.match(/DRAW CALLS\s+(\d+)/i);
      return match && Number(match[1]) > 0;
    },
    { timeout: 45_000 },
  );
}

async function runMain(page) {
  await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForSelector("canvas", { timeout: 45_000 });
  await page.getByLabel("렌더링 지표 보기").click({ timeout: 45_000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("Render HUD"),
    { timeout: 45_000 },
  );
  await page.waitForTimeout(2000);
  return {
    hud: await readMainHud(page),
    raf: await measureRaf(page),
  };
}

async function runR3f(page, label, configure) {
  await page.goto(`${baseUrl}/r3f-perf-test`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await waitForR3fReady(page);

  if (configure) {
    await configure(page);
    await page.waitForTimeout(1500);
  }

  return {
    hud: await readR3fHud(page),
    label,
    raf: await measureRaf(page),
  };
}

async function runWithTimeout(label, work, timeoutMs = caseTimeoutMs) {
  let timeoutId;
  return Promise.race([
    work(),
    new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timeoutId));
}

async function runCase(browser, label, work) {
  console.log(`[benchmark] ${label} 시작`);
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.log(`[browser-error:${label}]`, message.text());
    }
  });

  try {
    const result = await runWithTimeout(label, () => work(page));
    console.log(`[benchmark] ${label} 완료`);
    return {
      label,
      ok: true,
      ...result,
    };
  } catch (error) {
    console.log(`[benchmark] ${label} 실패: ${error.message}`);
    return {
      error: error.message,
      label,
      ok: false,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

const browser = await chromium.launch({ headless: true });

try {
  const results = [
    await runCase(browser, "main-three-direct", runMain),
    await runCase(browser, "r3f-culling-on-420", (page) =>
      runR3f(page, "r3f-culling-on-420", null),
    ),
    await runCase(browser, "r3f-culling-off-420", (page) =>
      runR3f(page, "r3f-culling-off-420", async (benchmarkPage) => {
        await benchmarkPage.getByRole("button", { name: "Culling ON" }).click();
        await benchmarkPage.waitForFunction(() =>
          document.body.innerText.includes("Culling OFF"),
        );
      }),
    ),
    await runCase(browser, "r3f-culling-on-1200", (page) =>
      runR3f(page, "r3f-culling-on-1200", async (benchmarkPage) => {
        await benchmarkPage
          .locator('input[aria-label="R3F 차량 인스턴스 수"]')
          .evaluate((input) => {
            const descriptor = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value",
            );
            descriptor?.set?.call(input, "1200");
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
      }),
    ),
  ];

  console.log(JSON.stringify({ baseUrl, sampleMs, viewport, results }, null, 2));
} finally {
  await browser.close();
}
