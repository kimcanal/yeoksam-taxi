import * as THREE from "three";
import {
  markMeshResourceSharing,
  sharedImportedTaxiClickTargetGeometry,
  sharedImportedTaxiShadowGeometry,
  sharedImportedTaxiSignGeometry,
  sharedImportedTrafficShadowGeometry,
  type VehicleKind,
  type VehiclePalette,
  vehicleAssetMaterialHint,
} from "@/components/map-simulator/core";

function createTaxiAssetGroup(
  palette: VehiclePalette,
  taxiAssetTemplate: THREE.Group,
) {
  const group = taxiAssetTemplate.clone(true);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    emissive: 0x321500,
    emissiveIntensity: 0.1,
    roughness: 0.82,
    metalness: 0.16,
  });
  const signMaterial = new THREE.MeshStandardMaterial({
    color: palette.sign ?? 0xffe1aa,
    emissive: 0x7d4800,
    emissiveIntensity: 0.28,
    roughness: 0.66,
    metalness: 0.02,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x91a1ae,
    emissive: 0x101923,
    emissiveIntensity: 0.05,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.9,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d2024,
    roughness: 0.94,
    metalness: 0.04,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x959aa0,
    roughness: 0.66,
    metalness: 0.24,
  });

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.skipGeometryDispose = true;
    child.userData.skipMaterialDispose = false;

    const hint = vehicleAssetMaterialHint(child);
    if (hint === "body") {
      child.material = bodyMaterial;
      return;
    }
    if (hint === "glass") {
      child.material = glassMaterial;
      return;
    }
    if (hint === "trim") {
      child.material = trimMaterial;
      return;
    }
    if (hint === "metal") {
      child.material = metalMaterial;
      return;
    }
    child.material = metalMaterial;
  });

  const assetBounds = new THREE.Box3().setFromObject(group);
  const sign = markMeshResourceSharing(
    new THREE.Mesh(sharedImportedTaxiSignGeometry(), signMaterial),
  );
  sign.position.set(0, assetBounds.max.y + 0.1, -0.08);
  sign.castShadow = true;
  group.add(sign);

  const shadow = new THREE.Mesh(
    sharedImportedTaxiShadowGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.userData.skipGeometryDispose = true;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const clickTarget = new THREE.Mesh(
    sharedImportedTaxiClickTargetGeometry(),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  clickTarget.userData.skipGeometryDispose = true;
  clickTarget.position.y = 1.4;
  group.add(clickTarget);

  return { group, bodyMaterial, signMaterial, clickTarget };
}

function createTrafficAssetGroup(
  palette: VehiclePalette,
  trafficAssetTemplate: THREE.Group,
) {
  const group = trafficAssetTemplate.clone(true);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    emissive: 0x111417,
    emissiveIntensity: 0.05,
    roughness: 0.88,
    metalness: 0.12,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x96a6b3,
    emissive: 0x101923,
    emissiveIntensity: 0.04,
    roughness: 0.2,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x20242a,
    roughness: 0.95,
    metalness: 0.03,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x959ba2,
    roughness: 0.7,
    metalness: 0.22,
  });

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.skipGeometryDispose = true;
    child.userData.skipMaterialDispose = false;

    const hint = vehicleAssetMaterialHint(child);
    if (hint === "body") {
      child.material = bodyMaterial;
      return;
    }
    if (hint === "glass") {
      child.material = glassMaterial;
      return;
    }
    if (hint === "trim") {
      child.material = trimMaterial;
      return;
    }
    if (hint === "metal") {
      child.material = metalMaterial;
      return;
    }
    child.material = metalMaterial;
  });

  const shadow = new THREE.Mesh(
    sharedImportedTrafficShadowGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.userData.skipGeometryDispose = true;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, bodyMaterial, signMaterial: null, clickTarget: null };
}

export function createVehicleGroup(
  kind: VehicleKind,
  palette: VehiclePalette,
  {
    taxiAssetTemplate = null,
    importedAssetTemplate = null,
  }: {
    taxiAssetTemplate?: THREE.Group | null;
    importedAssetTemplate?: THREE.Group | null;
  } = {},
) {
  if (kind === "taxi" && taxiAssetTemplate) {
    return createTaxiAssetGroup(palette, taxiAssetTemplate);
  }
  if (kind === "traffic" && importedAssetTemplate) {
    return createTrafficAssetGroup(palette, importedAssetTemplate);
  }

  const group = new THREE.Group();
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
      kind === "taxi" ? 1.74 : 1.62,
      kind === "taxi" ? 0.78 : 1.2,
      kind === "taxi" ? 3.58 : 4.05,
    ),
    bodyMaterial,
  );
  body.position.y = kind === "taxi" ? 0.68 : 0.7;
  group.add(body);

  const lowerTrim = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.88 : 1.7,
      0.22,
      kind === "taxi" ? 4.18 : 3.94,
    ),
    trimMaterial,
  );
  lowerTrim.position.y = 0.2;
  group.add(lowerTrim);

  if (kind === "taxi") {
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
  }

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(kind === "taxi" ? 1.18 : 1.14, 0.82, 1.62),
    new THREE.MeshStandardMaterial({
      color: palette.cabin,
      roughness: kind === "taxi" ? 0.38 : 0.68,
      metalness: 0.04,
    }),
  );
  cabin.position.set(
    0,
    kind === "taxi" ? 1.34 : 1.5,
    kind === "taxi" ? -0.1 : 0.15,
  );
  group.add(cabin);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.0 : 1.08,
      0.18,
      kind === "taxi" ? 1.06 : 1.46,
    ),
    glassMaterial,
  );
  windshield.position.set(
    0,
    kind === "taxi" ? 1.78 : 2.05,
    kind === "taxi" ? 0.15 : 0.15,
  );
  group.add(windshield);

  if (kind === "taxi") {
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
    new THREE.PlaneGeometry(2.4, 4.9),
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
