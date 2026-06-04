import type { Metadata } from "next";
import R3FMapBenchmark from "@/components/map-simulator/r3f/R3FMapBenchmark";

export const metadata: Metadata = {
  title: "R3F 지도 성능 벤치마크",
};

export default function R3FPerfTestPage() {
  return <R3FMapBenchmark />;
}
