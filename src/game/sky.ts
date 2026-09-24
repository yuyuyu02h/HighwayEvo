import * as THREE from 'three';
import { getRadialGlowTexture } from './textures';

export interface SkySystem {
  skyGroup: THREE.Group;
  sunPosition: THREE.Vector3;
  update: (dt: number, time: number, cameraX: number) => void;
  beacons: { mesh: THREE.Mesh; phase: number }[];
}

export function createSkySystem(): SkySystem {
  const skyGroup = new THREE.Group();

  // 1. Sky Dome Mesh with 4-stop custom sunset shader
  const skyRadius = 1350;
  const skyGeo = new THREE.SphereGeometry(skyRadius, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    uniforms: {
      colorZenith:  { value: new THREE.Color(0x191428) }, // Deep twilight indigo
      colorBelt:    { value: new THREE.Color(0x64314c) }, // Belt of Venus violet-pink
      colorWarm:    { value: new THREE.Color(0xd25b39) }, // Rich terracotta sunset band
      colorHorizon: { value: new THREE.Color(0xefa25c) }, // Golden incandescent horizon
    },
    vertexShader: `
      varying float vNormalizedY;
      void main() {
        // Normalize altitude from -0.1 to 1.0
        vNormalizedY = clamp(position.y / 1350.0, -0.05, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vNormalizedY;
      uniform vec3 colorZenith;
      uniform vec3 colorBelt;
      uniform vec3 colorWarm;
      uniform vec3 colorHorizon;

      void main() {
        float h = clamp(vNormalizedY, 0.0, 1.0);
        vec3 col;
        if (h < 0.18) {
          // Low horizon into warm band
          col = mix(colorHorizon, colorWarm, h / 0.18);
        } else if (h < 0.48) {
          // Warm band into Belt of Venus
          col = mix(colorWarm, colorBelt, (h - 0.18) / 0.30);
        } else {
          // Belt of Venus into deep cosmic zenith
          col = mix(colorBelt, colorZenith, (h - 0.48) / 0.52);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyGroup.add(skyDome);

  // 2. Volumetric Sunset Sun
  const SUN_BASE_POS = new THREE.Vector3(-120, 52, -880);
  const sunGroup = new THREE.Group();
  sunGroup.position.copy(SUN_BASE_POS);

  // Intense sun core
  const sunCore = new THREE.Mesh(
    new THREE.CircleGeometry(48, 36),
    new THREE.MeshBasicMaterial({
      color: 0xfffaed,
      fog: false,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    })
  );
  sunGroup.add(sunCore);

  // Inner corona
  const innerCoronaTex = getRadialGlowTexture('rgba(255, 245, 210, 0.95)', 'rgba(255, 175, 75, 0)', 256);
  const innerCorona = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 280),
    new THREE.MeshBasicMaterial({
      map: innerCoronaTex,
      fog: false,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunGroup.add(innerCorona);

  // Wide golden atmospheric bloom
  const outerHazeTex = getRadialGlowTexture('rgba(255, 160, 60, 0.45)', 'rgba(255, 120, 40, 0)', 256);
  const outerHaze = new THREE.Mesh(
    new THREE.PlaneGeometry(850, 850),
    new THREE.MeshBasicMaterial({
      map: outerHazeTex,
      fog: false,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunGroup.add(outerHaze);

  // Cinematic anamorphic horizontal lens flare streak
  const streakCanvas = document.createElement('canvas');
  streakCanvas.width = 512;
  streakCanvas.height = 64;
  const sCtx = streakCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(256, 32, 0, 256, 32, 256);
  sGrad.addColorStop(0, 'rgba(255, 240, 190, 0.7)');
  sGrad.addColorStop(0.3, 'rgba(255, 160, 60, 0.3)');
  sGrad.addColorStop(1, 'rgba(255, 100, 20, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 512, 64);
  const streakTex = new THREE.CanvasTexture(streakCanvas);

  const flareStreak = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 70),
    new THREE.MeshBasicMaterial({
      map: streakTex,
      fog: false,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunGroup.add(flareStreak);

  skyGroup.add(sunGroup);

  // 3. Horizon golden glow band
  const horizonBandTex = getRadialGlowTexture('rgba(245, 175, 95, 0.65)', 'rgba(245, 150, 70, 0)', 256);
  const horizonBand = new THREE.Mesh(
    new THREE.PlaneGeometry(2600, 360),
    new THREE.MeshBasicMaterial({
      map: horizonBandTex,
      fog: false,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  horizonBand.position.set(0, 15, -1100);
  skyGroup.add(horizonBand);

  // 4. Distant Mountain Silhouette Ridges along the horizon
  const mountainGeo = new THREE.BufferGeometry();
  const mountainVertices: number[] = [];
  const mountainColors: number[] = [];
  const segmentsCount = 64;
  const ridgeWidth = 2600;
  const startX = -ridgeWidth / 2;
  const stepX = ridgeWidth / segmentsCount;

  // Generate 2 layered mountain ridges
  const ridgeProfiles = [
    { z: -1150, baseH: 25, amp: 75, col: new THREE.Color(0x281e2e) },
    { z: -1050, baseH: 10, amp: 45, col: new THREE.Color(0x352336) },
  ];

  ridgeProfiles.forEach((ridge) => {
    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (let i = 0; i < segmentsCount; i++) {
      const x1 = startX + i * stepX;
      const x2 = x1 + stepX;

      // Compound sine wave for mountain ridge profile
      const h1 = ridge.baseH +
        Math.sin(i * 0.18 + ridge.z * 0.01) * ridge.amp * 0.5 +
        Math.sin(i * 0.35 + 1.2) * (ridge.amp * 0.35) +
        Math.sin(i * 0.7) * (ridge.amp * 0.15);

      const h2 = ridge.baseH +
        Math.sin((i + 1) * 0.18 + ridge.z * 0.01) * ridge.amp * 0.5 +
        Math.sin((i + 1) * 0.35 + 1.2) * (ridge.amp * 0.35) +
        Math.sin((i + 1) * 0.7) * (ridge.amp * 0.15);

      // Two triangles forming quad between horizon ground y=0 and mountain peaks
      pos.push(x1, 0, ridge.z,  x1, h1, ridge.z,  x2, h2, ridge.z);
      pos.push(x1, 0, ridge.z,  x2, h2, ridge.z,  x2, 0, ridge.z);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mountainMat = new THREE.MeshBasicMaterial({
      color: ridge.col,
      fog: false,
      depthWrite: false,
    });
    skyGroup.add(new THREE.Mesh(geo, mountainMat));
  });

  // 4b. Iconic Mt. Fuji Silhouette on the sunset horizon
  const fujiGeo = new THREE.BufferGeometry();
  const fujiPos: number[] = [];
  const fujiSegments = 40;
  const fujiW = 420;
  const fujiH = 145;
  const fujiCX = -130;
  const fujiZ = -1180;

  for (let i = 0; i < fujiSegments; i++) {
    const t1 = (i / fujiSegments) * 2 - 1; // -1 to 1
    const t2 = ((i + 1) / fujiSegments) * 2 - 1;

    const x1 = fujiCX + t1 * (fujiW / 2);
    const x2 = fujiCX + t2 * (fujiW / 2);

    // Iconic concave volcanic slope curve: y = H * (1 - |t|^1.4)
    const y1 = Math.max(0, fujiH * (1 - Math.pow(Math.abs(t1), 1.35)));
    const y2 = Math.max(0, fujiH * (1 - Math.pow(Math.abs(t2), 1.35)));

    fujiPos.push(x1, 0, fujiZ,  x1, y1, fujiZ,  x2, y2, fujiZ);
    fujiPos.push(x1, 0, fujiZ,  x2, y2, fujiZ,  x2, 0, fujiZ);
  }
  fujiGeo.setAttribute('position', new THREE.Float32BufferAttribute(fujiPos, 3));
  const fujiMat = new THREE.MeshBasicMaterial({
    color: 0x22172a,
    fog: false,
    depthWrite: false,
  });
  skyGroup.add(new THREE.Mesh(fujiGeo, fujiMat));

  // Snow-capped summit crown glowing softly in twilight
  const snowGeo = new THREE.BufferGeometry();
  const snowPos: number[] = [];
  for (let i = 0; i < fujiSegments; i++) {
    const t1 = (i / fujiSegments) * 2 - 1;
    const t2 = ((i + 1) / fujiSegments) * 2 - 1;
    if (Math.abs(t1) < 0.28 && Math.abs(t2) < 0.28) {
      const x1 = fujiCX + t1 * (fujiW / 2);
      const x2 = fujiCX + t2 * (fujiW / 2);
      const y1 = Math.max(0, fujiH * (1 - Math.pow(Math.abs(t1), 1.35)));
      const y2 = Math.max(0, fujiH * (1 - Math.pow(Math.abs(t2), 1.35)));
      const snowBase = fujiH * 0.72;

      snowPos.push(x1, snowBase, fujiZ + 1,  x1, y1, fujiZ + 1,  x2, y2, fujiZ + 1);
      snowPos.push(x1, snowBase, fujiZ + 1,  x2, y2, fujiZ + 1,  x2, snowBase, fujiZ + 1);
    }
  }
  snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPos, 3));
  const snowMat = new THREE.MeshBasicMaterial({
    color: 0xe09b82, // Rose-gold dusk snowglow
    fog: false,
    depthWrite: false,
  });
  skyGroup.add(new THREE.Mesh(snowGeo, snowMat));

  // 4c. Tokyo Bay Industrial Harbor Container Cranes & Suspension Bridge Towers
  const beacons: { mesh: THREE.Mesh; phase: number }[] = [];
  const harborGroup = new THREE.Group();
  const harborMat = new THREE.MeshBasicMaterial({ color: 0x241d2d, fog: false });
  const hazardRedMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, fog: false });

  // 3 Gantry Container Cranes
  const cranePositions = [
    { x: 380, z: -880, scale: 1.0 },
    { x: 440, z: -920, scale: 0.9 },
    { x: 500, z: -950, scale: 0.8 },
  ];

  cranePositions.forEach(({ x, z, scale }) => {
    const cH = 58 * scale;
    const cW = 22 * scale;
    // Left & right A-frame legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(1.6 * scale, cH, 1.6 * scale), harborMat);
    legL.position.set(x - cW / 2, cH / 2, z);
    legL.rotation.z = -0.12;
    harborGroup.add(legL);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(1.6 * scale, cH, 1.6 * scale), harborMat);
    legR.position.set(x + cW / 2, cH / 2, z);
    legR.rotation.z = 0.12;
    harborGroup.add(legR);

    // Cantilever boom projecting over water
    const boom = new THREE.Mesh(new THREE.BoxGeometry(65 * scale, 2.2 * scale, 2.2 * scale), harborMat);
    boom.position.set(x + 12 * scale, cH * 0.78, z);
    harborGroup.add(boom);

    // Crane peak red obstruction beacon
    const craneBeacon = new THREE.Mesh(new THREE.BoxGeometry(1.8 * scale, 1.8 * scale, 1.8 * scale), hazardRedMat.clone());
    craneBeacon.position.set(x, cH + 2 * scale, z);
    harborGroup.add(craneBeacon);
    beacons.push({ mesh: craneBeacon, phase: Math.random() * Math.PI * 2 });
  });

  // Tokyo Bay Suspension Bridge Towers (Rainbow Bridge / Yokohama Bay Bridge style)
  [-320, -210].forEach((bx) => {
    const bH = 88;
    const bZ = -1020;
    // Dual tower columns
    const colL = new THREE.Mesh(new THREE.BoxGeometry(2.4, bH, 2.4), harborMat);
    colL.position.set(bx - 12, bH / 2, bZ);
    harborGroup.add(colL);

    const colR = new THREE.Mesh(new THREE.BoxGeometry(2.4, bH, 2.4), harborMat);
    colR.position.set(bx + 12, bH / 2, bZ);
    harborGroup.add(colR);

    // Cross-struts
    const strut1 = new THREE.Mesh(new THREE.BoxGeometry(26, 2.0, 1.8), harborMat);
    strut1.position.set(bx, bH * 0.5, bZ);
    harborGroup.add(strut1);

    const strut2 = new THREE.Mesh(new THREE.BoxGeometry(26, 2.0, 1.8), harborMat);
    strut2.position.set(bx, bH * 0.92, bZ);
    harborGroup.add(strut2);

    // Red aviation beacon
    const bBeacon = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), hazardRedMat.clone());
    bBeacon.position.set(bx, bH + 2, bZ);
    harborGroup.add(bBeacon);
    beacons.push({ mesh: bBeacon, phase: Math.random() * Math.PI * 2 });
  });

  skyGroup.add(harborGroup);

  // 5. Far Distant Metropolis Silhouette Towers with Aircraft Warning Lights
  const distantSkylineGroup = new THREE.Group();
  const distantMat = new THREE.MeshBasicMaterial({ color: 0x1d1724, fog: false });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, fog: false });

  for (let i = 0; i < 48; i++) {
    const w = 12 + Math.random() * 26;
    const h = 25 + Math.random() * 140;
    const d = w * 0.9;
    const bx = (Math.random() - 0.5) * 1900;
    const bz = -980 - Math.random() * 240;

    const bld = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), distantMat);
    bld.position.set(bx, h / 2, bz);
    distantSkylineGroup.add(bld);

    // Tall towers get red warning beacons on top
    if (h > 65) {
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), beaconMat.clone());
      beacon.position.set(bx, h + 1.2, bz);
      distantSkylineGroup.add(beacon);
      beacons.push({ mesh: beacon, phase: Math.random() * Math.PI * 2 });
    }
  }
  skyGroup.add(distantSkylineGroup);

  // 6. Sunset Clouds (Wispy Cirrus Bands)
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xdf845d,
    transparent: true,
    opacity: 0.24,
    fog: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const clouds: { mesh: THREE.Mesh; speed: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const cw = 280 + Math.random() * 260;
    const ch = 25 + Math.random() * 32;
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), cloudMat);
    cloud.position.set(
      (Math.random() - 0.5) * 1200,
      120 + Math.random() * 160,
      -550 - Math.random() * 450
    );
    cloud.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
    skyGroup.add(cloud);
    clouds.push({ mesh: cloud, speed: 0.35 + Math.random() * 0.55 });
  }

  // 7. Golden hour atmosphere floating motes
  const moteCount = 60;
  const moteGeo = new THREE.BufferGeometry();
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3 + 0] = (Math.random() - 0.5) * 20;
    motePositions[i * 3 + 1] = 0.5 + Math.random() * 4.5;
    motePositions[i * 3 + 2] = -Math.random() * 70;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0xffdb99,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
    fog: true,
  });
  const motePoints = new THREE.Points(moteGeo, moteMat);
  skyGroup.add(motePoints);

  function update(dt: number, time: number, cameraX: number) {
    // Parallax sun slightly with camera steer
    const sunTargetX = cameraX * 0.12 + SUN_BASE_POS.x;
    sunGroup.position.x = sunTargetX;

    // Gentle cloud drift
    for (const c of clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 750) c.mesh.position.x = -750;
    }

    // Aircraft obstruction warning beacons pulse rhythmically
    for (const b of beacons) {
      const pulse = Math.sin(time * 2.4 + b.phase);
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = pulse > 0.3 ? 1.0 : 0.08;
    }

    // Floating sunset particles gentle drift
    const pos = moteGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < moteCount; i++) {
      pos[i * 3 + 1] += Math.sin(time + i) * 0.002;
    }
    moteGeo.attributes.position.needsUpdate = true;
  }

  return {
    skyGroup,
    sunPosition: SUN_BASE_POS,
    update,
    beacons,
  };
}
