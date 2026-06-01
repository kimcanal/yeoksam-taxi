#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const steps = [
  ["fetch:dongs", "Refresh dong boundaries"],
  ["fetch:buildings", "Refresh building geometry"],
  ["fetch:non-road", "Refresh non-road surfaces"],
  ["fetch:roads", "Refresh roads and routing source geometry"],
  ["fetch:road-network", "Regenerate the derived road graph asset"],
  ["fetch:traffic-signals", "Refresh traffic signal points"],
  ["fetch:transit", "Refresh transit landmarks"],
];

function printUsage() {
  console.log(`Usage:
  npm run asset:update
  npm run asset:update -- --dry-run

Options:
      --dry-run   Print the refresh steps without running them.
  -h, --help      Show this help.`);
}

function parseArgs(args) {
  const options = {
    dryRun: false,
    help: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "--dry-run":
        options.dryRun = true;
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function quoteCmdArg(value) {
  const arg = String(value);
  if (/^[A-Za-z0-9_./:=@-]+$/.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '""')}"`;
}

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const args = ["run", scriptName];
    const command = process.platform === "win32" ? "cmd.exe" : npmCommand;
    const commandArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", [npmCommand, ...args].map(quoteCmdArg).join(" ")]
        : args;

    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      env: {
        ...process.env,
        PATH: `${path.join(rootDir, "node_modules", ".bin")}${path.delimiter}${process.env.PATH ?? ""}`,
      },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printUsage();
  process.exit(0);
}

console.log("yeoksam-taxi asset updater");
console.log("This may take a few minutes because Overpass mirrors can rate-limit or retry.");
console.log("When a fetch step can reuse a cached local file, the pipeline keeps going.");

for (const [index, [scriptName, description]] of steps.entries()) {
  console.log("");
  console.log(`[${index + 1}/${steps.length}] ${description}`);
  console.log(`Running: npm run ${scriptName}`);

  if (options.dryRun) {
    continue;
  }

  const exitCode = await runNpmScript(scriptName);
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

console.log("");
console.log("Asset refresh complete.");
