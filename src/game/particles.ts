import * as THREE from 'three';

interface SmokeParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  growth: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
}

export class TireSmokeSystem {
  private maxParticles: number;
  private particles: SmokeParticle[];
  private mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private baseColor = new THREE.Color(0xdadada);
  private currentIndex = 0;

  constructor(scene: THREE.Scene, maxParticles = 120) {
    this.maxParticles = maxParticles;
    this.particles = [];

    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 0.2,
        growth: 1.5,
        life: 0,
        maxLife: 1.0,
        rotation: 0,
        rotSpeed: 0,
      });
    }

    // Soft volumetric billboard quad with smooth radial puff texture
    const geo = new THREE.PlaneGeometry(1, 1);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(245, 245, 250, 0.75)');
    grad.addColorStop(0.25, 'rgba(235, 235, 242, 0.55)');
    grad.addColorStop(0.55, 'rgba(215, 218, 225, 0.25)');
    grad.addColorStop(0.85, 'rgba(195, 200, 210, 0.06)');
    grad.addColorStop(1, 'rgba(180, 185, 195, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const smokeTexture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.MeshBasicMaterial({
      map: smokeTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
      blending: THREE.NormalBlending,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Initialize all offscreen
    this.dummy.position.set(0, -999, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < maxParticles; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }

  public emit(pos: THREE.Vector3, carVel: THREE.Vector3, intensity = 1.0) {
    const p = this.particles[this.currentIndex];
    p.active = true;
    p.x = pos.x + (Math.random() - 0.5) * 0.4;
    p.y = 0.12 + Math.random() * 0.08;
    p.z = pos.z + (Math.random() - 0.5) * 0.4;

    // Billow outward radially and gently behind car
    p.vx = carVel.x * 0.18 + (Math.random() - 0.5) * 1.5;
    p.vy = 0.15 + Math.random() * 0.22; // Gentle low rise, not vertical plumes
    p.vz = carVel.z * 0.18 + (Math.random() - 0.5) * 1.5;

    p.scale = 0.45 + Math.random() * 0.25;
    p.growth = 2.4 + intensity * 1.6;
    p.life = 0;
    p.maxLife = 0.85 + Math.random() * 0.4;
    p.rotation = Math.random() * Math.PI * 2;
    p.rotSpeed = (Math.random() - 0.5) * 1.8;

    this.currentIndex = (this.currentIndex + 1) % this.maxParticles;
  }

  public update(dt: number, camera: THREE.Camera) {
    let needsUpdate = false;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.dummy.position.set(0, -999, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        needsUpdate = true;
        continue;
      }

      // Physics motion with slight aerodynamic drag
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= 0.96;
      p.vz *= 0.96;
      p.scale += p.growth * dt;
      p.rotation += p.rotSpeed * dt;

      // Soft shrink near end of lifetime to smoothly fade
      const lifeRatio = p.life / p.maxLife;
      const renderScale = lifeRatio > 0.65
        ? p.scale * (1.0 - (lifeRatio - 0.65) * 1.8)
        : p.scale;

      // Billow billboard towards camera with in-plane rotation
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.quaternion.copy(camera.quaternion);
      this.dummy.rotateZ(p.rotation);
      this.dummy.scale.set(Math.max(0.01, renderScale), Math.max(0.01, renderScale), 1);
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this.dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose() {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
