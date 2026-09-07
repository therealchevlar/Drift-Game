import * as THREE from 'three';

export interface CarMeshes {
  rootGroup: THREE.Group;
  bodyGroup: THREE.Group; // Tilts with suspension roll & pitch
  wheelFLGroup: THREE.Group; // Front Left Steering Knuckle
  wheelFRGroup: THREE.Group; // Front Right Steering Knuckle
  wheelFLMesh: THREE.Group;  // Spinning Wheel FL
  wheelFRMesh: THREE.Group;  // Spinning Wheel FR
  wheelRLMesh: THREE.Group;  // Spinning Wheel RL
  wheelRRMesh: THREE.Group;  // Spinning Wheel RR
  taillightMaterial: THREE.MeshStandardMaterial;
  headlightMaterial: THREE.MeshStandardMaterial;
  flameLeft: THREE.Mesh;
  flameRight: THREE.Mesh;
}

export function createCar(): CarMeshes {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'CarRoot';

  // Body group pivots on suspension (subtle roll & pitch)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'CarBodySuspension';
  rootGroup.add(bodyGroup);

  // High-performance automotive materials
  const carPaintMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0f52ba, // Sapphire Blue Metallic
    metalness: 0.85,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const carbonFiberMaterial = new THREE.MeshStandardMaterial({
    color: 0x18181b, // Dark Carbon
    roughness: 0.45,
    metalness: 0.6,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x09090b,
    metalness: 0.9,
    roughness: 0.1,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.95,
    roughness: 0.1,
  });

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x93c5fd,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.8, // Increases to 3.0 when braking
    roughness: 0.2,
  });

  // 1. MAIN LOWER CHASSIS & FLOOR
  const lowerChassisGeo = new THREE.BoxGeometry(1.85, 0.35, 4.3);
  const lowerChassis = new THREE.Mesh(lowerChassisGeo, carPaintMaterial);
  lowerChassis.position.set(0, 0.45, 0);
  lowerChassis.castShadow = true;
  lowerChassis.receiveShadow = true;
  bodyGroup.add(lowerChassis);

  // 2. SCULPTED HOOD & FRONT NOSE
  const hoodGeo = new THREE.BoxGeometry(1.78, 0.22, 1.55);
  const hood = new THREE.Mesh(hoodGeo, carPaintMaterial);
  hood.position.set(0, 0.62, 1.15);
  hood.rotation.x = 0.05; // Sleek slope
  hood.castShadow = true;
  bodyGroup.add(hood);

  // Hood Dual Intake Scoops
  const scoopGeo = new THREE.BoxGeometry(0.32, 0.04, 0.65);
  const scoopL = new THREE.Mesh(scoopGeo, carbonFiberMaterial);
  scoopL.position.set(-0.45, 0.74, 1.05);
  const scoopR = scoopL.clone();
  scoopR.position.x = 0.45;
  bodyGroup.add(scoopL, scoopR);

  // Front Splitter / Lip
  const splitterGeo = new THREE.BoxGeometry(1.95, 0.06, 0.7);
  const splitter = new THREE.Mesh(splitterGeo, carbonFiberMaterial);
  splitter.position.set(0, 0.25, 2.05);
  splitter.castShadow = true;
  bodyGroup.add(splitter);

  // Front Lower Mesh Grille
  const grilleGeo = new THREE.BoxGeometry(1.2, 0.22, 0.1);
  const grille = new THREE.Mesh(grilleGeo, carbonFiberMaterial);
  grille.position.set(0, 0.38, 2.16);
  bodyGroup.add(grille);

  // 3. GREENHOUSE / CABIN & ROOF
  const cabinGeo = new THREE.BoxGeometry(1.5, 0.55, 1.9);
  const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
  cabin.position.set(0, 0.88, -0.3);
  cabin.castShadow = true;
  bodyGroup.add(cabin);

  // Painted Roof Panel
  const roofGeo = new THREE.BoxGeometry(1.42, 0.06, 1.45);
  const roof = new THREE.Mesh(roofGeo, carbonFiberMaterial);
  roof.position.set(0, 1.16, -0.35);
  roof.castShadow = true;
  bodyGroup.add(roof);

  // Windshield Frame Pillars (A-Pillars & C-Pillars)
  const pillarGeo = new THREE.BoxGeometry(0.08, 0.55, 0.08);
  const pillarFL = new THREE.Mesh(pillarGeo, carPaintMaterial);
  pillarFL.position.set(-0.72, 0.85, 0.45);
  pillarFL.rotation.x = -0.45;
  const pillarFR = pillarFL.clone();
  pillarFR.position.x = 0.72;
  bodyGroup.add(pillarFL, pillarFR);

  // 4. FLARED WIDEBODY OVERFENDERS (Drift Stance)
  const fenderGeo = new THREE.BoxGeometry(0.2, 0.42, 1.15);

  const fenderFL = new THREE.Mesh(fenderGeo, carPaintMaterial);
  fenderFL.position.set(-0.95, 0.52, 1.25);
  fenderFL.castShadow = true;

  const fenderFR = fenderFL.clone();
  fenderFR.position.x = 0.95;

  const fenderRL = new THREE.Mesh(fenderGeo, carPaintMaterial);
  fenderRL.position.set(-0.97, 0.54, -1.25);
  fenderRL.castShadow = true;

  const fenderRR = fenderRL.clone();
  fenderRR.position.x = 0.97;

  bodyGroup.add(fenderFL, fenderFR, fenderRL, fenderRR);

  // Side Skirts
  const skirtGeo = new THREE.BoxGeometry(0.12, 0.08, 1.85);
  const skirtL = new THREE.Mesh(skirtGeo, carbonFiberMaterial);
  skirtL.position.set(-0.96, 0.28, 0);
  const skirtR = skirtL.clone();
  skirtR.position.x = 0.96;
  bodyGroup.add(skirtL, skirtR);

  // 5. REAR TRUNK DECK & LARGE GT SPOILER
  const trunkGeo = new THREE.BoxGeometry(1.65, 0.28, 0.95);
  const trunk = new THREE.Mesh(trunkGeo, carPaintMaterial);
  trunk.position.set(0, 0.65, -1.65);
  trunk.castShadow = true;
  bodyGroup.add(trunk);

  // Spoiler Dual Uprights / Mounts
  const uprightGeo = new THREE.BoxGeometry(0.05, 0.4, 0.25);
  const uprightL = new THREE.Mesh(uprightGeo, chromeMaterial);
  uprightL.position.set(-0.55, 0.95, -1.8);
  const uprightR = uprightL.clone();
  uprightR.position.x = 0.55;
  bodyGroup.add(uprightL, uprightR);

  // Main Carbon GT Wing Foil
  const wingGeo = new THREE.BoxGeometry(1.98, 0.06, 0.42);
  const wing = new THREE.Mesh(wingGeo, carbonFiberMaterial);
  wing.position.set(0, 1.16, -1.82);
  wing.rotation.x = -0.06; // Downforce angle
  wing.castShadow = true;
  bodyGroup.add(wing);

  // Spoiler Endplates
  const endplateGeo = new THREE.BoxGeometry(0.04, 0.22, 0.44);
  const endplateL = new THREE.Mesh(endplateGeo, carbonFiberMaterial);
  endplateL.position.set(-1.0, 1.16, -1.82);
  const endplateR = endplateL.clone();
  endplateR.position.x = 1.0;
  bodyGroup.add(endplateL, endplateR);

  // 6. REAR DIFFUSER & DUAL EXHAUST
  const diffuserGeo = new THREE.BoxGeometry(1.7, 0.16, 0.5);
  const diffuser = new THREE.Mesh(diffuserGeo, carbonFiberMaterial);
  diffuser.position.set(0, 0.28, -2.05);
  bodyGroup.add(diffuser);

  // Exhaust Tips
  const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.25, 16);
  exhaustGeo.rotateX(Math.PI / 2);

  const exhaustL = new THREE.Mesh(exhaustGeo, chromeMaterial);
  exhaustL.position.set(-0.45, 0.26, -2.18);

  const exhaustR = exhaustL.clone();
  exhaustR.position.x = 0.45;
  bodyGroup.add(exhaustL, exhaustR);

  // Exhaust Backfire Flames (animated visibility and scale)
  const flameGeo = new THREE.ConeGeometry(0.09, 0.4, 8);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8, // Electric blue & orange core
    transparent: true,
    opacity: 0.9,
  });

  const flameLeft = new THREE.Mesh(flameGeo, flameMat);
  flameLeft.position.set(-0.45, 0.26, -2.45);
  flameLeft.visible = false;

  const flameRight = flameLeft.clone();
  flameRight.position.x = 0.45;
  flameRight.visible = false;
  bodyGroup.add(flameLeft, flameRight);

  // 7. LIGHTING FIXTURES
  // Headlights (Angular modern LED DRLs)
  const headlightGeo = new THREE.BoxGeometry(0.42, 0.12, 0.15);
  const headL = new THREE.Mesh(headlightGeo, headlightMaterial);
  headL.position.set(-0.68, 0.55, 2.14);
  headL.rotation.y = -0.15;

  const headR = new THREE.Mesh(headlightGeo, headlightMaterial);
  headR.position.set(0.68, 0.55, 2.14);
  headR.rotation.y = 0.15;
  bodyGroup.add(headL, headR);

  // Taillight Horizontal Neon Bar
  const taillightGeo = new THREE.BoxGeometry(1.68, 0.1, 0.08);
  const taillight = new THREE.Mesh(taillightGeo, taillightMaterial);
  taillight.position.set(0, 0.62, -2.14);
  bodyGroup.add(taillight);

  // 8. HIGH QUALITY WHEELS (FL, FR, RL, RR)
  const wheelRadius = 0.36;
  const wheelWidth = 0.28;
  const wheelTrackX = 0.92;
  const wheelBaseZ = 1.35;
  const wheelPosY = wheelRadius;

  function buildWheelMesh(isFront: boolean): { wheelGroup: THREE.Group; rimGroup: THREE.Group } {
    const wheelGroup = new THREE.Group();

    // Tire Rubber
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Deep Dish Alloy Rim Lip
    const lipGeo = new THREE.CylinderGeometry(wheelRadius * 0.78, wheelRadius * 0.78, wheelWidth * 1.01, 20, 1, true);
    lipGeo.rotateZ(Math.PI / 2);
    const rimLip = new THREE.Mesh(lipGeo, chromeMaterial);
    wheelGroup.add(rimLip);

    // 5-Spoke Drift Center Hub
    const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, wheelWidth * 0.95, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const bronzeRimMat = new THREE.MeshStandardMaterial({
      color: 0xc28236, // Bronze/Gold drift rims
      roughness: 0.35,
      metalness: 0.8,
    });
    const centerHub = new THREE.Mesh(hubGeo, bronzeRimMat);
    wheelGroup.add(centerHub);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(0.04, wheelRadius * 0.72, 0.04);
      const spoke = new THREE.Mesh(spokeGeo, bronzeRimMat);
      spoke.rotation.x = angle;
      spoke.position.set(0, 0, 0);
      wheelGroup.add(spoke);
    }

    // Brake Disc (Steel) & Red Caliper (Mounted inside rim)
    const discGeo = new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, 0.04, 16);
    discGeo.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, chromeMaterial);
    wheelGroup.add(disc);

    const caliperGeo = new THREE.BoxGeometry(0.07, 0.12, 0.16);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Brembo red
      roughness: 0.3,
      metalness: 0.5,
    });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(0, wheelRadius * 0.32, 0);
    wheelGroup.add(caliper);

    return { wheelGroup, rimGroup: wheelGroup };
  }

  // Front Wheels with Steering Knuckles
  const wheelFLGroup = new THREE.Group();
  wheelFLGroup.name = 'SteeringKnuckleFL';
  wheelFLGroup.position.set(-wheelTrackX, wheelPosY, wheelBaseZ);
  rootGroup.add(wheelFLGroup);

  const { wheelGroup: wheelFLMesh } = buildWheelMesh(true);
  wheelFLGroup.add(wheelFLMesh);

  const wheelFRGroup = new THREE.Group();
  wheelFRGroup.name = 'SteeringKnuckleFR';
  wheelFRGroup.position.set(wheelTrackX, wheelPosY, wheelBaseZ);
  rootGroup.add(wheelFRGroup);

  const { wheelGroup: wheelFRMesh } = buildWheelMesh(true);
  wheelFRGroup.add(wheelFRMesh);

  // Rear Wheels (Direct on root, spin on roll)
  const { wheelGroup: wheelRLMesh } = buildWheelMesh(false);
  wheelRLMesh.position.set(-wheelTrackX, wheelPosY, -wheelBaseZ);
  rootGroup.add(wheelRLMesh);

  const { wheelGroup: wheelRRMesh } = buildWheelMesh(false);
  wheelRRMesh.position.set(wheelTrackX, wheelPosY, -wheelBaseZ);
  rootGroup.add(wheelRRMesh);

  return {
    rootGroup,
    bodyGroup,
    wheelFLGroup,
    wheelFRGroup,
    wheelFLMesh,
    wheelFRMesh,
    wheelRLMesh,
    wheelRRMesh,
    taillightMaterial,
    headlightMaterial,
    flameLeft,
    flameRight,
  };
}
