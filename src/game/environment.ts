import * as THREE from 'three';
import { CollisionObstacle } from './physics';

export interface EnvironmentResult {
  sceneGroup: THREE.Group;
  obstacles: CollisionObstacle[];
  sunLight: THREE.DirectionalLight;
}

export function buildEnvironment(qualityShadows = true): EnvironmentResult {
  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'DriftPlaygroundEnvironment';

  const obstacles: CollisionObstacle[] = [];

  // ==========================================
  // 1. PROCEDURAL ASPHALT TEXTURE
  // ==========================================
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Noise specks for tarmac grit
  for (let i = 0; i < 28000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.floor(Math.random() * 50 + 25);
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 2})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Faint asphalt aggregate / oil stains
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 18 + 5;
    ctx.fillStyle = 'rgba(15, 17, 20, 0.4)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const asphaltTexture = new THREE.CanvasTexture(canvas);
  asphaltTexture.wrapS = THREE.RepeatWrapping;
  asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(50, 60);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(320, 360);
  const groundMat = new THREE.MeshStandardMaterial({
    map: asphaltTexture,
    roughness: 0.88,
    metalness: 0.12,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = qualityShadows;
  sceneGroup.add(ground);

  // ==========================================
  // 2. LIGHTING & ATMOSPHERE (Golden Hour)
  // ==========================================
  const hemiLight = new THREE.HemisphereLight(0xffe4cc, 0x1e293b, 0.95);
  sceneGroup.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffb266, 1.8);
  sunLight.position.set(70, 55, 45);
  sunLight.castShadow = qualityShadows;
  if (qualityShadows) {
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 220;
    const d = 80;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.001;
  }
  sceneGroup.add(sunLight);

  // Warm secondary fill light
  const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.45);
  fillLight.position.set(-60, 30, -50);
  sceneGroup.add(fillLight);

  // ==========================================
  // 3. TRACK MARKINGS & ZONES
  // ==========================================
  const markingsGroup = new THREE.Group();
  sceneGroup.add(markingsGroup);

  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const redKerbMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
  const whiteKerbMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });

  // A. DONUT DRIFT ZONE (Centered at x: 45, z: 35)
  const donutCenterX = 45;
  const donutCenterZ = 35;
  const donutRingRadius = 24;

  const donutRingGeo = new THREE.RingGeometry(donutRingRadius - 0.4, donutRingRadius + 0.4, 48);
  donutRingGeo.rotateX(-Math.PI / 2);
  const donutRing = new THREE.Mesh(donutRingGeo, yellowLineMat);
  donutRing.position.set(donutCenterX, 0.02, donutCenterZ);
  markingsGroup.add(donutRing);

  const donutInnerRingGeo = new THREE.RingGeometry(12 - 0.3, 12 + 0.3, 36);
  donutInnerRingGeo.rotateX(-Math.PI / 2);
  const donutInnerRing = new THREE.Mesh(donutInnerRingGeo, whiteLineMat);
  donutInnerRing.position.set(donutCenterX, 0.02, donutCenterZ);
  markingsGroup.add(donutInnerRing);

  // Donut Center Staging Monument / Pylon
  const centerPylonGeo = new THREE.CylinderGeometry(2.2, 2.5, 6, 16);
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
  const centerPylon = new THREE.Mesh(centerPylonGeo, pylonMat);
  centerPylon.position.set(donutCenterX, 3, donutCenterZ);
  centerPylon.castShadow = qualityShadows;
  sceneGroup.add(centerPylon);

  const neonRingGeo = new THREE.TorusGeometry(2.3, 0.15, 8, 24);
  neonRingGeo.rotateX(Math.PI / 2);
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const neonRing = new THREE.Mesh(neonRingGeo, neonMat);
  neonRing.position.set(donutCenterX, 4.5, donutCenterZ);
  sceneGroup.add(neonRing);

  obstacles.push({ x: donutCenterX, z: donutCenterZ, radius: 2.7, type: 'pillar' });

  // B. FIGURE-8 DRIFT ZONE (Centered at x: -45, z: 20)
  const f8X = -45;
  const f8Z1 = 0;
  const f8Z2 = 45;
  const f8Radius = 18;

  const f8Ring1Geo = new THREE.RingGeometry(f8Radius - 0.35, f8Radius + 0.35, 48);
  f8Ring1Geo.rotateX(-Math.PI / 2);
  const f8Ring1 = new THREE.Mesh(f8Ring1Geo, whiteLineMat);
  f8Ring1.position.set(f8X, 0.02, f8Z1);
  markingsGroup.add(f8Ring1);

  const f8Ring2 = new THREE.Mesh(f8Ring1Geo, whiteLineMat);
  f8Ring2.position.set(f8X, 0.02, f8Z2);
  markingsGroup.add(f8Ring2);

  // Figure-8 apex tire clusters
  createTireStack(f8X, f8Z1, sceneGroup, obstacles, qualityShadows);
  createTireStack(f8X, f8Z2, sceneGroup, obstacles, qualityShadows);

  // C. START / PADDOCK AREA (Centered at x: 0, z: -25)
  // Grid starting boxes
  for (let i = -1; i <= 1; i++) {
    const boxLineGeo = new THREE.PlaneGeometry(3.5, 0.25);
    boxLineGeo.rotateX(-Math.PI / 2);
    const boxLine = new THREE.Mesh(boxLineGeo, yellowLineMat);
    boxLine.position.set(i * 8, 0.02, -28);
    markingsGroup.add(boxLine);
  }

  // Runway center dashed line along straight
  for (let z = -90; z <= 90; z += 12) {
    const dashGeo = new THREE.PlaneGeometry(0.35, 6);
    dashGeo.rotateX(-Math.PI / 2);
    const dash = new THREE.Mesh(dashGeo, whiteLineMat);
    dash.position.set(0, 0.02, z);
    markingsGroup.add(dash);
  }

  // D. RED/WHITE RUMBLE STRIP KERBS
  createRumbleCurbs(sceneGroup, redKerbMat, whiteKerbMat, qualityShadows);

  // ==========================================
  // 4. PERIMETER SAFETY WALLS & BARRIERS
  // ==========================================
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.7,
    metalness: 0.2,
  });

  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.5,
  });

  // Perimeter Jersey Barriers
  createPerimeterWalls(sceneGroup, wallMat, stripeMat, qualityShadows);

  // ==========================================
  // 5. INDUSTRIAL PROPS & SHIPPING CONTAINERS
  // ==========================================
  createShippingContainers(sceneGroup, obstacles, qualityShadows);

  // ==========================================
  // 6. TRACK CONES & TIRE BARRIERS
  // ==========================================
  createTrackCones(sceneGroup, obstacles, qualityShadows);
  createTireBarriers(sceneGroup, obstacles, qualityShadows);

  // ==========================================
  // 7. STREETLIGHT TOWERS WITH WARM SPOTLIGHTS
  // ==========================================
  createLightTowers(sceneGroup, obstacles, qualityShadows);

  // ==========================================
  // 8. DISTANT INDUSTRIAL SKYLINE & MOUNTAINS
  // ==========================================
  createBackgroundScenery(sceneGroup);

  return {
    sceneGroup,
    obstacles,
    sunLight,
  };
}

/**
 * Creates striped race track rumble curbs on curves
 */
function createRumbleCurbs(
  group: THREE.Group,
  redMat: THREE.Material,
  whiteMat: THREE.Material,
  shadows: boolean
) {
  const curbGeo = new THREE.BoxGeometry(1.6, 0.12, 1.8);

  // Curbs along sweeping outer turn (East side)
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 0.85 - 0.4;
    const r = 58;
    const x = 70 + Math.cos(angle) * r;
    const z = -20 + Math.sin(angle) * r;

    const curb = new THREE.Mesh(curbGeo, i % 2 === 0 ? redMat : whiteMat);
    curb.position.set(x, 0.06, z);
    curb.rotation.y = -angle;
    curb.receiveShadow = shadows;
    group.add(curb);
  }

  // Curbs along tight hairpin turn (West side)
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI + 0.1;
    const r = 38;
    const x = -75 + Math.cos(angle) * r;
    const z = -65 + Math.sin(angle) * r;

    const curb = new THREE.Mesh(curbGeo, i % 2 === 0 ? redMat : whiteMat);
    curb.position.set(x, 0.06, z);
    curb.rotation.y = -angle;
    curb.receiveShadow = shadows;
    group.add(curb);
  }
}

/**
 * Solid perimeter concrete barriers enclosing the track
 */
function createPerimeterWalls(
  group: THREE.Group,
  wallMat: THREE.Material,
  stripeMat: THREE.Material,
  shadows: boolean
) {
  const halfW = 135;
  const halfL = 165;
  const wallH = 2.2;
  const wallThick = 2.0;

  // North wall
  buildWallSegment(0, halfL, halfW * 2, wallThick, wallH, group, wallMat, stripeMat, shadows);
  // South wall
  buildWallSegment(0, -halfL, halfW * 2, wallThick, wallH, group, wallMat, stripeMat, shadows);
  // East wall
  buildWallSegment(halfW, 0, wallThick, halfL * 2, wallH, group, wallMat, stripeMat, shadows);
  // West wall
  buildWallSegment(-halfW, 0, wallThick, halfL * 2, wallH, group, wallMat, stripeMat, shadows);
}

function buildWallSegment(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  group: THREE.Group,
  wallMat: THREE.Material,
  stripeMat: THREE.Material,
  shadows: boolean
) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const wall = new THREE.Mesh(geo, wallMat);
  wall.position.set(x, h / 2, z);
  wall.castShadow = shadows;
  wall.receiveShadow = shadows;
  group.add(wall);

  // Warning stripe on top
  const stripeGeo = new THREE.BoxGeometry(w, 0.1, d);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(x, h + 0.05, z);
  group.add(stripe);
}

/**
 * Authentic stacked shipping containers for industrial drifting arena feel
 */
function createShippingContainers(
  group: THREE.Group,
  obstacles: CollisionObstacle[],
  shadows: boolean
) {
  const containerColors = [0x0284c7, 0xe11d48, 0xd97706, 0x15803d, 0x475569];
  const containerGeo = new THREE.BoxGeometry(3.2, 3.2, 8.5);

  const containerSpots = [
    // Paddock cluster
    { x: -28, z: -55, rot: 0.1, color: 0 },
    { x: -32, z: -55, rot: 0.1, color: 1 },
    { x: -30, z: -55, y: 3.2, rot: 0.1, color: 2 },

    { x: 30, z: -70, rot: -0.2, color: 3 },
    { x: 34, z: -70, rot: -0.2, color: 0 },

    // North corner chicane boundaries
    { x: 75, z: 90, rot: 0.4, color: 1 },
    { x: 79, z: 92, rot: 0.4, color: 4 },
    { x: 77, z: 91, y: 3.2, rot: 0.4, color: 2 },

    // West boundary stacks
    { x: -105, z: 40, rot: 1.57, color: 0 },
    { x: -105, z: 49, rot: 1.57, color: 3 },
    { x: -105, z: 45, y: 3.2, rot: 1.57, color: 1 },
  ];

  containerSpots.forEach((spot) => {
    const mat = new THREE.MeshStandardMaterial({
      color: containerColors[spot.color],
      roughness: 0.55,
      metalness: 0.4,
    });
    const container = new THREE.Mesh(containerGeo, mat);
    const posY = (spot.y || 0) + 1.6;
    container.position.set(spot.x, posY, spot.z);
    container.rotation.y = spot.rot;
    container.castShadow = shadows;
    container.receiveShadow = shadows;
    group.add(container);

    if (!spot.y) {
      // Add collision footprint
      obstacles.push({ x: spot.x, z: spot.z, radius: 3.5, type: 'barrier' });
    }
  });
}

/**
 * Drift cone marker
 */
function createTrackCones(
  group: THREE.Group,
  obstacles: CollisionObstacle[],
  shadows: boolean
) {
  const coneGeo = new THREE.ConeGeometry(0.35, 0.85, 12);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.4,
  });

  const coneLocations = [
    // Donut clipping points
    { x: 45 + 20, z: 35 },
    { x: 45 - 20, z: 35 },
    { x: 45, z: 35 + 20 },
    { x: 45, z: 35 - 20 },

    // Slalom cones along straight
    { x: -4, z: -10 },
    { x: 4, z: 12 },
    { x: -4, z: 34 },
    { x: 4, z: 56 },

    // Hairpin apex gates
    { x: -85, z: -40 },
    { x: -80, z: -45 },
    { x: -75, z: -50 },
  ];

  coneLocations.forEach((c) => {
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(c.x, 0.42, c.z);
    cone.castShadow = shadows;
    group.add(cone);

    obstacles.push({ x: c.x, z: c.z, radius: 0.5, type: 'cone' });
  });
}

/**
 * Realistic stacked tire barriers
 */
function createTireStack(
  x: number,
  z: number,
  group: THREE.Group,
  obstacles: CollisionObstacle[],
  shadows: boolean
) {
  const tireGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 16);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
  });

  for (let i = 0; i < 3; i++) {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.position.set(x, 0.25 + i * 0.48, z);
    tire.castShadow = shadows;
    group.add(tire);
  }

  obstacles.push({ x, z, radius: 1.4, type: 'tire' });
}

function createTireBarriers(
  group: THREE.Group,
  obstacles: CollisionObstacle[],
  shadows: boolean
) {
  const tireLocations = [
    { x: 65, z: 2 },
    { x: 68, z: -12 },
    { x: 88, z: 32 },
    { x: -30, z: 80 },
    { x: -34, z: 84 },
    { x: 15, z: 125 },
    { x: 20, z: 125 },
  ];

  tireLocations.forEach((pos) => {
    createTireStack(pos.x, pos.z, group, obstacles, shadows);
  });
}

/**
 * Modern stadium floodlight poles
 */
function createLightTowers(
  group: THREE.Group,
  obstacles: CollisionObstacle[],
  shadows: boolean
) {
  const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 18, 12);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });

  const headGeo = new THREE.BoxGeometry(4.2, 1.2, 0.8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

  const bulbGeo = new THREE.PlaneGeometry(3.8, 0.9);
  bulbGeo.rotateX(Math.PI / 4);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });

  const towerPositions = [
    { x: -110, z: -120 },
    { x: 110, z: -120 },
    { x: -110, z: 120 },
    { x: 110, z: 120 },
    { x: 0, z: -140 },
    { x: 0, z: 140 },
  ];

  towerPositions.forEach((pos) => {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(pos.x, 0, pos.z);

    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 9;
    pole.castShadow = shadows;
    towerGroup.add(pole);

    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 18;
    head.lookAt(0, 0, 0); // Face center of track
    towerGroup.add(head);

    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0, 17.9, 0.3);
    bulb.rotation.copy(head.rotation);
    towerGroup.add(bulb);

    group.add(towerGroup);
    obstacles.push({ x: pos.x, z: pos.z, radius: 1.2, type: 'pillar' });
  });
}

/**
 * Distant mountains and city skyline silhouettes on horizon
 */
function createBackgroundScenery(group: THREE.Group) {
  const horizonGroup = new THREE.Group();
  horizonGroup.name = 'HorizonScenery';

  const mountainMat = new THREE.MeshBasicMaterial({
    color: 0x1c1917, // Silhouette against sunset
  });

  // Distant Mountain Peaks (North / East)
  const mountainGeo = new THREE.ConeGeometry(85, 95, 6);
  const m1 = new THREE.Mesh(mountainGeo, mountainMat);
  m1.position.set(120, 35, -280);
  m1.scale.set(1.5, 0.9, 1.2);

  const m2 = new THREE.Mesh(mountainGeo, mountainMat);
  m2.position.set(-60, 42, -310);
  m2.scale.set(1.8, 1.2, 1.4);

  const m3 = new THREE.Mesh(mountainGeo, mountainMat);
  m3.position.set(-220, 30, -260);
  m3.scale.set(1.3, 0.8, 1.1);

  horizonGroup.add(m1, m2, m3);

  // Distant Urban Skyline Blocks (South / West)
  const buildingMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  for (let i = -10; i <= 10; i++) {
    const h = 25 + Math.sin(i * 3) * 20 + Math.random() * 15;
    const w = 12 + Math.random() * 8;
    const bGeo = new THREE.BoxGeometry(w, h, w);
    const bMesh = new THREE.Mesh(bGeo, buildingMat);
    bMesh.position.set(i * 22, h / 2 - 5, 260);
    horizonGroup.add(bMesh);
  }

  group.add(horizonGroup);
}
