import * as THREE from 'three';
import { InputState, CarPhysicsState } from '../types';
import { soundEngine } from './audio';

export interface CollisionObstacle {
  x: number;
  z: number;
  radius: number;
  type?: 'cone' | 'tire' | 'barrier' | 'pillar';
}

/**
 * High-Performance Arcade-Realistic RWD Drift Physics Engine
 *
 * Simulates:
 * - Dual-axle Pacejka tire slip friction model (independent front/rear slip angles)
 * - RWD powertrain with realistic torque curve, gear ratios, and wheelspin power-oversteer
 * - Dynamic longitudinal and lateral weight transfer (suspension squat, dive, and body roll)
 * - Razor-sharp responsive handbrake with rear traction cut and entry yaw impulse
 * - Self-aligning torque & caster effect for butter-smooth, controllable counter-steering
 * - Seamless "Manji" drift transitions with pendulum inertia and transitional yaw damping
 * - Anti-spinout sweet spot (20°–65°) that rewards skill while remaining approachable
 * - Complete ground-plane stability (no flipping, jittering, or erratic physics explosion)
 */
export class CarPhysics {
  // World transforms
  public position = new THREE.Vector3(0, 0, -25);
  public rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  public heading = 0; // Yaw in radians (0 = facing +Z)

  // Velocity (World & Body space)
  public velocity = new THREE.Vector3(0, 0, 0);
  public angularVelocity = 0; // Yaw rate in radians/sec
  public vLong = 0;           // Forward longitudinal velocity (m/s)
  public vLat = 0;            // Lateral slide velocity (m/s)

  // Driven rear wheels dynamics
  public rearWheelAngularVelocity = 0; // Rad/sec of driven wheels (simulates wheelspin)
  public frontWheelRotation = 0;       // Rolling angle for front wheels
  public rearWheelRotation = 0;        // Rolling angle for rear wheels
  public wheelRotation = 0;           // Rolling angle for 3D meshes (backward compat)

  // Steering & visual suspension state
  public steerAngle = 0;              // Current front wheel visual/physical steer angle
  public bodyRoll = 0;                // Dynamic suspension roll
  public bodyPitch = 0;               // Dynamic suspension pitch (squat/dive)
  private rollVelocity = 0;           // Spring-damper for body roll
  private pitchVelocity = 0;          // Spring-damper for body pitch

  // Powertrain & Gearbox
  public engineRpm = 900;
  public currentGear: number | string = 1;
  public exhaustTimer = 0;
  public hasCollidedRecently = false;
  private collisionCooldown = 0;

  // Track collision boundaries
  public obstacles: CollisionObstacle[] = [];
  public mapHalfWidth = 135;
  public mapHalfLength = 165;

  // Spawn reset points
  public resetSpawnPosition = new THREE.Vector3(0, 0, -25);
  public resetSpawnHeading = 0;

  // === VEHICLE DIMENSIONS & INERTIA ===
  private readonly mass = 1320;             // kg
  private readonly inertia = 1750;          // kg*m^2 (yaw rotational inertia)
  private readonly wheelbase = 2.65;        // meters
  private readonly distToFrontAxle = 1.25;  // meters (CG to front axle)
  private readonly distToRearAxle = 1.40;   // meters (CG to rear axle)
  private readonly wheelRadius = 0.33;      // meters
  private readonly gravity = 9.81;          // m/s^2

  // === STEERING CONFIG ===
  private readonly maxSteerAngle = 0.68;    // ~39 degrees max lock for deep drift angle control
  private readonly steerSpeed = 7.5;        // Snappy responsive steering rack (rad/sec)
  private readonly counterSteerAssist = 1.45; // Enhanced authority when counter-steering into slide

  // === ENGINE & BRAKING ===
  private readonly engineMaxTorque = 490;   // Nm (punchy turbocharged inline-6 feel)
  private readonly brakeTorque = 980;       // Nm
  private readonly handbrakeTorque = 1600;   // Nm (instantly locks rear wheels)
  private readonly gearRatios = [3.8, 2.3, 1.55, 1.15, 0.88]; // 5 forward gears
  private readonly reverseGearRatio = 3.4;
  private readonly finalDriveRatio = 3.73;

  constructor() {
    this.reset();
  }

  public reset() {
    this.position.copy(this.resetSpawnPosition);
    this.heading = this.resetSpawnHeading;
    this.rotation.set(0, this.heading, 0);
    this.velocity.set(0, 0, 0);
    this.angularVelocity = 0;
    this.vLong = 0;
    this.vLat = 0;
    this.rearWheelAngularVelocity = 0;
    this.steerAngle = 0;
    this.frontWheelRotation = 0;
    this.rearWheelRotation = 0;
    this.wheelRotation = 0;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.rollVelocity = 0;
    this.pitchVelocity = 0;
    this.engineRpm = 900;
    this.currentGear = 1;
    this.exhaustTimer = 0;
    this.hasCollidedRecently = false;
  }

  public update(dt: number, input: InputState): CarPhysicsState {
    // Safety clamp dt to avoid physics blowup on lag spikes or tab switching
    const delta = Math.min(0.04, Math.max(0.001, dt));

    if (input.reset) {
      this.reset();
    }

    // 1. CAR ORIENTATION VECTORS (0 heading points along +Z)
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    const forwardVec = new THREE.Vector3(sinH, 0, cosH);
    const rightVec = new THREE.Vector3(cosH, 0, -sinH);

    // Velocity decomposition into car local frame
    if (this.hasCollidedRecently) {
      this.vLong = this.velocity.dot(forwardVec);
      this.vLat = this.velocity.dot(rightVec);
    }
    const vLong = this.vLong;
    const vLat = this.vLat;
    const speedTotal = Math.sqrt(vLong * vLong + vLat * vLat);
    const speedKmh = speedTotal * 3.6;

    // Body slip angle (overall drift angle)
    let driftAngleRad = 0;
    if (speedTotal > 1.5) {
      driftAngleRad = Math.atan2(Math.abs(vLat), Math.abs(vLong) + 0.1);
    }
    const driftAngleDeg = (driftAngleRad * 180) / Math.PI;

    // 2. RESPONSIVE STEERING WITH CASTER DYNAMICS
    // Ideal counter-steer angle when sliding
    let idealCounterSteer = 0;
    if (speedTotal > 2.5 && Math.abs(vLat) > 0.5) {
      idealCounterSteer = Math.atan2(vLat, Math.max(1.0, Math.abs(vLong)));
    }

    // In Three.js coordinates (car facing +Z):
    // Steer Right (input.steer > 0) -> targetSteerAngle < 0 (knuckles turn right, yaw rate turns car right)
    // Steer Left (input.steer < 0) -> targetSteerAngle > 0 (knuckles turn left, yaw rate turns car left)
    const targetSteerAngle = -input.steer * this.maxSteerAngle;

    // If player steers into the direction of the slide (counter-steer), increase rack speed
    const isCounterSteering =
      Math.sign(targetSteerAngle) === Math.sign(idealCounterSteer) && Math.abs(idealCounterSteer) > 0.08;
    const currentSteerSpeed = isCounterSteering
      ? this.steerSpeed * this.counterSteerAssist
      : this.steerSpeed;

    this.steerAngle += (targetSteerAngle - this.steerAngle) * currentSteerSpeed * delta;

    // 3. DYNAMIC WEIGHT TRANSFER (Longitudinal & Lateral)
    // Static axle loads (N)
    const fzFrontStatic = (this.distToRearAxle / this.wheelbase) * this.mass * this.gravity;
    const fzRearStatic = (this.distToFrontAxle / this.wheelbase) * this.mass * this.gravity;

    // Longitudinal acceleration estimation for weight transfer
    const approxLongAccel = this.velocity.length() > 0.1
      ? ((input.throttle * 9.0) - (input.brake * 12.0))
      : 0;
    const weightTransferLong = (0.42 / this.wheelbase) * this.mass * approxLongAccel;

    // Front/Rear normal loads (clamped to prevent negative load)
    const fzFront = Math.max(1500, Math.min(fzFrontStatic * 1.7, fzFrontStatic - weightTransferLong));
    const fzRear = Math.max(1500, Math.min(fzRearStatic * 1.7, fzRearStatic + weightTransferLong));

    // 4. INDEPENDENT AXLE SLIP VELOCITIES & ANGLES
    // Front axle lateral velocity = vLat + a * yawRate
    const vLatFront = vLat + this.distToFrontAxle * this.angularVelocity;
    // Rear axle lateral velocity = vLat - b * yawRate
    const vLatRear = vLat - this.distToRearAxle * this.angularVelocity;

    const vLongEffective = Math.max(0.6, Math.abs(vLong));

    // Slip angle front: angle of front tire velocity relative to front wheel angle
    const alphaFront = Math.atan2(vLatFront, vLongEffective) - this.steerAngle;
    // Slip angle rear: angle of rear tire velocity
    const alphaRear = Math.atan2(vLatRear, vLongEffective);

    // 5. POWERTRAIN, GEARBOX, & RWD WHEELSPIN
    const isHandbraking = input.handbrake;
    const isThrottle = input.throttle > 0.02;
    const isBraking = input.brake > 0.02;

    // Calculate current gear ratio
    let currentRatio = this.gearRatios[0];
    if (vLong < -0.4 && isBraking) {
      this.currentGear = 'R';
      currentRatio = this.reverseGearRatio;
    } else {
      // 5-speed progressive auto-shifter tuned for high-rev powerband
      const gearThresholds = [0, 8.5, 17.5, 27.5, 38.0];
      let gear = 1;
      for (let i = 1; i <= 5; i++) {
        if (Math.abs(vLong) >= gearThresholds[i - 1]) {
          gear = i;
        }
      }
      this.currentGear = gear;
      currentRatio = this.gearRatios[gear - 1];
    }

    // Engine Torque curve: wide punchy powerband between 3000 and 7000 RPM
    const rpmNorm = Math.min(1.0, Math.max(0, (this.engineRpm - 1000) / 6500));
    // High low-end grunt for breaking rear traction on demand
    const torqueMultiplier = 0.85 + 0.35 * Math.sin(rpmNorm * Math.PI);
    const driveTorque = isThrottle
      ? input.throttle * this.engineMaxTorque * torqueMultiplier * currentRatio * this.finalDriveRatio
      : 0;

    // Rear Driven Wheels Angular Velocity & Wheelspin Simulation
    const groundWheelAngularVel = vLong / this.wheelRadius;

    if (isHandbraking) {
      // E-Brake locks rear wheels instantly
      this.rearWheelAngularVelocity = 0;
    } else if (isThrottle && vLong >= -0.5) {
      // Accelerating forward: calculate wheel torque vs ground traction
      const driveForceRaw = driveTorque / this.wheelRadius;
      // Max traction rear tires can transmit before spinning
      const maxRearTraction = fzRear * 1.15;

      if (driveForceRaw > maxRearTraction || (speedKmh < 30 && input.throttle > 0.5)) {
        // Power oversteer: excess torque accelerates wheels past ground speed!
        const excessTorque = driveTorque - maxRearTraction * this.wheelRadius;
        this.rearWheelAngularVelocity += (excessTorque / 8.5) * delta;
        // Cap wheelspin RPM
        this.rearWheelAngularVelocity = Math.min(180, Math.max(groundWheelAngularVel, this.rearWheelAngularVelocity));
      } else {
        // Gripping: rear wheels match ground speed closely
        this.rearWheelAngularVelocity += (groundWheelAngularVel - this.rearWheelAngularVelocity) * 18.0 * delta;
      }
    } else if (isBraking && vLong < -0.5) {
      // Reverse drive
      this.rearWheelAngularVelocity += (-15 - this.rearWheelAngularVelocity) * 10.0 * delta;
    } else {
      // Coasting / decelerating: wheels spin at ground speed
      this.rearWheelAngularVelocity += (groundWheelAngularVel - this.rearWheelAngularVelocity) * 16.0 * delta;
    }

    // Longitudinal wheel slip ratio Sr = (w*R - v) / v
    const wheelSurfaceSpeed = this.rearWheelAngularVelocity * this.wheelRadius;
    const slipRatio = (wheelSurfaceSpeed - vLong) / Math.max(1.0, Math.abs(vLong));

    // 6. TIRE FORCES (FRONT & REAR)
    // Pacejka Magic Formula / Hyperbolic Tangent curve
    // Front lateral force
    const frontMuPeak = 1.28;
    const frontStiffness = 16.5; // Sharp front bite for authority
    const fyFront = -fzFront * frontMuPeak * Math.tanh(frontStiffness * alphaFront);

    // Rear lateral force (subject to Friction Ellipse with wheelspin & handbrake)
    let rearMuPeak = 1.20;
    let rearMuSlide = 0.62;

    if (isHandbraking) {
      // Handbrake cuts rear lateral traction to pure sliding level
      rearMuPeak = 0.24;
      rearMuSlide = 0.20;
    } else if (isThrottle) {
      // Power Oversteer Friction Ellipse:
      // High wheelspin reduces available lateral grip
      const slipMagnitude = Math.min(2.5, Math.abs(slipRatio));
      const gripDropFactor = Math.max(0.35, 1.0 - slipMagnitude * 0.38);
      rearMuPeak *= gripDropFactor;
      rearMuSlide *= gripDropFactor;
    }

    const rearStiffness = isHandbraking ? 4.0 : 12.0;
    // Smooth transition from peak to kinetic slide as slip angle widens
    const absAlphaRear = Math.abs(alphaRear);
    const slideBlend = Math.min(1.0, Math.max(0, (absAlphaRear - 0.12) / 0.28));
    const effectiveRearMu = (1.0 - slideBlend) * rearMuPeak + slideBlend * rearMuSlide;
    const fyRear = -fzRear * effectiveRearMu * Math.tanh(rearStiffness * alphaRear);

    const isRearSlipping = absAlphaRear > 0.14 || isHandbraking || (isThrottle && Math.abs(slipRatio) > 0.35);

    // Longitudinal forces on car chassis
    let fxLong = 0;

    if (vLong >= -0.4) {
      // Forward direction
      if (isThrottle && !isHandbraking) {
        // Propulsion force from driven wheels
        const thrust = Math.min(fzRear * effectiveRearMu * 1.35, (driveTorque / this.wheelRadius));
        fxLong += thrust;
      }
      if (isBraking) {
        fxLong -= input.brake * (this.brakeTorque / this.wheelRadius) * 1.2;
      }
      if (isHandbraking) {
        // Sliding rear tires resist forward motion
        fxLong -= fzRear * rearMuSlide * 0.95;
      }
    } else {
      // Reverse direction
      if (isBraking) {
        fxLong -= input.brake * 14.0 * this.mass * 0.1;
      }
      if (isThrottle) {
        fxLong += input.throttle * 24.0 * this.mass * 0.1;
      }
    }

    // Aerodynamic drag & Rolling resistance
    const aeroDragCoeff = 0.38;
    const frontalArea = 2.1;
    const airDensity = 1.225;
    const dragForce = 0.5 * airDensity * aeroDragCoeff * frontalArea * vLong * Math.abs(vLong);
    const rollingResistance = 0.015 * this.mass * this.gravity * Math.sign(vLong);
    fxLong -= (dragForce + rollingResistance);

    // 7. YAW DYNAMICS & COUNTER-STEER STABILIZATION
    // Kinematic target yaw rate based on steering angle and forward speed:
    // Left steer (steerAngle < 0) -> negative yaw rate -> turns left
    // Right steer (steerAngle > 0) -> positive yaw rate -> turns right
    const kinematicYawRate = (vLong / this.wheelbase) * Math.tan(this.steerAngle);

    // Front steering authority creates decisive, responsive yaw moment
    const steerResponsiveness = 14.5;
    let yawTorque = (kinematicYawRate - this.angularVelocity) * this.inertia * steerResponsiveness;

    // Drift Oversteer: when rear tires slip, the tail steps outward
    if (isRearSlipping || isHandbraking) {
      // Lateral slide oversteer torque
      const slipOversteer = -vLat * 0.42;
      yawTorque += slipOversteer * this.inertia * 6.5;

      // Throttle-on power oversteer kicks tail out in direction of turn
      if (isThrottle && Math.abs(this.steerAngle) > 0.04) {
        yawTorque += Math.sign(this.steerAngle) * input.throttle * 4200;
      }
    }

    // Handbrake flick impulse:
    // Pulling e-brake while initiating turn kicks tail out instantly!
    if (isHandbraking && speedKmh > 12 && Math.abs(this.steerAngle) > 0.03) {
      const flickDir = Math.sign(this.steerAngle);
      yawTorque += flickDir * 8500 * Math.min(1.0, speedKmh / 30);
    }

    // Dynamic Yaw Damping (prevents infinite spinout, stabilizes drift sweet spot)
    const baseDamping = 1800;
    let extraDamping = 0;
    if (driftAngleDeg > 22) {
      const deepAngleFactor = Math.min(1.0, (driftAngleDeg - 22) / 42);
      extraDamping = deepAngleFactor * 2600;
    }
    yawTorque -= (baseDamping + extraDamping) * this.angularVelocity;

    // Angular acceleration (alpha = Torque / I_z)
    const yawAccel = yawTorque / this.inertia;
    this.angularVelocity += yawAccel * delta;

    // Realistic cap on maximum rotational rate (~260 deg/s) to prevent dizzy spinning
    this.angularVelocity = Math.max(-4.5, Math.min(4.5, this.angularVelocity));

    // Update Heading
    this.heading += this.angularVelocity * delta;

    // 8. ACCELERATION INTEGRATION INTO WORLD VELOCITY
    // Longitudinal acceleration
    const localAccelZ = fxLong / this.mass;
    this.vLong += localAccelZ * delta;

    // Lateral acceleration / drift slide
    if (isRearSlipping || isHandbraking) {
      // Lateral tire friction gradually damps lateral slide
      const lateralFriction = (fyFront + fyRear) / this.mass;
      this.vLat += lateralFriction * delta;
    } else {
      // High traction keeps car firmly on rails without sideways slip
      this.vLat *= Math.max(0, 1.0 - 22.0 * delta);
    }

    // Dead-stop damping at low speeds (anti-jitter)
    if (speedTotal < 0.35 && !isThrottle && !isBraking) {
      this.vLong *= 0.82;
      this.vLat *= 0.82;
      this.angularVelocity *= 0.82;
      if (speedTotal < 0.04) {
        this.vLong = 0;
        this.vLat = 0;
        this.velocity.set(0, 0, 0);
        this.angularVelocity = 0;
      }
    }

    // Compute updated world velocity from current heading and body velocities
    const newSinH = Math.sin(this.heading);
    const newCosH = Math.cos(this.heading);
    this.velocity.set(
      newSinH * this.vLong + newCosH * this.vLat,
      0,
      newCosH * this.vLong - newSinH * this.vLat
    );

    // 9. UPDATE POSITION & WORLD MATRIX
    this.position.add(this.velocity.clone().multiplyScalar(delta));

    // Keep car securely on track plane (prevent flipping)
    this.position.y = 0;

    // 10. COLLISION HANDLING (GUARDRAILS & OBSTACLES)
    this.handleCollisions();

    // 11. VISUAL WHEEL ROTATION & SUSPENSION SPRING DYNAMICS
    // Rolling rotation: driven rear wheels rotate with wheelspin, front wheels with road travel
    const frontRollSpeed = vLong / this.wheelRadius;
    const rearRollSpeed = this.rearWheelAngularVelocity;
    this.frontWheelRotation += frontRollSpeed * delta;
    this.rearWheelRotation += rearRollSpeed * delta;
    this.wheelRotation = this.rearWheelRotation;

    // Spring-Damper Body Roll:
    // Leans outward in response to lateral G and rotational whip
    const targetRoll = Math.max(-0.13, Math.min(0.13, (-vLatFront * vLong * 0.007) - (this.angularVelocity * 0.038)));
    const rollSpring = 120.0;
    const rollDamper = 14.0;
    const rollAccel = (targetRoll - this.bodyRoll) * rollSpring - this.rollVelocity * rollDamper;
    this.rollVelocity += rollAccel * delta;
    this.bodyRoll += this.rollVelocity * delta;

    // Spring-Damper Body Pitch:
    // Squats under hard throttle, dives under hard braking
    const targetPitch = Math.max(-0.065, Math.min(0.065, (localAccelZ * 0.0045)));
    const pitchSpring = 140.0;
    const pitchDamper = 16.0;
    const pitchAccel = (targetPitch - this.bodyPitch) * pitchSpring - this.pitchVelocity * pitchDamper;
    this.pitchVelocity += pitchAccel * delta;
    this.bodyPitch += this.pitchVelocity * delta;

    // 12. ENGINE RPM SIMULATION
    this.updateEngineRpm(vLong, isThrottle, delta);

    // 13. EXHAUST FLAME POPPING
    if (this.exhaustTimer > 0) {
      this.exhaustTimer -= delta;
    }
    const isDrifting = driftAngleDeg > 13 && speedKmh > 16;

    // Exhaust pops on throttle lift-off or rev-limiter bounces during drift
    if (isDrifting && isThrottle && this.engineRpm > 6800 && Math.random() < 0.14) {
      this.exhaustTimer = 0.12;
      soundEngine.triggerExhaustPop();
    }

    if (this.collisionCooldown > 0) {
      this.collisionCooldown -= delta;
    }

    return {
      speedKmh: Math.round(speedKmh),
      engineRpm: Math.round(this.engineRpm),
      gear: this.currentGear,
      driftAngle: Math.round(driftAngleDeg),
      isDrifting,
      isRearSlipping: isRearSlipping && speedKmh > 10,
      lateralG: Math.abs((vLong * this.angularVelocity) / 9.81),
      steeringAngle: this.steerAngle,
      wheelRotSpeed: this.rearWheelAngularVelocity,
      exhaustFlame: this.exhaustTimer > 0,
      colliding: this.hasCollidedRecently,
    };
  }

  private updateEngineRpm(vLong: number, isThrottle: boolean, dt: number) {
    if (vLong < -0.5) {
      // Reverse gear
      const targetRpm = 1000 + Math.min(1.0, Math.abs(vLong) / 12) * 5800;
      this.engineRpm += (targetRpm - this.engineRpm) * 0.25;
      return;
    }

    // Engine RPM directly tied to driven rear wheel rotation speed
    // Ratio = (gearRatio * finalDrive)
    const gearIdx = typeof this.currentGear === 'number' ? this.currentGear - 1 : 0;
    const ratio = (this.gearRatios[gearIdx] || 2.0) * this.finalDriveRatio;

    // Ground RPM based on wheel speed
    const wheelRpm = (this.rearWheelAngularVelocity * 60) / (2 * Math.PI);
    let calculatedRpm = Math.max(900, Math.abs(wheelRpm * (ratio / 3.5)));

    if (isThrottle) {
      // Throttle flare
      calculatedRpm += 550;
    }

    // Rev limiter bounce (7600 RPM)
    if (calculatedRpm >= 7600) {
      // Bounce down slightly to simulate ignition cut
      calculatedRpm = 7350 + Math.random() * 250;
      if (Math.random() < 0.25) {
        soundEngine.triggerExhaustPop();
      }
    }

    // Smooth engine needle response
    const rpmSpeed = isThrottle ? 22.0 : 14.0;
    this.engineRpm += (calculatedRpm - this.engineRpm) * Math.min(1.0, rpmSpeed * dt);
    this.engineRpm = Math.max(900, Math.min(7800, this.engineRpm));
  }

  private handleCollisions() {
    this.hasCollidedRecently = false;
    const carRadius = 1.35;

    // 1. Perimeter Concrete Walls / Guardrails
    const minX = -this.mapHalfWidth + 3.2;
    const maxX = this.mapHalfWidth - 3.2;
    const minZ = -this.mapHalfLength + 3.2;
    const maxZ = this.mapHalfLength - 3.2;

    let hitWall = false;

    if (this.position.x < minX) {
      this.position.x = minX;
      this.velocity.x = -this.velocity.x * 0.35;
      hitWall = true;
    } else if (this.position.x > maxX) {
      this.position.x = maxX;
      this.velocity.x = -this.velocity.x * 0.35;
      hitWall = true;
    }

    if (this.position.z < minZ) {
      this.position.z = minZ;
      this.velocity.z = -this.velocity.z * 0.35;
      hitWall = true;
    } else if (this.position.z > maxZ) {
      this.position.z = maxZ;
      this.velocity.z = -this.velocity.z * 0.35;
      hitWall = true;
    }

    // 2. Obstacles (Tire stacks, light poles, donut center monument, shipping containers)
    for (const obs of this.obstacles) {
      const dx = this.position.x - obs.x;
      const dz = this.position.z - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = carRadius + obs.radius;

      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;

        // Push car out smoothly
        this.position.x += nx * overlap;
        this.position.z += nz * overlap;

        // Velocity deflection with friction drag
        const dot = this.velocity.x * nx + this.velocity.z * nz;
        if (dot < 0) {
          const restitution = obs.type === 'tire' ? 0.45 : 0.25;
          this.velocity.x -= (1 + restitution) * dot * nx;
          this.velocity.z -= (1 + restitution) * dot * nz;

          // Wall-rub friction (allows players to scrape barriers without coming to a sudden dead halt)
          this.velocity.multiplyScalar(0.82);
          this.angularVelocity *= 0.65;
          hitWall = true;
        }
      }
    }

    if (hitWall) {
      this.hasCollidedRecently = true;
      const sinH = Math.sin(this.heading);
      const cosH = Math.cos(this.heading);
      this.vLong = this.velocity.x * sinH + this.velocity.z * cosH;
      this.vLat = this.velocity.x * cosH - this.velocity.z * sinH;
      if (this.collisionCooldown <= 0) {
        const impactSpeed = this.velocity.length() * 3.6;
        if (impactSpeed > 12) {
          soundEngine.triggerCollisionSound(Math.min(1.0, impactSpeed / 60));
          this.collisionCooldown = 0.35;
        }
      }
    }
  }
}
