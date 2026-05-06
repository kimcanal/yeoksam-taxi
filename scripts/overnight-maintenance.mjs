import { spawn, execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);

const GENERATED_ARTIFACTS = [
  "public/forecast/latest.json",
  "public/dispatch-plan.json",
  "public/data-summary.json",
  "public/feature-snapshot.json",
  "public/traffic-snapshot.json",
  "public/live-forecast-comparison.json",
  "public/traffic-forecast/latest.json",
  "public/traffic-forecast-comparison.json",
  "public/taxi-pressure/latest.json",
  "public/taxi-pressure-comparison.json",
  "public/public-pressure-baseline-comparison.json",
  "public/poi-features.json",
  "public/poi-forecast-comparison.json",
  "public/population-pressure-summary.json",
  "public/demand-guardrail-summary.json",
  "public/model-observability.json",
  "public/overnight-status.json",
  "docs/overnight-model-qa-status.md",
  "data/processed/features/latest.json",
  "data/processed/live_validation/latest.json",
  "data/processed/live_validation/live_forecast_log.jsonl",
  "data/processed/live_validation/live_forecast_comparison.json",
  "data/processed/live_validation/traffic_forecast_log.jsonl",
  "data/processed/live_validation/traffic_forecast_comparison.json",
  "data/processed/live_validation/taxi_pressure_log.jsonl",
  "data/processed/live_validation/taxi_pressure_comparison.json",
  "data/processed/live_validation/public_pressure_baseline_comparison.json",
  "data/processed/live_validation/poi_forecast_comparison.json",
  "data/processed/live_validation/population_pressure_summary.json",
  "data/processed/live_validation/demand_guardrail_summary.json",
  "data/processed/traffic/citydata_dong_traffic_latest.json",
];

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag) || process.env[envName(flag)] === "1";
const optionValue = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
};

function envName(flag) {
  return `OVERNIGHT_${flag.replace(/^--/, "").replaceAll("-", "_").toUpperCase()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function kstLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

async function gitOutput(gitArgs, fallback = "") {
  try {
    const { stdout } = await execFileAsync("git", gitArgs, {
      cwd: projectRoot,
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout.trim();
  } catch {
    return fallback;
  }
}

async function hasStagedChanges() {
  try {
    await execFileAsync("git", ["diff", "--cached", "--quiet"], {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024,
    });
    return false;
  } catch (error) {
    if (error?.code === 1) {
      return true;
    }
    throw error;
  }
}

async function runStep({ label, command, stepArgs, critical = true, report, logStream }) {
  const started = Date.now();
  const step = {
    label,
    command: [command, ...stepArgs].join(" "),
    started_at: nowIso(),
    duration_seconds: null,
    ok: false,
    exit_code: null,
    critical,
  };
  report.steps.push(step);
  logStream.write(`\n## ${label}\n$ ${step.command}\n\n`);
  console.log(`\n[${label}] ${step.command}`);

  await new Promise((resolve) => {
    const child = spawn(command, stepArgs, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });
    child.on("error", (error) => {
      step.error = error.message;
      logStream.write(`\n[error] ${error.message}\n`);
      resolve();
    });
    child.on("exit", (code) => {
      step.exit_code = code;
      step.ok = code === 0;
      resolve();
    });
  });

  step.duration_seconds = Number(((Date.now() - started) / 1000).toFixed(1));
  if (!step.ok && critical) {
    report.ok = false;
  }
  return step.ok;
}

async function writeReports(reportPath, jsonPath, report) {
  const lines = [
    "# Overnight Maintenance Report",
    "",
    `- Status: ${report.ok ? "PASS" : "FAIL"}`,
    `- Started: ${report.started_at}`,
    `- Finished: ${report.finished_at}`,
    `- KST finished: ${report.finished_kst}`,
    `- Branch: ${report.branch || "-"}`,
    `- Commit: ${report.head || "-"}`,
    `- Mode: ${report.mode}`,
    `- Log: ${path.relative(projectRoot, report.log_path)}`,
    "",
    "## Steps",
    "",
    "| Step | Result | Seconds | Critical |",
    "| --- | --- | ---: | --- |",
    ...report.steps.map((step) =>
      `| ${step.label} | ${step.ok ? "PASS" : "FAIL"} | ${step.duration_seconds ?? "-"} | ${step.critical ? "yes" : "no"} |`,
    ),
    "",
    "## Git",
    "",
    `- Start dirty: ${report.git.start_dirty ? "yes" : "no"}`,
    `- Commit requested: ${report.git.commit_requested ? "yes" : "no"}`,
    `- Push requested: ${report.git.push_requested ? "yes" : "no"}`,
    `- Commit created: ${report.git.commit_created || "-"}`,
    `- Push: ${report.git.push_result || "-"}`,
    "",
    "## Changed Files",
    "",
    report.git.changed_files.length
      ? report.git.changed_files.map((file) => `- \`${file}\``).join("\n")
      : "- No changes detected.",
    "",
    "## Notes",
    "",
    ...report.notes.map((note) => `- ${note}`),
    "",
  ];

  await writeFile(reportPath, `${lines.join("\n")}\n`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
}

const dryRun = hasFlag("--dry-run");
const commitRequested = hasFlag("--commit");
const pushRequested = hasFlag("--push");
const allowDirty = hasFlag("--allow-dirty");
const skipChecks = hasFlag("--no-checks");
const skipBuild = hasFlag("--no-build") || skipChecks;
const skipLint = hasFlag("--no-lint") || skipChecks;
const skipCollect = hasFlag("--skip-collect");
const offline = hasFlag("--offline");
const nodeModels = hasFlag("--node-models") || offline;
const reportPath = path.resolve(projectRoot, optionValue("--report", ".tmp/overnight-report.md"));
const jsonReportPath = reportPath.replace(/\.md$/i, ".json");
const logPath = reportPath.replace(/\.md$/i, ".log");
const targetDatetime = args.find((arg, index) => {
  if (arg.startsWith("--")) return false;
  const previous = args[index - 1];
  return previous !== "--report";
});

await mkdir(path.dirname(reportPath), { recursive: true });
const logStream = createWriteStream(logPath, { flags: "a" });
const branch = await gitOutput(["branch", "--show-current"]);
const head = await gitOutput(["rev-parse", "--short", "HEAD"]);
const startStatus = await gitOutput(["status", "--porcelain"]);
const report = {
  ok: true,
  started_at: nowIso(),
  finished_at: null,
  finished_kst: null,
  branch,
  head,
  mode: [
    dryRun ? "dry-run" : "run",
    offline ? "offline" : skipCollect ? "skip-collect" : "live-collect",
    nodeModels ? "node-models" : "python-preferred",
    skipChecks ? "no-checks" : skipBuild ? "no-build" : "checks",
  ].join(", "),
  log_path: logPath,
  steps: [],
  notes: [],
  git: {
    start_dirty: Boolean(startStatus),
    start_status: startStatus,
    commit_requested: commitRequested,
    push_requested: pushRequested,
    changed_files: [],
    commit_created: null,
    push_result: null,
  },
};

if (dryRun) {
  report.notes.push("Dry run only. No live cycle, checks, commit, or push was executed.");
  report.finished_at = nowIso();
  report.finished_kst = kstLabel();
  await writeReports(reportPath, jsonReportPath, report);
  logStream.end();
  console.log(`Wrote ${path.relative(projectRoot, reportPath)}`);
  process.exit(0);
}

const cycleArgs = ["scripts/run-live-demand-cycle.mjs"];
if (targetDatetime) cycleArgs.push(targetDatetime);
if (skipCollect) cycleArgs.push("--skip-collect");
if (offline) cycleArgs.push("--offline");
if (nodeModels) cycleArgs.push("--node-models");

await runStep({
  label: "live-demand-cycle",
  command: "node",
  stepArgs: cycleArgs,
  critical: true,
  report,
  logStream,
});

if (!skipLint) {
  await runStep({
    label: "lint",
    command: "npm",
    stepArgs: ["run", "lint"],
    critical: true,
    report,
    logStream,
  });
}

if (!skipBuild) {
  await runStep({
    label: "build",
    command: "npm",
    stepArgs: ["run", "build"],
    critical: true,
    report,
    logStream,
  });
}

const changedStatus = await gitOutput(["status", "--porcelain"]);
report.git.changed_files = changedStatus
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.slice(3));

if (commitRequested) {
  if (report.git.start_dirty && !allowDirty) {
    report.notes.push(
      "Commit skipped because the worktree was already dirty at start. Re-run with --allow-dirty to stage the generated artifact allowlist anyway.",
    );
  } else if (!report.ok) {
    report.notes.push("Commit skipped because one or more critical steps failed.");
  } else {
    await runStep({
      label: "stage-generated-artifacts",
      command: "git",
      stepArgs: ["add", "-f", ...GENERATED_ARTIFACTS],
      critical: true,
      report,
      logStream,
    });
    if (!(await hasStagedChanges())) {
      report.notes.push("No generated artifact changes to commit.");
    } else {
      const message = optionValue("--message", "Update overnight live artifacts");
      const committed = await runStep({
        label: "commit",
        command: "git",
        stepArgs: ["commit", "-m", message],
        critical: true,
        report,
        logStream,
      });
      if (committed) {
        report.git.commit_created = await gitOutput(["rev-parse", "--short", "HEAD"]);
      }
    }
  }
}

if (pushRequested) {
  if (!report.git.commit_created) {
    report.git.push_result = "skipped-no-new-commit";
    report.notes.push("Push skipped because no new commit was created.");
  } else if (!report.ok) {
    report.git.push_result = "skipped-failed-steps";
    report.notes.push("Push skipped because one or more critical steps failed.");
  } else {
    const pushed = await runStep({
      label: "push",
      command: "git",
      stepArgs: ["push", "-u", "origin", branch],
      critical: true,
      report,
      logStream,
    });
    report.git.push_result = pushed ? "pushed" : "failed";
  }
}

report.finished_at = nowIso();
report.finished_kst = kstLabel();
report.head = await gitOutput(["rev-parse", "--short", "HEAD"]);
await writeReports(reportPath, jsonReportPath, report);
logStream.end();

console.log(`\nWrote ${path.relative(projectRoot, reportPath)}`);
console.log(`Wrote ${path.relative(projectRoot, jsonReportPath)}`);

if (!report.ok) {
  process.exit(1);
}
