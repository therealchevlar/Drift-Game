import * as THREE from 'three';
import { CarPhysics } from './physics';

export class ChaseCamera {
  public camera: THREE.PerspectiveCamera;

  private currentPosition = new THREE.Vector3(0, 5, -35);
  private currentLookAt = new THREE.Vector3(0, 1.2, -25);
  private smoothFollowHeading = 0;

  private baseFov = 56;
  private maxFov = 68;
  private shakeIntensity = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 1000);
    this.camera.position.copy(this.currentPosition);
  }

  public reset(carPhysics: CarPhysics) {
    this.smoothFollowHeading = carPhysics.heading;
    const sinH = Math.sin(this.smoothFollowHeading);
    const cosH = Math.cos(this.smoothFollowHeading);

    const behindDist = 7.0;
    const height = 2.6;

    this.currentPosition.set(
      carPhysics.position.x - sinH * behindDist,
      carPhysics.position.y + height,
      carPhysics.position.z - cosH * behindDist
    );

    this.currentLookAt.set(
      carPhysics.position.x + sinH * 1.5,
      carPhysics.position.y + 1.1,
      carPhysics.position.z + cosH * 1.5
    );

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  public triggerImpactShake(amount = 0.4) {
    this.shakeIntensity = Math.min(0.8, this.shakeIntensity + amount);
  }

  public update(dt: number, carPhysics: CarPhysics) {
    const delta = Math.min(0.05, Math.max(0.001, dt));

    const speed = carPhysics.velocity.length();
    const speedKmh = speed * 3.6;

    // 1. DYNAMIC BLEND HEADING (CINEMATIC DRIFT MOMENTUM ANGLE)
    // When drifting, camera blends between car heading and actual velocity direction
    let targetHeading = carPhysics.heading;

    if (speed > 2.0) {
      const velHeading = Math.atan2(carPhysics.velocity.x, carPhysics.velocity.z);
      // Shortest angle difference
      let diff = velHeading - carPhysics.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // Blend ~30% of drift movement angle into camera follow to showcase the slide
      targetHeading = carPhysics.heading + diff * 0.32;
    }

    // Smooth shortest angle interpolation for camera yaw
    let headingDiff = targetHeading - this.smoothFollowHeading;
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;

    const followSpeed = 4.8;
    this.smoothFollowHeading += headingDiff * followSpeed * delta;

    const sinF = Math.sin(this.smoothFollowHeading);
    const cosF = Math.cos(this.smoothFollowHeading);

    // 2. IDEAL CAMERA DISTANCE & HEIGHT
    // Distance pulls back slightly at higher speed
    const distance = 6.8 + Math.min(2.5, speed * 0.05);
    const height = 2.4 + Math.min(0.8, speed * 0.015);

    const targetPos = new THREE.Vector3(
      carPhysics.position.x - sinF * distance,
      carPhysics.position.y + height,
      carPhysics.position.z - cosF * distance
    );

    // Look slightly ahead of car
    const lookAheadDist = 1.6 + Math.min(2.0, speed * 0.03);
    const targetLookAt = new THREE.Vector3(
      carPhysics.position.x + Math.sin(carPhysics.heading) * lookAheadDist,
      carPhysics.position.y + 1.15,
      carPhysics.position.z + Math.cos(carPhysics.heading) * lookAheadDist
    );

    // 3. SMOOTH CAMERA LERP
    const posLerpFactor = 1.0 - Math.exp(-6.5 * delta);
    const lookLerpFactor = 1.0 - Math.exp(-8.0 * delta);

    this.currentPosition.lerp(targetPos, posLerpFactor);
    this.currentLookAt.lerp(targetLookAt, lookLerpFactor);

    // 4. SCREEN SHAKE FOR IMPACTS
    if (this.shakeIntensity > 0.01) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeZ = (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.set(
        this.currentPosition.x + shakeX,
        this.currentPosition.y + shakeY,
        this.currentPosition.z + shakeZ
      );
      this.shakeIntensity *= 0.88;
    } else {
      this.camera.position.copy(this.currentPosition);
    }

    this.camera.lookAt(this.currentLookAt);

    // 5. DYNAMIC SPEED FOV
    const speedRatio = Math.min(1.0, speedKmh / 140);
    const targetFov = this.baseFov + (this.maxFov - this.baseFov) * (speedRatio * speedRatio);
    this.camera.fov += (targetFov - this.camera.fov) * 3.0 * delta;
    this.camera.updateProjectionMatrix();
  }

  public setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
