#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const defaultServerPort = "8000";
const defaultHealthTimeoutMs = 2500;
const defaultStartupTimeoutMs = 40_000;
const defaultWatchdogStartupMs = 10_000;
const defaultWatchdogIntervalMs = 15_000;
const defaultWatchdogFailures = 3;
const defaultMaxRestarts = 5;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr,
});
const lineIterator = rl[Symbol.asyncIterator]();

const scriptChoices = new Map([
  ["1", "dev"],
  ["dev", "dev"],
  ["2", "start"],
  ["start", "start"],
  ["3", "build"],
  ["build", "build"],
  ["4", "lint"],
  ["lint", "lint"],
  ["5", "asset:update"],
  ["asset:update", "asset:update"],
  ["fetch:map", "asset:update"],
]);

function printHeader() {
  console.log(`yeoksam-taxi web launcher

Choose what to run
  1) dev       - development server with HMR. Best for active coding.
  2) start     - production server. Uses the latest build output.
  3) build     - production build only. Does not start a server.
  4) lint      - ESLint check only.
  5) asset:update - refresh local OSM snapshot assets. Can take a few minutes.
  q) quit

For dev/start, the launcher binds Next.js to 0.0.0.0 by default.
That keeps localhost working on this machine while still allowing access from other devices.
The launcher opens http://localhost:<port>/ after the server is ready.`);
}

function printUsage() {
  console.log(`Usage:
  ./run-web.sh
  ./run-web.sh dev
  ./run-web.sh start --no-open

Options:
  -s, --script <name>       dev, start, build, lint, or asset:update
  -p, --port <port>         Port for dev/start. Defaults to ${defaultServerPort}.
  -H, --host <host>         Bind host for dev/start. Defaults to 0.0.0.0.
      --hostname <host>     Alias for --host.
      --path <path>         Path to open after startup. Defaults to /.
      --open                Open the browser after the server is ready.
      --no-open             Do not open the browser.
      --auto-port           In non-interactive mode, use the next free port if busy.
      --replace-stale       If the port is busy but unresponsive, stop this app's stale listener and reuse it.
      --watchdog            Restart start/dev if HTTP health checks keep failing. Defaults on for start.
      --no-watchdog         Disable server health watchdog.
      --health-timeout-ms <ms>
                            HTTP timeout for readiness and health checks. Defaults to ${defaultHealthTimeoutMs}.
      --watchdog-interval-ms <ms>
                            Interval between watchdog checks. Defaults to ${defaultWatchdogIntervalMs}.
      --watchdog-failures <count>
                            Failed health checks before restart. Defaults to ${defaultWatchdogFailures}.
      --max-restarts <count>
                            Max watchdog restarts before giving up. Defaults to ${defaultMaxRestarts}.
      --cloudflare-dev      Enable OpenNext Cloudflare dev context.
  -h, --help                Show this help.`);
}

function normalizeScriptName(value) {
  return scriptChoices.get(String(value).trim()) ?? null;
}

function readOptionValue(args, index, optionName) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`${optionName} needs a value.`);
  }
  return value;
}

function readNonNegativeInteger(args, index, optionName) {
  const value = Number(readOptionValue(args, index, optionName));
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${optionName} must be a non-negative integer.`);
  }
  return value;
}

function readPositiveInteger(args, index, optionName) {
  const value = readNonNegativeInteger(args, index, optionName);
  if (value <= 0) {
    throw new Error(`${optionName} must be greater than 0.`);
  }
  return value;
}

function parseArgs(args) {
  const options = {
    autoPort: false,
    bindHost: null,
    cloudflareDev: false,
    help: false,
    healthTimeoutMs: defaultHealthTimeoutMs,
    launchPath: null,
    maxRestarts: defaultMaxRestarts,
    port: null,
    replaceStale: false,
    scriptName: null,
    shouldOpen: null,
    watchdog: null,
    watchdogFailures: defaultWatchdogFailures,
    watchdogIntervalMs: defaultWatchdogIntervalMs,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-s":
      case "--script": {
        const scriptName = normalizeScriptName(readOptionValue(args, index, arg));
        if (!scriptName) {
          throw new Error(`Unknown script: ${args[index + 1]}`);
        }
        options.scriptName = scriptName;
        index += 1;
        break;
      }
      case "-p":
      case "--port":
        options.port = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "-H":
      case "--host":
      case "--hostname":
        options.bindHost = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "--path":
        options.launchPath = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "--open":
        options.shouldOpen = true;
        break;
      case "--no-open":
        options.shouldOpen = false;
        break;
      case "--auto-port":
        options.autoPort = true;
        break;
      case "--replace-stale":
        options.replaceStale = true;
        break;
      case "--watchdog":
        options.watchdog = true;
        break;
      case "--no-watchdog":
        options.watchdog = false;
        break;
      case "--health-timeout-ms":
        options.healthTimeoutMs = readPositiveInteger(args, index, arg);
        index += 1;
        break;
      case "--watchdog-interval-ms":
        options.watchdogIntervalMs = readPositiveInteger(args, index, arg);
        index += 1;
        break;
      case "--watchdog-failures":
        options.watchdogFailures = readPositiveInteger(args, index, arg);
        index += 1;
        break;
      case "--max-restarts":
        options.maxRestarts = readNonNegativeInteger(args, index, arg);
        index += 1;
        break;
      case "--cloudflare-dev":
        options.cloudflareDev = true;
        break;
      default: {
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }

        const scriptName = normalizeScriptName(arg);
        if (!scriptName) {
          throw new Error(`Unknown script: ${arg}`);
        }
        if (options.scriptName) {
          throw new Error(`Script already selected: ${options.scriptName}`);
        }
        options.scriptName = scriptName;
      }
    }
  }

  return options;
}

async function ask(question) {
  rl.output.write(question);
  const nextLine = await lineIterator.next();
  if (nextLine.done) {
    console.log("Cancelled.");
    process.exit(1);
  }
  return nextLine.value;
}

async function promptScript() {
  while (true) {
    console.error("");
    const choice = await ask("Choose what to run: ");
    const scriptName = normalizeScriptName(choice);

    if (scriptName) {
      return scriptName;
    }

    switch (choice.trim()) {
      case "q":
      case "Q":
      case "quit":
      case "exit":
        process.exit(0);
      default:
        console.error("Invalid choice. Pick 1-5 or q.");
    }
  }
}

function validatePort(candidate) {
  if (!/^\d+$/.test(String(candidate))) {
    return false;
  }

  const port = Number(candidate);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeLaunchPath(value) {
  const nextPath = value?.trim() || "/";
  return nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
}

function formatElapsed(ms) {
  return `${Math.max(1, Math.round(ms))}ms`;
}

function portIsBusy(port) {
  return new Promise((resolve) => {
    const socket = net
      .connect({ host: "127.0.0.1", port: Number(port) })
      .once("connect", () => {
        socket.destroy();
        resolve(true);
      })
      .once("error", () => {
        socket.destroy();
        resolve(false);
      });
  });
}

function checkHttpHealth(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? defaultHealthTimeoutMs;

  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        elapsedMs: Date.now() - startedAt,
        ...result,
      });
    };

    const request = http.get(url, (response) => {
      response.resume();
      finish({
        ok: (response.statusCode ?? 500) < 500,
        statusCode: response.statusCode ?? null,
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });

    request.once("error", (error) => {
      finish({
        error: error.message,
        ok: false,
        statusCode: null,
      });
    });
  });
}

function listeningPidsForPort(port) {
  if (process.platform === "win32") {
    return [];
  }

  const result = spawnSync("lsof", [
    "-nP",
    `-iTCP:${port}`,
    "-sTCP:LISTEN",
    "-t",
  ], {
    encoding: "utf8",
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  return result.stdout
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function describePid(pid) {
  let command = "";
  let cwd = "";

  try {
    command = fs
      .readFileSync(`/proc/${pid}/cmdline`, "utf8")
      .replace(/\0/g, " ")
      .trim();
  } catch {
    command = "";
  }

  try {
    cwd = fs.realpathSync(`/proc/${pid}/cwd`);
  } catch {
    cwd = "";
  }

  return { command, cwd, pid };
}

function isProjectListener(description) {
  return (
    description.cwd === rootDir ||
    description.cwd.startsWith(`${rootDir}${path.sep}`) ||
    description.command.includes(rootDir)
  );
}

async function terminateProjectListenersOnPort(port) {
  const listeners = listeningPidsForPort(port).map(describePid);
  const projectListeners = listeners.filter(isProjectListener);

  if (!listeners.length) {
    console.error(`No listener process was found for port ${port}.`);
    return false;
  }

  const foreignListeners = listeners.filter((item) => !isProjectListener(item));
  if (foreignListeners.length) {
    console.error(`Port ${port} is owned by a process outside this project. Refusing to stop it.`);
    foreignListeners.forEach((item) => {
      console.error(`  pid ${item.pid}: ${item.command || "(command unavailable)"}`);
    });
    return false;
  }

  console.error(`Stopping stale ${rootDir} listener(s) on port ${port}:`);
  projectListeners.forEach((item) => {
    console.error(`  pid ${item.pid}: ${item.command || "(command unavailable)"}`);
  });

  for (const item of projectListeners) {
    try {
      process.kill(item.pid, "SIGTERM");
    } catch {
      // The process may already have exited.
    }
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await portIsBusy(port))) {
      return true;
    }
    await sleep(250);
  }

  console.error(`Port ${port} is still busy after stopping stale listener(s).`);
  return false;
}

async function chooseAvailablePort(port, options = {}) {
  if (!(await portIsBusy(port))) {
    return port;
  }

  const healthPath = normalizeLaunchPath(options.healthPath);
  const healthUrl = `http://127.0.0.1:${port}${healthPath}`;
  const health = await checkHttpHealth(healthUrl, {
    timeoutMs: options.healthTimeoutMs,
  });

  if (health.ok) {
    console.error(
      `Port ${port} is already in use and responding with HTTP ${health.statusCode} in ${formatElapsed(health.elapsedMs)}.`,
    );
  } else {
    console.error(
      `Port ${port} is already in use but did not respond to ${healthUrl} (${health.error ?? "unhealthy"}).`,
    );

    if (options.replaceStale) {
      const replaced = await terminateProjectListenersOnPort(port);
      if (replaced) {
        console.error(`Reusing port ${port} after stale listener cleanup.`);
        return String(port);
      }
      process.exit(1);
    }
  }

  let alternatePort = Number(port) + 1;
  while (validatePort(alternatePort) && (await portIsBusy(alternatePort))) {
    alternatePort += 1;
  }

  if (!validatePort(alternatePort)) {
    console.error(`Port ${port} is already in use, and no nearby free port was found.`);
    process.exit(1);
  }

  if (options.autoPort) {
    console.error(`Port ${port} is already in use. Using port ${alternatePort} instead.`);
    return String(alternatePort);
  }

  if (options.prompt === false) {
    console.error(`Port ${port} is already in use. Use --auto-port or choose another --port.`);
    process.exit(1);
  }

  console.error(`Port ${port} is already in use.`);
  const useAlternate = await ask(`Use port ${alternatePort} instead? [Y/n]: `);
  if (["", "y", "Y", "yes", "YES"].includes(useAlternate.trim())) {
    return String(alternatePort);
  }

  console.log("Cancelled.");
  process.exit(1);
}

async function promptPort(options) {
  if (options.port) {
    if (!validatePort(options.port)) {
      console.error("Port must be a number between 1 and 65535.");
      process.exit(1);
    }

    return chooseAvailablePort(options.port, {
      autoPort: options.autoPort,
      healthPath: options.healthPath,
      healthTimeoutMs: options.healthTimeoutMs,
      prompt: !options.scriptName || Boolean(process.stdin.isTTY),
      replaceStale: options.replaceStale,
    });
  }

  if (options.scriptName) {
    const defaultPort = process.env.PORT || defaultServerPort;
    return chooseAvailablePort(defaultPort, {
      autoPort: options.autoPort,
      healthPath: options.healthPath,
      healthTimeoutMs: options.healthTimeoutMs,
      prompt: false,
      replaceStale: options.replaceStale,
    });
  }

  while (true) {
    console.error("");
    console.error("Port mode");
    console.error(`  1) Start on VDI web port ${defaultServerPort}`);
    console.error("  2) Start on a specific port");
    const portMode = await ask("Choose port mode: ");

    switch (portMode.trim()) {
      case "":
      case "1":
      case "default":
      case "8000":
        return chooseAvailablePort(defaultServerPort, {
          healthPath: options.healthPath,
          healthTimeoutMs: options.healthTimeoutMs,
          replaceStale: options.replaceStale,
        });
      case "2":
      case "custom": {
        const customPortInput = await ask(`Port number [${defaultServerPort}]: `);
        const customPort = customPortInput.trim() || defaultServerPort;
        if (validatePort(customPort)) {
          return chooseAvailablePort(customPort, {
            healthPath: options.healthPath,
            healthTimeoutMs: options.healthTimeoutMs,
            replaceStale: options.replaceStale,
          });
        }
        console.error("Port must be a number between 1 and 65535.");
        break;
      }
      default:
        console.error("Invalid choice. Pick 1 or 2.");
    }
  }
}

function isPrivateIpv4(ip) {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function selectAccessHost() {
  if (process.env.LAUNCH_ACCESS_HOST) {
    return process.env.LAUNCH_ACCESS_HOST;
  }

  let detectedIps = [];
  try {
    detectedIps = Object.values(os.networkInterfaces())
      .flat()
      .filter(Boolean)
      .filter((item) => item.family === "IPv4" && !item.internal)
      .map((item) => item.address)
      .sort();
  } catch {
    detectedIps = [];
  }

  return detectedIps.find(isPrivateIpv4) ?? detectedIps[0] ?? "";
}

function printAccessUrls(port, bindHost, accessHost, launchPath) {
  console.log("");
  console.log("Access URLs");
  console.log(`  this machine : http://localhost:${port}${launchPath}`);
  if (accessHost) {
    console.log(`  external     : http://${accessHost}:${port}${launchPath}`);
  } else {
    console.log("  external     : auto-detect unavailable");
  }
  console.log(`  bind         : ${bindHost}`);

  console.log("");
  if (bindHost === "0.0.0.0") {
    console.log("Next listens on every interface.");
    console.log("If your VDI/firewall only exposes port 8000, use the external URL above with port 8000.");
  } else {
    console.log("Next listens only on the bind address above.");
  }

  console.log("");
  console.log("Note: Next.js labels below are its own banner.");
  console.log("When binding to 0.0.0.0, Next may still show 0.0.0.0 in its Network line.");
}

function createChildEnv(options = {}) {
  const env = { ...process.env };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const localBin = path.join(rootDir, "node_modules", ".bin");
  env[pathKey] = env[pathKey] ? `${localBin}${path.delimiter}${env[pathKey]}` : localBin;

  if (!env.XDG_CONFIG_HOME) {
    env.XDG_CONFIG_HOME = path.join(os.tmpdir(), "yeoksam-taxi", "xdg.config");
    fs.mkdirSync(env.XDG_CONFIG_HOME, { recursive: true });
  }

  env.NEXT_ENABLE_OPENNEXT_CLOUDFLARE_DEV = options.cloudflareDev ? "1" : "0";

  // 자동 인증서(cert.pem) 감지 및 NODE_EXTRA_CA_CERTS 주입
  if (!env.NODE_EXTRA_CA_CERTS) {
    const possibleCertPaths = [
      path.join(rootDir, "cert.pem"),
      path.join(os.homedir(), "cert.pem"),
    ];
    for (const certPath of possibleCertPaths) {
      if (fs.existsSync(certPath)) {
        env.NODE_EXTRA_CA_CERTS = certPath;
        console.log(`[Launcher] Detected cert.pem at ${certPath}. Automatically set NODE_EXTRA_CA_CERTS.`);
        break;
      }
    }
  }

  return env;
}

function localBinCommand(name) {
  const executable = process.platform === "win32" ? `${name}.cmd` : name;
  return path.join(rootDir, "node_modules", ".bin", executable);
}

function commandForScript(scriptName, serverOptions = {}) {
  switch (scriptName) {
    case "dev":
    case "start":
      return {
        command: localBinCommand("next"),
        args: [
          scriptName,
          ...(scriptName === "dev" ? ["--webpack"] : []),
          "--hostname",
          serverOptions.bindHost,
          "--port",
          serverOptions.port,
        ],
        label: `next ${scriptName}${scriptName === "dev" ? " --webpack" : ""} --hostname ${serverOptions.bindHost} --port ${serverOptions.port}`,
      };
    case "build":
      return {
        command: localBinCommand("next"),
        args: ["build", "--webpack"],
        label: "next build --webpack",
      };
    case "lint":
      return {
        command: localBinCommand("eslint"),
        args: [],
        label: "eslint",
      };
    case "asset:update":
      return {
        command: process.execPath,
        args: [path.join(rootDir, "scripts", "update-assets.mjs")],
        label: "node scripts/update-assets.mjs",
      };
    default:
      throw new Error(`Unknown script: ${scriptName}`);
  }
}

function spawnManagedChild(command, args, options = {}) {
  const childEnv = createChildEnv(options);
  return spawn(command, args, {
    cwd: rootDir,
    env: childEnv,
    stdio: ["ignore", "inherit", "inherit"],
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnManagedChild(command, args, options);

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

function stopChild(child, signal = "SIGTERM") {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  child.kill(signal);
}

function runServerCommand(command, args, options = {}) {
  const watchdogEnabled = Boolean(options.watchdogEnabled);
  const watchdogFailures = options.watchdogFailures ?? defaultWatchdogFailures;
  const watchdogIntervalMs = options.watchdogIntervalMs ?? defaultWatchdogIntervalMs;
  const maxRestarts = options.maxRestarts ?? defaultMaxRestarts;
  const healthTimeoutMs = options.healthTimeoutMs ?? defaultHealthTimeoutMs;
  const healthUrl = options.healthUrl;

  return new Promise((resolve, reject) => {
    let child = null;
    let consecutiveFailures = 0;
    let finalCode = null;
    let forceStopTimer = null;
    let healthTimer = null;
    let intentionalStop = false;
    let restartRequested = false;
    let restarts = 0;
    let startupTimer = null;

    const clearTimers = () => {
      if (forceStopTimer) {
        clearTimeout(forceStopTimer);
        forceStopTimer = null;
      }
      if (healthTimer) {
        clearInterval(healthTimer);
        healthTimer = null;
      }
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
    };

    const requestStop = (code = null) => {
      intentionalStop = true;
      finalCode = code;
      stopChild(child);
      forceStopTimer = setTimeout(() => stopChild(child, "SIGKILL"), 8000);
    };

    const startHealthChecks = () => {
      if (!watchdogEnabled || !healthUrl) {
        return;
      }

      startupTimer = setTimeout(() => {
        const check = async () => {
          if (!child || child.exitCode !== null || intentionalStop || restartRequested) {
            return;
          }

          const health = await checkHttpHealth(healthUrl, {
            timeoutMs: healthTimeoutMs,
          });

          if (health.ok) {
            consecutiveFailures = 0;
            return;
          }

          consecutiveFailures += 1;
          console.error(
            `[Launcher] Health check failed for ${healthUrl}: ${health.error ?? `HTTP ${health.statusCode}`} (${consecutiveFailures}/${watchdogFailures})`,
          );

          if (consecutiveFailures < watchdogFailures) {
            return;
          }

          if (restarts >= maxRestarts) {
            console.error(
              `[Launcher] Max restarts reached (${maxRestarts}). Stopping server supervisor.`,
            );
            requestStop(1);
            return;
          }

          restarts += 1;
          consecutiveFailures = 0;
          restartRequested = true;
          console.error(
            `[Launcher] Restarting unhealthy server (${restarts}/${maxRestarts}).`,
          );
          stopChild(child);
          forceStopTimer = setTimeout(() => stopChild(child, "SIGKILL"), 8000);
        };

        void check();
        healthTimer = setInterval(() => {
          void check();
        }, watchdogIntervalMs);
      }, defaultWatchdogStartupMs);
    };

    const startChild = () => {
      child = spawnManagedChild(command, args, options);
      startHealthChecks();

      child.once("error", (error) => {
        clearTimers();
        reject(error);
      });

      child.once("exit", (code, signal) => {
        clearTimers();

        if (intentionalStop) {
          resolve({ code: finalCode ?? code ?? 0, signal });
          return;
        }

        if (restartRequested) {
          restartRequested = false;
          setTimeout(startChild, 1500);
          return;
        }

        resolve({ code: code ?? 1, signal });
      });
    };

    const handleSignal = () => requestStop(0);
    process.once("SIGINT", handleSignal);
    process.once("SIGTERM", handleSignal);

    startChild();
  });
}

async function ensureBuildIfNeeded(options) {
  if (fs.existsSync(path.join(rootDir, ".next", "BUILD_ID"))) {
    return;
  }

  console.log("");
  console.log("No production build found. The production server needs a fresh build first.");
  const runBuild = await ask("Run a production build now? [Y/n]: ");
  if (["", "y", "Y", "yes", "YES"].includes(runBuild.trim())) {
    const buildTask = commandForScript("build");
    const result = await runCommand(buildTask.command, buildTask.args, options);
    if (result.code !== 0) {
      process.exit(result.code);
    }
    return;
  }

  console.log("Cancelled.");
  process.exit(1);
}

async function waitForUrl(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? defaultHealthTimeoutMs;
  const startupTimeoutMs = options.startupTimeoutMs ?? defaultStartupTimeoutMs;
  const startedAt = Date.now();

  while (Date.now() - startedAt < startupTimeoutMs) {
    const health = await checkHttpHealth(url, { timeoutMs });
    if (health.ok) {
      return true;
    }
    await sleep(500);
  }

  return false;
}

function openUrl(url) {
  let command;
  let args;

  if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function openUrlWhenReady(url, shouldOpen, options = {}) {
  if (!shouldOpen) {
    return;
  }

  waitForUrl(url, options).then((ready) => {
    if (ready) {
      openUrl(url);
    } else {
      console.error(`Browser auto-open unavailable. Open this URL manually: ${url}`);
    }
  });
}

async function runSelectedScript(scriptName, options) {
  if (scriptName === "dev" || scriptName === "start") {
    const launchPath = normalizeLaunchPath(options.launchPath || process.env.LAUNCH_PATH || "/");
    options.healthPath = launchPath;
    const port = await promptPort(options);
    const bindHost = options.bindHost || process.env.LAUNCH_BIND_HOST || "0.0.0.0";
    const accessHost = selectAccessHost();
    const localUrl = `http://localhost:${port}${launchPath}`;
    const shouldOpen =
      options.shouldOpen ?? (process.env.LAUNCH_OPEN ? process.env.LAUNCH_OPEN !== "0" : true);
    const watchdogEnabled = options.watchdog ?? scriptName === "start";

    if (scriptName === "start") {
      await ensureBuildIfNeeded(options);
    }

    printAccessUrls(port, bindHost, accessHost, launchPath);
    console.log("");
    console.log(`Opening when ready: ${localUrl}`);
    if (watchdogEnabled) {
      console.log(
        `Health watchdog: on (${options.watchdogFailures} failures, every ${options.watchdogIntervalMs}ms)`,
      );
    } else {
      console.log("Health watchdog: off");
    }
    const task = commandForScript(scriptName, { bindHost, port });
    console.log(`Running: ${task.label}`);
    openUrlWhenReady(localUrl, shouldOpen, {
      timeoutMs: options.healthTimeoutMs,
    });

    rl.close();
    const result = await runServerCommand(task.command, task.args, {
      ...options,
      healthUrl: localUrl,
      watchdogEnabled,
    });
    process.exit(result.code);
  }

  const task = commandForScript(scriptName);
  console.log("");
  console.log(`Running: ${task.label}`);
  rl.close();
  const result = await runCommand(task.command, task.args, options);
  process.exit(result.code);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  printHeader();
  const selectedScript = options.scriptName ?? (await promptScript());
  await runSelectedScript(selectedScript, options);
} catch (error) {
  rl.close();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
