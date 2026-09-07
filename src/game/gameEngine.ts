import * as THREE from 'three';
import { createCar, CarMeshes } from './carModel';
import { CarPhysics } from './physics';
import { buildEnvironment, EnvironmentResult } from './environment';
import { ChaseCamera } from './camera';
import { TireSmokeSystem } from './particles';
import { SkidMarkManager } from './skidmarks';
import { DriftScoreManager } from './scoring';
import { InputManager } from './input';
import { soundEngine } from './audio';
import { CarPhysicsState, DriftScoreState } from '../types';

export class DriftGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private chaseCamera: ChaseCamera;

  // Systems
  public inputManager: InputManager;
  private carPhysics: CarPhysics;
  private carMeshes: CarMeshes;
  private environment: EnvironmentResult;
  private smokeSystem: TireSmokeSystem;
  private skidManager: SkidMarkManager;
  private scoreManager: DriftScoreManager;

  // Loop & Timing
  private animFrameId: number | null = null;
  private lastTime = 0;
  private isRunning = false;
  private isPaused = false;

  // Callbacks to React UI
  public onPhysicsUpdate?: (state: CarPhysicsState) => void;
  public onScoreUpdate?: (score: DriftScoreState) => void;
  public onFpsUpdate?: (fps: number) => void;

  // FPS & Adaptive Quality
  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;
  private lowFpsCounter = 0;
  private shadowsEnabled = true;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. SCENE
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x161922); // Deep twilight warm tone
    this.scene.fog = new THREE.FogExp2(0x282329, 0.0055); // Warm evening horizon haze

    // 2. RENDERER
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(width, height);
    // Mobile optimization: Cap DPR at 1.6 to ensure rock solid 60fps
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    this.renderer.setPixelRatio(dpr);

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. CAMERA
    this.chaseCamera = new ChaseCamera(width / height);

    // 4. SYSTEMS
    this.inputManager = new InputManager();
    this.carPhysics = new CarPhysics();
    this.carMeshes = createCar();
    this.scene.add(this.carMeshes.rootGroup);

    this.environment = buildEnvironment(true);
    this.scene.add(this.environment.sceneGroup);
    this.carPhysics.obstacles = this.environment.obstacles;

    this.smokeSystem = new TireSmokeSystem(this.scene, this.inputManager.isTouchDevice ? 80 : 130);
    this.skidManager = new SkidMarkManager(this.scene, 550);
    this.scoreManager = new DriftScoreManager();

    // Initial positioning
    this.chaseCamera.reset(this.carPhysics);

    // Event listeners
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resetCar() {
    this.carPhysics.reset();
    this.chaseCamera.reset(this.carPhysics);
    this.scoreManager.reset();
    this.skidManager.reset();
  }

  public setQuality(lowQuality: boolean) {
    this.shadowsEnabled = !lowQuality;
    this.renderer.shadowMap.enabled = this.shadowsEnabled;
    this.environment.sunLight.castShadow = this.shadowsEnabled;
    this.renderer.setPixelRatio(lowQuality ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5));
  }

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.chaseCamera.setAspect(width / height);
    this.renderer.setSize(width, height);
  };

  private handleVisibility = () => {
    if (document.hidden) {
      this.isPaused = true;
    } else {
      this.isPaused = false;
      this.lastTime = performance.now();
    }
  };

  private loop = (time: number) => {
    if (!this.isRunning) return;

    this.animFrameId = requestAnimationFrame(this.loop);

    if (this.isPaused) return;

    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    // FPS measurement & adaptive quality
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1.0) {
      this.currentFps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
      if (this.onFpsUpdate) this.onFpsUpdate(this.currentFps);

      // Adaptive quality: if FPS < 32 on mobile, automatically downgrade shadows
      if (this.currentFps < 32 && this.shadowsEnabled) {
        this.lowFpsCounter++;
        if (this.lowFpsCounter >= 2) {
          this.setQuality(true);
        }
      }
    }

    // 1. INPUT
    const input = this.inputManager.getInput();

    // 2. PHYSICS UPDATE
    const physState = this.carPhysics.update(dt, input);
    if (this.onPhysicsUpdate) this.onPhysicsUpdate(physState);

    // 3. UPDATE CAR 3D MESHES
    this.carMeshes.rootGroup.position.copy(this.carPhysics.position);
    this.carMeshes.rootGroup.rotation.y = this.carPhysics.heading;

    // Front steering knuckles
    this.carMeshes.wheelFLGroup.rotation.y = this.carPhysics.steerAngle;
    this.carMeshes.wheelFRGroup.rotation.y = this.carPhysics.steerAngle;

    // Rolling wheel rotation (independent front rolling vs rear driven wheelspin)
    this.carMeshes.wheelFLMesh.rotation.x = this.carPhysics.frontWheelRotation;
    this.carMeshes.wheelFRMesh.rotation.x = this.carPhysics.frontWheelRotation;
    this.carMeshes.wheelRLMesh.rotation.x = this.carPhysics.rearWheelRotation;
    this.carMeshes.wheelRRMesh.rotation.x = this.carPhysics.rearWheelRotation;

    // Body suspension tilt
    this.carMeshes.bodyGroup.rotation.z = this.carPhysics.bodyRoll;
    this.carMeshes.bodyGroup.rotation.x = this.carPhysics.bodyPitch;

    // Taillight brake flare
    const brakeIntensity = input.brake > 0.05 ? 3.0 : 0.8;
    this.carMeshes.taillightMaterial.emissiveIntensity = brakeIntensity;

    // Exhaust flames
    const showFlame = physState.exhaustFlame;
    this.carMeshes.flameLeft.visible = showFlame;
    this.carMeshes.flameRight.visible = showFlame;
    if (showFlame) {
      const flameScale = 0.8 + Math.random() * 0.5;
      this.carMeshes.flameLeft.scale.set(flameScale, flameScale, flameScale);
      this.carMeshes.flameRight.scale.set(flameScale, flameScale, flameScale);
    }

    // 4. TIRE SMOKE & SKID MARKS
    // World coordinates of rear tire contact points
    const carPos = this.carPhysics.position;
    const sinH = Math.sin(this.carPhysics.heading);
    const cosH = Math.cos(this.carPhysics.heading);

    const wheelTrack = 0.92;
    const wheelBase = -1.35;

    // Rear Left Wheel World Pos
    const rlx = carPos.x - cosH * wheelTrack + sinH * wheelBase;
    const rlz = carPos.z + sinH * wheelTrack + cosH * wheelBase;
    const rearLeftWorld = new THREE.Vector3(rlx, 0, rlz);

    // Rear Right Wheel World Pos
    const rrx = carPos.x + cosH * wheelTrack + sinH * wheelBase;
    const rrz = carPos.z - sinH * wheelTrack + cosH * wheelBase;
    const rearRightWorld = new THREE.Vector3(rrx, 0, rrz);

    // Slip ratio determines smoke and skid marks
    const isWheelspinning = Math.abs(physState.wheelRotSpeed) > 28 && input.throttle > 0.4;
    const isSlipping = physState.isRearSlipping || input.handbrake || isWheelspinning;
    const slipRatio = Math.max(
      physState.driftAngle / 40,
      input.handbrake ? 0.8 : 0,
      isWheelspinning ? 0.9 : 0
    );

    if (isSlipping && (physState.speedKmh > 8 || isWheelspinning)) {
      // Emit tire smoke
      const intensity = Math.min(1.4, Math.max(0.35, slipRatio));
      this.smokeSystem.emit(rearLeftWorld, this.carPhysics.velocity, intensity);
      this.smokeSystem.emit(rearRightWorld, this.carPhysics.velocity, intensity);

      // Leave skid marks
      this.skidManager.addMark(rearLeftWorld, rearRightWorld, this.carPhysics.heading, intensity);
    } else {
      this.skidManager.addMark(rearLeftWorld, rearRightWorld, this.carPhysics.heading, 0);
    }

    this.smokeSystem.update(dt, this.chaseCamera.camera);

    // 5. CAMERA UPDATE
    if (physState.colliding) {
      this.chaseCamera.triggerImpactShake(0.35);
    }
    this.chaseCamera.update(dt, this.carPhysics);

    // 6. SCORING UPDATE
    const scoreState = this.scoreManager.update(dt, physState);
    if (this.onScoreUpdate) this.onScoreUpdate(scoreState);

    // 7. AUDIO UPDATE
    soundEngine.update(
      physState.engineRpm,
      input.throttle,
      physState.speedKmh,
      slipRatio,
      physState.isDrifting,
      input.handbrake
    );

    // 8. RENDER SCENE
    this.renderer.render(this.scene, this.chaseCamera.camera);
  };

  public dispose() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    this.smokeSystem.dispose();
    this.renderer.dispose();
  }
}
