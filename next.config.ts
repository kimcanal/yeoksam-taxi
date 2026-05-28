import { execSync } from "node:child_process";
import { networkInterfaces } from "node:os";

function envValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

function readGitValue(command: string) {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function shortCommit(value: string) {
  return value ? value.slice(0, 12) : "";
}

function envListValue(name: string) {
  return envValue(name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function localIpv4DevOrigins() {
  return Object.values(networkInterfaces())
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address);
}

const allowedDevOrigins = Array.from(
  new Set([
    "127.0.0.1",
    "localhost",
    ...localIpv4DevOrigins(),
    ...envListValue("NEXT_ALLOWED_DEV_ORIGINS"),
  ]),
);

const buildBranch =
  envValue("NEXT_PUBLIC_BUILD_BRANCH") ||
  envValue("CF_PAGES_BRANCH") ||
  envValue("GITHUB_HEAD_REF") ||
  envValue("GITHUB_REF_NAME") ||
  envValue("BRANCH") ||
  readGitValue("git rev-parse --abbrev-ref HEAD") ||
  "main";
const normalizedBuildBranch = buildBranch === "HEAD" ? "main" : buildBranch;
const buildCommit = shortCommit(
  envValue("NEXT_PUBLIC_BUILD_COMMIT") ||
    envValue("CF_PAGES_COMMIT_SHA") ||
    envValue("GITHUB_SHA") ||
    readGitValue("git rev-parse HEAD"),
);
const buildTimeIso =
  envValue("NEXT_PUBLIC_BUILD_TIME_ISO") ||
  envValue("BUILD_TIME_ISO") ||
  new Date().toISOString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextConfig: any = {
  allowedDevOrigins,
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_BRANCH: normalizedBuildBranch,
    NEXT_PUBLIC_BUILD_COMMIT: buildCommit,
    NEXT_PUBLIC_BUILD_TIME_ISO: buildTimeIso,
  },
};

export default nextConfig;

if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_ENABLE_OPENNEXT_CLOUDFLARE_DEV === "1"
) {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
