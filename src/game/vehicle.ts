import * as THREE from 'three';
import { CameraViewMode } from '../types';
import {
  getCarbonFiberTexture,
  getJapaneseLicensePlateTexture,
  getCarWheelRotorTexture,
  getCarCockpitGaugeTexture,
  getCarCenterConsoleTexture,
  getHeadlightInternalTexture,
} from './textures';

export class HighwayVehicle {
  public group: THREE.Group;

  // Visual sub-components
  private chassisMesh: THREE.Mesh;
  private brakeLightMat: THREE.MeshStandardMaterial;
  private taillightBarMat: THREE.MeshStandardMaterial;
  private reverseLightMat: THREE.MeshBasicMaterial;
  private steeringWheel: THREE.Group;
  private speedoNeedle: THREE.Mesh;
  private tachNeedle: THREE.Mesh;
  private frontWheels: THREE.Group[] = [];
  private allWheels: THREE.Mesh[] = [];
  private exhaustFlameL: THREE.Mesh;
  private exhaustFlameR: THREE.Mesh;
  private exhaustLight: THREE.PointLight;

  // Exterior parts vs interior parts
  private exteriorParts: THREE.Object3D[] = [];
  private interiorParts: THREE.Object3D[] = [];

  constructor() {
    this.group = new THREE.Group();

    // ==========================================
    // 1. HIGH-GRADE MATERIALS PALETTE
    // ==========================================
    // Deep Midnight Obsidian Paint with warm sunset clearcoat pearlescence
    const bodyPaintMat = new THREE.MeshStandardMaterial({
      color: 0x1a1622,
      metalness: 0.88,
      roughness: 0.18,
      envMapIntensity: 1.4,
    });

    const bodySecondaryPaint = new THREE.MeshStandardMaterial({
      color: 0x120f18,
      metalness: 0.82,
      roughness: 0.22,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      map: getCarbonFiberTexture(),
      roughness: 0.42,
      metalness: 0.55,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f131a,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.78,
    });

    const interiorLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x181719,
      roughness: 0.72,
      metalness: 0.08,
    });

    const interiorRedAccentMat = new THREE.MeshStandardMaterial({
      color: 0xb71c1c,
      roughness: 0.55,
      metalness: 0.15,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0xd8d4cb,
      roughness: 0.2,
      metalness: 0.9,
    });

    // Flamed titanium blue-purple exhaust tip material
    const exhaustTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x5b6ea8,
      roughness: 0.25,
      metalness: 0.95,
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1c,
      roughness: 0.85,
      metalness: 0.06,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xb89d6e, // Bronze/Titanium forged finish
      roughness: 0.22,
      metalness: 0.82,
    });

    // Rear running taillight & brake lights
    this.taillightBarMat = new THREE.MeshStandardMaterial({
      color: 0xaa1111,
      emissive: 0x990000,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.1,
    });

    this.brakeLightMat = new THREE.MeshStandardMaterial({
      color: 0xd50000,
      emissive: 0xff1744,
      emissiveIntensity: 1.1,
      roughness: 0.15,
      metalness: 0.1,
    });

    this.reverseLightMat = new THREE.MeshBasicMaterial({
      color: 0xffeedd,
    });

    // ==========================================
    // 2. SCULPTED CAR BODYWORK & WIDEBODY FENDERS
    // ==========================================
    // Lower Flat Underside / Underbody Skid Plate
    const floorGeo = new THREE.BoxGeometry(1.84, 0.14, 4.38);
    const floorMesh = new THREE.Mesh(floorGeo, carbonMat);
    floorMesh.position.set(0, 0.18, 0);
    this.group.add(floorMesh);
    this.exteriorParts.push(floorMesh);

    // Central Monocoque Body Tub
    const bodyGeo = new THREE.BoxGeometry(1.78, 0.38, 4.15);
    this.chassisMesh = new THREE.Mesh(bodyGeo, bodyPaintMat);
    this.chassisMesh.position.set(0, 0.44, 0);
    this.group.add(this.chassisMesh);
    this.exteriorParts.push(this.chassisMesh);

    // Flared Front Fenders (Widebody muscular wheel arches)
    [-0.88, 0.88].forEach((fx) => {
      const archFront = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.32, 1.25),
        bodyPaintMat
      );
      archFront.position.set(fx, 0.48, -1.35);
      this.group.add(archFront);
      this.exteriorParts.push(archFront);

      // Aerodynamic top fender air extraction vents
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 0.45),
        carbonMat
      );
      vent.position.set(fx * 0.96, 0.65, -1.25);
      this.group.add(vent);
      this.exteriorParts.push(vent);
    });

    // Flared Rear Quarter Panels (Muscular rear haunches)
    [-0.92, 0.92].forEach((rx) => {
      const archRear = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.38, 1.35),
        bodyPaintMat
      );
      archRear.position.set(rx, 0.52, 1.35);
      this.group.add(archRear);
      this.exteriorParts.push(archRear);
    });

    // Low Aerodynamic Side Skirts with Carbon Winglets
    [-0.93, 0.93].forEach((sx) => {
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 1.95),
        carbonMat
      );
      skirt.position.set(sx, 0.22, 0.05);
      this.group.add(skirt);
      this.exteriorParts.push(skirt);

      // Rear aero winglet in front of rear wheel
      const winglet = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.24, 0.18),
        carbonMat
      );
      winglet.position.set(sx, 0.28, 0.65);
      winglet.rotation.y = sx > 0 ? 0.2 : -0.2;
      this.group.add(winglet);
      this.exteriorParts.push(winglet);
    });

    // Sculpted Sloping Front Hood with Power Bulge & Twin Vents
    const hoodGeo = new THREE.BoxGeometry(1.64, 0.18, 1.55);
    const hood = new THREE.Mesh(hoodGeo, bodyPaintMat);
    hood.position.set(0, 0.57, -1.28);
    hood.rotation.x = 0.075;
    this.group.add(hood);
    this.exteriorParts.push(hood);

    // Hood Center Power Bulge
    const powerBulge = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.06, 1.2),
      bodySecondaryPaint
    );
    powerBulge.position.set(0, 0.67, -1.26);
    powerBulge.rotation.x = 0.075;
    this.group.add(powerBulge);
    this.exteriorParts.push(powerBulge);

    // Hood Twin Heat Extractor Louvers
    [-0.38, 0.38].forEach((vx) => {
      const hoodVent = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.03, 0.55),
        carbonMat
      );
      hoodVent.position.set(vx, 0.67, -1.2);
      hoodVent.rotation.x = 0.075;
      this.group.add(hoodVent);
      this.exteriorParts.push(hoodVent);
    });

    // Aggressive Front Bumper Fascia & Central Intercooler Radiator Core
    const bumperGeo = new THREE.BoxGeometry(1.82, 0.32, 0.42);
    const bumper = new THREE.Mesh(bumperGeo, bodyPaintMat);
    bumper.position.set(0, 0.33, -2.12);
    this.group.add(bumper);
    this.exteriorParts.push(bumper);

    // Large Central Air Dam Opening
    const intercooler = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.2, 0.12),
      titaniumMat
    );
    intercooler.position.set(0, 0.24, -2.26);
    this.group.add(intercooler);
    this.exteriorParts.push(intercooler);

    // Carbon Front Lower Lip Splitter
    const splitter = new THREE.Mesh(
      new THREE.BoxGeometry(1.92, 0.05, 0.55),
      carbonMat
    );
    splitter.position.set(0, 0.14, -2.18);
    this.group.add(splitter);
    this.exteriorParts.push(splitter);

    // Splitter Turnbuckle Support Rods
    [-0.35, 0.35].forEach((sx) => {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8),
        titaniumMat
      );
      rod.position.set(sx, 0.24, -2.32);
      rod.rotation.x = 0.42;
      this.group.add(rod);
      this.exteriorParts.push(rod);
    });

    // Twin Bi-LED Projector Headlight Assemblies with Clear Acrylic Covers
    const headlightTex = getHeadlightInternalTexture();
    const headlightInternalMat = new THREE.MeshBasicMaterial({ map: headlightTex });

    [-0.64, 0.64].forEach((hx) => {
      // Inner detailed reflector housing
      const lampUnit = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.14, 0.1),
        headlightInternalMat
      );
      lampUnit.position.set(hx, 0.52, -2.14);
      lampUnit.rotation.y = hx > 0 ? -0.15 : 0.15;
      this.group.add(lampUnit);
      this.exteriorParts.push(lampUnit);

      // Clear Aerodynamic Outer Glass Lens Cover
      const glassCover = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.15, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.04,
          metalness: 0.95,
          transparent: true,
          opacity: 0.6,
        })
      );
      glassCover.position.set(hx, 0.52, -2.18);
      glassCover.rotation.y = hx > 0 ? -0.15 : 0.15;
      this.group.add(glassCover);
      this.exteriorParts.push(glassCover);

      // Forward Headlight Light Beam Cone (Projected onto highway asphalt)
      const beamGeo = new THREE.ConeGeometry(2.2, 18, 16, 1, true);
      beamGeo.rotateX(-Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffe2a3,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(hx, 0.48, -11.2);
      this.group.add(beam);
      this.exteriorParts.push(beam);
    });

    // ==========================================
    // 3. AERODYNAMIC CABIN GREENHOUSE & GLASS
    // ==========================================
    // Curvilinear Cabin Greenhouse with Raked Windshield & Fastback Hatch
    const cabinGeo = new THREE.BoxGeometry(1.48, 0.44, 2.05);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.88, 0.15);
    this.group.add(cabin);
    this.exteriorParts.push(cabin);

    // Front Windshield Raked Glass
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.04, 0.95),
      glassMat
    );
    windshield.position.set(0, 0.92, -0.68);
    windshield.rotation.x = -0.56;
    this.group.add(windshield);
    this.exteriorParts.push(windshield);

    // Rear Fastback Hatch Glass with Defroster Lines
    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.04, 1.15),
      glassMat
    );
    rearGlass.position.set(0, 0.89, 1.05);
    rearGlass.rotation.x = 0.48;
    this.group.add(rearGlass);
    this.exteriorParts.push(rearGlass);

    // Sculpted Roof Panel with Subtle Center Channel
    const roofPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.06, 1.35),
      bodyPaintMat
    );
    roofPanel.position.set(0, 1.12, 0.16);
    this.group.add(roofPanel);
    this.exteriorParts.push(roofPanel);

    // Aerodynamic Side Mirrors with Chrome Reflective Glass
    [-0.82, 0.82].forEach((mx) => {
      const mirrorStalk = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.03, 0.05),
        carbonMat
      );
      mirrorStalk.position.set(mx, 0.84, -0.42);
      this.group.add(mirrorStalk);
      this.exteriorParts.push(mirrorStalk);

      const mirrorHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.1, 0.12),
        bodyPaintMat
      );
      mirrorHousing.position.set(mx + (mx > 0 ? 0.09 : -0.09), 0.86, -0.42);
      this.group.add(mirrorHousing);
      this.exteriorParts.push(mirrorHousing);

      // Chrome Mirror Glass Face
      const mirrorFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x90caf9,
          roughness: 0.06,
          metalness: 0.98,
        })
      );
      mirrorFace.position.set(mx + (mx > 0 ? 0.09 : -0.09), 0.86, -0.355);
      mirrorFace.rotation.y = mx > 0 ? 0.15 : -0.15;
      this.group.add(mirrorFace);
      this.exteriorParts.push(mirrorFace);

      // Integrated Amber LED Turn Signal Strip
      const blinker = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.02, 0.03),
        new THREE.MeshBasicMaterial({ color: 0xffa000 })
      );
      blinker.position.set(mx + (mx > 0 ? 0.09 : -0.09), 0.86, -0.48);
      this.group.add(blinker);
      this.exteriorParts.push(blinker);
    });

    // ==========================================
    // 4. REAR DECK, GT WING, LIGHTBAR & DIFFUSER
    // ==========================================
    // Rear Trunk Deck
    const trunkDeck = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.16, 1.05),
      bodyPaintMat
    );
    trunkDeck.position.set(0, 0.65, 1.52);
    this.group.add(trunkDeck);
    this.exteriorParts.push(trunkDeck);

    // Swan-Neck Carbon Fiber GT Wing
    [-0.58, 0.58].forEach((wx) => {
      // Swan-neck curved aluminum uprights
      const stanchion = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.38, 0.22),
        titaniumMat
      );
      stanchion.position.set(wx, 0.88, 1.95);
      stanchion.rotation.x = -0.15;
      this.group.add(stanchion);
      this.exteriorParts.push(stanchion);
    });

    // Main 3D Aerodynamic Wing Blade
    const wingBlade = new THREE.Mesh(
      new THREE.BoxGeometry(1.84, 0.045, 0.36),
      carbonMat
    );
    wingBlade.position.set(0, 1.08, 1.96);
    wingBlade.rotation.x = -0.07;
    this.group.add(wingBlade);
    this.exteriorParts.push(wingBlade);

    // Wing Endplates
    [-0.92, 0.92].forEach((ex) => {
      const endplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.18, 0.42),
        carbonMat
      );
      endplate.position.set(ex, 1.08, 1.96);
      this.group.add(endplate);
      this.exteriorParts.push(endplate);
    });

    // Continuous 3D Smoked Full-Width LED Taillight Cluster
    const taillightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.76, 0.12, 0.08),
      this.taillightBarMat
    );
    taillightBar.position.set(0, 0.58, 2.08);
    this.group.add(taillightBar);
    this.exteriorParts.push(taillightBar);

    // Inner Glowing LED Light Strip (Neon Light Guide Tube)
    const neonRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.035, 0.02),
      this.brakeLightMat
    );
    neonRibbon.position.set(0, 0.58, 2.12);
    this.group.add(neonRibbon);
    this.exteriorParts.push(neonRibbon);

    // High-Mounted Center Brake Light (CHMSL)
    const thirdBrake = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.035, 0.04),
      this.brakeLightMat
    );
    thirdBrake.position.set(0, 1.1, 0.92);
    this.group.add(thirdBrake);
    this.exteriorParts.push(thirdBrake);

    // Authentic Japanese License Plate (品川 330 た 86-92)
    const licensePlateTex = getJapaneseLicensePlateTexture('品川', '330', 'た', '86-92');
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.24),
      new THREE.MeshStandardMaterial({
        map: licensePlateTex,
        roughness: 0.35,
        metalness: 0.1,
      })
    );
    plate.position.set(0, 0.36, 2.12);
    this.group.add(plate);
    this.exteriorParts.push(plate);

    // Twin White LED License Plate Illumination Lamps
    [-0.18, 0.18].forEach((lx) => {
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.02, 0.04),
        this.reverseLightMat
      );
      lamp.position.set(lx, 0.5, 2.12);
      this.group.add(lamp);
      this.exteriorParts.push(lamp);
    });

    // Aggressive Carbon Fiber Rear Underbody Diffuser with 4 Vertical Strakes
    const diffuserBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.12, 0.55),
      carbonMat
    );
    diffuserBase.position.set(0, 0.18, 1.95);
    diffuserBase.rotation.x = -0.18;
    this.group.add(diffuserBase);
    this.exteriorParts.push(diffuserBase);

    [-0.55, -0.2, 0.2, 0.55].forEach((dx) => {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.16, 0.52),
        carbonMat
      );
      fin.position.set(dx, 0.16, 1.95);
      fin.rotation.x = -0.18;
      this.group.add(fin);
      this.exteriorParts.push(fin);
    });

    // Quad Flamed Titanium Exhaust Tips (Dual Twin Pipes)
    [-0.52, -0.38, 0.38, 0.52].forEach((tx) => {
      // Outer flamed titanium pipe sleeve
      const pipeOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.38, 16),
        exhaustTitaniumMat
      );
      pipeOuter.rotation.x = Math.PI / 2;
      pipeOuter.position.set(tx, 0.2, 2.16);
      this.group.add(pipeOuter);
      this.exteriorParts.push(pipeOuter);

      // Inner hollow black exhaust bore
      const pipeInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.062, 0.39, 16),
        new THREE.MeshBasicMaterial({ color: 0x0a0a0c })
      );
      pipeInner.rotation.x = Math.PI / 2;
      pipeInner.position.set(tx, 0.2, 2.165);
      this.group.add(pipeInner);
      this.exteriorParts.push(pipeInner);
    });

    // Deceleration Exhaust Pop Flame Cones
    const flameGeo = new THREE.ConeGeometry(0.12, 0.55, 8);
    flameGeo.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff7043,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.exhaustFlameL = new THREE.Mesh(flameGeo, flameMat);
    this.exhaustFlameL.position.set(-0.45, 0.2, 2.45);
    this.group.add(this.exhaustFlameL);
    this.exteriorParts.push(this.exhaustFlameL);

    this.exhaustFlameR = new THREE.Mesh(flameGeo, flameMat.clone());
    this.exhaustFlameR.position.set(0.45, 0.2, 2.45);
    this.group.add(this.exhaustFlameR);
    this.exteriorParts.push(this.exhaustFlameR);

    // Warm exhaust light pulse
    this.exhaustLight = new THREE.PointLight(0xff5722, 0, 4);
    this.exhaustLight.position.set(0, 0.2, 2.5);
    this.group.add(this.exhaustLight);

    // ==========================================
    // 5. 3D FORGED WHEELS, ROTORS & CALIPERS
    // ==========================================
    const wheelR = 0.35;
    const wheelW = 0.26;
    const rotorTex = getCarWheelRotorTexture();
    const rotorMat = new THREE.MeshStandardMaterial({
      map: rotorTex,
      roughness: 0.32,
      metalness: 0.85,
    });

    const wheelPositions = [
      { x: -0.92, z: -1.35, isFront: true },
      { x: 0.92, z: -1.35, isFront: true },
      { x: -0.95, z: 1.35, isFront: false },
      { x: 0.95, z: 1.35, isFront: false },
    ];

    wheelPositions.forEach(({ x, z, isFront }) => {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(x, wheelR, z);

      // Low-profile high-performance tire
      const tireGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMesh = new THREE.Mesh(tireGeo, tireMat);
      wheelMount.add(tireMesh);

      // Forged Alloy Wheel Rim (Deep dish step rim)
      const rimDishGeo = new THREE.CylinderGeometry(wheelR * 0.74, wheelR * 0.78, wheelW + 0.015, 18);
      rimDishGeo.rotateZ(Math.PI / 2);
      const rimDishMesh = new THREE.Mesh(rimDishGeo, rimMat);
      wheelMount.add(rimDishMesh);

      // 6-Spoke Concave Face
      const spokeGroup = new THREE.Group();
      spokeGroup.position.set(x > 0 ? 0.06 : -0.06, 0, 0);

      for (let s = 0; s < 6; s++) {
        const spokeAngle = (s * Math.PI * 2) / 6;
        const spokeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.22, 0.04),
          rimMat
        );
        spokeMesh.position.set(0, Math.cos(spokeAngle) * 0.13, Math.sin(spokeAngle) * 0.13);
        spokeMesh.rotation.x = spokeAngle;
        spokeGroup.add(spokeMesh);
      }
      wheelMount.add(spokeGroup);

      // Drilled Ventilated Brake Rotor Disc
      const rotorGeo = new THREE.CircleGeometry(wheelR * 0.65, 24);
      rotorGeo.rotateY(x > 0 ? -Math.PI / 2 : Math.PI / 2);
      const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
      rotorMesh.position.set(x > 0 ? -0.02 : 0.02, 0, 0);
      wheelMount.add(rotorMesh);

      // 6-Piston Brembo Racing Red Brake Caliper
      const caliperGroup = new THREE.Group();
      caliperGroup.position.set(x > 0 ? -0.04 : 0.04, 0.12, 0);

      const caliperMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.17, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0xcc0000,
          roughness: 0.25,
          metalness: 0.5,
        })
      );
      caliperGroup.add(caliperMesh);

      // White Caliper Logo Accent
      const caliperLogo = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.07),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      caliperGroup.add(caliperLogo);

      wheelMount.add(caliperGroup);

      this.group.add(wheelMount);
      this.exteriorParts.push(wheelMount);
      this.allWheels.push(tireMesh);

      if (isFront) {
        this.frontWheels.push(wheelMount);
      }
    });

    // ==========================================
    // 6. HIGH-FIDELITY COCKPIT INTERIOR
    // ==========================================
    const cockpitGroup = new THREE.Group();

    // Sculpted Dashboard Base
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(1.44, 0.36, 0.68),
      interiorLeatherMat
    );
    dash.position.set(0, 0.82, -0.42);
    cockpitGroup.add(dash);

    // Defroster vent grille strip along windshield base
    const defroster = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.02, 0.08),
      carbonMat
    );
    defroster.position.set(0, 0.98, -0.66);
    cockpitGroup.add(defroster);

    // Driver's Instrument Cluster Binnacle (Right-Hand Drive: x = -0.35)
    const clusterHood = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.22, 0.28),
      interiorLeatherMat
    );
    clusterHood.position.set(-0.35, 0.99, -0.42);
    cockpitGroup.add(clusterHood);

    // High-Resolution Backlit Sports Gauge Cluster Face
    const gaugeTex = getCarCockpitGaugeTexture();
    const gaugeFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.2),
      new THREE.MeshBasicMaterial({ map: gaugeTex })
    );
    gaugeFace.position.set(-0.35, 0.98, -0.32);
    cockpitGroup.add(gaugeFace);

    // Animated Speedometer Needle (0 - 320 km/h)
    const needleGeo = new THREE.BoxGeometry(0.006, 0.055, 0.002);
    needleGeo.translate(0, 0.026, 0);

    this.speedoNeedle = new THREE.Mesh(
      needleGeo,
      new THREE.MeshBasicMaterial({ color: 0xff3d00 })
    );
    this.speedoNeedle.position.set(-0.49, 0.98, -0.315);
    cockpitGroup.add(this.speedoNeedle);

    // Animated Tachometer Needle (0 - 9000 RPM)
    this.tachNeedle = new THREE.Mesh(
      needleGeo,
      new THREE.MeshBasicMaterial({ color: 0xff3d00 })
    );
    this.tachNeedle.position.set(-0.21, 0.98, -0.315);
    cockpitGroup.add(this.tachNeedle);

    // Momo-Style 3-Spoke Perforated Leather Sport Steering Wheel
    this.steeringWheel = new THREE.Group();
    this.steeringWheel.position.set(-0.35, 0.88, -0.22);
    this.steeringWheel.rotation.x = -0.34;

    const wheelRimGeo = new THREE.TorusGeometry(0.18, 0.022, 10, 28);
    const rimMesh = new THREE.Mesh(wheelRimGeo, interiorLeatherMat);
    this.steeringWheel.add(rimMesh);

    // 12 o'clock Red Center Stripe
    const redStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.03, 10),
      interiorRedAccentMat
    );
    redStripe.rotation.z = Math.PI / 2;
    redStripe.position.set(0, 0.18, 0);
    this.steeringWheel.add(redStripe);

    // Brushed Center Hub with Horn Button
    const centerHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.028, 16),
      titaniumMat
    );
    centerHub.rotation.x = Math.PI / 2;
    this.steeringWheel.add(centerHub);

    // 3 Brushed Metal Spokes
    [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((a) => {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.13, 0.008),
        titaniumMat
      );
      spoke.position.set(Math.sin(a) * 0.08, Math.cos(a) * 0.08, 0);
      spoke.rotation.z = -a;
      this.steeringWheel.add(spoke);
    });

    // Steering Column & Turn Signal / Wiper Stalks
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12),
      interiorLeatherMat
    );
    column.rotation.x = Math.PI / 2;
    column.position.set(0, 0, -0.08);
    this.steeringWheel.add(column);

    const stalkL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.015, 0.015),
      interiorLeatherMat
    );
    stalkL.position.set(-0.08, 0.02, -0.06);
    this.steeringWheel.add(stalkL);

    cockpitGroup.add(this.steeringWheel);

    // Center Console Tower (Triple Defi Gauges + GPS Route Map + Climate Controls)
    const consoleTower = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.58, 0.44),
      interiorLeatherMat
    );
    consoleTower.position.set(0.12, 0.74, -0.28);
    cockpitGroup.add(consoleTower);

    // Center Console Faceplate (Auxiliary Gauges + Tokyo Bay Wangan Nav Map)
    const consoleTex = getCarCenterConsoleTexture();
    const consoleFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.48),
      new THREE.MeshBasicMaterial({ map: consoleTex })
    );
    consoleFace.position.set(0.12, 0.76, -0.05);
    consoleFace.rotation.x = -0.25;
    cockpitGroup.add(consoleFace);

    // 6-Speed Manual Shift Gate, Stitched Leather Boot & Titanium Knob
    const shiftTunnel = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.18, 0.65),
      carbonMat
    );
    shiftTunnel.position.set(0.12, 0.44, 0.22);
    cockpitGroup.add(shiftTunnel);

    const shiftBoot = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.09, 8),
      interiorLeatherMat
    );
    shiftBoot.position.set(0.12, 0.56, 0.12);
    cockpitGroup.add(shiftBoot);

    const shiftKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 12, 12),
      titaniumMat
    );
    shiftKnob.position.set(0.12, 0.63, 0.12);
    cockpitGroup.add(shiftKnob);

    // Handbrake lever with polished aluminum button
    const handbrake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8),
      interiorLeatherMat
    );
    handbrake.rotation.x = 0.45;
    handbrake.position.set(0.04, 0.56, 0.28);
    cockpitGroup.add(handbrake);

    // Panoramic Rearview Mirror
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.08, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0x90caf9,
        metalness: 0.95,
        roughness: 0.08,
      })
    );
    mirror.position.set(0, 1.15, -0.28);
    cockpitGroup.add(mirror);

    // High-Back Racing Bucket Seats with Red 4-Point Harness Belts
    [-0.35, 0.35].forEach((sx) => {
      // Sculpted seat base
      const seatBottom = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.16, 0.58),
        interiorLeatherMat
      );
      seatBottom.position.set(sx, 0.42, 0.15);
      cockpitGroup.add(seatBottom);

      // Deep side bolsters
      [-0.24, 0.24].forEach((bx) => {
        const bolster = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.22, 0.54),
          interiorRedAccentMat
        );
        bolster.position.set(sx + bx, 0.5, 0.15);
        cockpitGroup.add(bolster);
      });

      // Anatomical backrest
      const seatBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.68, 0.14),
        interiorLeatherMat
      );
      seatBack.position.set(sx, 0.74, 0.44);
      seatBack.rotation.x = 0.22;
      cockpitGroup.add(seatBack);

      // Integrated headrest with racing harness pass-through slots
      const headrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.2, 0.12),
        interiorLeatherMat
      );
      headrest.position.set(sx, 1.08, 0.52);
      cockpitGroup.add(headrest);

      // Red 4-point shoulder harness belts
      [-0.08, 0.08].forEach((hx) => {
        const belt = new THREE.Mesh(
          new THREE.BoxGeometry(0.045, 0.62, 0.015),
          interiorRedAccentMat
        );
        belt.position.set(sx + hx, 0.74, 0.38);
        belt.rotation.x = 0.22;
        cockpitGroup.add(belt);
      });
    });

    this.group.add(cockpitGroup);
    this.interiorParts.push(cockpitGroup);
  }

  /**
   * Updates vehicle animations:
   * - Wheel spin proportional to speed
   * - Front wheel steer angle
   * - Interior sport steering wheel rotation
   * - Sweeping speedometer and tachometer needles
   * - Dynamic brake lights and deceleration exhaust pop flames
   */
  public update(
    dt: number,
    speed: number,
    steerInput: number,
    throttleInput: number,
    steerVX: number
  ): void {
    // 1. Wheel Rotation (Forward spin proportional to speed)
    const spinSpeed = (speed / 0.35) * dt;
    this.allWheels.forEach((w) => {
      w.rotation.x += spinSpeed;
    });

    // 2. Front Wheel Steering Angle
    const targetSteerAngle = -steerInput * 0.48;
    this.frontWheels.forEach((fw) => {
      fw.rotation.y = THREE.MathUtils.lerp(fw.rotation.y, targetSteerAngle, 0.24);
    });

    // 3. Interior Steering Wheel Rotation
    if (this.steeringWheel) {
      const targetWheelAngle = steerInput * 2.4 + steerVX * 0.08;
      this.steeringWheel.rotation.z = THREE.MathUtils.lerp(
        this.steeringWheel.rotation.z,
        targetWheelAngle,
        0.26
      );
    }

    // 4. Backlit Instrument Cluster Needles
    if (this.speedoNeedle && this.tachNeedle) {
      // Speedo angle: 0 km/h -> 320 km/h (sweep -2.35 rad to +2.35 rad)
      const speedNorm = Math.min(1, speed / 55);
      const targetSpeedoAngle = -2.35 + speedNorm * 4.7;
      this.speedoNeedle.rotation.z = THREE.MathUtils.lerp(
        this.speedoNeedle.rotation.z,
        targetSpeedoAngle,
        0.18
      );

      // Tachometer: surges on throttle, rev matches during deceleration
      const rpmBase = 0.22 + speedNorm * 0.58;
      const rpmThrottle = throttleInput > 0 ? 0.24 : (throttleInput < 0 ? 0.08 : 0);
      const targetTachAngle = -2.35 + Math.min(1, rpmBase + rpmThrottle) * 4.7;
      this.tachNeedle.rotation.z = THREE.MathUtils.lerp(
        this.tachNeedle.rotation.z,
        targetTachAngle,
        0.22
      );
    }

    // 5. Active Brake Light & Exhaust Flare
    const isBraking = throttleInput < 0;
    if (isBraking) {
      this.taillightBarMat.emissive.setHex(0xff1744);
      this.taillightBarMat.emissiveIntensity = 3.2;
      this.brakeLightMat.emissiveIntensity = 3.6;
    } else {
      this.taillightBarMat.emissive.setHex(0x990000);
      this.taillightBarMat.emissiveIntensity = 0.95;
      this.brakeLightMat.emissiveIntensity = 0.75;
    }

    // Exhaust pop flame bursts on deceleration from high speed or hard acceleration
    const isDeceleratingFast = throttleInput < 0 && speed > 28;
    const isHardAcceleration = throttleInput > 0.8 && speed > 36;
    const showFlame = isDeceleratingFast || (isHardAcceleration && Math.random() < 0.15);

    const targetFlameOpacity = showFlame ? 0.85 : 0.0;
    const flameMatL = this.exhaustFlameL.material as THREE.MeshBasicMaterial;
    const flameMatR = this.exhaustFlameR.material as THREE.MeshBasicMaterial;

    flameMatL.opacity = THREE.MathUtils.lerp(flameMatL.opacity, targetFlameOpacity, showFlame ? 0.6 : 0.2);
    flameMatR.opacity = flameMatL.opacity;

    if (showFlame) {
      this.exhaustLight.intensity = THREE.MathUtils.lerp(this.exhaustLight.intensity, 2.4, 0.5);
    } else {
      this.exhaustLight.intensity = THREE.MathUtils.lerp(this.exhaustLight.intensity, 0, 0.2);
    }
  }

  /**
   * Adjusts exterior visibility based on current camera view
   */
  public setViewMode(mode: CameraViewMode): void {
    if (mode === 'hood') {
      this.chassisMesh.visible = true;
    } else if (mode === 'cockpit') {
      this.chassisMesh.visible = true;
    } else {
      this.chassisMesh.visible = true;
    }
  }
}
