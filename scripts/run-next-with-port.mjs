import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

import nextEnv from "@next/env";

const [nextCommand = "dev", ...nextArgs] = process.argv.slice(2);
const projectDir = process.cwd();
const { loadEnvConfig } = nextEnv;

loadEnvConfig(projectDir, process.env.NODE_ENV !== "production");

const env = { ...process.env };
const configuredPortEnvName = env.PORT_ENV_NAME?.trim();
const candidatePortEnvNames = configuredPortEnvName
  ? [configuredPortEnvName, "APP_PORT"]
  : ["APP_PORT"];

if (!env.PORT) {
  const mappedPort = candidatePortEnvNames
    .map((envName) => env[envName])
    .find((value) => value);

  if (mappedPort) {
    env.PORT = mappedPort;
  }
}

const nextBinPath = path.join(projectDir, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBinPath, nextCommand, ...nextArgs], {
  cwd: projectDir,
  env,
  stdio: "inherit",
});

const forwardSignal = (signal) => {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
