import * as THREE from 'three';

export class SkidMarkManager {
  private maxPoints = 500;
  private geometry: THREE.BufferGeometry;
  private mesh: THREE.Mesh;
  private positions: Float32Array;
  private colors: Float32Array;
  private indices: Uint16Array;

  private currentSegment = 0;
  private totalSegments = 0;

  private lastLeftPoint: THREE.Vector3 | null = null;
  private lastRightPoint: THREE.Vector3 | null = null;
  private isCurrentlyMarking = false;

  constructor(scene: THREE.Scene, maxSegments = 600) {
    this.maxPoints = maxSegments;

    // Each segment connects 2 vertices to 2 previous vertices = 2 triangles = 6 indices
    const vertexCount = this.maxPoints * 4;
    const indexCount = this.maxPoints * 6;

    this.positions = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 4); // RGBA
    this.indices = new Uint16Array(indexCount);

    // Setup index buffer for quads
    for (let i = 0; i < this.maxPoints; i++) {
      const v = i * 4;
      const idx = i * 6;
      this.indices[idx] = v;
      this.indices[idx + 1] = v + 1;
      this.indices[idx + 2] = v + 2;

      this.indices[idx + 3] = v + 2;
      this.indices[idx + 4] = v + 1;
      this.indices[idx + 5] = v + 3;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  public addMark(
    leftWheelPos: THREE.Vector3,
    rightWheelPos: THREE.Vector3,
    carHeading: number,
    slipIntensity: number // 0 to 1
  ) {
    if (slipIntensity <= 0.05) {
      this.isCurrentlyMarking = false;
      this.lastLeftPoint = null;
      this.lastRightPoint = null;
      return;
    }

    const tireHalfWidth = 0.14;
    const normalX = Math.cos(carHeading) * tireHalfWidth;
    const normalZ = -Math.sin(carHeading) * tireHalfWidth;
    const groundY = 0.035; // Hover just above ground to avoid z-fighting

    // Left Wheel quad
    if (this.lastLeftPoint) {
      const dist = leftWheelPos.distanceTo(this.lastLeftPoint);
      if (dist >= 0.35) {
        this.writeQuad(
          this.lastLeftPoint.x - normalX, groundY, this.lastLeftPoint.z - normalZ,
          this.lastLeftPoint.x + normalX, groundY, this.lastLeftPoint.z + normalZ,
          leftWheelPos.x - normalX, groundY, leftWheelPos.z - normalZ,
          leftWheelPos.x + normalX, groundY, leftWheelPos.z + normalZ,
          slipIntensity
        );
        this.lastLeftPoint.copy(leftWheelPos);
      }
    } else {
      this.lastLeftPoint = leftWheelPos.clone();
    }

    // Right Wheel quad
    if (this.lastRightPoint) {
      const dist = rightWheelPos.distanceTo(this.lastRightPoint);
      if (dist >= 0.35) {
        this.writeQuad(
          this.lastRightPoint.x - normalX, groundY, this.lastRightPoint.z - normalZ,
          this.lastRightPoint.x + normalX, groundY, this.lastRightPoint.z + normalZ,
          rightWheelPos.x - normalX, groundY, rightWheelPos.z - normalZ,
          rightWheelPos.x + normalX, groundY, rightWheelPos.z + normalZ,
          slipIntensity
        );
        this.lastRightPoint.copy(rightWheelPos);
      }
    } else {
      this.lastRightPoint = rightWheelPos.clone();
    }
  }

  private writeQuad(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    x3: number, y3: number, z3: number,
    x4: number, y4: number, z4: number,
    intensity: number
  ) {
    const seg = this.currentSegment;
    const vOffset = seg * 12; // 4 vertices * 3 coords
    const cOffset = seg * 16; // 4 vertices * 4 colors

    // Vertices
    this.positions[vOffset] = x1;
    this.positions[vOffset + 1] = y1;
    this.positions[vOffset + 2] = z1;

    this.positions[vOffset + 3] = x2;
    this.positions[vOffset + 4] = y2;
    this.positions[vOffset + 5] = z2;

    this.positions[vOffset + 6] = x3;
    this.positions[vOffset + 7] = y3;
    this.positions[vOffset + 8] = z3;

    this.positions[vOffset + 9] = x4;
    this.positions[vOffset + 10] = y4;
    this.positions[vOffset + 11] = z4;

    // Dark rubber color with alpha
    const alpha = Math.min(0.72, Math.max(0.15, intensity * 0.75));
    const r = 0.08, g = 0.08, b = 0.09;

    for (let i = 0; i < 4; i++) {
      const c = cOffset + i * 4;
      this.colors[c] = r;
      this.colors[c + 1] = g;
      this.colors[c + 2] = b;
      this.colors[c + 3] = alpha;
    }

    this.currentSegment = (this.currentSegment + 1) % this.maxPoints;
    if (this.totalSegments < this.maxPoints) {
      this.totalSegments++;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public reset() {
    this.currentSegment = 0;
    this.totalSegments = 0;
    this.positions.fill(0);
    this.colors.fill(0);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.lastLeftPoint = null;
    this.lastRightPoint = null;
  }
}
