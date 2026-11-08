import * as THREE from 'three';

/**
 * Collectibles - Candyland treats & Power-ups
 * Handles:
 * - Jellybeans / Sugar Stars (scoring & combo multipliers)
 * - Power-up Treats (Sugar Rush, Cotton Candy Float, Shield)
 * - Floating hover & spin animations
 * - Magnet attraction physics
 */
export class Collectibles {
  constructor(scene) {
    this.scene = scene;
    this.items = [];

    // Pre-allocated geometries and materials for optimal performance
    this.starGeo = this.createStarGeometry();
    this.jellyGeo = new THREE.CapsuleGeometry(0.24, 0.35, 8, 12);
    this.jellyGeo.rotateZ(Math.PI / 4);

    this.gemColors = [0xff3366, 0xffbb00, 0x00e5ff, 0x76ff03, 0xe040fb];
    this.gemMaterials = this.gemColors.map(c => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.2,
      metalness: 0.15,
      emissive: c,
      emissiveIntensity: 0.35
    }));

    // Power-up Geometries
    this.donutPowerGeo = new THREE.TorusGeometry(0.42, 0.18, 12, 24);
    this.starPowerGeo = this.createStarGeometry(0.65);
    this.heartPowerGeo = new THREE.SphereGeometry(0.45, 16, 16);
    this.heartPowerGeo.scale(1.2, 1.2, 0.7);

    this.powerMaterials = {
      sugarRush: new THREE.MeshStandardMaterial({
        color: 0xff007f,
        emissive: 0xff007f,
        emissiveIntensity: 0.8,
        roughness: 0.1
      }),
      floatWings: new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.8,
        roughness: 0.1
      }),
      shield: new THREE.MeshStandardMaterial({
        color: 0xffe600,
        emissive: 0xffe600,
        emissiveIntensity: 0.8,
        roughness: 0.1
      })
    };
  }

  createStarGeometry(radius = 0.38) {
    const shape = new THREE.Shape();
    const points = 5;
    const innerRadius = radius * 0.48;

    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : innerRadius;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }

  spawnJellybean(x, y, z) {
    const mat = this.gemMaterials[Math.floor(Math.random() * this.gemMaterials.length)];
    const mesh = new THREE.Mesh(this.jellyGeo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;

    this.scene.add(mesh);
    this.items.push({
      type: 'candy',
      mesh: mesh,
      baseY: y,
      timeOffset: Math.random() * 10,
      active: true,
      radius: 0.75
    });
  }

  spawnSugarStar(x, y, z) {
    const mat = this.gemMaterials[Math.floor(Math.random() * this.gemMaterials.length)];
    const mesh = new THREE.Mesh(this.starGeo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;

    this.scene.add(mesh);
    this.items.push({
      type: 'star',
      mesh: mesh,
      baseY: y,
      timeOffset: Math.random() * 10,
      active: true,
      radius: 0.85
    });
  }

  spawnPowerup(type, x, y, z) {
    let geo, mat;
    if (type === 'sugarRush') {
      geo = this.starPowerGeo;
      mat = this.powerMaterials.sugarRush;
    } else if (type === 'floatWings') {
      geo = this.donutPowerGeo;
      mat = this.powerMaterials.floatWings;
    } else {
      geo = this.heartPowerGeo;
      mat = this.powerMaterials.shield;
    }

    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);

    // Glowing halo ring around powerup
    const haloGeo = new THREE.TorusGeometry(0.7, 0.04, 8, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: mat.color });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    group.add(halo);

    group.position.set(x, y, z);
    this.scene.add(group);

    this.items.push({
      type: 'powerup',
      powerType: type,
      mesh: group,
      halo: halo,
      baseY: y,
      timeOffset: Math.random() * 10,
      active: true,
      radius: 1.1
    });
  }

  update(delta, playerPos, isMagnetActive, onCollect) {
    const dt = delta;
    const now = Date.now() * 0.003;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (!item.active) continue;

      // 1. Idle float & rotation animation
      const t = now + item.timeOffset;
      item.mesh.position.y = item.baseY + Math.sin(t * 3.0) * 0.22;
      item.mesh.rotation.y += dt * 2.5;

      if (item.type === 'powerup' && item.halo) {
        item.halo.rotation.x += dt * 3.5;
        item.halo.rotation.z += dt * 2.0;
      }

      // 2. Magnet Pull towards player if Sugar Rush is active
      if (isMagnetActive && item.type !== 'powerup') {
        const dx = playerPos.x - item.mesh.position.x;
        const dy = playerPos.y - item.mesh.position.y;
        const dz = playerPos.z - item.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 12.0) {
          const pullSpeed = 22.0 * dt;
          item.mesh.position.x += (dx / dist) * pullSpeed;
          item.mesh.position.y += (dy / dist) * pullSpeed;
          item.mesh.position.z += (dz / dist) * pullSpeed;
        }
      }

      // 3. Collision with player
      const dx = playerPos.x - item.mesh.position.x;
      const dy = playerPos.y - item.mesh.position.y;
      const dz = playerPos.z - item.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < item.radius + 0.6) {
        // Collected!
        item.active = false;
        this.scene.remove(item.mesh);
        onCollect(item);
        this.items.splice(i, 1);
        continue;
      }

      // 4. Remove items that fell far behind the player
      if (item.mesh.position.z > playerPos.z + 15.0) {
        item.active = false;
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.items = [];
  }
}
