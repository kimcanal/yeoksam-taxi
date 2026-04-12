import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3210;
const DEFAULT_VIEWPORT = { width: 1440, height: 960 };
const DEFAULT_OUTPUT_DIR = path.join(projectRoot, "docs", "reports", "soak");
const DEFAULT_SOAK_MINUTES = 2;
const DEFAULT_DWELL_MS = 2_500;
const READY_TIMEOUT_MS = 45_000;
const DEFAULT_SLOW_READY_THRESHOLD_MS = 8_000;

function normalizeText(value) {
  return value?.replace(/\s+/g, " ").trim() ?? null;
}

function parseArgs(argv) {
  const options = {
    skipBuild: false,
    outputDir: DEFAULT_OUTPUT_DIR,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    minutes: DEFAULT_SOAK_MINUTES,
    dwellMs: DEFAULT_DWELL_MS,
    slowReadyThresholdMs: DEFAULT_SLOW_READY_THRESHOLD_MS,
    maxInitialReadyMs: null,
    maxAverageReadyMs: null,
    maxReadyMs: null,
    maxSlowEvents: null,
    maxMemoryMb: null,
    maxWarnings: null,
    requireFpsOverlay: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--skip-build") {
      options.skipBuild = true;
      continue;
    }

    if (argument === "--output-dir") {
      options.outputDir = path.resolve(projectRoot, argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (argument === "--port") {
      options.port = Number(argv[index + 1] ?? DEFAULT_PORT);
      index += 1;
      continue;
    }

    if (argument === "--host") {
      options.host = argv[index + 1] ?? DEFAULT_HOST;
      index += 1;
      continue;
    }

    if (argument === "--minutes") {
      options.minutes = Number(argv[index + 1] ?? DEFAULT_SOAK_MINUTES);
      index += 1;
      continue;
    }

    if (argument === "--dwell-ms") {
      options.dwellMs = Number(argv[index + 1] ?? DEFAULT_DWELL_MS);
      index += 1;
      continue;
    }

    if (argument === "--slow-ready-threshold-ms") {
      options.slowReadyThresholdMs = Number(
        argv[index + 1] ?? DEFAULT_SLOW_READY_THRESHOLD_MS,
      );
      index += 1;
      continue;
    }

    if (argument === "--max-initial-ready-ms") {
      options.maxInitialReadyMs = Number(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (argument === "--max-average-ready-ms") {
      options.maxAverageReadyMs = Number(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (argument === "--max-ready-ms") {
      options.maxReadyMs = Number(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (argument === "--max-slow-events") {
      options.maxSlowEvents = Number(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (argument === "--max-memory-mb") {
      options.maxMemoryMb = Number(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (argument === "--max-warnings") {
      options.maxWarnings = Number(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (argument === "--require-fps-overlay") {
      options.requireFpsOverlay = true;
    }
  }

  return options;
}

function formatThresholdFailure(label, actual, limit, unit = "") {
  const suffix = unit ? ` ${unit}` : "";
  return `${label}: ${actual}${suffix} > ${limit}${suffix}`;
}

function runCommand(command, args, { cwd = projectRoot, env, stdio = "inherit" } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function waitForServer(baseUrl, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Server is still starting up.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function isPortAvailable(host, port) {
  return new Promise((resolve) => {
    const probe = net.createServer();

    probe.once("error", () => resolve(false));
    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });

    probe.listen(port, host);
  });
}

async function findAvailablePort(host, startPort, attempts = 10) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(host, candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find an open port near ${host}:${startPort} for soak testing`,
  );
}

async function stopServer(child) {
  if (!child || child.killed) {
    return;
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5_000);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    child.kill("SIGINT");
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const statusNode = document.querySelector("[data-scene-status]");
    const fpsNode = document.querySelector('[data-ui-panel="fps-overlay"]');
    const fpsText = fpsNode ? fpsNode.textContent : null;
    const memory = "memory" in performance
      ? performance.memory?.usedJSHeapSize ?? null
      : null;

    return {
      sceneStatus: statusNode?.getAttribute("data-scene-status") ?? null,
      statusText: statusNode?.textContent ?? null,
      fpsVisible: Boolean(fpsNode),
      fpsText,
      usedJsHeapMb:
        typeof memory === "number" ? Math.round((memory / 1024 / 1024) * 10) / 10 : null,
    };
  });
}

async function waitForReady(
  page,
  label,
  startedAt = Date.now(),
  timeoutMs = READY_TIMEOUT_MS,
) {
  await page.waitForFunction(
    () =>
      document.querySelector("[data-scene-status]")?.getAttribute(
        "data-scene-status",
      ) === "ready",
    undefined,
    { timeout: timeoutMs },
  );
  const state = await readState(page);
  return {
    label,
    readyMs: Date.now() - startedAt,
    sceneStatus: state.sceneStatus,
    statusText: normalizeText(state.statusText),
    fpsVisible: state.fpsVisible,
    fpsText: normalizeText(state.fpsText),
    usedJsHeapMb: state.usedJsHeapMb,
  };
}

async function waitForRenderTransition(page, previousState, timeoutMs = 1_200) {
  try {
    await page.waitForFunction(
      ({ sceneStatus, statusText }) => {
        const statusNode = document.querySelector("[data-scene-status]");
        const nextSceneStatus =
          statusNode?.getAttribute("data-scene-status") ?? null;
        const nextStatusText = statusNode?.textContent ?? null;
        return (
          nextSceneStatus !== sceneStatus ||
          nextSceneStatus !== "ready" ||
          nextStatusText !== statusText
        );
      },
      {
        sceneStatus: previousState?.sceneStatus ?? null,
        statusText: previousState?.statusText ?? null,
      },
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}

async function setRangeValue(page, selector, value) {
  await page.locator(selector).first().evaluate((element, nextValue) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );
    descriptor?.set?.call(element, String(nextValue));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function applyScenario(page, scenarioId) {
  const button = page.locator(`[data-local-scenario-button="${scenarioId}"]`);
  await button.click();
  await page.waitForFunction(
    (targetScenarioId) =>
      document
        .querySelector(`[data-local-scenario-button="${targetScenarioId}"]`)
        ?.getAttribute("data-selected") === "true",
    scenarioId,
    { timeout: 20_000 },
  );
}

function actionPlan() {
  return [
    {
      id: "baseline",
      label: "기본 시연",
      perform: (page) => applyScenario(page, "baseline"),
    },
    {
      id: "gangnam-peak",
      label: "강남역 퇴근 피크",
      perform: (page) => applyScenario(page, "gangnam-peak"),
    },
    {
      id: "rainy-evening",
      label: "우천 혼잡",
      perform: (page) => applyScenario(page, "rainy-evening"),
    },
    {
      id: "late-night",
      label: "심야 순환",
      perform: (page) => applyScenario(page, "late-night"),
    },
    {
      id: "density-peak",
      label: "밀도 증가",
      perform: async (page) => {
        await setRangeValue(page, 'input[aria-label="택시 밀도"]', 24);
        await setRangeValue(page, 'input[aria-label="일반 차량 밀도"]', 32);
      },
    },
    {
      id: "density-reset",
      label: "밀도 기본값 복귀",
      perform: async (page) => {
        await setRangeValue(page, 'input[aria-label="택시 밀도"]', 12);
        await setRangeValue(page, 'input[aria-label="일반 차량 밀도"]', 16);
      },
    },
    {
      id: "specific-mode",
      label: "특정 시각 전환",
      perform: async (page) => {
        await page.getByRole("button", { name: "특정 시각" }).click();
        await setRangeValue(page, 'input[aria-label="시뮬레이션 시간"]', 1140);
      },
    },
    {
      id: "weather-snow",
      label: "폭설 날씨",
      perform: (page) => page.getByRole("button", { name: "폭설" }).click(),
    },
    {
      id: "weather-clear",
      label: "맑음 날씨",
      perform: (page) => page.getByRole("button", { name: "맑음" }).click(),
    },
    {
      id: "live-mode",
      label: "실시간 모드 복귀",
      perform: (page) => page.getByRole("button", { name: "실시간" }).click(),
    },
  ];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const port = await findAvailablePort(options.host, options.port);
  const baseUrl = `http://${options.host}:${port}`;
  const soakDurationMs = Math.max(15_000, Math.round(options.minutes * 60_000));
  const startedAtIso = new Date().toISOString();
  const timestampSlug = startedAtIso.replace(/[:.]/g, "-");

  console.log("yeoksam-taxi simulator soak test");
  console.log(`Output directory: ${options.outputDir}`);
  console.log(`Target duration: ${Math.round(soakDurationMs / 1000)}s`);
  if (port !== options.port) {
    console.log(
      `Port ${options.port} was busy, using ${port} for this soak run.`,
    );
  }

  await mkdir(options.outputDir, { recursive: true });

  if (!options.skipBuild) {
    console.log("Building production app...");
    await runCommand("npm", ["run", "build"]);
  }

  const server = spawn(
    "npm",
    ["run", "start", "--", "--hostname", options.host, "--port", String(port)],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  const errors = [];
  const warnings = [];
  const results = [];
  let browser;

  try {
    await waitForServer(baseUrl);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: DEFAULT_VIEWPORT,
      deviceScaleFactor: 1,
    });

    page.on("pageerror", (error) => {
      errors.push(`pageerror: ${error.message}`);
    });
    page.on("requestfailed", (request) => {
      errors.push(
        `requestfailed: ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
      );
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`console:error: ${message.text()}`);
      } else if (message.type() === "warning") {
        warnings.push(message.text());
      }
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const initialReady = await waitForReady(page, "initial");
    results.push(initialReady);
    console.log(`Initial ready in ${initialReady.readyMs} ms`);

    await page.keyboard.press("KeyF");
    await page.waitForTimeout(300);
    const fpsState = await readState(page);
    if (!fpsState.fpsVisible) {
      warnings.push("FPS overlay did not become visible after KeyF toggle");
    }

    const soakStartedAt = Date.now();
    let cycle = 0;
    const actions = actionPlan();

    while (Date.now() - soakStartedAt < soakDurationMs) {
      cycle += 1;
      for (const action of actions) {
        if (Date.now() - soakStartedAt >= soakDurationMs) {
          break;
        }

        const actionStartedAt = Date.now();
        const previousState = await readState(page);
        await action.perform(page);
        await waitForRenderTransition(page, previousState);
        const ready = await waitForReady(
          page,
          `${cycle}:${action.id}`,
          actionStartedAt,
        );
        results.push({
          ...ready,
          cycle,
          actionId: action.id,
          actionLabel: action.label,
        });
        console.log(
          `Cycle ${cycle} / ${action.label}: ready in ${ready.readyMs} ms`,
        );
        await page.waitForTimeout(options.dwellMs);
      }
    }

    const finalState = await readState(page);
    const finalScreenshotPath = path.join(
      options.outputDir,
      `soak-${timestampSlug}.png`,
    );
    await page.screenshot({
      path: finalScreenshotPath,
      fullPage: false,
    });

    const readyDurations = results.map((entry) => entry.readyMs);
    const averageReadyMs = readyDurations.length
      ? Math.round(
        readyDurations.reduce((sum, value) => sum + value, 0) /
          readyDurations.length,
      )
      : 0;
    const maxReadyMs = readyDurations.length
      ? Math.max(...readyDurations)
      : 0;
    const slowEvents = results.filter(
      (entry) => entry.readyMs >= options.slowReadyThresholdMs,
    ).length;
    const thresholdFailures = [];
    const thresholdNotes = [];

    if (
      typeof options.maxInitialReadyMs === "number" &&
      Number.isFinite(options.maxInitialReadyMs) &&
      initialReady.readyMs > options.maxInitialReadyMs
    ) {
      thresholdFailures.push(
        formatThresholdFailure(
          "initial ready",
          initialReady.readyMs,
          options.maxInitialReadyMs,
          "ms",
        ),
      );
    }

    if (
      typeof options.maxAverageReadyMs === "number" &&
      Number.isFinite(options.maxAverageReadyMs) &&
      averageReadyMs > options.maxAverageReadyMs
    ) {
      thresholdFailures.push(
        formatThresholdFailure(
          "average ready",
          averageReadyMs,
          options.maxAverageReadyMs,
          "ms",
        ),
      );
    }

    if (
      typeof options.maxReadyMs === "number" &&
      Number.isFinite(options.maxReadyMs) &&
      maxReadyMs > options.maxReadyMs
    ) {
      thresholdFailures.push(
        formatThresholdFailure(
          "max ready",
          maxReadyMs,
          options.maxReadyMs,
          "ms",
        ),
      );
    }

    if (
      typeof options.maxSlowEvents === "number" &&
      Number.isFinite(options.maxSlowEvents) &&
      slowEvents > options.maxSlowEvents
    ) {
      thresholdFailures.push(
        formatThresholdFailure(
          "slow events",
          slowEvents,
          options.maxSlowEvents,
        ),
      );
    }

    if (
      typeof options.maxWarnings === "number" &&
      Number.isFinite(options.maxWarnings) &&
      warnings.length > options.maxWarnings
    ) {
      thresholdFailures.push(
        formatThresholdFailure(
          "warnings",
          warnings.length,
          options.maxWarnings,
        ),
      );
    }

    if (options.requireFpsOverlay && !finalState.fpsVisible) {
      thresholdFailures.push("fps overlay was not visible after KeyF toggle");
    }

    if (
      typeof options.maxMemoryMb === "number" &&
      Number.isFinite(options.maxMemoryMb)
    ) {
      if (typeof finalState.usedJsHeapMb === "number") {
        if (finalState.usedJsHeapMb > options.maxMemoryMb) {
          thresholdFailures.push(
            formatThresholdFailure(
              "used JS heap",
              finalState.usedJsHeapMb,
              options.maxMemoryMb,
              "MB",
            ),
          );
        }
      } else {
        thresholdNotes.push("used JS heap metric unavailable; skipped memory threshold");
      }
    }

    const report = {
      startedAt: startedAtIso,
      finishedAt: new Date().toISOString(),
      baseUrl,
      durationSeconds: Math.round((Date.now() - soakStartedAt) / 1000),
      configuredMinutes: options.minutes,
      initialReadyMs: initialReady.readyMs,
      actionsRun: results.length,
      cyclesCompleted: cycle,
      averageReadyMs,
      maxReadyMs,
      slowEventCount: slowEvents,
      slowThresholdMs: options.slowReadyThresholdMs,
      errors,
      warnings,
      thresholdNotes,
      thresholds: {
        maxInitialReadyMs: options.maxInitialReadyMs,
        maxAverageReadyMs: options.maxAverageReadyMs,
        maxReadyMs: options.maxReadyMs,
        maxSlowEvents: options.maxSlowEvents,
        maxMemoryMb: options.maxMemoryMb,
        maxWarnings: options.maxWarnings,
        requireFpsOverlay: options.requireFpsOverlay,
      },
      assertions: {
        passed: thresholdFailures.length === 0,
        failures: thresholdFailures,
      },
      finalState: {
        sceneStatus: finalState.sceneStatus,
        statusText: normalizeText(finalState.statusText),
        fpsVisible: finalState.fpsVisible,
        fpsText: normalizeText(finalState.fpsText),
        usedJsHeapMb: finalState.usedJsHeapMb,
      },
      results,
      artifacts: {
        screenshot: path.relative(projectRoot, finalScreenshotPath),
      },
    };

    const reportPath = path.join(
      options.outputDir,
      `soak-${timestampSlug}.json`,
    );
    const latestReportPath = path.join(options.outputDir, "latest.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(latestReportPath, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`Saved ${path.relative(projectRoot, reportPath)}`);
    console.log(`Saved ${path.relative(projectRoot, finalScreenshotPath)}`);
    console.log(
      `Ready summary: initial ${initialReady.readyMs} ms, avg ${averageReadyMs} ms, max ${maxReadyMs} ms`,
    );

    if (errors.length) {
      throw new Error(`Soak test captured ${errors.length} browser/runtime errors`);
    }
    if (thresholdFailures.length) {
      throw new Error(
        `Soak test assertions failed:\n- ${thresholdFailures.join("\n- ")}`,
      );
    }
  } catch (error) {
    if (browser) {
      try {
        const failurePage = (await browser.contexts()[0]?.pages()?.[0]) ?? null;
        if (failurePage) {
          const failureShot = path.join(options.outputDir, "soak-failure.png");
          await failurePage.screenshot({ path: failureShot, fullPage: false });
          console.log(`Saved ${path.relative(projectRoot, failureShot)}`);
        }
      } catch {
        // Ignore screenshot failures during cleanup.
      }
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }

    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
