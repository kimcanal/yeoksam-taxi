#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr,
});
const lineIterator = rl[Symbol.asyncIterator]();

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
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
  console.log(`yeoksam-taxi launcher

npm run options
  1) dev       - development server with HMR. Best for active coding.
  2) start     - production server. Uses the latest build output.
  3) build     - production build only. Does not start a server.
  4) lint      - ESLint check only.
  5) asset:update - refresh local OSM snapshot assets. Can take a few minutes.
  q) quit

For dev/start, the launcher binds Next.js to 0.0.0.0 by default.
That keeps localhost working on this machine while still allowing access from other devices.
The launcher opens http://localhost:<port>/map after the server is ready.`);
}

function printUsage() {
  console.log(`Usage:
  npm run launch
  npm run launch -- --script dev --port 3000
  npm run launch -- dev --port 3000 --no-open

Options:
  -s, --script <name>       dev, start, build, lint, or asset:update
  -p, --port <port>         Port for dev/start. Defaults to 3000 when --script is used.
  -H, --host <host>         Bind host for dev/start. Defaults to 0.0.0.0.
      --hostname <host>     Alias for --host.
      --path <path>         Path to open after startup. Defaults to /map.
      --open                Open the browser after the server is ready.
      --no-open             Do not open the browser.
      --auto-port           In non-interactive mode, use the next free port if busy.
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

function parseArgs(args) {
  const options = {
    autoPort: false,
    bindHost: null,
    cloudflareDev: false,
    help: false,
    launchPath: null,
    port: null,
    scriptName: null,
    shouldOpen: null,
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
    const choice = await ask("Choose an npm script to run: ");
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

async function chooseAvailablePort(port, options = {}) {
  if (!(await portIsBusy(port))) {
    return port;
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
      prompt: !options.scriptName || process.stdin.isTTY,
    });
  }

  if (options.scriptName) {
    const defaultPort = process.env.PORT || "3000";
    return chooseAvailablePort(defaultPort, {
      autoPort: options.autoPort,
      prompt: false,
    });
  }

  while (true) {
    console.error("");
    console.error("Port mode");
    console.error("  1) Start on default port 3000 and open /map");
    console.error("  2) Start on a specific port (press Enter for 8000, useful on VDI)");
    const portMode = await ask("Choose port mode: ");

    switch (portMode.trim()) {
      case "":
      case "1":
      case "default":
      case "3000":
        return chooseAvailablePort("3000");
      case "2":
      case "custom": {
        const customPortInput = await ask("Port number [8000]: ");
        const customPort = customPortInput.trim() || "8000";
        if (validatePort(customPort)) {
          return chooseAvailablePort(customPort);
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

  const detectedIps = Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .sort();

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
    env.XDG_CONFIG_HOME = path.join(rootDir, ".tmp", "xdg.config");
    fs.mkdirSync(env.XDG_CONFIG_HOME, { recursive: true });
  }

  env.NEXT_ENABLE_OPENNEXT_CLOUDFLARE_DEV = options.cloudflareDev ? "1" : "0";

  return env;
}

function quoteCmdArg(value) {
  const arg = String(value);
  if (/^[A-Za-z0-9_./:=@-]+$/.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '""')}"`;
}

function runNpm(args, options = {}) {
  return new Promise((resolve, reject) => {
    const childEnv = createChildEnv(options);
    const command = process.platform === "win32" ? "cmd.exe" : npmCommand;
    const commandArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", [npmCommand, ...args].map(quoteCmdArg).join(" ")]
        : args;

    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      env: childEnv,
      stdio: ["ignore", "inherit", "inherit"],
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

async function ensureBuildIfNeeded(options) {
  if (fs.existsSync(path.join(rootDir, ".next", "BUILD_ID"))) {
    return;
  }

  console.log("");
  console.log("No production build found. 'npm run start' needs a fresh build first.");
  const runBuild = await ask("Run 'npm run build' now? [Y/n]: ");
  if (["", "y", "Y", "yes", "YES"].includes(runBuild.trim())) {
    const result = await runNpm(["run", "build"], options);
    if (result.code !== 0) {
      process.exit(result.code);
    }
    return;
  }

  console.log("Cancelled.");
  process.exit(1);
}

function waitForUrl(url) {
  return new Promise((resolve) => {
    let attempt = 0;

    const check = () => {
      attempt += 1;
      const request = http.get(url, (response) => {
        response.resume();
        resolve(true);
      });

      request.setTimeout(500, () => {
        request.destroy();
      });

      request.once("error", () => {
        if (attempt >= 80) {
          resolve(false);
          return;
        }
        setTimeout(check, 500);
      });
    };

    check();
  });
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

function openUrlWhenReady(url, shouldOpen) {
  if (!shouldOpen) {
    return;
  }

  waitForUrl(url).then((ready) => {
    if (ready) {
      openUrl(url);
    } else {
      console.error(`Browser auto-open unavailable. Open this URL manually: ${url}`);
    }
  });
}

async function runNpmScript(scriptName, options) {
  if (scriptName === "dev" || scriptName === "start") {
    const port = await promptPort(options);
    const bindHost = options.bindHost || process.env.LAUNCH_BIND_HOST || "0.0.0.0";
    const accessHost = selectAccessHost();
    const launchPath = options.launchPath || process.env.LAUNCH_PATH || "/map";
    const localUrl = `http://localhost:${port}${launchPath}`;
    const shouldOpen =
      options.shouldOpen ?? (process.env.LAUNCH_OPEN ? process.env.LAUNCH_OPEN !== "0" : true);

    if (scriptName === "start") {
      await ensureBuildIfNeeded(options);
    }

    printAccessUrls(port, bindHost, accessHost, launchPath);
    console.log("");
    console.log(`Opening when ready: ${localUrl}`);
    console.log(`Running: npm run ${scriptName} -- --hostname ${bindHost} --port ${port}`);
    openUrlWhenReady(localUrl, shouldOpen);

    rl.close();
    const result = await runNpm(
      ["run", scriptName, "--", "--hostname", bindHost, "--port", port],
      options,
    );
    process.exit(result.code);
  }

  console.log("");
  console.log(`Running: npm run ${scriptName}`);
  rl.close();
  const result = await runNpm(["run", scriptName], options);
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
  await runNpmScript(selectedScript, options);
} catch (error) {
  rl.close();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
