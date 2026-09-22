import * as THREE from 'three';
import { CameraViewMode } from '../types';

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
  private exhaustGlowL: THREE.Mesh;
  private exhaustGlowR: THREE.Mesh;

  // Exterior parts to hide/show or dim based on view
  private exteriorParts: THREE.Object3D[] = [];
  private interiorParts: THREE.Object3D[] = [];

  constructor() {
    this.group = new THREE.Group();

    // --- Materials Palette ---
    // Deep Midnight Obsidian Paint with warm metallic clearcoat
    const bodyPaintMat = new THREE.MeshStandardMaterial({
      color: 0x181520,
      metalness: 0.88,
      roughness: 0.22,
      envMapIntensity: 1.2,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1f1f22,
      roughness: 0.6,
      metalness: 0.4,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x11131a,
      roughness: 0.08,
      metalness: 0.95,
      transparent: true,
      opacity: 0.82,
    });

    const interiorLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b18,
      roughness: 0.75,
      metalness: 0.1,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.12,
      metalness: 0.95,
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.85,
      metalness: 0.05,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xc8c0b5,
      roughness: 0.25,
      metalness: 0.85,
    });

    // Rear running taillight & brake lights
    this.taillightBarMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x8b0000,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.1,
    });

    this.brakeLightMat = new THREE.MeshStandardMaterial({
      color: 0xd32f2f,
      emissive: 0xff1744,
      emissiveIntensity: 1.0,
      roughness: 0.15,
      metalness: 0.1,
    });

    this.reverseLightMat = new THREE.MeshBasicMaterial({
      color: 0xffeedd,
    });

    // 1. Lower Chassis & Aerodynamic Floor
    const floorGeo = new THREE.BoxGeometry(1.82, 0.22, 4.3);
    const floorMesh = new THREE.Mesh(floorGeo, carbonMat);
    floorMesh.position.set(0, 0.22, 0);
    this.group.add(floorMesh);
    this.exteriorParts.push(floorMesh);

    // 2. Main Wedge Body / Fenders
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.46, 4.1);
    this.chassisMesh = new THREE.Mesh(bodyGeo, bodyPaintMat);
    this.chassisMesh.position.set(0, 0.48, 0);
    this.group.add(this.chassisMesh);
    this.exteriorParts.push(this.chassisMesh);

    // Front Sloped Nose / Hood
    const hoodGeo = new THREE.BoxGeometry(1.72, 0.22, 1.45);
    const hood = new THREE.Mesh(hoodGeo, bodyPaintMat);
    hood.position.set(0, 0.58, -1.25);
    hood.rotation.x = 0.08;
    this.group.add(hood);
    this.exteriorParts.push(hood);

    // Front Bumper & Air Dam
    const bumperGeo = new THREE.BoxGeometry(1.78, 0.32, 0.45);
    const bumper = new THREE.Mesh(bumperGeo, carbonMat);
    bumper.position.set(0, 0.28, -2.05);
    this.group.add(bumper);
    this.exteriorParts.push(bumper);

    // Twin Recessed Projector Headlight Lenses
    const headlampLensMat = new THREE.MeshBasicMaterial({ color: 0xffecb3 });
    [-0.62, 0.62].forEach((x) => {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), headlampLensMat);
      lamp.position.set(x, 0.52, -2.06);
      this.group.add(lamp);
      this.exteriorParts.push(lamp);

      // Warm forward light pools projecting onto the road
      const beamGeo = new THREE.ConeGeometry(1.8, 14, 16, 1, true);
      beamGeo.rotateX(-Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffd180,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x, 0.5, -9);
      this.group.add(beam);
      this.exteriorParts.push(beam);
    });

    // 3. Cabin Greenhouse (Roof & Pillars)
    const cabinGeo = new THREE.BoxGeometry(1.48, 0.46, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.88, 0.15);
    this.group.add(cabin);
    this.exteriorParts.push(cabin);

    // Roof Panel
    const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 1.45), bodyPaintMat);
    roofPanel.position.set(0, 1.12, 0.18);
    this.group.add(roofPanel);
    this.exteriorParts.push(roofPanel);

    // 4. Rear Deck & GT Spoiler
    const trunkDeck = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.18, 1.05), bodyPaintMat);
    trunkDeck.position.set(0, 0.65, 1.5);
    this.group.add(trunkDeck);
    this.exteriorParts.push(trunkDeck);

    // Spoiler Pedestals and Wing Blade
    [-0.58, 0.58].forEach((x) => {
      const stanchion = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.18), carbonMat);
      stanchion.position.set(x, 0.84, 1.95);
      this.group.add(stanchion);
      this.exteriorParts.push(stanchion);
    });
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.05, 0.32), carbonMat);
    wingBlade.position.set(0, 0.98, 1.98);
    wingBlade.rotation.x = -0.06;
    this.group.add(wingBlade);
    this.exteriorParts.push(wingBlade);

    // 5. Rear Continuous LED Taillight Bar & License Plate
    const taillightBar = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.14, 0.06), this.taillightBarMat);
    taillightBar.position.set(0, 0.58, 2.06);
    this.group.add(taillightBar);
    this.exteriorParts.push(taillightBar);

    // High-Mounted Center Brake Light (CHMSL)
    const thirdBrake = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.05), this.brakeLightMat);
    thirdBrake.position.set(0, 1.08, 0.9);
    this.group.add(thirdBrake);
    this.exteriorParts.push(thirdBrake);

    // Japanese License Plate (White / Green characters)
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.22, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 })
    );
    plate.position.set(0, 0.38, 2.07);
    this.group.add(plate);
    this.exteriorParts.push(plate);

    // 6. Polished Twin Chrome Exhaust Tips
    [-0.45, 0.45].forEach((x) => {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12),
        chromeMat
      );
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, 0.22, 2.12);
      this.group.add(pipe);
      this.exteriorParts.push(pipe);
    });

    // Reactive Exhaust Glow Cones
    const glowGeo = new THREE.ConeGeometry(0.14, 0.4, 8);
    glowGeo.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff6d00,
      transparent: true,
      opacity: 0.3,
    });
    this.exhaustGlowL = new THREE.Mesh(glowGeo, glowMat);
    this.exhaustGlowL.position.set(-0.45, 0.22, 2.3);
    this.group.add(this.exhaustGlowL);
    this.exteriorParts.push(this.exhaustGlowL);

    this.exhaustGlowR = new THREE.Mesh(glowGeo, glowMat);
    this.exhaustGlowR.position.set(0.45, 0.22, 2.3);
    this.group.add(this.exhaustGlowR);
    this.exteriorParts.push(this.exhaustGlowR);

    // 7. Wheels & Suspension
    const wheelR = 0.34;
    const wheelW = 0.24;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(wheelR * 0.72, wheelR * 0.72, wheelW + 0.01, 8);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      { x: -0.92, z: -1.35, isFront: true },
      { x: 0.92, z: -1.35, isFront: true },
      { x: -0.92, z: 1.35, isFront: false },
      { x: 0.92, z: 1.35, isFront: false },
    ];

    wheelPositions.forEach(({ x, z, isFront }) => {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(x, wheelR, z);

      const tireMesh = new THREE.Mesh(wheelGeo, tireMat);
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      wheelMount.add(tireMesh);
      wheelMount.add(rimMesh);

      // Brake rotor & caliper
      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.16, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xd50000, metalness: 0.5, roughness: 0.3 })
      );
      caliper.position.set(x > 0 ? -0.06 : 0.06, 0.1, 0);
      wheelMount.add(caliper);

      this.group.add(wheelMount);
      this.exteriorParts.push(wheelMount);
      this.allWheels.push(tireMesh);

      if (isFront) {
        this.frontWheels.push(wheelMount);
      }
    });

    // 8. Cockpit Interior (For Interior View & High Detail)
    const cockpitGroup = new THREE.Group();

    // Dashboard
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.55), interiorLeatherMat);
    dash.position.set(0, 0.82, -0.45);
    cockpitGroup.add(dash);

    // Instrument Cluster Hood (Right-Hand Drive position: x = -0.35)
    const clusterHood = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.18, 0.22),
      interiorLeatherMat
    );
    clusterHood.position.set(-0.35, 0.98, -0.42);
    cockpitGroup.add(clusterHood);

    // Glowing Gauge Cluster Backplate
    const gaugeBackplate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x111622 })
    );
    gaugeBackplate.position.set(-0.35, 0.96, -0.31);
    cockpitGroup.add(gaugeBackplate);

    // Speedometer & Tachometer Dials
    const dialMat = new THREE.MeshBasicMaterial({ color: 0xffb74d });
    [-0.45, -0.25].forEach((gx) => {
      const dialRing = new THREE.Mesh(new THREE.RingGeometry(0.045, 0.052, 16), dialMat);
      dialRing.position.set(gx, 0.96, -0.308);
      cockpitGroup.add(dialRing);
    });

    // Speedometer Needle
    const needleGeo = new THREE.BoxGeometry(0.005, 0.045, 0.002);
    needleGeo.translate(0, 0.02, 0);
    this.speedoNeedle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0xff3d00 }));
    this.speedoNeedle.position.set(-0.45, 0.96, -0.305);
    cockpitGroup.add(this.speedoNeedle);

    // Tachometer Needle
    this.tachNeedle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0xff3d00 }));
    this.tachNeedle.position.set(-0.25, 0.96, -0.305);
    cockpitGroup.add(this.tachNeedle);

    // Momo-style 3-Spoke Sport Steering Wheel
    this.steeringWheel = new THREE.Group();
    this.steeringWheel.position.set(-0.35, 0.88, -0.22);
    this.steeringWheel.rotation.x = -0.35;

    const wheelRimGeo = new THREE.TorusGeometry(0.17, 0.02, 8, 24);
    const rim = new THREE.Mesh(wheelRimGeo, interiorLeatherMat);
    this.steeringWheel.add(rim);

    const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), chromeMat);
    centerHub.rotation.x = Math.PI / 2;
    this.steeringWheel.add(centerHub);

    // 3 Spokes
    [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((a) => {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.12, 0.008), chromeMat);
      spoke.position.set(Math.sin(a) * 0.07, Math.cos(a) * 0.07, 0);
      spoke.rotation.z = -a;
      this.steeringWheel.add(spoke);
    });

    cockpitGroup.add(this.steeringWheel);

    // Rearview Mirror
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x90caf9, metalness: 0.9, roughness: 0.1 })
    );
    mirror.position.set(0, 1.15, -0.28);
    cockpitGroup.add(mirror);

    // Bucket Seats (Driver & Passenger)
    [-0.35, 0.35].forEach((sx) => {
      const seatBottom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.55), interiorLeatherMat);
      seatBottom.position.set(sx, 0.42, 0.15);
      cockpitGroup.add(seatBottom);

      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.14), interiorLeatherMat);
      seatBack.position.set(sx, 0.72, 0.42);
      seatBack.rotation.x = 0.22;
      cockpitGroup.add(seatBack);

      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.12), interiorLeatherMat);
      headrest.position.set(sx, 1.06, 0.5);
      cockpitGroup.add(headrest);
    });

    this.group.add(cockpitGroup);
    this.interiorParts.push(cockpitGroup);
  }

  /**
   * Updates vehicle animation: wheel spin, wheel steer angle, steering wheel rotation,
   * instrument needles, brake lights, and reactive exhaust glow.
   */
  public update(
    dt: number,
    speed: number,
    steerInput: number,
    throttleInput: number,
    steerVX: number
  ): void {
    // 1. Wheel Rotation (Forward spin proportional to speed)
    const spinSpeed = (speed / 0.34) * dt;
    this.allWheels.forEach((w) => {
      w.rotation.x += spinSpeed;
    });

    // 2. Front Wheel Steering Angle
    const targetSteerAngle = -steerInput * 0.48;
    this.frontWheels.forEach((fw) => {
      fw.rotation.y = THREE.MathUtils.lerp(fw.rotation.y, targetSteerAngle, 0.22);
    });

    // 3. Interior Steering Wheel Rotation
    if (this.steeringWheel) {
      const targetWheelAngle = steerInput * 2.2 + steerVX * 0.08;
      this.steeringWheel.rotation.z = THREE.MathUtils.lerp(
        this.steeringWheel.rotation.z,
        targetWheelAngle,
        0.25
      );
    }

    // 4. Instrument Gauges (Speedometer & Tachometer Needle)
    if (this.speedoNeedle && this.tachNeedle) {
      // Speedo angle: 0 km/h -> ~200 km/h (sweep -2.2 rad to +2.2 rad)
      const speedNorm = Math.min(1, speed / 55);
      const targetSpeedoAngle = -2.2 + speedNorm * 4.4;
      this.speedoNeedle.rotation.z = THREE.MathUtils.lerp(
        this.speedoNeedle.rotation.z,
        targetSpeedoAngle,
        0.18
      );

      // Tachometer (RPM needle surges on throttle)
      const rpmBase = 0.25 + speedNorm * 0.55;
      const rpmThrottle = throttleInput > 0 ? 0.22 : 0;
      const targetTachAngle = -2.2 + (rpmBase + rpmThrottle) * 4.4;
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
      this.taillightBarMat.emissiveIntensity = 2.8;
      this.brakeLightMat.emissiveIntensity = 3.2;
    } else {
      this.taillightBarMat.emissive.setHex(0x990000);
      this.taillightBarMat.emissiveIntensity = 0.9;
      this.brakeLightMat.emissiveIntensity = 0.7;
    }

    // Exhaust glow flares when accelerating
    const isAccelerating = throttleInput > 0;
    const targetGlowOpacity = isAccelerating ? 0.65 : 0.08;
    (this.exhaustGlowL.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
      (this.exhaustGlowL.material as THREE.MeshBasicMaterial).opacity,
      targetGlowOpacity,
      0.2
    );
    (this.exhaustGlowR.material as THREE.MeshBasicMaterial).opacity =
      (this.exhaustGlowL.material as THREE.MeshBasicMaterial).opacity;
  }

  /**
   * Adjusts exterior visibility based on current camera view
   */
  public setViewMode(mode: CameraViewMode): void {
    if (mode === 'hood') {
      // In hood view, roof and rear exterior can be transparent or hidden
      this.chassisMesh.visible = true;
    } else if (mode === 'cockpit') {
      // In cockpit view, dashboard and hood remain visible
      this.chassisMesh.visible = true;
    } else {
      // In chase view, everything is fully visible
      this.chassisMesh.visible = true;
    }
  }
}
