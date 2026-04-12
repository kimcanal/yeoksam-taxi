import { execSync } from "node:child_process";
import MapSimulatorClient from "@/components/MapSimulatorClient";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";

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

function formatBuildTimeKst(date: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return `${partMap.get("year")}.${partMap.get("month")}.${partMap.get("day")} ${partMap.get("hour")}:${partMap.get("minute")} KST`;
}

function resolveBuildVersion(): BuildVersionInfo {
  const rawBranch =
    readGitValue("git rev-parse --abbrev-ref HEAD") ||
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF_NAME ||
    process.env.CF_PAGES_BRANCH ||
    process.env.BRANCH ||
    "main";
  const branch = rawBranch === "HEAD" ? "main" : rawBranch;
  const commit = readGitValue("git rev-parse --short HEAD") || null;

  return {
    branch,
    commit,
    builtAtLabel: formatBuildTimeKst(new Date()),
  };
}

export default function Home() {
  const buildVersion = resolveBuildVersion();

  return (
    <main className="w-full h-screen bg-black overflow-hidden">
      <MapSimulatorClient buildVersion={buildVersion} />
    </main>
  );
}
