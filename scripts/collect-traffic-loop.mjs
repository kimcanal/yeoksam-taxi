/**
 * Continuous traffic collection loop.
 * Collects citydata + extracts dong-filtered traffic links on a fixed interval.
 *
 * Usage:
 *   node scripts/collect-traffic-loop.mjs          # default: every 5 minutes
 *   node scripts/collect-traffic-loop.mjs 10       # every 10 minutes
 *   INTERVAL_MIN=3 node scripts/collect-traffic-loop.mjs
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);

const intervalMin = Number(
  process.argv[2] ?? process.env.INTERVAL_MIN ?? 5,
);
if (!Number.isFinite(intervalMin) || intervalMin < 1) {
  console.error("Interval must be a positive number of minutes.");
  process.exit(1);
}
const intervalMs = intervalMin * 60 * 1000;

function kstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);
}

async function runStep(script) {
  await execFileAsync("node", [path.join(projectRoot, "scripts", script)], {
    cwd: projectRoot,
    env: process.env,
  });
}

async function collect() {
  const start = Date.now();
  console.log(`\n[${kstNow()}] collecting...`);
  try {
    await runStep("collect-citydata.mjs");
    await runStep("extract-traffic-links.mjs");
    console.log(`[${kstNow()}] done (${((Date.now() - start) / 1000).toFixed(1)}s)`);
  } catch (err) {
    console.error(`[${kstNow()}] error:`, err.message ?? err);
  }
}

console.log(`Traffic collection loop — every ${intervalMin} min. Ctrl+C to stop.`);
await collect();
setInterval(collect, intervalMs);
