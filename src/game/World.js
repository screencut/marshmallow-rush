import * as THREE from 'three';
import { Decorations } from './Decorations.js';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * World - Candyland Procedural Track & Holes Generator
 * Handles:
 * - Frosted wafer road segments with 3 lanes and waffle biscuit texture
 * - Fair, guaranteed-solvable hole hazard generation (single pits, narrow bridges, full chasms)
 * - Guaranteed safe landing zones after chasms
 * - Glowing candy warning hazard borders on hole edges
 * - Deep glowing molten candy abyss beneath holes with dual atmospheric lights
 * - Candyland scenery (Donut arches, lollipops, candy canes, ice cream mountains, clouds)
 * - Precise hole collision detection accounting for vertical velocity and jump takeoff
 */
export class World {
  constructor(scene, collectibles) {
    this.scene = scene;
    this.collectibles = collectibles;
    this.decorations = new Decorations();

    this.segmentLength = 6.0;
    this.numSegments = 24; // Length of active visible track ahead
    this.segments = [];
    this.nextSegmentZ = 12.0; // Start slightly behind player (z=0)
    this.segmentsCreated = 0;

    // Lane definitions
    this.laneX = [-2.4, 0.0, 2.4];
    this.laneWidth = 2.2;

    // Hazard generation state
    this.consecutiveHoles = 0;
    this.lastHazardType = 'safe'; // 'safe', 'single', 'double', 'chasm'
    this.lastSafeLane = 1; // start in center

    // Procedural Wafer Materials
    const waferTexture = TextureGenerator.createWaferTexture();

    this.waferTopMat = new THREE.MeshStandardMaterial({
      color: 0xfff0dd, // Vanilla sugar biscuit
      map: waferTexture,
      roughness: 0.55,
      metalness: 0.05
    });

    this.waferSideMat = new THREE.MeshStandardMaterial({
      color: 0xe6a875, // Golden baked biscuit crust
      roughness: 0.8
    });

    this.waferMaterials = [
      this.waferSideMat, // +x
      this.waferSideMat, // -x
      this.waferTopMat,  // +y (top frosted road surface)
      this.waferSideMat, // -y
      this.waferSideMat, // +z
      this.waferSideMat  // -z
    ];

    // Whipped cream piped road rails
    this.creamMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.05
    });

    // Strawberry wafer filling layer material
    this.creamPinkMat = new THREE.MeshStandardMaterial({
      color: 0xff6b8b, // Strawberry cream filling
      roughness: 0.3,
      metalness: 0.05
    });

    // Hole crumb lip material
    this.crumbMat = new THREE.MeshStandardMaterial({
      color: 0x935116,
      roughness: 0.9
    });

    // Glowing hazard rim material
    this.hazardRimMat = new THREE.MeshStandardMaterial({
      color: 0xff0066,
      emissive: 0xff0066,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });

    // Reusable slab geometries for authentic 3-layer wafer sandwich
    this.topSlabGeo = new THREE.BoxGeometry(this.laneWidth - 0.1, 0.22, this.segmentLength - 0.1);
    this.creamSlabGeo = new THREE.BoxGeometry(this.laneWidth - 0.18, 0.16, this.segmentLength - 0.18);
    this.bottomSlabGeo = new THREE.BoxGeometry(this.laneWidth - 0.1, 0.22, this.segmentLength - 0.1);

    this.railGeo = new THREE.CylinderGeometry(0.24, 0.24, this.segmentLength, 12);
    this.railGeo.rotateX(Math.PI / 2);

    // Deep Swirling Candy Abyss (under the holes)
    this.createCandyAbyss();

    // Distant Scenery (Mountains & Clouds)
    this.distantScenery = new THREE.Group();
    this.scene.add(this.distantScenery);
    this.createDistantScenery();

    // Generate initial safe runway
    this.initTrack();
  }

  createCandyAbyss() {
    // Molten pink/purple candy sea beneath the track
    const abyssGeo = new THREE.PlaneGeometry(160, 260, 32, 32);
    abyssGeo.rotateX(-Math.PI / 2);

    this.abyssMat = new THREE.MeshStandardMaterial({
      color: 0xff007f, // Neon hot strawberry syrup
      emissive: 0x660033,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.15
    });

    this.abyssMesh = new THREE.Mesh(abyssGeo, this.abyssMat);
    this.abyssMesh.position.set(0, -6.5, -60);
    this.scene.add(this.abyssMesh);

    // Glowing abyss lights that illuminate holes from below
    this.abyssLight1 = new THREE.PointLight(0xff1493, 2.8, 65);
    this.abyssLight1.position.set(0, -4.0, 0);
    this.scene.add(this.abyssLight1);

    this.abyssLight2 = new THREE.PointLight(0x9b5de5, 2.0, 50);
    this.abyssLight2.position.set(0, -4.5, -20);
    this.scene.add(this.abyssLight2);
  }

  createDistantScenery() {
    // Mountains on left and right
    const mountainConfigs = [
      { x: -38, z: -80, scale: 2.2 },
      { x: 38, z: -110, scale: 2.6 },
      { x: -45, z: -160, scale: 3.0 },
      { x: 42, z: -190, scale: 2.8 },
      { x: -40, z: -240, scale: 2.5 }
    ];

    mountainConfigs.forEach(cfg => {
      const m = this.decorations.createIceCreamMountain(cfg.scale);
      m.position.set(cfg.x, -5.0, cfg.z);
      this.distantScenery.add(m);
    });

    // Distant floating cotton candy clouds
    for (let i = 0; i < 16; i++) {
      const cloud = this.decorations.createCloud(
        1.5 + Math.random() * 1.5,
        i % 2 === 0 ? 0xffe5ec : 0xd8f3dc
      );
      cloud.position.set(
        (Math.random() - 0.5) * 90,
        18 + Math.random() * 14,
        -Math.random() * 220
      );
      this.distantScenery.add(cloud);
    }
  }

  initTrack() {
    this.clear();
    this.consecutiveHoles = 0;
    this.lastHazardType = 'safe';
    this.lastSafeLane = 1;

    for (let i = 0; i < this.numSegments; i++) {
      // First 6 segments are always solid safe runway
      const isSafe = i < 6;
      this.spawnSegment(isSafe);
    }
  }

  spawnSegment(isSafe = false) {
    const group = new THREE.Group();
    const z = this.nextSegmentZ;
    this.nextSegmentZ -= this.segmentLength;
    this.segmentsCreated++;

    // Determine lane holes for this segment
    // [lane0, lane1, lane2] : true = solid wafer ground, false = HOLE!
    let lanes = [true, true, true];
    let currentHazard = 'safe';

    // GUARANTEED FAIR HAZARD RULES:
    // 1. If previous segment was a Full Chasm, current MUST BE SAFE to guarantee landing!
    // 2. If consecutive holes >= 2, force a safe breather segment.
    // 3. Consecutive chasms are STRICTLY FORBIDDEN (no 12m+ pits).
    // 4. Double hole safe lane must be reachable from previous safe lane (+/- 1 lane).
    const mustBeSafe = isSafe ||
                       this.lastHazardType === 'chasm' ||
                       this.consecutiveHoles >= 2;

    if (!mustBeSafe) {
      const difficulty = Math.min(1.0, this.segmentsCreated / 80);
      const rand = Math.random();

      if (rand < 0.35) {
        // Single lane hole
        currentHazard = 'single';
        const holeLane = Math.floor(Math.random() * 3);
        lanes[holeLane] = false;
        this.consecutiveHoles++;
      } else if (rand < 0.60 && difficulty > 0.20 && this.lastHazardType !== 'double') {
        // Double lane hole (narrow bridge)
        // Ensure safe lane is at most 1 lane shift away from previous safe lane
        let safeLane = this.lastSafeLane;
        if (Math.random() > 0.5) {
          const shift = Math.random() > 0.5 ? 1 : -1;
          safeLane = Math.max(0, Math.min(2, this.lastSafeLane + shift));
        }
        lanes = [false, false, false];
        lanes[safeLane] = true;
        this.lastSafeLane = safeLane;
        currentHazard = 'double';
        this.consecutiveHoles++;
      } else if (rand < 0.78 && difficulty > 0.30 && this.lastHazardType === 'safe') {
        // Full Chasm Trench! All 3 lanes have holes! Player MUST JUMP!
        // Guaranteed followed by a safe landing segment next turn!
        lanes = [false, false, false];
        currentHazard = 'chasm';
        this.consecutiveHoles = 0; // next segment will be safe
      } else if (rand < 0.90) {
        // Outer holes (center lane safe)
        lanes = [false, true, false];
        this.lastSafeLane = 1;
        currentHazard = 'single';
        this.consecutiveHoles++;
      } else {
        // Safe breather segment
        currentHazard = 'safe';
        this.consecutiveHoles = 0;
      }
    } else {
      currentHazard = 'safe';
      this.consecutiveHoles = 0;
    }

    this.lastHazardType = currentHazard;

    // Build wafer sandwich slabs for solid lanes
    for (let l = 0; l < 3; l++) {
      if (lanes[l]) {
        // Top vanilla biscuit layer with waffle grid texture
        const topSlab = new THREE.Mesh(this.topSlabGeo, this.waferMaterials);
        topSlab.position.set(this.laneX[l], -0.11, 0);
        topSlab.receiveShadow = true;
        group.add(topSlab);

        // Center strawberry cream layer
        const creamSlab = new THREE.Mesh(this.creamSlabGeo, this.creamPinkMat);
        creamSlab.position.set(this.laneX[l], -0.30, 0);
        group.add(creamSlab);

        // Bottom biscuit crust layer
        const botSlab = new THREE.Mesh(this.bottomSlabGeo, this.waferSideMat);
        botSlab.position.set(this.laneX[l], -0.49, 0);
        group.add(botSlab);

        // Add cute rainbow sprinkles embedded on top surface
        this.addSprinklesToSlab(topSlab);
      } else {
        // Hole visuals: broken cookie crumb chunks, glowing warning rims and crystals
        this.addHoleBorderVisuals(group, this.laneX[l]);
      }
    }

    // Outer Whipped Cream Rails (along road edges)
    const leftRail = new THREE.Mesh(this.railGeo, this.creamMat);
    leftRail.position.set(-3.7, 0.05, 0);
    leftRail.castShadow = true;
    leftRail.receiveShadow = true;
    group.add(leftRail);

    const rightRail = new THREE.Mesh(this.railGeo, this.creamMat);
    rightRail.position.set(3.7, 0.05, 0);
    rightRail.castShadow = true;
    rightRail.receiveShadow = true;
    group.add(rightRail);

    // Side decorations (Lollipops, Candy Canes, Gumdrops, Donut Arches)
    this.addSideDecorations(group, z);

    // Spawn Collectibles & Powerups
    this.addCollectiblesToSegment(lanes, z);

    group.position.z = z;
    this.scene.add(group);

    const isChasm = !lanes[0] && !lanes[1] && !lanes[2];
    this.segments.push({
      group: group,
      z: z,
      lanes: lanes,
      hasHole: lanes.includes(false),
      isChasm: isChasm
    });
  }

  addSprinklesToSlab(slab) {
    const sprinkleColors = [0xff3366, 0x00f5d4, 0xffbe0b, 0x9b5de5, 0xff99c8];
    const sprGeo = new THREE.BoxGeometry(0.1, 0.04, 0.22);

    for (let i = 0; i < 4; i++) {
      const sprMat = new THREE.MeshBasicMaterial({
        color: sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)]
      });
      const spr = new THREE.Mesh(sprGeo, sprMat);
      spr.position.set(
        (Math.random() - 0.5) * (this.laneWidth - 0.6),
        0.12,
        (Math.random() - 0.5) * (this.segmentLength - 0.8)
      );
      spr.rotation.y = Math.random() * Math.PI;
      slab.add(spr);
    }
  }

  addHoleBorderVisuals(group, x) {
    // Glowing hazard neon warning rims on the front and back edge of the hole
    const rimGeo = new THREE.BoxGeometry(this.laneWidth - 0.1, 0.08, 0.12);
    const frontRim = new THREE.Mesh(rimGeo, this.hazardRimMat);
    frontRim.position.set(x, 0.02, -this.segmentLength * 0.48);
    group.add(frontRim);

    const backRim = new THREE.Mesh(rimGeo, this.hazardRimMat);
    backRim.position.set(x, 0.02, this.segmentLength * 0.48);
    group.add(backRim);

    // Crumb chunks at edge of hole
    const crumbGeo = new THREE.DodecahedronGeometry(0.18, 0);
    for (let i = 0; i < 5; i++) {
      const crumb = new THREE.Mesh(crumbGeo, this.crumbMat);
      const side = (i % 2 === 0) ? -1 : 1;
      crumb.position.set(
        x + (Math.random() - 0.5) * 1.6,
        -0.2 - Math.random() * 0.4,
        side * (this.segmentLength * 0.46)
      );
      crumb.scale.set(1.2, 0.7, 1.2);
      group.add(crumb);
    }

    // Glowing hazard candy warning crystal on hole corner
    const warnGeo = new THREE.OctahedronGeometry(0.2, 0);
    const warnCrystal1 = new THREE.Mesh(warnGeo, this.hazardRimMat);
    warnCrystal1.position.set(x - 0.75, 0.1, -this.segmentLength * 0.46);
    group.add(warnCrystal1);

    const warnCrystal2 = new THREE.Mesh(warnGeo, this.hazardRimMat);
    warnCrystal2.position.set(x + 0.75, 0.1, this.segmentLength * 0.46);
    group.add(warnCrystal2);
  }

  addSideDecorations(group, z) {
    // Candy Canes along rails
    if (this.segmentsCreated % 3 === 0) {
      const caneL = this.decorations.createCandyCane(0.9);
      caneL.position.set(-4.6, 0, 0);
      caneL.rotation.y = Math.PI / 2;
      group.add(caneL);

      const caneR = this.decorations.createCandyCane(0.9);
      caneR.position.set(4.6, 0, 0);
      caneR.rotation.y = -Math.PI / 2;
      group.add(caneR);
    }

    // Giant Swirl Lollipops
    if (this.segmentsCreated % 5 === 1) {
      const isLeft = Math.random() > 0.5;
      const pop = this.decorations.createLollipop(1.1 + Math.random() * 0.3);
      pop.position.set(isLeft ? -7.0 - Math.random() * 2 : 7.0 + Math.random() * 2, 0, 0);
      pop.rotation.y = (Math.random() - 0.5) * 0.5;
      group.add(pop);
    }

    // Gumdrops on side banks
    if (Math.random() > 0.4) {
      const side = Math.random() > 0.5 ? -1 : 1;
      const gum = this.decorations.createGumdrop(0.8 + Math.random() * 0.4);
      gum.position.set(side * (5.5 + Math.random() * 2.5), 0, (Math.random() - 0.5) * 3);
      group.add(gum);
    }

    // Donut Arch over track every ~12 segments
    if (this.segmentsCreated % 13 === 0) {
      const arch = this.decorations.createDonutArch(8.0);
      arch.position.set(0, 0, 0);
      group.add(arch);
    }
  }

  addCollectiblesToSegment(lanes, z) {
    const hasAnySolid = lanes.includes(true);
    const rand = Math.random();

    // Power-up spawn chance (~1 every 14 segments)
    if (this.segmentsCreated % 14 === 0 && this.segmentsCreated > 8) {
      const validLanes = [];
      for (let l = 0; l < 3; l++) if (lanes[l]) validLanes.push(l);

      if (validLanes.length > 0) {
        const lane = validLanes[Math.floor(Math.random() * validLanes.length)];
        const types = ['sugarRush', 'floatWings', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.collectibles.spawnPowerup(type, this.laneX[lane], 1.2, z);
        return;
      }
    }

    // Candies / Stars in safe lanes
    if (hasAnySolid && rand > 0.25) {
      for (let l = 0; l < 3; l++) {
        if (lanes[l] && Math.random() > 0.5) {
          // Row of 2 jellybeans
          this.collectibles.spawnJellybean(this.laneX[l], 0.9, z - 1.5);
          this.collectibles.spawnJellybean(this.laneX[l], 0.9, z + 1.5);
        }
      }
    }

    // If it's a full chasm hole, spawn an airborne Sugar Star right above the center gap to reward jumping!
    if (!lanes[0] && !lanes[1] && !lanes[2]) {
      this.collectibles.spawnSugarStar(0, 2.4, z);
    }
  }

  /**
   * Check if character at (x, z, y, vy, isGrounded) is falling into a hole!
   * Returns true if player is falling into a hole.
   * Accounts for jump velocity (vy > 0) and height (y > 0.25).
   */
  checkHoleFall(x, z, y = 0, vy = 0, isGrounded = true) {
    // 1. If character is actively jumping UPWARD (vy > 0 and not grounded),
    // they are safely in mid-air leaping over the hole!
    if (!isGrounded && vy > 0) return false;

    // 2. If character is high in the air (jumping/gliding y > 0.25), they are safe above holes!
    if (y > 0.25) return false;

    // 3. Check which segment covers z
    for (const seg of this.segments) {
      const minZ = seg.z - this.segmentLength * 0.5 - 0.2;
      const maxZ = seg.z + this.segmentLength * 0.5 + 0.2;

      if (z >= minZ && z <= maxZ) {
        // Character is inside this segment along Z
        // Determine lane index based on x with safe margins
        let laneIdx = 1; // default center
        if (x < -1.2) laneIdx = 0;
        else if (x > 1.2) laneIdx = 2;

        // Check if this primary lane has a hole
        if (!seg.lanes[laneIdx]) {
          return true; // FALL INTO HOLE!
        }

        // If player is straddling between lanes and both lanes have holes
        if (x < -0.7 && !seg.lanes[0] && !seg.lanes[1]) return true;
        if (x > 0.7 && !seg.lanes[1] && !seg.lanes[2]) return true;

        return false;
      }
    }

    return false;
  }

  update(playerZ) {
    // 1. Move candy abyss sea & point lights with player
    this.abyssMesh.position.z = playerZ - 60;
    this.abyssLight1.position.z = playerZ;
    this.abyssLight2.position.z = playerZ - 20;

    // Soft pulse of abyss light
    const pulse = Math.sin(Date.now() * 0.003) * 0.4 + 2.5;
    this.abyssLight1.intensity = pulse;

    // 2. Cycle distant scenery forward
    this.distantScenery.children.forEach(obj => {
      if (obj.position.z > playerZ + 40) {
        obj.position.z -= 280;
      }
    });

    // 3. Recycle old segments that fell far behind player
    const recycleThreshold = playerZ + 20.0;
    while (this.segments.length > 0 && this.segments[0].z > recycleThreshold) {
      const oldSeg = this.segments.shift();
      this.scene.remove(oldSeg.group);
      // Spawn new segment in front
      this.spawnSegment(false);
    }
  }

  clear() {
    for (const seg of this.segments) {
      this.scene.remove(seg.group);
    }
    this.segments = [];
    this.nextSegmentZ = 12.0;
    this.segmentsCreated = 0;
    this.consecutiveHoles = 0;
    this.lastHazardType = 'safe';
    this.lastSafeLane = 1;
  }
}
