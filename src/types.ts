export interface InputState {
  throttle: number; // 0 to 1
  brake: number;    // 0 to 1
  steer: number;    // -1 (left) to 1 (right)
  handbrake: boolean;
  reset: boolean;
}

export interface CarPhysicsState {
  speedKmh: number;
  engineRpm: number;
  gear: number | string; // 'R', 'N', 1, 2, 3, 4, 5
  driftAngle: number;    // in degrees (0 to 90)
  isDrifting: boolean;
  isRearSlipping: boolean;
  lateralG: number;
  steeringAngle: number; // front wheel visual angle in radians
  wheelRotSpeed: number; // wheel rotation speed
  exhaustFlame: boolean;
  colliding: boolean;
}

export interface DriftScoreState {
  currentPoints: number;
  combo: number;
  multiplier: number;
  totalScore: number;
  bestScore: number;
  isChainActive: boolean;
  chainTimerPct: number; // 0 to 1
  driftRatingText: string;
}

export interface QualityConfig {
  dpr: number;
  shadows: boolean;
  maxSmokeParticles: number;
  maxSkidPoints: number;
  bloom: boolean;
}
