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
const DEFAULT_VIEWPORT = { width: 1720, height: 980 };
const DEFAULT_OUTPUT_DIR = path.join(
  projectRoot,
  "docs",
  "screenshots",
  "local-scenarios",
);
const SCENARIOS = [
  { id: "baseline", fileName: "scenario-baseline-demo.png" },
  { id: "gangnam-peak", fileName: "scenario-gangnam-station-peak.png" },
  { id: "rainy-evening", fileName: "scenario-rainy-evening.png" },
  { id: "late-night", fileName: "scenario-late-night-loop.png" },
];

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
      await page.waitForTimeout(1_500);

      const screenshotPath = path.join(options.outputDir, scenario.fileName);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });

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
