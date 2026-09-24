import * as THREE from 'three';
import { GameInput, GameState, DistrictType, CameraViewMode } from '../types';
import { HighwayAudioEngine } from './audio';
import { createSkySystem, SkySystem } from './sky';
import { HighwayVehicle } from './vehicle';
import {
  DISTRICT_CONFIGS,
  buildDetailedBuilding,
} from './architect';
import {
  STEER_LIMIT,
  SEGMENT_LENGTH,
  NUM_SEGMENTS,
  TOTAL_LENGTH,
  RECYCLE_MARGIN,
  buildCurvedRoad,
  getHighwayPath,
  createHighwayGantry,
  createHighwayLightPole,
  createUtilityPoleWithWires,
  addRoadsideInfrastructure,
} from './highway';

const BASE_SPEED = 32;
const MAX_SPEED = 54;
const MIN_SPEED = 15;
const SPEED_LERP = 1.6;
const DISTRICT_SPAN = 3;

const DISTRICT_KEYS: DistrictType[] = ['commercial', 'apartment', 'industrial', 'downtown'];

export class HighwayGameEngine {
  private canvas: HTMLCanvasElement;
  private bloomCanvas: HTMLCanvasElement;
  private bloomCtx: CanvasRenderingContext2D | null = null;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private skySystem: SkySystem;
  private audioEngine: HighwayAudioEngine;
  public vehicle: HighwayVehicle;

  private segments: THREE.Group[] = [];
  private districtCounter = 0;
  private beaconsList: { mesh: THREE.Mesh; phase: number }[] = [];

  private isRunning = false;
  private animFrameId: number | null = null;
  private clock = new THREE.Clock();

  public cameraMode: CameraViewMode = 'chase';
  private currentLookTarget = new THREE.Vector3(0, 1.2, -15);
  private currentCamPos = new THREE.Vector3(0, 2.2, 5.0);

  public input: GameInput = { steer: 0, throttle: 0 };
  public state: GameState = {
    speed: BASE_SPEED,
    playerX: 0,
    playerVX: 0,
    time: 0,
    distanceTraveled: 0,
    cameraMode: 'chase',
  };

  public currentDistrictTitle = '湾岸新都心 Commercial District';
  public onStateChange?: (state: GameState, districtTitle: string) => void;

  constructor(canvas: HTMLCanvasElement, bloomCanvas?: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bloomCanvas = bloomCanvas || canvas;

    if (bloomCanvas) {
      this.bloomCtx = bloomCanvas.getContext('2d');
    }

    // 1. Three.js Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 2. Scene with atmospheric distance fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd67d4f, 0.0028);

    // 3. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.3, 1400);
    this.camera.position.set(0, 2.2, 5.0);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffbe85, 0.7);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffa764, 0x3d291e, 0.6);
    this.scene.add(hemiLight);

    // Warm setting sun directional key light
    const sunLight = new THREE.DirectionalLight(0xfff2d4, 1.95);
    sunLight.position.set(0, 80, -750);
    this.scene.add(sunLight);

    // 5. Procedural Sky Dome & Atmosphere
    this.skySystem = createSkySystem();
    this.scene.add(this.skySystem.skyGroup);
    this.beaconsList = this.skySystem.beacons;

    // 6. Player Vehicle
    this.vehicle = new HighwayVehicle();
    this.scene.add(this.vehicle.group);

    // 7. Sound Engine
    this.audioEngine = new HighwayAudioEngine();

    // 8. Initialize Road Segments
    this.initWorldSegments();

    // 9. Resize Handler
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  private initWorldSegments(): void {
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const seg = this.createSegment(i);
      seg.position.z = -i * SEGMENT_LENGTH;
      this.segments.push(seg);
    }
    this.districtCounter = NUM_SEGMENTS;
  }

  private createSegment(absIndex: number): THREE.Group {
    const group = new THREE.Group();

    // Curved road surface, shoulders, lines, cat's eyes, and guardrails
    const roadGroup = new THREE.Group();
    group.add(roadGroup);
    buildCurvedRoad(roadGroup, absIndex);

    // Dynamic procedural roadside content (buildings, poles, signs)
    const dynGroup = new THREE.Group();
    group.add(dynGroup);
    this.populateSegmentDynamicContent(dynGroup, absIndex);

    group.userData.roadGroup = roadGroup;
    group.userData.dynGroup = dynGroup;
    group.userData.absIndex = absIndex;
    this.scene.add(group);
    return group;
  }

  private populateSegmentDynamicContent(dynGroup: THREE.Group, absIndex: number): void {
    // Clear previous dynamic children
    while (dynGroup.children.length > 0) {
      dynGroup.remove(dynGroup.children[0]);
    }

    const districtType = DISTRICT_KEYS[Math.floor(absIndex / DISTRICT_SPAN) % DISTRICT_KEYS.length];
    const district = DISTRICT_CONFIGS[districtType];
    this.currentDistrictTitle = district.title;

    // 1. Architectural Buildings on both sides of the highway
    // Each building is placed with guaranteed safe clearance outside the road boundary
    [-1, 1].forEach((side) => {
      let z = -8;
      while (z > -SEGMENT_LENGTH + 8) {
        const bld = buildDetailedBuilding(
          side,
          z,
          district,
          this.beaconsList,
          absIndex
        );
        dynGroup.add(bld.group);

        const gap = THREE.MathUtils.lerp(district.gap[0], district.gap[1], Math.random());
        z -= (bld.depth + gap);
      }
    });

    // 2. Highway Overhead Directional Gantries (positioned along the curved road)
    if (absIndex % 3 === 1) {
      const gantryZ = -SEGMENT_LENGTH * 0.45;
      const gantry = createHighwayGantry(gantryZ, absIndex, district.title);
      dynGroup.add(gantry);
    }

    // 3. Arched Highway Cobra-Head Light Poles (alternating sides along the curve)
    for (let i = 0; i < 3; i++) {
      const poleZ = -14 - i * (SEGMENT_LENGTH / 2.8) + (Math.random() - 0.5) * 6;
      const poleSide = i % 2 === 0 ? -1 : 1;
      const lightPole = createHighwayLightPole(poleSide, poleZ, absIndex);
      dynGroup.add(lightPole);
    }

    // 4. Roadside Concrete Utility Poles with Catenary Power Lines
    if (district.name === 'industrial' || district.name === 'apartment') {
      const poleSide = absIndex % 2 === 0 ? 1 : -1;
      const z1 = -18;
      const z2 = -SEGMENT_LENGTH * 0.55;
      const z3 = -SEGMENT_LENGTH + 12;

      dynGroup.add(createUtilityPoleWithWires(poleSide, z1, z2, absIndex));
      dynGroup.add(createUtilityPoleWithWires(poleSide, z2, z3, absIndex));
    }

    // 5. Roadside Highway Safety Infrastructure (Emergency SOS boxes, km markers)
    addRoadsideInfrastructure(dynGroup, absIndex);
  }

  public handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    if (this.bloomCanvas) {
      const scale = 0.22;
      this.bloomCanvas.width = Math.max(2, Math.floor(w * scale));
      this.bloomCanvas.height = Math.max(2, Math.floor(h * scale));
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public toggleMute(): boolean {
    return this.audioEngine.toggleMute();
  }

  public startAudio(): void {
    this.audioEngine.init();
  }

  public cycleCameraMode(): CameraViewMode {
    const modes: CameraViewMode[] = ['chase', 'hood'];
    const idx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(idx + 1) % modes.length];
    this.state.cameraMode = this.cameraMode;
    this.vehicle.setViewMode(this.cameraMode);
    return this.cameraMode;
  }

  public setCameraMode(mode: CameraViewMode): void {
    this.cameraMode = mode;
    this.state.cameraMode = this.cameraMode;
    this.vehicle.setViewMode(this.cameraMode);
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.tick);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.state.time += dt;

    // --- 1. Vehicle Acceleration & Braking (Identical to original gameplay) ---
    let targetSpeed = BASE_SPEED;
    if (this.input.throttle > 0) targetSpeed = MAX_SPEED;
    else if (this.input.throttle < 0) targetSpeed = MIN_SPEED;
    this.state.speed += (targetSpeed - this.state.speed) * Math.min(1, SPEED_LERP * dt);
    this.state.distanceTraveled += this.state.speed * dt;

    // --- 2. Vehicle Steering Physics ---
    const steerAccel = 26;
    const friction = 4.2;
    this.state.playerVX += this.input.steer * steerAccel * dt;
    this.state.playerVX -= this.state.playerVX * friction * dt;
    this.state.playerX += this.state.playerVX * dt;

    // Clamp within highway lane bounds
    if (this.state.playerX > STEER_LIMIT) {
      this.state.playerX = STEER_LIMIT;
      this.state.playerVX = 0;
    }
    if (this.state.playerX < -STEER_LIMIT) {
      this.state.playerX = -STEER_LIMIT;
      this.state.playerVX = 0;
    }

    // --- 3. Highway Path, Vehicle Transform & Camera Modes ---
    const roadPath = getHighwayPath(this.state.distanceTraveled);
    const nx = Math.cos(roadPath.angle);
    const nz = Math.sin(roadPath.angle);

    // Car world position at (carX, carY, carZ)
    const carX = roadPath.x + this.state.playerX * nx;
    const carZ = 0 + this.state.playerX * nz;
    const carY = 0.0;

    // Road heading in Three.js coordinates (negative angle so forward is along -Z road tangent)
    const roadHeading = -roadPath.angle;
    // Lateral drift yaw angle when steering
    const steerSlip = -this.state.playerVX * 0.015;
    const carHeading = roadHeading + steerSlip;

    // Body dynamics:
    // - Body roll into curve and steering
    const bodyRoll = -this.state.playerVX * 0.022 - roadPath.curvature * this.state.speed * 0.08;
    // - Body pitch on acceleration and braking
    const bodyPitch = this.input.throttle > 0 ? 0.012 : (this.input.throttle < 0 ? -0.028 : 0);

    // Update vehicle visual model
    this.vehicle.update(dt, this.state.speed, this.input.steer, this.input.throttle, this.state.playerVX);
    this.vehicle.group.position.set(carX, carY, carZ);
    this.vehicle.group.rotation.set(bodyPitch, carHeading, bodyRoll);

    // Camera viewpoints:
    const sinH = Math.sin(carHeading);
    const cosH = Math.cos(carHeading);
    const perpX = Math.cos(carHeading);
    const perpZ = -Math.sin(carHeading);

    let targetCamX = carX;
    let targetCamY = carY;
    let targetCamZ = carZ;
    let targetLookX = carX;
    let targetLookY = carY;
    let targetLookZ = carZ;
    let lerpSpeed = 0.16;

    const suspensionBob = Math.sin(this.state.time * 5.4) * 0.014 * (this.state.speed / BASE_SPEED);

    if (this.cameraMode === 'chase') {
      // Third-Person Chase Cam (Behind and above the sports car)
      const distBehind = 5.2;
      const heightAbove = 2.15;
      targetCamX = carX + distBehind * sinH;
      targetCamY = carY + heightAbove + suspensionBob;
      targetCamZ = carZ + distBehind * cosH;

      // Look-at point ahead of the car along the road
      const lookDist = 14.0;
      targetLookX = carX - lookDist * sinH;
      targetLookY = carY + 0.95;
      targetLookZ = carZ - lookDist * cosH;
      lerpSpeed = 0.18;
    } else {
      // Front Hood / Bumper View (Nose-mounted low camera for intense speed)
      const hoodForward = 1.65;
      const hoodHeight = 1.02;

      targetCamX = carX - hoodForward * sinH;
      targetCamY = carY + hoodHeight + suspensionBob * 0.4;
      targetCamZ = carZ - hoodForward * cosH;

      const lookDist = 26.0;
      targetLookX = carX - lookDist * sinH;
      targetLookY = carY + 0.92;
      targetLookZ = carZ - lookDist * cosH;
      lerpSpeed = 0.38;
    }

    // Smoothly interpolate camera position and look target
    const stepLerp = Math.min(1, lerpSpeed * (dt * 60));
    this.currentCamPos.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), stepLerp);
    this.currentLookTarget.lerp(new THREE.Vector3(targetLookX, targetLookY, targetLookZ), Math.min(1, (lerpSpeed + 0.05) * (dt * 60)));

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookTarget);

    // Natural camera banking into curves and steering roll
    const bankRoll = -roadPath.curvature * this.state.speed * 0.12 - this.state.playerVX * 0.01;
    this.camera.rotation.z += THREE.MathUtils.clamp(bankRoll, -0.06, 0.06);

    // --- 4. Update Sky, Atmosphere & Audio ---
    this.skySystem.update(dt, this.state.time, this.camera.position.x);
    this.audioEngine.update(
      dt,
      this.state.speed,
      MIN_SPEED,
      MAX_SPEED,
      Math.abs(this.input.steer) > 0.1
    );

    // --- 5. Scroll & Recycle World Segments ---
    const dz = this.state.speed * dt;
    for (const seg of this.segments) {
      seg.position.z += dz;

      // Recycle when segment has fully cleared behind camera view
      if (seg.position.z - SEGMENT_LENGTH > RECYCLE_MARGIN) {
        seg.position.z -= TOTAL_LENGTH;
        const newAbsIndex = this.districtCounter++;
        seg.userData.absIndex = newAbsIndex;

        // Rebuild the curved road geometry for this recycled segment
        const roadGroup = seg.userData.roadGroup as THREE.Group;
        while (roadGroup.children.length > 0) {
          const child = roadGroup.children[0] as THREE.Mesh;
          if (child.geometry) child.geometry.dispose();
          roadGroup.remove(child);
        }
        buildCurvedRoad(roadGroup, newAbsIndex);

        // Rebuild dynamic roadside buildings and props
        this.populateSegmentDynamicContent(seg.userData.dynGroup, newAbsIndex);
      }
    }

    // --- 6. Render Main Scene ---
    this.renderer.render(this.scene, this.camera);

    // --- 7. Bloom Canvas Render (Dreamy warm sunset glow) ---
    if (this.bloomCtx && this.bloomCanvas) {
      this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
      this.bloomCtx.drawImage(this.canvas, 0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
    }

    if (this.onStateChange) {
      this.onStateChange(this.state, this.currentDistrictTitle);
    }
  };

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
