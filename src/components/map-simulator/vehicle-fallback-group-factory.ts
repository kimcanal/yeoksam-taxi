import * as THREE from "three";
import {
  type VehicleKind,
  type VehiclePalette,
} from "@/components/map-simulator/map-simulator-types";
import type { TrafficVehicleModelKey } from "@/components/map-simulator/vehicle-asset-loader";

type TrafficFallbackProfile = {
  body: [number, number, number];
  bodyY: number;
  trim: [number, number, number];
  cabin: [number, number, number];
  cabinY: number;
  cabinZ: number;
  glass: [number, number, number];
  glassY: number;
  wheelZ: [number, number];
  shadow: [number, number];
};

type FallbackVehicleGroup = {
  group: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  signMaterial: THREE.MeshStandardMaterial | null;
  clickTarget: THREE.Mesh | null;
};

const TRAFFIC_FALLBACK_PROFILES: Record<
  TrafficVehicleModelKey,
  TrafficFallbackProfile
> = {
  porter: {
    body: [1.7, 1.16, 4.18],
    bodyY: 0.72,
    trim: [1.78, 0.22, 4.12],
    cabin: [1.18, 0.88, 1.35],
    cabinY: 1.48,
    cabinZ: 0.92,
    glass: [1.08, 0.18, 1.1],
    glassY: 1.98,
    wheelZ: [-1.42, 1.42],
    shadow: [2.45, 5.0],
  },
  sportage: {
    body: [1.78, 0.94, 4.2],
    bodyY: 0.68,
    trim: [1.88, 0.22, 4.12],
    cabin: [1.28, 0.82, 1.86],
    cabinY: 1.36,
    cabinZ: 0.04,
    glass: [1.18, 0.18, 1.52],
    glassY: 1.78,
    wheelZ: [-1.44, 1.46],
    shadow: [2.55, 5.0],
  },
  compact: {
    body: [1.58, 0.78, 3.8],
    bodyY: 0.64,
    trim: [1.68, 0.2, 3.72],
    cabin: [1.08, 0.72, 1.46],
    cabinY: 1.22,
    cabinZ: -0.06,
    glass: [1.0, 0.16, 1.22],
    glassY: 1.58,
    wheelZ: [-1.24, 1.24],
    shadow: [2.26, 4.5],
  },
  van: {
    body: [1.86, 1.28, 4.62],
    bodyY: 0.78,
    trim: [1.96, 0.24, 4.52],
    cabin: [1.42, 0.92, 2.18],
    cabinY: 1.54,
    cabinZ: 0.12,
    glass: [1.3, 0.18, 1.78],
    glassY: 2.04,
    wheelZ: [-1.58, 1.58],
    shadow: [2.7, 5.4],
  },
};

function trafficProfileFor(modelKey: TrafficVehicleModelKey | null | undefined) {
  return TRAFFIC_FALLBACK_PROFILES[modelKey ?? "compact"];
}

function addFallbackTaxiDetails({
  group,
  bodyMaterial,
  glassMaterial,
  headlightMaterial,
  tailLightMaterial,
}: {
  group: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  glassMaterial: THREE.MeshStandardMaterial;
  headlightMaterial: THREE.MeshStandardMaterial;
  tailLightMaterial: THREE.MeshStandardMaterial;
}) {
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.58, 0.34, 0.96),
    bodyMaterial,
  );
  hood.position.set(0, 0.92, 1.55);
  group.add(hood);

  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.32, 0.72),
    bodyMaterial,
  );
  trunk.position.set(0, 0.92, -1.63);
  group.add(trunk);

  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.16, 0.58),
    glassMaterial,
  );
  rearGlass.position.set(0, 1.72, -0.88);
  group.add(rearGlass);

  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x252017,
    emissive: 0x2a1700,
    emissiveIntensity: 0.08,
    roughness: 0.74,
    metalness: 0.03,
  });
  [-1, 1].forEach((side) => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.16, 2.72),
      stripeMaterial,
    );
    stripe.position.set(side * 0.91, 0.78, -0.02);
    group.add(stripe);
  });

  [-1, 1].forEach((side) => {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.06),
      headlightMaterial,
    );
    headlight.position.set(side * 0.46, 0.67, 2.09);
    group.add(headlight);

    const tailLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 0.06),
      tailLightMaterial,
    );
    tailLight.position.set(side * 0.46, 0.66, -2.09);
    group.add(tailLight);
  });

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x101316,
    roughness: 0.86,
    metalness: 0.08,
  });
  const wheelGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 14);
  [-1, 1].forEach((side) => {
    [-1.34, 1.36].forEach((z) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.98, 0.36, z);
      group.add(wheel);
    });
  });
}

function addFallbackTrafficDetails({
  group,
  bodyMaterial,
  trimMaterial,
  glassMaterial,
  headlightMaterial,
  tailLightMaterial,
  trafficModelKey,
  trafficProfile,
}: {
  group: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  trimMaterial: THREE.MeshStandardMaterial;
  glassMaterial: THREE.MeshStandardMaterial;
  headlightMaterial: THREE.MeshStandardMaterial;
  tailLightMaterial: THREE.MeshStandardMaterial;
  trafficModelKey: TrafficVehicleModelKey | null | undefined;
  trafficProfile: TrafficFallbackProfile;
}) {
  const trafficWindowHeight = THREE.MathUtils.clamp(
    trafficProfile.cabin[1] * 0.42,
    0.3,
    0.44,
  );
  const trafficWindowY = trafficProfile.cabinY + trafficProfile.cabin[1] * 0.08;
  const sideWindowGeometry = new THREE.BoxGeometry(
    0.045,
    trafficWindowHeight,
    trafficProfile.cabin[2] * 0.58,
  );
  const frontWindowGeometry = new THREE.BoxGeometry(
    trafficProfile.cabin[0] * 0.68,
    trafficWindowHeight,
    0.055,
  );
  [-1, 1].forEach((side) => {
    const sideWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
    sideWindow.position.set(
      side * (trafficProfile.cabin[0] * 0.5 + 0.035),
      trafficWindowY,
      trafficProfile.cabinZ - trafficProfile.cabin[2] * 0.04,
    );
    group.add(sideWindow);
  });

  const frontWindow = new THREE.Mesh(frontWindowGeometry, glassMaterial);
  frontWindow.position.set(
    0,
    trafficWindowY,
    trafficProfile.cabinZ + trafficProfile.cabin[2] * 0.5 + 0.035,
  );
  group.add(frontWindow);

  const rearWindow = new THREE.Mesh(frontWindowGeometry, glassMaterial);
  rearWindow.position.set(
    0,
    trafficWindowY,
    trafficProfile.cabinZ - trafficProfile.cabin[2] * 0.5 - 0.035,
  );
  group.add(rearWindow);

  const bumperGeometry = new THREE.BoxGeometry(
    trafficProfile.body[0] * 0.86,
    0.16,
    0.16,
  );
  const frontBumper = new THREE.Mesh(bumperGeometry, trimMaterial);
  frontBumper.position.set(
    0,
    trafficProfile.bodyY - trafficProfile.body[1] * 0.18,
    trafficProfile.body[2] * 0.5 + 0.12,
  );
  group.add(frontBumper);

  const rearBumper = new THREE.Mesh(bumperGeometry, trimMaterial);
  rearBumper.position.set(
    0,
    trafficProfile.bodyY - trafficProfile.body[1] * 0.18,
    -trafficProfile.body[2] * 0.5 - 0.12,
  );
  group.add(rearBumper);

  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(trafficProfile.body[0] * 0.42, 0.18, 0.045),
    trimMaterial,
  );
  grille.position.set(
    0,
    trafficProfile.bodyY + trafficProfile.body[1] * 0.04,
    trafficProfile.body[2] * 0.5 + 0.17,
  );
  group.add(grille);

  if (trafficModelKey === "compact" || trafficModelKey === "sportage") {
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(
        trafficProfile.body[0] * 0.82,
        0.2,
        trafficProfile.body[2] * 0.22,
      ),
      bodyMaterial,
    );
    hood.position.set(
      0,
      trafficProfile.bodyY + trafficProfile.body[1] * 0.5 + 0.04,
      trafficProfile.body[2] * 0.28,
    );
    group.add(hood);
  }

  [-1, 1].forEach((side) => {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.11, 0.06),
      headlightMaterial,
    );
    headlight.position.set(
      side * (trafficProfile.body[0] * 0.28),
      trafficProfile.bodyY + trafficProfile.body[1] * 0.18,
      trafficProfile.body[2] * 0.5 + 0.03,
    );
    group.add(headlight);

    const tailLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 0.06),
      tailLightMaterial,
    );
    tailLight.position.set(
      side * (trafficProfile.body[0] * 0.28),
      trafficProfile.bodyY + trafficProfile.body[1] * 0.16,
      -trafficProfile.body[2] * 0.5 - 0.03,
    );
    group.add(tailLight);
  });

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x101316,
    roughness: 0.86,
    metalness: 0.08,
  });
  const wheelGeometry = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 14);
  [-1, 1].forEach((side) => {
    trafficProfile.wheelZ.forEach((z) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * (trafficProfile.body[0] * 0.58), 0.34, z);
      group.add(wheel);
    });
  });
}

export function createFallbackVehicleGroup(
  kind: VehicleKind,
  palette: VehiclePalette,
  {
    trafficModelKey = null,
  }: {
    trafficModelKey?: TrafficVehicleModelKey | null;
  } = {},
): FallbackVehicleGroup {
  const group = new THREE.Group();
  const trafficProfile =
    kind === "traffic" ? trafficProfileFor(trafficModelKey) : null;
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    roughness: kind === "taxi" ? 0.58 : 0.9,
    metalness: kind === "taxi" ? 0.22 : 0.12,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x171b20,
    roughness: 0.92,
    metalness: 0.04,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x92a7b5,
    emissive: 0x0d1720,
    emissiveIntensity: 0.06,
    roughness: 0.18,
    metalness: 0.08,
  });
  const fallbackCabinMaterial =
    kind === "taxi"
      ? new THREE.MeshStandardMaterial({
        color: palette.cabin,
        roughness: 0.38,
        metalness: 0.04,
      })
      : bodyMaterial;
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff6cf,
    emissive: 0xffd27a,
    emissiveIntensity: 0.32,
    roughness: 0.35,
    metalness: 0.02,
  });
  const tailLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4c62,
    emissive: 0xff2038,
    emissiveIntensity: 0.28,
    roughness: 0.42,
    metalness: 0.02,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.74 : trafficProfile!.body[0],
      kind === "taxi" ? 0.78 : trafficProfile!.body[1],
      kind === "taxi" ? 3.58 : trafficProfile!.body[2],
    ),
    bodyMaterial,
  );
  body.position.y = kind === "taxi" ? 0.68 : trafficProfile!.bodyY;
  group.add(body);

  const lowerTrim = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.88 : trafficProfile!.trim[0],
      kind === "taxi" ? 0.22 : trafficProfile!.trim[1],
      kind === "taxi" ? 4.18 : trafficProfile!.trim[2],
    ),
    trimMaterial,
  );
  lowerTrim.position.y = 0.2;
  group.add(lowerTrim);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.18 : trafficProfile!.cabin[0],
      kind === "taxi" ? 0.82 : trafficProfile!.cabin[1],
      kind === "taxi" ? 1.62 : trafficProfile!.cabin[2],
    ),
    fallbackCabinMaterial,
  );
  cabin.position.set(
    0,
    kind === "taxi" ? 1.34 : trafficProfile!.cabinY,
    kind === "taxi" ? -0.1 : trafficProfile!.cabinZ,
  );
  group.add(cabin);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.0 : trafficProfile!.glass[0],
      kind === "taxi" ? 0.18 : trafficProfile!.glass[1],
      kind === "taxi" ? 1.06 : trafficProfile!.glass[2],
    ),
    glassMaterial,
  );
  windshield.position.set(
    0,
    kind === "taxi" ? 1.78 : trafficProfile!.glassY,
    kind === "taxi" ? 0.15 : trafficProfile!.cabinZ,
  );
  group.add(windshield);

  if (kind === "taxi") {
    addFallbackTaxiDetails({
      group,
      bodyMaterial,
      glassMaterial,
      headlightMaterial,
      tailLightMaterial,
    });
  } else {
    addFallbackTrafficDetails({
      group,
      bodyMaterial,
      trimMaterial,
      glassMaterial,
      headlightMaterial,
      tailLightMaterial,
      trafficModelKey,
      trafficProfile: trafficProfile!,
    });
  }

  let signMaterial: THREE.MeshStandardMaterial | null = null;
  if (kind === "taxi") {
    signMaterial = new THREE.MeshStandardMaterial({
      color: palette.sign ?? 0xfff9d8,
      emissive: 0x6b4300,
      emissiveIntensity: 0.34,
      roughness: 0.46,
      metalness: 0,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.16, 0.34),
      signMaterial,
    );
    sign.position.set(0, 1.88, -0.12);
    group.add(sign);
  }

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(
      kind === "taxi" ? 2.4 : trafficProfile!.shadow[0],
      kind === "taxi" ? 4.9 : trafficProfile!.shadow[1],
    ),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  let clickTarget: THREE.Mesh | null = null;
  if (kind === "taxi") {
    clickTarget = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.2, 6.8),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
    );
    clickTarget.position.y = 1.4;
    group.add(clickTarget);
  }

  return { group, bodyMaterial, signMaterial, clickTarget };
}
