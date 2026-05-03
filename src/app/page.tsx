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

function resolveEnvironmentLabel(branch: string) {
  const configuredEnvironment =
    process.env.NEXT_PUBLIC_APP_ENV?.trim() || process.env.APP_ENV?.trim();

  if (configuredEnvironment) {
    return configuredEnvironment;
  }

  if (process.env.NODE_ENV === "development") {
    return "로컬 개발";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "프리뷰";
  }

  if (process.env.VERCEL_ENV === "production") {
    return "운영";
  }

  if (process.env.CF_PAGES_BRANCH) {
    return process.env.CF_PAGES_BRANCH === "main" ? "운영" : "프리뷰";
  }

  if (process.env.NODE_ENV === "production") {
    return branch === "main" ? "로컬 빌드(main)" : "로컬 빌드(branch)";
  }

  return "로컬";
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
    environmentLabel: resolveEnvironmentLabel(branch),
    branch,
    commit,
    builtAtLabel: formatBuildTimeKst(new Date()),
  };
}

export default function Home() {
  const buildVersion = resolveBuildVersion();

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      <div className="pointer-events-none absolute left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 px-3 sm:top-4">
        <a
          className="pointer-events-auto rounded-full border border-white/15 bg-slate-950/82 px-4 py-2 text-sm font-extrabold text-white shadow-2xl backdrop-blur-md transition hover:border-blue-300/70 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
          href="/presentation"
        >
          A-Eye 발표 자료
        </a>
      </div>
      <MapSimulatorClient buildVersion={buildVersion} />
    </main>
  );
}
