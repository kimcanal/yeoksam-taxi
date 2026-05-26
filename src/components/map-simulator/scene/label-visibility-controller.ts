import type * as THREE from "three";
import type { CameraMode } from "@/components/map-simulator/camera";
import { labelVisibilityBudget } from "@/components/map-simulator/utils";
import type {
  LabelDistanceEntry,
  SceneLabelEntry,
} from "@/components/map-simulator/types";

export function createSceneLabelVisibilityController({
  districtLabelEntries,
  getHighlightedDongNames,
  getShowLabels,
  getShowTransit,
  optionalLabelEntries,
}: {
  districtLabelEntries: SceneLabelEntry[];
  getHighlightedDongNames: () => string[];
  getShowLabels: () => boolean;
  getShowTransit: () => boolean;
  optionalLabelEntries: SceneLabelEntry[];
}) {
  const labelDistanceEntries: LabelDistanceEntry[] = [];

  const sync = (mode: CameraMode, cameraPosition: THREE.Vector3) => {
    const budget = labelVisibilityBudget(mode);
    const highlightedDongs = new Set(getHighlightedDongNames());
    const showLabels = getShowLabels();
    const showTransit = getShowTransit();
    let visibleDistrictCount = 0;
    let visibleOptionalCount = 0;

    labelDistanceEntries.length = 0;
    districtLabelEntries.forEach((entry) => {
      const isHighlighted = entry.name
        ? highlightedDongs.has(entry.name)
        : false;
      if (isHighlighted) {
        entry.label.visible = true;
        visibleDistrictCount += 1;
        return;
      }

      entry.label.visible = false;
      const distanceSq = entry.label.position.distanceToSquared(cameraPosition);
      if (distanceSq <= budget.districtDistanceSq) {
        labelDistanceEntries.push({ entry, distanceSq });
      }
    });

    labelDistanceEntries.sort(
      (left, right) =>
        left.entry.priority - right.entry.priority ||
        left.distanceSq - right.distanceSq,
    );
    for (
      let index = 0;
      index < Math.max(0, budget.districtLimit - visibleDistrictCount) &&
      index < labelDistanceEntries.length;
      index += 1
    ) {
      labelDistanceEntries[index]!.entry.label.visible = true;
      visibleDistrictCount += 1;
    }

    labelDistanceEntries.length = 0;
    optionalLabelEntries.forEach((entry) => {
      entry.label.visible = false;
      const isMapContextLabel =
        entry.kind === "transit" || entry.kind === "road";
      if (!showLabels && !isMapContextLabel) {
        return;
      }
      if (entry.kind === "transit" && !showTransit) {
        return;
      }

      const distanceSq = entry.label.position.distanceToSquared(cameraPosition);
      if (distanceSq <= budget.optionalDistanceSq) {
        labelDistanceEntries.push({ entry, distanceSq });
      }
    });

    labelDistanceEntries.sort(
      (left, right) =>
        left.entry.priority - right.entry.priority ||
        left.distanceSq - right.distanceSq,
    );
    for (
      let index = 0;
      index < budget.optionalLimit && index < labelDistanceEntries.length;
      index += 1
    ) {
      labelDistanceEntries[index]!.entry.label.visible = true;
      visibleOptionalCount += 1;
    }

    return visibleDistrictCount + visibleOptionalCount;
  };

  return { sync };
}
