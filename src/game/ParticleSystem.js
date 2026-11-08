import * as THREE from 'three';

/**
 * ParticleSystem - Candy Particle Effects
 * - Sugar footstep dust
 * - Candy pickup bursts & star sparkles
 * - Rainbow trail on Sugar Rush
 * - Bubble splash in hole abyss
 * - Ambient floating sugar dust
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Pre-allocated geometries
    this.sparkleGeo = new THREE.DodecahedronGeometry(0.12, 0);
    this.confettiGeo = new THREE.PlaneGeometry(0.18, 0.18);
    this.bubbleGeo = new THREE.SphereGeometry(0.15, 8, 8);

    // Pre-allocated materials
    this.palette = [
      0xff3366, 0xff70a6, 0xff9770, 0xffd670, 0xe9ff70, 0x70d6ff, 0x00f5d4, 0xffffff
    ];
    this.materials = this.palette.map(c => new THREE.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    }));

    // Ambient floating sugar dust
    this.ambientCount = 120;
    this.ambientParticles = [];
    this.createAmbientDust();
  }

  createAmbientDust() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.ambientCount * 3);
    const colors = new Float32Array(this.ambientCount * 3);

    for (let i = 0; i < this.ambientCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = 0.5 + Math.random() * 8;
      positions[i * 3 + 2] = -Math.random() * 80;

      // Pastel fairy colors
      const c = new THREE.Color(this.palette[i % this.palette.length]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.ambientPoints = new THREE.Points(geo, mat);
    this.scene.add(this.ambientPoints);
  }

  emitFootstepSparkles(x, y, z) {
    for (let i = 0; i < 3; i++) {
      const mat = this.materials[Math.floor(Math.random() * this.materials.length)];
      const mesh = new THREE.Mesh(this.sparkleGeo, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.4,
        y + 0.1,
        z + (Math.random() - 0.5) * 0.3
      );
      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.0 + Math.random() * 1.5,
        vz: 1.5 + Math.random() * 2.0,
        life: 0.45,
        maxLife: 0.45,
        scaleSpeed: 2.2
      });
    }
  }

  emitCandyBurst(x, y, z, count = 14) {
    for (let i = 0; i < count; i++) {
      const mat = this.materials[Math.floor(Math.random() * this.materials.length)];
      const isConfetti = Math.random() > 0.5;
      const mesh = new THREE.Mesh(isConfetti ? this.confettiGeo : this.sparkleGeo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 5.0;
      this.particles.push({
        mesh: mesh,
        vx: Math.cos(angle) * speed,
        vy: (Math.random() * 0.7 + 0.3) * speed,
        vz: Math.sin(angle) * speed,
        rotVx: (Math.random() - 0.5) * 15,
        rotVy: (Math.random() - 0.5) * 15,
        life: 0.7 + Math.random() * 0.3,
        maxLife: 1.0,
        gravity: -14.0
      });
    }
  }

  emitRainbowTrail(x, y, z) {
    for (let i = 0; i < 4; i++) {
      const mat = this.materials[Math.floor(Math.random() * this.materials.length)];
      const mesh = new THREE.Mesh(this.sparkleGeo, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.8,
        y + (Math.random() - 0.5) * 0.8,
        z + 0.5 + Math.random() * 0.4
      );
      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        vx: (Math.random() - 0.5) * 2.0,
        vy: (Math.random() - 0.5) * 2.0,
        vz: 3.0 + Math.random() * 2.0,
        life: 0.35,
        maxLife: 0.35,
        scaleSpeed: 2.8
      });
    }
  }

  emitHoleSplash(x, y, z) {
    // Chocolate / berry syrup bubbles bursting
    for (let i = 0; i < 20; i++) {
      const mat = this.materials[i % 3]; // magenta/pink syrup
      const mesh = new THREE.Mesh(this.bubbleGeo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const a = Math.random() * Math.PI * 2;
      const s = 2.0 + Math.random() * 4.0;
      this.particles.push({
        mesh: mesh,
        vx: Math.cos(a) * s,
        vy: 3.0 + Math.random() * 4.0,
        vz: Math.sin(a) * s,
        life: 0.6,
        maxLife: 0.6,
        gravity: -16.0
      });
    }
  }

  update(delta, playerZ) {
    const dt = delta;

    // 1. Update active bursts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      if (p.gravity) {
        p.vy += p.gravity * dt;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      if (p.rotVx) p.mesh.rotation.x += p.rotVx * dt;
      if (p.rotVy) p.mesh.rotation.y += p.rotVy * dt;

      // Fade & shrink
      const progress = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.01, progress));
    }

    // 2. Update ambient dust positions following player
    if (this.ambientPoints) {
      const pos = this.ambientPoints.geometry.attributes.position;
      for (let i = 0; i < this.ambientCount; i++) {
        let z = pos.getZ(i);
        // If particle is behind player, cycle it forward
        if (z > playerZ + 10) {
          z = playerZ - 65 - Math.random() * 20;
          pos.setZ(i, z);
          pos.setX(i, (Math.random() - 0.5) * 35);
          pos.setY(i, 0.5 + Math.random() * 8);
        }
      }
      pos.needsUpdate = true;
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    this.particles = [];
  }
}
