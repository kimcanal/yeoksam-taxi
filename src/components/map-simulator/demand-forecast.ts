import type { WeatherMode } from "@/components/map-simulator/simulation-environment";

export type DemandForecastDong = {
  dongName: string;
  relativeScore: number;
  contextPrior: number;
  publicTransitSignal: number;
  contextMultiplier: number;
};

export type DemandForecastSnapshot = {
  offsetMinutes: number;
  timestamp: string;
  label: string;
  dongs: DemandForecastDong[];
};

export const DEMAND_FORECAST_SOURCE =
  "A-Eye Gangnam context-transfer relative demand, March 2026 sample";

export const DEMAND_FORECAST_SAFE_CLAIM =
  "정확한 카카오T 호출 수가 아니라, 공개 강남 지표와 NYC 택시 시간 패턴을 전이한 동 단위 상대 수요 강도입니다.";

export const DEMAND_FORECAST_SNAPSHOTS: DemandForecastSnapshot[] = [
  {
    offsetMinutes: 0,
    timestamp: "2026-03-31 18:30:00",
    label: "현재 기준",
    dongs: [
      { dongName: "역삼1동", relativeScore: 1, contextPrior: 0.0268066033, publicTransitSignal: 1, contextMultiplier: 1.31118946 },
      { dongName: "논현1동", relativeScore: 0.36678153, contextPrior: 0.009832167, publicTransitSignal: 0.51217315, contextMultiplier: 1.15938289 },
      { dongName: "삼성2동", relativeScore: 0.2935341, contextPrior: 0.0078686522, publicTransitSignal: 0.49095184, contextMultiplier: 1.15277904 },
      { dongName: "논현2동", relativeScore: 0.29254786, contextPrior: 0.0078422144, publicTransitSignal: 0.38742033, contextMultiplier: 1.12056112 },
      { dongName: "대치4동", relativeScore: 0.23284088, contextPrior: 0.0062416732, publicTransitSignal: 0.22941085, contextMultiplier: 1.07139024 },
      { dongName: "삼성1동", relativeScore: 0.19747507, contextPrior: 0.0052936358, publicTransitSignal: 0.23553669, contextMultiplier: 1.07329654 },
      { dongName: "신사동", relativeScore: 0.18302902, contextPrior: 0.0049063864, publicTransitSignal: 0.18503201, contextMultiplier: 1.05758001 },
      { dongName: "청담동", relativeScore: 0.13533384, contextPrior: 0.0036278407, publicTransitSignal: 0.10288632, contextMultiplier: 1.03201714 },
      { dongName: "역삼2동", relativeScore: 0.0579003, contextPrior: 0.0015521103, publicTransitSignal: 0.00801911, contextMultiplier: 1.00249546 },
    ],
  },
  {
    offsetMinutes: 15,
    timestamp: "2026-03-31 18:45:00",
    label: "+15분",
    dongs: [
      { dongName: "역삼1동", relativeScore: 1, contextPrior: 0.0265811529, publicTransitSignal: 1, contextMultiplier: 1.31118946 },
      { dongName: "논현1동", relativeScore: 0.36678153, contextPrior: 0.0097494759, publicTransitSignal: 0.51217315, contextMultiplier: 1.15938289 },
      { dongName: "삼성2동", relativeScore: 0.2935341, contextPrior: 0.0078024748, publicTransitSignal: 0.49095184, contextMultiplier: 1.15277904 },
      { dongName: "논현2동", relativeScore: 0.29254786, contextPrior: 0.0077762593, publicTransitSignal: 0.38742033, contextMultiplier: 1.12056112 },
      { dongName: "대치4동", relativeScore: 0.23284088, contextPrior: 0.0061891791, publicTransitSignal: 0.22941085, contextMultiplier: 1.07139024 },
      { dongName: "삼성1동", relativeScore: 0.19747507, contextPrior: 0.0052491149, publicTransitSignal: 0.23553669, contextMultiplier: 1.07329654 },
      { dongName: "신사동", relativeScore: 0.18302902, contextPrior: 0.0048651224, publicTransitSignal: 0.18503201, contextMultiplier: 1.05758001 },
      { dongName: "청담동", relativeScore: 0.13533384, contextPrior: 0.0035973296, publicTransitSignal: 0.10288632, contextMultiplier: 1.03201714 },
      { dongName: "역삼2동", relativeScore: 0.0579003, contextPrior: 0.0015390567, publicTransitSignal: 0.00801911, contextMultiplier: 1.00249546 },
    ],
  },
  {
    offsetMinutes: 30,
    timestamp: "2026-03-31 19:00:00",
    label: "+30분",
    dongs: [
      { dongName: "역삼1동", relativeScore: 1, contextPrior: 0.0285830697, publicTransitSignal: 1, contextMultiplier: 1.31118946 },
      { dongName: "논현1동", relativeScore: 0.36879112, contextPrior: 0.0105411824, publicTransitSignal: 0.51674428, contextMultiplier: 1.16080537 },
      { dongName: "삼성2동", relativeScore: 0.31463135, contextPrior: 0.0089931298, publicTransitSignal: 0.42777364, contextMultiplier: 1.13311865 },
      { dongName: "논현2동", relativeScore: 0.27293169, contextPrior: 0.0078012254, publicTransitSignal: 0.33701199, contextMultiplier: 1.10487458 },
      { dongName: "대치4동", relativeScore: 0.26150038, contextPrior: 0.0074744835, publicTransitSignal: 0.21011657, contextMultiplier: 1.06538606 },
      { dongName: "삼성1동", relativeScore: 0.18960541, contextPrior: 0.0054195045, publicTransitSignal: 0.20227656, contextMultiplier: 1.06294633 },
      { dongName: "신사동", relativeScore: 0.1800841, contextPrior: 0.0051473564, publicTransitSignal: 0.19569838, contextMultiplier: 1.06089927 },
      { dongName: "청담동", relativeScore: 0.13223412, contextPrior: 0.0037796569, publicTransitSignal: 0.09453374, contextMultiplier: 1.0294179 },
      { dongName: "역삼2동", relativeScore: 0.07655628, contextPrior: 0.0021882135, publicTransitSignal: 0.00758826, contextMultiplier: 1.00236139 },
    ],
  },
  {
    offsetMinutes: 60,
    timestamp: "2026-03-31 19:30:00",
    label: "+60분",
    dongs: [
      { dongName: "역삼1동", relativeScore: 1, contextPrior: 0.0256911638, publicTransitSignal: 1, contextMultiplier: 1.31118946 },
      { dongName: "논현1동", relativeScore: 0.36879112, contextPrior: 0.0094746732, publicTransitSignal: 0.51674428, contextMultiplier: 1.16080537 },
      { dongName: "삼성2동", relativeScore: 0.31463135, contextPrior: 0.0080832455, publicTransitSignal: 0.42777364, contextMultiplier: 1.13311865 },
      { dongName: "논현2동", relativeScore: 0.27293169, contextPrior: 0.0070119327, publicTransitSignal: 0.33701199, contextMultiplier: 1.10487458 },
      { dongName: "대치4동", relativeScore: 0.26150038, contextPrior: 0.006718249, publicTransitSignal: 0.21011657, contextMultiplier: 1.06538606 },
      { dongName: "삼성1동", relativeScore: 0.18960541, contextPrior: 0.0048711835, publicTransitSignal: 0.20227656, contextMultiplier: 1.06294633 },
      { dongName: "신사동", relativeScore: 0.1800841, contextPrior: 0.0046265701, publicTransitSignal: 0.19569838, contextMultiplier: 1.06089927 },
      { dongName: "청담동", relativeScore: 0.13223412, contextPrior: 0.0033972483, publicTransitSignal: 0.09453374, contextMultiplier: 1.0294179 },
      { dongName: "역삼2동", relativeScore: 0.07655628, contextPrior: 0.00196682, publicTransitSignal: 0.00758826, contextMultiplier: 1.00236139 },
    ],
  },
];

function circularMinuteDistance(left: number, right: number) {
  const dayMinutes = 24 * 60;
  const diff = Math.abs(left - right) % dayMinutes;
  return Math.min(diff, dayMinutes - diff);
}

function peakInfluence(minutes: number, center: number, radius: number) {
  return Math.max(0, 1 - circularMinuteDistance(minutes, center) / radius);
}

function dongWeight(dongName: string, kind: "office" | "nightlife" | "transit") {
  if (dongName === "역삼1동") return kind === "nightlife" ? 0.72 : 1;
  if (dongName === "논현1동") return kind === "office" ? 0.46 : 0.92;
  if (dongName === "논현2동") return kind === "office" ? 0.42 : 0.76;
  if (dongName === "삼성2동") return kind === "nightlife" ? 0.34 : 0.78;
  if (dongName === "삼성1동") return kind === "nightlife" ? 0.28 : 0.68;
  if (dongName === "신사동") return kind === "office" ? 0.36 : 0.82;
  if (dongName === "청담동") return kind === "office" ? 0.32 : 0.72;
  if (dongName === "대치4동") return kind === "nightlife" ? 0.24 : 0.64;
  if (dongName === "역삼2동") return kind === "nightlife" ? 0.2 : 0.58;
  return kind === "transit" ? 0.5 : 0.45;
}

function timeDemandMultiplier(dongName: string, targetMinutes: number) {
  const morning = peakInfluence(targetMinutes, 8 * 60 + 30, 150);
  const lunch = peakInfluence(targetMinutes, 12 * 60 + 20, 95);
  const evening = peakInfluence(targetMinutes, 19 * 60 + 15, 210);
  const lateNight = peakInfluence(targetMinutes, 23 * 60 + 20, 190);
  const dawn = peakInfluence(targetMinutes, 4 * 60, 170);
  const office = dongWeight(dongName, "office");
  const nightlife = dongWeight(dongName, "nightlife");
  const transit = dongWeight(dongName, "transit");

  return Math.max(
    0.42,
    0.64 +
      morning * (0.46 * office + 0.16 * transit) +
      lunch * (0.16 * office + 0.08 * transit) +
      evening * (0.5 * office + 0.26 * nightlife + 0.22 * transit) +
      lateNight * (0.44 * nightlife + 0.1 * transit) -
      dawn * 0.24,
  );
}

function weatherDemandMultiplier(dong: DemandForecastDong, weatherMode: WeatherMode) {
  if (weatherMode === "heavy-rain") {
    return 1.08 + dong.publicTransitSignal * 0.3 + dong.contextMultiplier * 0.05;
  }
  if (weatherMode === "heavy-snow") {
    return 1.14 + dong.publicTransitSignal * 0.24 + dong.contextMultiplier * 0.08;
  }
  if (weatherMode === "cloudy") {
    return 1.02 + dong.publicTransitSignal * 0.06;
  }
  return 1;
}

export function conditionDemandForecast(
  snapshot: DemandForecastSnapshot,
  targetMinutes: number,
  weatherMode: WeatherMode,
) {
  const weightedDongs = snapshot.dongs.map((dong) => ({
    ...dong,
    relativeScore:
      dong.relativeScore *
      timeDemandMultiplier(dong.dongName, targetMinutes) *
      weatherDemandMultiplier(dong, weatherMode),
  }));
  const maxScore = Math.max(
    0.001,
    ...weightedDongs.map((dong) => dong.relativeScore),
  );

  return weightedDongs.map((dong) => ({
    ...dong,
    relativeScore: dong.relativeScore / maxScore,
  }));
}
