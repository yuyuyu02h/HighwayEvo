import * as THREE from 'three';
import { DistrictConfig, DistrictType } from '../types';
import { getHighwayPath } from './highway';
import {
  getModernOfficeFacadeTexture,
  getApartmentFacadeTexture,
  getIndustrialFacadeTexture,
  getConcreteTexture,
  getVendingMachineTexture,
  getRooftopNeonSignTexture,
} from './textures';

// Shared materials and geometries for optimal performance
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 16);

// Color constants matching the sunset mood
const PALETTE = {
  sunsetGold: 0xf5a456,
  warmLight: 0xffd180,
  tvCool: 0x86b9d6,
  metalDark: 0x3d3834,
  metalLight: 0x6e655c,
  concrete: 0x6b635a,
  warningRed: 0xff453a,
  neonCyan: 0x00e5ff,
  neonAmber: 0xffa726,
};

export const DISTRICT_CONFIGS: Record<DistrictType, DistrictConfig> = {
  commercial: {
    name: 'commercial',
    title: '湾岸新都心 Commercial District',
    heightRange: [24, 75],
    widthRange: [14, 26],
    depthRange: [14, 26],
    gap: [8, 16],
    colors: [0x544c45, 0x665c52, 0x47423c],
    accentColors: [0xf5a456, 0x86b9d6],
    windowDensity: 0.8,
  },
  apartment: {
    name: 'apartment',
    title: '海岸通り住宅街 Residential Quarter',
    heightRange: [18, 48],
    widthRange: [12, 22],
    depthRange: [12, 22],
    gap: [7, 14],
    colors: [0x5e564d, 0x6c6257, 0x504941],
    accentColors: [0xffd18a, 0xd9825b],
    windowDensity: 0.6,
  },
  industrial: {
    name: 'industrial',
    title: '臨海工業地帯 Industrial Harbor',
    heightRange: [12, 32],
    widthRange: [16, 32],
    depthRange: [16, 32],
    gap: [12, 22],
    colors: [0x4d4740, 0x3d3832, 0x595046],
    accentColors: [0xd95a45, 0x8c7b64],
    windowDensity: 0.3,
  },
  downtown: {
    name: 'downtown',
    title: '都心環状摩天楼 Downtown Metropolis',
    heightRange: [38, 95],
    widthRange: [16, 30],
    depthRange: [16, 30],
    gap: [6, 12],
    colors: [0x4a433d, 0x5c5248, 0x3b3530],
    accentColors: [0xffe082, 0x81d4fa],
    windowDensity: 0.9,
  },
};

/**
 * Creates an intricate rooftop mechanical penthouse, cooling tower, water tank, and antenna.
 */
export function createRooftopInfrastructure(
  width: number,
  depth: number,
  height: number,
  baseX: number,
  baseZ: number,
  beaconsList: { mesh: THREE.Mesh; phase: number }[]
): THREE.Group {
  const group = new THREE.Group();
  const concMat = new THREE.MeshStandardMaterial({
    map: getConcreteTexture(),
    roughness: 0.85,
    metalness: 0.1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.metalDark,
    roughness: 0.5,
    metalness: 0.6,
  });

  // 1. Elevator/Stair Mechanical Penthouse
  const phW = width * (0.35 + Math.random() * 0.2);
  const phD = depth * (0.35 + Math.random() * 0.2);
  const phH = 3.5 + Math.random() * 2.5;
  const phX = baseX + (Math.random() - 0.5) * (width - phW) * 0.6;
  const phZ = baseZ + (Math.random() - 0.5) * (depth - phD) * 0.6;

  const penthouse = new THREE.Mesh(new THREE.BoxGeometry(phW, phH, phD), concMat);
  penthouse.position.set(phX, height + phH / 2, phZ);
  group.add(penthouse);

  // Penthouse steel access door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.1), metalMat);
  door.position.set(phX, height + 0.9, phZ + phD / 2 + 0.05);
  group.add(door);

  // 2. Parapet Perimeter Railing
  const parapetH = 0.9;
  const parapetThick = 0.25;
  const pFront = new THREE.Mesh(new THREE.BoxGeometry(width, parapetH, parapetThick), concMat);
  pFront.position.set(baseX, height + parapetH / 2, baseZ + depth / 2 - parapetThick / 2);
  group.add(pFront);

  const pBack = pFront.clone();
  pBack.position.z = baseZ - depth / 2 + parapetThick / 2;
  group.add(pBack);

  // 3. Cylindrical Rooftop Water Tank on 4-leg Steel Lattice Frame
  if (Math.random() < 0.65) {
    const tankR = 1.2 + Math.random() * 0.6;
    const tankH = 2.4 + Math.random() * 0.8;
    const tankX = baseX + (Math.random() - 0.5) * (width * 0.5);
    const tankZ = baseZ + (Math.random() - 0.5) * (depth * 0.5);
    const tankY = height + 1.8;

    const legGeo = new THREE.BoxGeometry(0.12, 1.8, 0.12);
    const offsets = [
      [-tankR * 0.7, -tankR * 0.7],
      [tankR * 0.7, -tankR * 0.7],
      [-tankR * 0.7, tankR * 0.7],
      [tankR * 0.7, tankR * 0.7],
    ];
    offsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(tankX + ox, height + 0.9, tankZ + oz);
      group.add(leg);
    });

    const tankMesh = new THREE.Mesh(
      cylinderGeo,
      new THREE.MeshStandardMaterial({
        color: 0x8a9299,
        roughness: 0.4,
        metalness: 0.7,
      })
    );
    tankMesh.scale.set(tankR, tankH, tankR);
    tankMesh.position.set(tankX, tankY + tankH / 2, tankZ);
    group.add(tankMesh);
  }

  // 4. Industrial HVAC Air Handling / Chiller Units with Fan Grilles
  const hvacCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < hvacCount; i++) {
    const hw = 1.4 + Math.random() * 0.8;
    const hh = 1.0 + Math.random() * 0.5;
    const hd = 1.4 + Math.random() * 0.8;
    const hx = baseX + (Math.random() - 0.5) * (width * 0.6);
    const hz = baseZ + (Math.random() - 0.5) * (depth * 0.6);

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), metalMat);
    hvac.position.set(hx, height + hh / 2, hz);
    group.add(hvac);

    const fanGrille = new THREE.Mesh(
      cylinderGeo,
      new THREE.MeshBasicMaterial({ color: 0x1a1816 })
    );
    fanGrille.scale.set(hw * 0.35, 0.08, hd * 0.35);
    fanGrille.position.set(hx, height + hh + 0.04, hz);
    group.add(fanGrille);
  }

  // 5. Communications / Telecom Antenna Mast with Red Pulsing Warning Beacon
  if (height > 30 || Math.random() < 0.45) {
    const mastH = 6 + Math.random() * 12;
    const mastX = phX;
    const mastZ = phZ;

    const mast = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, mastH, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xd93829, metalness: 0.8, roughness: 0.3 })
    );
    mast.position.set(mastX, height + phH + mastH / 2, mastZ);
    group.add(mast);

    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), metalMat);
    arm1.position.set(mastX, height + phH + mastH * 0.6, mastZ);
    group.add(arm1);

    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), metalMat);
    arm2.position.set(mastX, height + phH + mastH * 0.8, mastZ);
    group.add(arm2);

    const beacon = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshBasicMaterial({ color: PALETTE.warningRed, fog: false })
    );
    beacon.position.set(mastX, height + phH + mastH + 0.2, mastZ);
    group.add(beacon);
    beaconsList.push({ mesh: beacon, phase: Math.random() * Math.PI * 2 });
  }

  // 6. Helipad Markings (on large wide downtown towers)
  if (width > 22 && depth > 22 && height > 50) {
    const padR = 7;
    const ringGeo = new THREE.RingGeometry(padR - 0.4, padR, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd54f, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(baseX, height + 0.04, baseZ);
    group.add(ring);

    const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 4.5), barMat);
    bar1.position.set(baseX - 1.2, height + 0.05, baseZ);
    group.add(bar1);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 4.5), barMat);
    bar2.position.set(baseX + 1.2, height + 0.05, baseZ);
    group.add(bar2);
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.6), barMat);
    crossBar.position.set(baseX, height + 0.05, baseZ);
    group.add(crossBar);
  }

  // 7. Rooftop Window-Washing Maintenance Crane (BMU)
  if (height > 35 && Math.random() < 0.6) {
    const bmuBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.4), metalMat);
    bmuBase.position.set(baseX + (Math.random() - 0.5) * (width * 0.4), height + 0.3, baseZ + (Math.random() - 0.5) * (depth * 0.4));
    group.add(bmuBase);

    // Boom arm
    const boomH = 4.5;
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, boomH, 8), metalMat);
    boom.rotation.z = 0.55;
    boom.position.set(bmuBase.position.x + 1.2, height + 0.6 + boomH * 0.4, bmuBase.position.z);
    group.add(boom);

    // Counterweight
    const counterweight = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffcc00 })
    );
    counterweight.position.set(bmuBase.position.x - 0.6, height + 0.7, bmuBase.position.z);
    group.add(counterweight);
  }

  // 8. Rooftop Japanese Corporate Neon Signboard with Steel Truss Scaffolding
  if (width > 12 && (height > 25 || Math.random() < 0.55)) {
    const brands = [
      { k: '湾岸興産', e: 'WANGAN CORP', c1: '#ff9800', c2: '#00e5ff' },
      { k: '東京電子', e: 'TOKYO ELECTRON', c1: '#00e5ff', c2: '#ffeb3b' },
      { k: '大森港運', e: 'OMORI LOGISTICS', c1: '#ff3d00', c2: '#ffea00' },
      { k: '三井信託', e: 'MITSUI TRUST', c1: '#ffa726', c2: '#69f0ae' },
      { k: '日本精密', e: 'NIPPON PRECISION', c1: '#00e5ff', c2: '#ff1744' },
      { k: 'ベイフロント', e: 'BAYFRONT TOWER', c1: '#ff4081', c2: '#00e5ff' },
    ];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const signTex = getRooftopNeonSignTexture(brand.k, brand.e, brand.c1, brand.c2);

    const signW = Math.min(width * 0.75, 14);
    const signH = signW * 0.45;
    const signMat = new THREE.MeshBasicMaterial({ map: signTex, fog: true });

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(signW, signH, 0.2), signMat);
    const sZ = baseZ + depth * 0.35;
    signBoard.position.set(baseX, height + 1.2 + signH / 2, sZ);
    group.add(signBoard);

    // Steel lattice support scaffolding struts
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x3d3834, metalness: 0.7, roughness: 0.4 });
    [-signW * 0.4, 0, signW * 0.4].forEach((tx) => {
      // Vertical back legs
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, signH + 1.2, 0.15), trussMat);
      leg.position.set(baseX + tx, height + (signH + 1.2) / 2, sZ - 0.2);
      group.add(leg);

      // Diagonal rear kickers
      const kicker = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, signH * 1.3, 6), trussMat);
      kicker.rotation.x = -0.55;
      kicker.position.set(baseX + tx, height + signH * 0.45, sZ - 1.2);
      group.add(kicker);
    });
  }

  return group;
}

/**
 * Creates exterior architectural fire escape stairs running down the side wall.
 */
export function createFireEscape(
  startX: number,
  baseY: number,
  topY: number,
  sideZ: number,
  facingX: number
): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x2e2926,
    roughness: 0.7,
    metalness: 0.5,
  });

  const storyH = 3.2;
  const stories = Math.min(10, Math.floor((topY - baseY) / storyH));

  for (let s = 1; s <= stories; s++) {
    const y = baseY + s * storyH;

    const plat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 2.2), steelMat);
    plat.position.set(startX + facingX * 0.85, y, sideZ);
    group.add(plat);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.08), steelMat);
    rail.position.set(startX + facingX * 0.85, y + 0.45, sideZ + 1.05);
    group.add(rail);

    if (s < stories) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 2.4), steelMat);
      stair.rotation.x = 0.55 * (s % 2 === 0 ? 1 : -1);
      stair.position.set(startX + facingX * 0.85, y + storyH / 2, sideZ);
      group.add(stair);
    }
  }

  return group;
}

/**
 * Builds an authentic, architecturally intricate building strictly setback outside the highway boundary:
 * - Positioned along the road curve with guaranteed safe clearance (never overlapping the road)
 * - Podium / retail base with illuminated entrance lobby and awnings
 * - Setback tower shaft with high-res textured facades
 * - Air conditioning outdoor compressors on wall brackets
 * - Fire escapes and vertical signage
 * - Rooftop crown and mechanical infrastructure
 */
export function buildDetailedBuilding(
  side: number,
  zPos: number,
  district: DistrictConfig,
  beaconsList: { mesh: THREE.Mesh; phase: number }[],
  absIndex: number
): { group: THREE.Group; width: number; depth: number; height: number } {
  const group = new THREE.Group();

  const h = THREE.MathUtils.lerp(district.heightRange[0], district.heightRange[1], Math.random());
  const w = THREE.MathUtils.lerp(district.widthRange[0], district.widthRange[1], Math.random());
  const d = THREE.MathUtils.lerp(district.depthRange[0], district.depthRange[1], Math.random());

  // Building components
  const podiumH = 4.8;
  const podiumW = w + 1.6;
  const podiumD = d + 1.6;

  // Maximum projection towards road from building center
  const maxProjectionTowardsRoad = podiumW / 2 + 1.8;

  // Mathematical Clearance:
  // LANE_HALF (6.5) + shoulderW (3.6) = 10.1m.
  // Buffer gap = 3.8m.
  // So minimum distance from road center to building edge = 13.9m.
  // Center distance from road center = 13.9 + maxProjectionTowardsRoad + random variance.
  const centerDistance = 13.9 + maxProjectionTowardsRoad + Math.random() * 12.0;

  // Calculate position along curved highway
  const worldD = absIndex * 120 + (-zPos);
  const path = getHighwayPath(worldD);
  const nx = Math.cos(path.angle);
  const nz = Math.sin(path.angle);

  const bX = path.x + side * centerDistance * nx;
  const bZ = zPos + side * centerDistance * nz;

  group.position.set(bX, 0, bZ);
  group.rotation.y = -path.angle;

  // Select facade texture by district archetype
  let facadeTexture: THREE.CanvasTexture;
  if (district.name === 'commercial' || district.name === 'downtown') {
    facadeTexture = getModernOfficeFacadeTexture();
  } else if (district.name === 'apartment') {
    facadeTexture = getApartmentFacadeTexture();
  } else {
    facadeTexture = getIndustrialFacadeTexture();
  }

  // 1. Street-Level Podium Base
  const podiumMat = new THREE.MeshStandardMaterial({
    map: getConcreteTexture(),
    roughness: 0.8,
    metalness: 0.1,
  });
  const podium = new THREE.Mesh(new THREE.BoxGeometry(podiumW, podiumH, podiumD), podiumMat);
  podium.position.set(0, podiumH / 2, 0);
  group.add(podium);

  // Street-level illuminated entrance lobby facing highway
  const entranceW = podiumW * 0.65;
  const entranceH = 3.2;
  const entranceGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, entranceH, entranceW),
    new THREE.MeshBasicMaterial({
      color: PALETTE.warmLight,
      transparent: true,
      opacity: 0.85,
    })
  );
  entranceGlass.position.set(-side * (podiumW / 2 + 0.05), entranceH / 2 + 0.2, 0);
  group.add(entranceGlass);

  // Entrance awning / canopy
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.2, entranceW + 0.6),
    new THREE.MeshStandardMaterial({ color: PALETTE.metalDark, metalness: 0.7, roughness: 0.3 })
  );
  canopy.position.set(-side * (podiumW / 2 + 0.8), entranceH + 0.3, 0);
  group.add(canopy);

  // 2. Main Tower Shaft with Stepped Setback
  const hasSetback = h > 35 && Math.random() < 0.6;
  const towerH = hasSetback ? h * 0.65 : h;
  const towerW = w;
  const towerD = d;

  const towerMat = new THREE.MeshStandardMaterial({
    map: facadeTexture,
    roughness: 0.35,
    metalness: 0.25,
  });
  const towerGeo = new THREE.BoxGeometry(towerW, towerH, towerD);
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.set(0, podiumH + towerH / 2, 0);
  group.add(tower);

  // Vertical Architectural Corner LED Fin Accent Strips (Tokyo Dusk Skyline glow)
  if ((district.name === 'commercial' || district.name === 'downtown') && h > 28) {
    const ledColor = Math.random() < 0.65 ? 0xffa726 : 0x00e5ff;
    const finMat = new THREE.MeshBasicMaterial({ color: ledColor, fog: true });
    const finGeo = new THREE.BoxGeometry(0.2, towerH, 0.2);

    [-1, 1].forEach((cx) => {
      [-1, 1].forEach((cz) => {
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.set(cx * (towerW / 2 + 0.05), podiumH + towerH / 2, cz * (towerD / 2 + 0.05));
        group.add(fin);
      });
    });
  }

  let finalTopY = podiumH + towerH;
  let finalTopW = towerW;
  let finalTopD = towerD;
  let finalTopX = 0;

  // Upper setback tower
  if (hasSetback) {
    const upperH = h - towerH;
    const upperW = towerW * 0.72;
    const upperD = towerD * 0.72;
    const upperX = (Math.random() - 0.5) * (towerW - upperW) * 0.4;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(upperW, upperH, upperD), towerMat);
    upper.position.set(upperX, finalTopY + upperH / 2, 0);
    group.add(upper);

    finalTopY += upperH;
    finalTopW = upperW;
    finalTopD = upperD;
    finalTopX = upperX;
  }

  // 3. Rooftop mechanical systems & crowns
  const roof = createRooftopInfrastructure(
    finalTopW,
    finalTopD,
    finalTopY,
    finalTopX,
    0,
    beaconsList
  );
  group.add(roof);

  // 4. Fire Escape on side wall facing along highway
  if ((district.name === 'apartment' || district.name === 'commercial') && Math.random() < 0.4) {
    const fe = createFireEscape(
      0,
      podiumH,
      finalTopY - 4,
      d * 0.35,
      side
    );
    group.add(fe);
  }

  // 5. Exterior Wall Air-Conditioner Units on Brackets
  if (district.name === 'apartment' && Math.random() < 0.7) {
    const acGeo = new THREE.BoxGeometry(0.8, 0.5, 0.4);
    const acMat = new THREE.MeshStandardMaterial({ color: 0x9e978e, roughness: 0.6 });
    const acFacingSide = -side * (towerW / 2 + 0.25);
    const floorStep = 3.2;
    const numFloors = Math.floor(towerH / floorStep);

    for (let f = 1; f < numFloors; f += 2) {
      if (Math.random() < 0.65) {
        const ac = new THREE.Mesh(acGeo, acMat);
        ac.position.set(
          acFacingSide,
          podiumH + f * floorStep + 1.2,
          (Math.random() - 0.5) * (towerD * 0.6)
        );
        group.add(ac);
      }
    }
  }

  // 6. Vertical Glowing Neon / Acrylic Corporate Signage
  if (Math.random() < 0.45) {
    const signH = 8 + Math.random() * 8;
    const signW = 1.4;
    const signColor = district.accentColors[Math.floor(Math.random() * district.accentColors.length)];

    const signMat = new THREE.MeshBasicMaterial({
      color: signColor,
      fog: true,
    });
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, signH, signW), signMat);
    signMesh.position.set(
      -side * (towerW / 2 + 0.15),
      podiumH + towerH * (0.3 + Math.random() * 0.3),
      (Math.random() - 0.5) * (towerD * 0.4)
    );
    group.add(signMesh);
  }

  // 7. Street-Level Japanese Beverage Vending Machine
  if (Math.random() < 0.3) {
    const vmMat = new THREE.MeshStandardMaterial({
      map: getVendingMachineTexture(),
      roughness: 0.4,
      metalness: 0.3,
    });
    const vm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 1.0), vmMat);
    vm.position.set(
      -side * (podiumW / 2 + 0.6),
      0.9,
      (Math.random() - 0.5) * (podiumD * 0.5)
    );
    group.add(vm);

    const glowPool = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({
        color: PALETTE.warmLight,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );
    glowPool.rotation.x = -Math.PI / 2;
    glowPool.position.set(vm.position.x - side * 0.8, 0.02, vm.position.z);
    group.add(glowPool);
  }

  // 8. Street-Level 24h Japanese Convenience Store (Combini) Storefront
  if (Math.random() < 0.38) {
    const storeW = 8.5;
    const storeH = 3.2;
    const storeD = 0.4;
    const storeX = -side * (podiumW / 2 + 0.2);
    const storeZ = (Math.random() - 0.5) * (podiumD * 0.4);

    // Glowing Convenience Store Brand Fascia Header (Lawson / FamilyMart aesthetic)
    const brandColor = Math.random() < 0.5 ? 0x00b0ff : 0x00e676;
    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.7, storeW),
      new THREE.MeshBasicMaterial({ color: brandColor, fog: false })
    );
    fascia.position.set(storeX, storeH - 0.35, storeZ);
    group.add(fascia);

    // Illuminated glass front with warm interior merchandise shelves
    const storeWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, storeH - 0.8, storeW - 0.4),
      new THREE.MeshBasicMaterial({
        color: 0xfffaed,
        transparent: true,
        opacity: 0.88,
      })
    );
    storeWindow.position.set(storeX, (storeH - 0.8) / 2, storeZ);
    group.add(storeWindow);

    // Warm sidewalk light spill
    const storeSpill = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, storeW),
      new THREE.MeshBasicMaterial({
        color: 0xffeedd,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    storeSpill.rotation.x = -Math.PI / 2;
    storeSpill.position.set(storeX - side * 2.0, 0.03, storeZ);
    group.add(storeSpill);
  }

  return {
    group,
    width: w,
    depth: d,
    height: h,
  };
}
