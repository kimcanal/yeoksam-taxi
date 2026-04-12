import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3200;
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
const DEFAULT_OUTPUT_DIR = path.join(
  projectRoot,
  "docs",
  "screenshots",
  "local-scenarios",
);
const SCENARIOS = [
  {
    id: "baseline",
    fileName: "scenario-baseline-demo.png",
    label: "기본 시연",
    summary: "9개 동 OSM 공간 레이어를 가장 중립적으로 소개하는 기준 장면",
  },
  {
    id: "gangnam-peak",
    fileName: "scenario-gangnam-station-peak.png",
    label: "강남역 퇴근 피크",
    summary: "강남역 퇴근 시간대의 혼잡한 도로 점유와 택시 대응 장면",
  },
  {
    id: "rainy-evening",
    fileName: "scenario-rainy-evening.png",
    label: "우천 혼잡",
    summary: "우천 조건에서 시야와 흐름 밀도가 함께 무거워지는 저녁 장면",
  },
  {
    id: "late-night",
    fileName: "scenario-late-night-loop.png",
    label: "심야 순환",
    summary: "일반 교통이 줄어든 뒤 택시 순환성이 또렷해지는 안정 장면",
  },
];

async function installCaptureChrome(page, scenario) {
  await page.evaluate((scenarioMeta) => {
    document.getElementById("scenario-capture-style")?.remove();
    document.getElementById("scenario-capture-overlay")?.remove();

    const style = document.createElement("style");
    style.id = "scenario-capture-style";
    style.textContent = `
      [data-ui-panel] {
        display: none !important;
      }

      [data-label-kind] {
        display: none !important;
      }
    `;
    document.head.append(style);

    const overlay = document.createElement("div");
    overlay.id = "scenario-capture-overlay";
    overlay.innerHTML = `
      <div style="font-size:12px; letter-spacing:0.26em; text-transform:uppercase; color:rgba(151, 234, 255, 0.82);">
        A-Eye Module 1
      </div>
      <div style="margin-top:10px; font-size:34px; font-weight:700; line-height:1.15; color:#f8fbff;">
        ${scenarioMeta.label}
      </div>
      <div style="margin-top:10px; max-width:520px; font-size:14px; line-height:1.6; color:rgba(224, 232, 255, 0.84);">
        ${scenarioMeta.summary}
      </div>
    `;
    Object.assign(overlay.style, {
      position: "fixed",
      left: "28px",
      top: "28px",
      zIndex: "50",
      width: "min(560px, calc(100vw - 56px))",
      padding: "18px 22px",
      borderRadius: "26px",
      border: "1px solid rgba(255,255,255,0.1)",
      background:
        "linear-gradient(180deg, rgba(5,12,22,0.86), rgba(5,12,22,0.62))",
      boxShadow: "0 22px 60px rgba(0, 0, 0, 0.34)",
      backdropFilter: "blur(18px)",
      pointerEvents: "none",
    });
    document.body.append(overlay);
  }, scenario);
}

async function removeCaptureChrome(page) {
  await page.evaluate(() => {
    document.getElementById("scenario-capture-style")?.remove();
    document.getElementById("scenario-capture-overlay")?.remove();
  });
}

function parseArgs(argv) {
  const options = {
    skipBuild: false,
    outputDir: DEFAULT_OUTPUT_DIR,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
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
    }
  }

  return options;
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
    `Could not find an open port near ${host}:${startPort} for screenshots`,
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const port = await findAvailablePort(options.host, options.port);
  const baseUrl = `http://${options.host}:${port}`;

  console.log("yeoksam-taxi scenario screenshot capture");
  console.log(`Output directory: ${options.outputDir}`);
  if (port !== options.port) {
    console.log(
      `Port ${options.port} was busy, using ${port} for this capture run.`,
    );
  }

  await mkdir(options.outputDir, { recursive: true });

  if (!options.skipBuild) {
    console.log("Building production app...");
    await runCommand("npm", ["run", "build"]);
  }

  console.log(`Starting Next.js server on ${baseUrl} ...`);
  const server = spawn(
    "npm",
    ["run", "start", "--", "--hostname", options.host, "--port", String(port)],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  let browser;

  try {
    await waitForServer(baseUrl);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: DEFAULT_VIEWPORT,
      deviceScaleFactor: 1,
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        document.querySelector("[data-scene-status]")?.getAttribute(
          "data-scene-status",
        ) === "ready",
      undefined,
      { timeout: 60_000 },
    );
    await page.evaluate(async () => {
      if ("fonts" in document) {
        await document.fonts.ready;
      }
    });
    await page.waitForTimeout(1_200);

    for (const scenario of SCENARIOS) {
      console.log(`Applying scenario: ${scenario.id}`);
      const button = page.locator(
        `[data-local-scenario-button="${scenario.id}"]`,
      );
      const startedAt = Date.now();

      await button.click();
      await page.waitForFunction(
        (scenarioId) =>
          document
            .querySelector(`[data-local-scenario-button="${scenarioId}"]`)
            ?.getAttribute("data-selected") === "true",
        scenario.id,
        { timeout: 20_000 },
      );
      await page.waitForFunction(
        () =>
          document.querySelector("[data-scene-status]")?.getAttribute(
            "data-scene-status",
          ) === "ready",
        undefined,
        { timeout: 60_000 },
      );
      console.log(`Scene ready in ${Date.now() - startedAt} ms`);
      await page.waitForTimeout(1_400);
      await installCaptureChrome(page, scenario);
      await page.waitForTimeout(350);

      const screenshotPath = path.join(options.outputDir, scenario.fileName);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });
      await removeCaptureChrome(page);

      console.log(`Saved ${path.relative(projectRoot, screenshotPath)}`);
    }
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
