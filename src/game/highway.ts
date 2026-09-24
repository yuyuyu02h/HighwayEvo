import * as THREE from 'three';
import {
  getRoadAsphaltTexture,
  getConcreteTexture,
  getHighwayOverheadSignTexture,
  getHighwayLedMatrixTexture,
  getPavementMarkerTexture,
  getNoiseBarrierPanelTexture,
} from './textures';

export const ROAD_WIDTH = 13;
export const LANE_HALF = ROAD_WIDTH / 2;
export const STEER_LIMIT = LANE_HALF - 1.3;
export const SEGMENT_LENGTH = 120;
export const NUM_SEGMENTS = 7;
export const TOTAL_LENGTH = SEGMENT_LENGTH * NUM_SEGMENTS;
export const RECYCLE_MARGIN = 12;

/**
 * Calculates the horizontal curve of the highway as a smooth, continuous function of distance.
 * Features:
 * - Straight launch section (first 60m)
 * - Gentle, sweeping curves with long wavelengths (450m - 1200m)
 * - Maximum lateral turn angle ~ 16 degrees, providing authentic expressway curvature without sharp kinks
 */
export function getHighwayPath(distance: number): { x: number; angle: number; curvature: number } {
  const fade = Math.min(1, Math.max(0, (distance - 50) / 100));

  const w1 = (2 * Math.PI) / 540;
  const w2 = (2 * Math.PI) / 980;
  const w3 = (2 * Math.PI) / 1650;

  const a1 = 36;
  const a2 = 24;
  const a3 = 14;

  const x = fade * (
    Math.sin(distance * w1) * a1 +
    Math.sin(distance * w2 + 0.8) * a2 +
    Math.sin(distance * w3 + 2.1) * a3
  );

  const dx = fade * (
    Math.cos(distance * w1) * a1 * w1 +
    Math.cos(distance * w2 + 0.8) * a2 * w2 +
    Math.cos(distance * w3 + 2.1) * a3 * w3
  );

  const angle = Math.atan(dx);

  const d2x = fade * (
    -Math.sin(distance * w1) * a1 * w1 * w1 +
    -Math.sin(distance * w2 + 0.8) * a2 * w2 * w2 +
    -Math.sin(distance * w3 + 2.1) * a3 * w3 * w3
  );

  return { x, angle, curvature: d2x };
}

// Shared highway materials
const asphaltMaps = getRoadAsphaltTexture();
const roadMaterial = new THREE.MeshStandardMaterial({
  map: asphaltMaps.map,
  roughnessMap: asphaltMaps.roughnessMap,
  roughness: 0.72,
  metalness: 0.15,
});
asphaltMaps.map.repeat.set(2, 8);
asphaltMaps.roughnessMap.repeat.set(2, 8);

const concreteMat = new THREE.MeshStandardMaterial({
  map: getConcreteTexture(),
  roughness: 0.85,
  metalness: 0.1,
});

const steelPostMat = new THREE.MeshStandardMaterial({
  color: 0x4a4540,
  roughness: 0.5,
  metalness: 0.7,
});

const wBeamMat = new THREE.MeshStandardMaterial({
  color: 0x8f887f,
  roughness: 0.45,
  metalness: 0.65,
});

const lineWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf5ede1, fog: true });
const lineYellowMat = new THREE.MeshBasicMaterial({ color: 0xffb300, fog: true });
const catEyeMat = new THREE.MeshStandardMaterial({
  map: getPavementMarkerTexture(),
  roughness: 0.2,
  metalness: 0.8,
  emissive: 0x332005,
});

const lampGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffd180,
  fog: false,
});

const wireMat = new THREE.LineBasicMaterial({
  color: 0x1f1b17,
  fog: true,
  linewidth: 1,
});

/**
 * Builds the curved road surface, shoulders, curbs, guardrails, and cat's eyes
 * for a segment with the given absIndex.
 */
export function buildCurvedRoad(group: THREE.Group, absIndex: number): void {
  const steps = 16;
  const stepLength = SEGMENT_LENGTH / steps;

  // Sample the highway centerline path across the segment
  interface PathPoint {
    z: number;
    x: number;
    angle: number;
    nx: number;
    nz: number;
    dist: number;
  }
  const points: PathPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const localZ = -i * stepLength;
    const worldDist = absIndex * SEGMENT_LENGTH + i * stepLength;
    const path = getHighwayPath(worldDist);
    const nx = Math.cos(path.angle);
    const nz = Math.sin(path.angle);
    points.push({
      z: localZ,
      x: path.x,
      angle: path.angle,
      nx,
      nz,
      dist: worldDist,
    });
  }

  // Helper to generate a lofted ribbon quad mesh along the path
  function buildRibbonMesh(
    innerOffset: number,
    outerOffset: number,
    yLevel: number,
    material: THREE.Material,
    uScale = 1
  ): THREE.Mesh {
    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const p = points[i];
      const x1 = p.x + innerOffset * p.nx;
      const z1 = p.z + innerOffset * p.nz;
      const x2 = p.x + outerOffset * p.nx;
      const z2 = p.z + outerOffset * p.nz;

      pos.push(x1, yLevel, z1);
      pos.push(x2, yLevel, z2);

      const v = (i / steps) * uScale;
      uvs.push(0, v);
      uvs.push(1, v);

      if (i < steps) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return new THREE.Mesh(geo, material);
  }

  // 1. Main Asphalt Expressway Deck (-LANE_HALF to +LANE_HALF)
  const roadDeck = buildRibbonMesh(-LANE_HALF, LANE_HALF, -0.05, roadMaterial, 8);
  group.add(roadDeck);

  // 2. Concrete Road Shoulders
  const shoulderW = 3.6;
  const shoulderL = buildRibbonMesh(-(LANE_HALF + shoulderW), -LANE_HALF, -0.06, concreteMat, 4);
  group.add(shoulderL);
  const shoulderR = buildRibbonMesh(LANE_HALF, LANE_HALF + shoulderW, -0.06, concreteMat, 4);
  group.add(shoulderR);

  // 3. Raised Curb Stone Edge Bevels
  const curbW = 0.28;
  const curbL = buildRibbonMesh(-(LANE_HALF + curbW), -LANE_HALF, 0.08, concreteMat, 4);
  group.add(curbL);
  const curbR = buildRibbonMesh(LANE_HALF, LANE_HALF + curbW, 0.08, concreteMat, 4);
  group.add(curbR);

  // 4. Solid White Fog Lines on outer edges of lanes
  const fogLineWidth = 0.22;
  const fogL = buildRibbonMesh(-(LANE_HALF - 0.4), -(LANE_HALF - 0.4 + fogLineWidth), 0.012, lineWhiteMat, 1);
  group.add(fogL);
  const fogR = buildRibbonMesh((LANE_HALF - 0.4 - fogLineWidth), (LANE_HALF - 0.4), 0.012, lineWhiteMat, 1);
  group.add(fogR);

  // 5. Dashed Center Dividing Line & Cat's Eyes (Bott's Dots)
  const dashLen = 5.0;
  const dashGap = 5.0;
  const dashGeo = new THREE.BoxGeometry(0.24, 0.02, dashLen);
  const studGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8);

  for (let z = -2.5; z > -SEGMENT_LENGTH; z -= (dashLen + dashGap)) {
    const worldD = absIndex * SEGMENT_LENGTH + (-z);
    const path = getHighwayPath(worldD);

    const dash = new THREE.Mesh(dashGeo, lineWhiteMat);
    dash.position.set(path.x, 0.015, z - dashLen / 2);
    dash.rotation.y = -path.angle;
    group.add(dash);

    // Reflective cat's eye stud between dashes
    const studD = worldD + dashLen + dashGap / 2;
    const studPath = getHighwayPath(studD);
    const stud = new THREE.Mesh(studGeo, catEyeMat);
    stud.position.set(studPath.x, 0.025, z - dashLen - dashGap / 2);
    stud.rotation.y = -studPath.angle;
    group.add(stud);
  }

  // 6. Curved W-Beam Guardrails with I-Beam Support Posts
  const railH = 0.72;
  const railW = 0.18;
  const postSpacing = 4.0;

  [-1, 1].forEach((side) => {
    const latOffset = side * (LANE_HALF + 0.35);

    // Guardrail upper ribbon
    const railUpper = buildRibbonMesh(
      latOffset - railW / 2,
      latOffset + railW / 2,
      railH,
      wBeamMat,
      2
    );
    group.add(railUpper);

    // Guardrail lower rubbing beam
    const railLower = buildRibbonMesh(
      latOffset - railW * 0.4,
      latOffset + railW * 0.4,
      railH * 0.48,
      wBeamMat,
      2
    );
    group.add(railLower);

    // Vertical steel support posts placed along the curve
    const postGeo = new THREE.BoxGeometry(0.12, railH + 0.2, 0.12);
    for (let z = -2; z > -SEGMENT_LENGTH; z -= postSpacing) {
      const worldD = absIndex * SEGMENT_LENGTH + (-z);
      const path = getHighwayPath(worldD);
      const nx = Math.cos(path.angle);
      const nz = Math.sin(path.angle);

      const px = path.x + latOffset * nx;
      const pz = z + latOffset * nz;

      const post = new THREE.Mesh(postGeo, steelPostMat);
      post.position.set(px, (railH + 0.2) / 2, pz);
      post.rotation.y = -path.angle;
      group.add(post);

      // Amber / White reflector on post
      const refMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.14, 0.08),
        side > 0 ? lineYellowMat : lineWhiteMat
      );
      refMesh.position.set(px - side * 0.1 * nx, railH + 0.05, pz - side * 0.1 * nz);
      refMesh.rotation.y = -path.angle;
      group.add(refMesh);
    }
  });

  // 7. Elevated Bridge / Highway Viaduct Bottom Girders
  [-1, 1].forEach((side) => {
    const latOffset = side * (LANE_HALF - 0.8);
    const girder = buildRibbonMesh(
      latOffset - 0.4,
      latOffset + 0.4,
      -1.1,
      concreteMat,
      2
    );
    group.add(girder);
  });

  // 8. Viaduct Expansion Joint Comb Plate (Segment Connection Seam)
  const seamPath = getHighwayPath(absIndex * SEGMENT_LENGTH);
  const seamGeo = new THREE.BoxGeometry(ROAD_WIDTH, 0.02, 0.42);
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x38393d,
    metalness: 0.85,
    roughness: 0.35,
  });
  const seamMesh = new THREE.Mesh(seamGeo, seamMat);
  seamMesh.position.set(seamPath.x, 0.025, -1.0);
  seamMesh.rotation.y = -seamPath.angle;
  group.add(seamMesh);

  // 9. Iconic Shuto Expressway Acoustic Noise Barrier Panels
  // Placed along one side or curves to give authentic elevated urban highway aesthetic
  const barrierSide = absIndex % 2 === 0 ? 1 : -1;
  const barrierLat = barrierSide * (LANE_HALF + 1.1);
  const barrierH = 2.8;
  const barrierPostSpacing = 4.0;
  const barrierTex = getNoiseBarrierPanelTexture();
  const barrierPanelMat = new THREE.MeshStandardMaterial({
    map: barrierTex,
    roughness: 0.25,
    metalness: 0.3,
    transparent: true,
    opacity: 0.9,
  });

  for (let z = -2; z > -SEGMENT_LENGTH + 4; z -= barrierPostSpacing) {
    const worldD = absIndex * SEGMENT_LENGTH + (-z);
    const path = getHighwayPath(worldD);
    const nx = Math.cos(path.angle);
    const nz = Math.sin(path.angle);

    const px = path.x + barrierLat * nx;
    const pz = z + barrierLat * nz;

    // Heavy green steel H-beam upright
    const hBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, barrierH, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x244238, roughness: 0.4, metalness: 0.6 })
    );
    hBeam.position.set(px, barrierH / 2, pz);
    hBeam.rotation.y = -path.angle;
    group.add(hBeam);

    // Acoustic acrylic panel spanning to next post
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, barrierH * 0.85, barrierPostSpacing - 0.2),
      barrierPanelMat
    );
    panel.position.set(px, barrierH * 0.48, pz - barrierPostSpacing / 2);
    panel.rotation.y = -path.angle;
    group.add(panel);

    // Curved top overhang baffle
    const baffle = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, barrierPostSpacing),
      new THREE.MeshStandardMaterial({ color: 0x1f3830, roughness: 0.4, metalness: 0.5 })
    );
    baffle.position.set(px - barrierSide * 0.2, barrierH + 0.1, pz - barrierPostSpacing / 2);
    baffle.rotation.y = -path.angle;
    baffle.rotation.z = -barrierSide * 0.45;
    group.add(baffle);
  }
}

/**
 * Creates overhead highway gantry positioned squarely across the curved highway.
 */
export function createHighwayGantry(
  zPos: number,
  absIndex: number,
  signTitle = '湾岸線 WANGAN LINE'
): THREE.Group {
  const gantry = new THREE.Group();
  const trussMat = steelPostMat;

  const worldD = absIndex * SEGMENT_LENGTH + (-zPos);
  const path = getHighwayPath(worldD);

  gantry.position.set(path.x, 0, zPos);
  gantry.rotation.y = -path.angle;

  const spanW = ROAD_WIDTH + 5.5;
  const clearH = 7.2;

  // Left & Right Support Tower Columns
  [-1, 1].forEach((side) => {
    const colX = side * (spanW / 2);
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, clearH, 0.5), trussMat);
    col.position.set(colX, clearH / 2, 0);
    gantry.add(col);

    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.2), trussMat);
    brace.rotation.z = side * 0.45;
    brace.position.set(colX - side * 0.6, 1.2, 0);
    gantry.add(brace);
  });

  // Horizontal Cross Truss Beam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(spanW, 0.65, 0.65), trussMat);
  beam.position.set(0, clearH, 0);
  gantry.add(beam);

  // Large Overhead Directional Route Sign
  const signTex = getHighwayOverheadSignTexture('夕凪海岸 芝浦', 'Sunset Bay / Shibaura', '14');
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.35,
    metalness: 0.2,
  });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.7, 0.15), signMat);
  signBoard.position.set(-2.2, clearH + 0.3, 0.35);
  gantry.add(signBoard);

  // Electronic LED Matrix Advisory Sign
  const ledTex = getHighwayLedMatrixTexture();
  const ledMat = new THREE.MeshBasicMaterial({ map: ledTex });
  const ledSign = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 0.15), ledMat);
  ledSign.position.set(3.2, clearH + 0.2, 0.35);
  gantry.add(ledSign);

  // Floodlights
  for (let i = -1; i <= 1; i++) {
    const lightFixture = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.6), steelPostMat);
    lightFixture.position.set(-2.2 + i * 1.8, clearH + 1.8, 0.8);
    gantry.add(lightFixture);
  }

  // Lane Control Signals: Glowing Green Down-Arrows above each driving lane
  [-LANE_HALF * 0.5, LANE_HALF * 0.5].forEach((laneX) => {
    const signalBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.25),
      steelPostMat
    );
    signalBox.position.set(laneX, clearH - 0.7, 0.2);
    gantry.add(signalBox);

    // Green illuminated arrow face
    const arrowFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.65),
      new THREE.MeshBasicMaterial({ color: 0x00e676, side: THREE.DoubleSide })
    );
    arrowFace.position.set(laneX, clearH - 0.7, 0.34);
    gantry.add(arrowFace);
  });

  // Circular Japanese Highway Speed Limit Sign (80 km/h)
  const speedSign = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  speedSign.rotation.x = Math.PI / 2;
  speedSign.position.set(spanW / 2 - 0.9, clearH + 1.5, 0.35);
  gantry.add(speedSign);

  const speedRing = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.64, 24),
    new THREE.MeshBasicMaterial({ color: 0xd50000, side: THREE.DoubleSide })
  );
  speedRing.position.set(spanW / 2 - 0.9, clearH + 1.5, 0.4);
  gantry.add(speedRing);

  return gantry;
}

/**
 * Creates modern curved highway cobra-head light pole positioned along the curve.
 */
export function createHighwayLightPole(side: number, zPos: number, absIndex: number): THREE.Group {
  const poleGroup = new THREE.Group();
  const poleH = 7.8;

  const worldD = absIndex * SEGMENT_LENGTH + (-zPos);
  const path = getHighwayPath(worldD);
  const nx = Math.cos(path.angle);
  const nz = Math.sin(path.angle);

  const latOffset = side * (LANE_HALF + 1.2);
  const px = path.x + latOffset * nx;
  const pz = zPos + latOffset * nz;

  poleGroup.position.set(px, 0, pz);
  poleGroup.rotation.y = -path.angle;

  // Vertical pole
  const poleMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, poleH, 12),
    steelPostMat
  );
  poleMesh.position.set(0, poleH / 2, 0);
  poleGroup.add(poleMesh);

  // Gracefully curved arm extending over highway
  const armLen = 2.4;
  const armMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, armLen, 8),
    steelPostMat
  );
  armMesh.rotation.z = -side * 0.7;
  armMesh.position.set(-side * (armLen * 0.4), poleH + 0.4, 0);
  poleGroup.add(armMesh);

  // Cobra-head fixture
  const luminaire = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.7),
    steelPostMat
  );
  const headX = -side * (armLen * 0.75);
  luminaire.position.set(headX, poleH + 0.95, 0);
  poleGroup.add(luminaire);

  // Glowing amber lens
  const lens = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.05, 0.55),
    lampGlowMat
  );
  lens.position.set(headX, poleH + 0.85, 0);
  poleGroup.add(lens);

  // Soft warm light pool on road surface
  const lightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffd180,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
  );
  lightPool.rotation.x = -Math.PI / 2;
  lightPool.position.set(headX, 0.02, 0);
  poleGroup.add(lightPool);

  return poleGroup;
}

/**
 * Creates roadside utility pole with crossbars and sagging catenary power lines along the curve.
 */
export function createUtilityPoleWithWires(
  side: number,
  z: number,
  nextZ: number,
  absIndex: number
): THREE.Group {
  const group = new THREE.Group();
  const poleH = 9.0;

  const worldD = absIndex * SEGMENT_LENGTH + (-z);
  const path = getHighwayPath(worldD);
  const nx = Math.cos(path.angle);
  const nz = Math.sin(path.angle);

  const latDist = side * (LANE_HALF + 3.8);
  const px = path.x + latDist * nx;
  const pz = z + latDist * nz;

  group.position.set(px, 0, pz);
  group.rotation.y = -path.angle;

  // Concrete utility pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, poleH, 12),
    concreteMat
  );
  pole.position.set(0, poleH / 2, 0);
  group.add(pole);

  // Lower & upper cross-arms
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), steelPostMat);
  arm1.position.set(0, 8.2, 0);
  group.add(arm1);

  const arm2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), steelPostMat);
  arm2.position.set(0, 7.2, 0);
  group.add(arm2);

  // Transformer
  const trans = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.1, 12),
    steelPostMat
  );
  trans.position.set(side * 0.45, 6.4, 0);
  group.add(trans);

  // Insulators
  [-0.9, 0, 0.9].forEach((ox) => {
    const ins = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a9990, roughness: 0.2 })
    );
    ins.position.set(ox, 8.35, 0);
    group.add(ins);
  });

  // Next pole position in this pole's local coordinates
  const nextWorldD = absIndex * SEGMENT_LENGTH + (-nextZ);
  const nextPath = getHighwayPath(nextWorldD);
  const nextNx = Math.cos(nextPath.angle);
  const nextNz = -Math.sin(nextPath.angle);
  const nextPx = nextPath.x + latDist * nextNx;
  const nextPz = nextZ + latDist * nextNz;

  // Relative vector from current pole to next pole
  const dx = nextPx - px;
  const dz = nextPz - pz;
  const localDx = dx * Math.cos(-path.angle) - dz * Math.sin(-path.angle);
  const localDz = dx * Math.sin(-path.angle) + dz * Math.cos(-path.angle);

  [-0.9, 0.9].forEach((ox) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(ox, 8.35, 0),
      new THREE.Vector3(ox + localDx * 0.5, 7.2, localDz * 0.5),
      new THREE.Vector3(ox + localDx, 8.35, localDz)
    );
    const wireGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(12));
    group.add(new THREE.Line(wireGeo, wireMat));
  });

  return group;
}

/**
 * Creates roadside highway safety props (SOS boxes, km posts) along the curve.
 */
export function addRoadsideInfrastructure(dynGroup: THREE.Group, absIndex: number): void {
  // 1. Emergency Telephone (SOS Call Box)
  if (Math.random() < 0.4) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const z = -15 - Math.random() * (SEGMENT_LENGTH - 30);
    const worldD = absIndex * SEGMENT_LENGTH + (-z);
    const path = getHighwayPath(worldD);
    const nx = Math.cos(path.angle);
    const nz = Math.sin(path.angle);

    const latDist = side * (LANE_HALF + 1.8);
    const px = path.x + latDist * nx;
    const pz = z + latDist * nz;

    const sosGroup = new THREE.Group();
    sosGroup.position.set(px, 0, pz);
    sosGroup.rotation.y = -path.angle;

    const sosBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.8, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.4 })
    );
    sosBox.position.set(0, 1.2, 0);
    sosGroup.add(sosBox);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), steelPostMat);
    post.position.set(0, 0.6, 0);
    sosGroup.add(post);

    const sosLabel = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.2, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    sosLabel.position.set(-side * 0.18, 1.35, 0);
    sosGroup.add(sosLabel);

    dynGroup.add(sosGroup);
  }

  // 2. Highway Kilometer Post
  [-1, 1].forEach((side) => {
    const z = -30 - Math.random() * (SEGMENT_LENGTH - 60);
    const worldD = absIndex * SEGMENT_LENGTH + (-z);
    const path = getHighwayPath(worldD);
    const nx = Math.cos(path.angle);
    const nz = Math.sin(path.angle);

    const latDist = side * (LANE_HALF + 0.55);
    const px = path.x + latDist * nx;
    const pz = z + latDist * nz;

    const kpMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.65, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.3 })
    );
    kpMesh.position.set(px, 0.35, pz);
    kpMesh.rotation.y = -path.angle;
    dynGroup.add(kpMesh);
  });
}
