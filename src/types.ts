export type CameraViewMode = 'chase' | 'cockpit' | 'hood';

export interface GameInput {
  steer: number;     // -1 (left) to +1 (right)
  throttle: number;  // -1 (brake), 0 (cruise), +1 (accelerate)
}

export interface GameState {
  speed: number;
  playerX: number;
  playerVX: number;
  time: number;
  distanceTraveled: number;
  cameraMode: CameraViewMode;
}

export type DistrictType = 'commercial' | 'apartment' | 'industrial' | 'downtown';

export type BuildingCondition = 'modern' | 'aged' | 'industrial_weathered' | 'commercial_lit';

export interface DistrictConfig {
  name: DistrictType;
  title: string;
  heightRange: [number, number];
  widthRange: [number, number];
  depthRange: [number, number];
  gap: [number, number];
  colors: number[];
  accentColors: number[];
  windowDensity: number;
  hasNoiseBarriers?: boolean;
}

export interface AudioSettings {
  isMuted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}
