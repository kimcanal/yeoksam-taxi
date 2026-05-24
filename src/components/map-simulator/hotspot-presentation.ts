import type {
  HotspotMarkerMode,
  HotspotPresentation,
} from "@/components/map-simulator/core";

export const HOTSPOT_PRESENTATION: Record<HotspotMarkerMode, HotspotPresentation> = {
  pickup: {
    accentColor: 0xc99543,
    badgeLabel: "승차",
    badgeBorderColor: "rgba(196,154,88,0.34)",
    badgeBackground: "rgba(35,29,22,0.84)",
    badgeTextColor: "#efe3c6",
    showsCaller: true,
  },
  dropoff: {
    accentColor: 0x78908a,
    badgeLabel: "하차",
    badgeBorderColor: "rgba(124,151,146,0.32)",
    badgeBackground: "rgba(24,31,30,0.82)",
    badgeTextColor: "#d5dfdc",
    showsCaller: false,
  },
  idle: {
    accentColor: 0x5c646c,
    badgeLabel: "대기",
    badgeBorderColor: "rgba(118,126,134,0.26)",
    badgeBackground: "rgba(28,31,35,0.82)",
    badgeTextColor: "#cfd5db",
    showsCaller: false,
  },
};

export const HOTSPOT_IDLE_COLORS = [0x7a6b57, 0x62716c, 0x76645c];
