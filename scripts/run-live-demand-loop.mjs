/**
 * Continuous live demand cycle loop.
 *
 * This is the presentation-safe automation path: it runs the same live cycle
 * command repeatedly on the machine that already has local model/data artifacts.
 *
 * Usage:
 *   npm run model:live:loop
 *   npm run model:live:loop -- 5
 *   INTERVAL_MIN=10 npm run model:live:loop
 *   npm run model:live:loop -- 10 --skip-collect
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const intervalArg = args.find((arg) => !arg.startsWith("--"));
const intervalMin = Number(intervalArg ?? process.env.INTERVAL_MIN ?? 10);
const skipCollect = args.includes("--skip-collect");
const once = args.includes("--once");

if (!Number.isFinite(intervalMin) || intervalMin < 1) {
  console.error("Interval must be a positive number of minutes.");
  process.exit(1);
}

const intervalMs = intervalMin * 60 * 1000;
let running = false;

function kstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
}

async function runCycle() {
  if (running) {
    console.warn(`[${kstNow()}] previous cycle is still running; skipping this tick.`);
    return;
  }

  running = true;
  const started = Date.now();
  const cycleArgs = ["scripts/run-live-demand-cycle.mjs"];
  if (skipCollect) cycleArgs.push("--skip-collect");

  console.log(`\n[${kstNow()}] live demand cycle start`);
  try {
    const { stdout, stderr } = await execFileAsync("node", cycleArgs, {
      cwd: projectRoot,
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
    console.log(
      `[${kstNow()}] live demand cycle done (${((Date.now() - started) / 1000).toFixed(1)}s)`,
    );
  } catch (error) {
    console.error(`[${kstNow()}] live demand cycle failed`);
    if (error.stdout) console.log(String(error.stdout).trim());
    if (error.stderr) console.error(String(error.stderr).trim());
    console.error(error.message ?? error);
  } finally {
    running = false;
  }
}

console.log(
  `Live demand loop -- every ${intervalMin} min${skipCollect ? " (skip collect)" : ""}. Ctrl+C to stop.`,
);
await runCycle();

if (!once) {
  setInterval(runCycle, intervalMs);
}
