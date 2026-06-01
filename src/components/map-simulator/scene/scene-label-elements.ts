export type LabelElementKind =
  | "road"
  | "building"
  | "service"
  | "district"
  | "transit";

export function boundaryHintElement() {
  const element = document.createElement("div");
  element.style.padding = "8px 14px";
  element.style.borderRadius = "16px";
  element.style.border = "1px solid rgba(162,255,187,0.28)";
  element.style.background = "rgba(5,28,18,0.88)";
  element.style.color = "#d9ffe5";
  element.style.fontSize = "12px";
  element.style.fontWeight = "600";
  element.style.fontFamily = "Pretendard, SUIT Variable, sans-serif";
  element.style.letterSpacing = "0.02em";
  element.style.whiteSpace = "nowrap";
  element.style.pointerEvents = "none";
  element.style.boxShadow = "0 10px 28px rgba(0,0,0,0.28)";
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  element.style.transform = "translate(14px, -18px)";
  element.style.zIndex = "12";
  element.style.display = "none";
  return element;
}

export function labelElement(text: string, kind: LabelElementKind) {
  const element = document.createElement("div");
  element.textContent = text;
  element.dataset.labelKind = kind;
  element.style.padding =
    kind === "road"
      ? "2px 8px"
      : kind === "service"
        ? "3px 10px"
        : kind === "transit"
          ? "4px 11px"
          : kind === "district"
            ? "4px 12px"
            : "3px 9px";
  element.style.borderRadius = "999px";
  element.style.border = "1px solid rgba(255,255,255,0.12)";
  element.style.background =
    kind === "road"
      ? "rgba(8,18,34,0.72)"
      : kind === "service"
        ? "rgba(51,36,7,0.86)"
        : kind === "transit"
          ? "rgba(5,32,44,0.92)"
          : kind === "district"
            ? "rgba(5,48,67,0.96)"
            : "rgba(12,20,36,0.85)";
  element.style.color =
    kind === "road"
      ? "#cfe7ff"
      : kind === "service"
        ? "#ffe7a8"
        : kind === "transit"
          ? "#a8eeff"
          : kind === "district"
            ? "#d5f6ff"
            : "#f7fbff";
  element.style.fontSize =
    kind === "road" ? "11px" : kind === "district" ? "13px" : "12px";
  element.style.fontWeight = kind === "district" ? "700" : "500";
  element.style.fontFamily = "Pretendard, SUIT Variable, sans-serif";
  element.style.letterSpacing = "0.02em";
  element.style.whiteSpace = "nowrap";
  element.style.pointerEvents = "none";
  element.style.transition =
    kind === "district"
      ? "background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 140ms ease"
      : "none";
  element.style.boxShadow = "0 8px 18px rgba(0,0,0,0.25)";
  return element;
}

export function hotspotCallElement() {
  const element = document.createElement("div");
  element.textContent = "";
  element.dataset.labelKind = "hotspot";
  element.style.padding = "2px 7px";
  element.style.borderRadius = "999px";
  element.style.border = "1px solid rgba(180,161,128,0.28)";
  element.style.background = "rgba(25,24,22,0.78)";
  element.style.color = "#ddd2bb";
  element.style.fontSize = "10px";
  element.style.fontWeight = "600";
  element.style.fontFamily = "Pretendard, SUIT Variable, sans-serif";
  element.style.letterSpacing = "0";
  element.style.whiteSpace = "nowrap";
  element.style.pointerEvents = "none";
  element.style.boxShadow = "0 4px 10px rgba(0,0,0,0.18)";
  return element;
}
