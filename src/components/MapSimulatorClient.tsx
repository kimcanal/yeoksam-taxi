"use client";

import dynamic from "next/dynamic";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";

type MapSimulatorClientProps = {
  buildVersion: BuildVersionInfo;
};

const MapSimulator = dynamic<MapSimulatorClientProps>(() => import("./MapSimulator"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-2 bg-[#060d16] px-6 text-center text-sm text-slate-300">
      <div>지도 모듈 불러오는 중...</div>
      <div className="text-xs text-slate-500">
        도로 그래프와 배차 캐시를 먼저 준비합니다.
      </div>
    </div>
  ),
});

export default function MapSimulatorClient({
  buildVersion,
}: MapSimulatorClientProps) {
  return <MapSimulator buildVersion={buildVersion} />;
}
