import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { labelElement } from "@/components/map-simulator/scene-label-elements";
import { sampleRoute } from "@/components/map-simulator/route-motion-utils";
import type {
  BuildingMass,
  DongRegion,
  RouteTemplate,
  SceneLabelEntry,
} from "@/components/map-simulator/map-simulator-types";

type LabelLayerResult = {
  labelObjects: CSS2DObject[];
  optionalLabelObjects: CSS2DObject[];
  districtLabelEntries: SceneLabelEntry[];
  optionalLabelEntries: SceneLabelEntry[];
  districtLabelElements: Map<string, HTMLDivElement>;
};

function sceneLabelEntry(
  label: CSS2DObject,
  kind: SceneLabelEntry["kind"],
  priority: number,
  name: string | null,
) {
  return { label, kind, priority, name } satisfies SceneLabelEntry;
}

export function createMapRegionLabelLayer({
  buildings,
  dongs,
  showLabels,
}: {
  buildings: BuildingMass[];
  dongs: DongRegion[];
  showLabels: boolean;
}): LabelLayerResult {
  const labelObjects: CSS2DObject[] = [];
  const optionalLabelObjects: CSS2DObject[] = [];
  const districtLabelEntries: SceneLabelEntry[] = [];
  const optionalLabelEntries: SceneLabelEntry[] = [];
  const districtLabelElements = new Map<string, HTMLDivElement>();

  dongs.forEach((dong) => {
    const label = new CSS2DObject(labelElement(dong.name, "district"));
    label.position.set(dong.position.x, 2.8, dong.position.z);
    label.visible = true;
    districtLabelElements.set(dong.name, label.element as HTMLDivElement);
    labelObjects.push(label);
    districtLabelEntries.push(sceneLabelEntry(label, "district", 0, dong.name));
  });

  buildings
    .filter((building) => building.label)
    .sort((left, right) => right.height - left.height)
    .slice(0, 7)
    .forEach((building) => {
      const buildingLabel = building.label as string;
      const label = new CSS2DObject(labelElement(buildingLabel, "building"));
      label.position.set(
        building.position.x,
        Math.min(building.height + 4, 38),
        building.position.z,
      );
      label.visible = showLabels;
      labelObjects.push(label);
      optionalLabelObjects.push(label);
      optionalLabelEntries.push(sceneLabelEntry(label, "building", 0, buildingLabel));
    });

  return {
    labelObjects,
    optionalLabelObjects,
    districtLabelEntries,
    optionalLabelEntries,
    districtLabelElements,
  };
}

export function createRoadLabelLayer({
  routes,
  showLabels,
}: {
  routes: RouteTemplate[];
  showLabels: boolean;
}) {
  const labelObjects: CSS2DObject[] = [];
  const optionalLabelObjects: CSS2DObject[] = [];
  const optionalLabelEntries: SceneLabelEntry[] = [];

  routes
    .filter((route) => route.name)
    .slice(0, 6)
    .forEach((route) => {
      const routeName = route.name as string;
      const sample = sampleRoute(route, route.totalLength * 0.4);
      const label = new CSS2DObject(labelElement(routeName, "road"));
      label.position.copy(sample.position.clone().setY(1.6));
      label.visible = showLabels;
      labelObjects.push(label);
      optionalLabelObjects.push(label);
      optionalLabelEntries.push(sceneLabelEntry(label, "road", 2, route.name));
    });

  return { labelObjects, optionalLabelObjects, optionalLabelEntries };
}
