import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * Decorations - Candyland 3D Environment Assets
 * Procedurally generated candy scenery:
 * - Giant Swirl Lollipops with spiral candy textures
 * - Donut Arches (spanning the track) with strawberry glaze and sprinkles
 * - Candy Canes with peppermint spiral stripes
 * - Translucent Gumdrop bushes with sugar crystals
 * - Waffle-cone Ice Cream Mountains with fudge drip
 * - Cotton Candy Clouds in pastel strawberry and mint
 */
export class Decorations {
  constructor() {
    this.caneTexture = TextureGenerator.createCandyCaneTexture();

    this.lollipopColors = ['#ff6b8b', '#4ecdc4', '#ffbe0b', '#9b5de5'];
    this.lollipopTextures = this.lollipopColors.map(c => 
      TextureGenerator.createLollipopSwirlTexture(c, '#ffffff')
    );

    this.stickMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5
    });

    this.gumdropColors = [0xff477e, 0x06d6a0, 0xffd166, 0x118ab2, 0xa0c4ff];
  }

  // Giant Swirl Spiral Lollipop
  createLollipop(scale = 1.0) {
    const group = new THREE.Group();

    // Stick
    const stickGeo = new THREE.CylinderGeometry(0.12 * scale, 0.14 * scale, 5.0 * scale, 16);
    const stick = new THREE.Mesh(stickGeo, this.stickMaterial);
    stick.position.y = 2.5 * scale;
    stick.castShadow = true;
    stick.receiveShadow = true;
    group.add(stick);

    // Swirl Disc
    const discGeo = new THREE.CylinderGeometry(1.6 * scale, 1.6 * scale, 0.35 * scale, 32);
    discGeo.rotateX(Math.PI / 2);

    const colorIdx = Math.floor(Math.random() * this.lollipopColors.length);
    const discMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.lollipopColors[colorIdx]),
      map: this.lollipopTextures[colorIdx] || null,
      roughness: 0.25,
      metalness: 0.1
    });

    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = 4.8 * scale;
    disc.castShadow = true;
    group.add(disc);

    // White candy swirl rings on both faces
    const swirlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const swirlGeo = new THREE.TorusGeometry(1.0 * scale, 0.12 * scale, 8, 24);
    const swirl1 = new THREE.Mesh(swirlGeo, swirlMat);
    swirl1.position.set(0, 4.8 * scale, 0.19 * scale);
    group.add(swirl1);

    const innerSwirlGeo = new THREE.TorusGeometry(0.5 * scale, 0.1 * scale, 8, 24);
    const swirl2 = new THREE.Mesh(innerSwirlGeo, swirlMat);
    swirl2.position.set(0, 4.8 * scale, 0.19 * scale);
    group.add(swirl2);

    // Bow ribbon under candy
    const bowGeo = new THREE.SphereGeometry(0.35 * scale, 8, 8);
    bowGeo.scale(1.8, 0.8, 0.6);
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const bow = new THREE.Mesh(bowGeo, bowMat);
    bow.position.set(0, 3.4 * scale, 0.1 * scale);
    group.add(bow);

    return group;
  }

  // Donut Arch that arches over the road
  createDonutArch(trackWidth = 8.0) {
    const group = new THREE.Group();

    // Main donut dough
    const donutGeo = new THREE.TorusGeometry(trackWidth * 0.58, 1.1, 20, 40);
    const doughMat = new THREE.MeshStandardMaterial({
      color: 0xdeb887, // Golden donut dough
      roughness: 0.7
    });
    const donutMesh = new THREE.Mesh(donutGeo, doughMat);
    donutMesh.position.y = trackWidth * 0.42;
    donutMesh.castShadow = true;
    donutMesh.receiveShadow = true;
    group.add(donutMesh);

    // Glazed Frosting layer on top half
    const frostGeo = new THREE.TorusGeometry(trackWidth * 0.58, 1.15, 16, 36, Math.PI);
    frostGeo.rotateZ(Math.PI);
    const frostMat = new THREE.MeshStandardMaterial({
      color: 0xff69b4, // Glossy strawberry glaze
      roughness: 0.2,
      metalness: 0.15
    });
    const frostMesh = new THREE.Mesh(frostGeo, frostMat);
    frostMesh.position.set(0, trackWidth * 0.42, 0.05);
    frostMesh.castShadow = true;
    group.add(frostMesh);

    // Colorful sprinkles on the frosting
    const sprinkleColors = [0xffffff, 0xffd700, 0x00f5d4, 0x70d6ff, 0xff99c8];
    const sprinkleGeo = new THREE.CapsuleGeometry(0.1, 0.35, 6, 8);

    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI / 18) * i + 0.1;
      const sRadius = trackWidth * 0.58;
      const x = Math.cos(angle) * sRadius;
      const y = Math.sin(angle) * sRadius + trackWidth * 0.42;
      const sMat = new THREE.MeshBasicMaterial({
        color: sprinkleColors[i % sprinkleColors.length]
      });
      const sprinkle = new THREE.Mesh(sprinkleGeo, sMat);
      sprinkle.position.set(x, y, 1.18);
      sprinkle.rotation.z = angle + Math.random() * 0.5;
      sprinkle.rotation.x = 0.4;
      group.add(sprinkle);
    }

    return group;
  }

  // Candy Cane post
  createCandyCane(scale = 1.0) {
    const group = new THREE.Group();

    // Curved hook geometry using curve
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 3.5 * scale, 0),
      new THREE.Vector3(0.3 * scale, 4.4 * scale, 0),
      new THREE.Vector3(1.1 * scale, 4.4 * scale, 0),
      new THREE.Vector3(1.4 * scale, 3.6 * scale, 0)
    ]);

    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.22 * scale, 12, false);
    const caneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.caneTexture || null,
      roughness: 0.3
    });
    const cane = new THREE.Mesh(tubeGeo, caneMat);
    cane.castShadow = true;
    group.add(cane);

    // Red spiral stripes rings along curve
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff1e42 });
    for (let i = 2; i < 28; i += 3) {
      const point = curve.getPoint(i / 30);
      const ringGeo = new THREE.SphereGeometry(0.25 * scale, 8, 8);
      const ring = new THREE.Mesh(ringGeo, redMat);
      ring.position.copy(point);
      ring.scale.set(1.05, 0.4, 1.05);
      group.add(ring);
    }

    return group;
  }

  // Gumdrop Bush
  createGumdrop(scale = 1.0, colorHex = null) {
    const group = new THREE.Group();
    const color = colorHex || this.gumdropColors[Math.floor(Math.random() * this.gumdropColors.length)];

    const gumGeo = new THREE.ConeGeometry(0.8 * scale, 1.4 * scale, 16);
    const pos = gumGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0.4 * scale) {
        pos.setY(i, y * 0.9);
      }
    }
    gumGeo.computeVertexNormals();

    const gumMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
      emissive: color,
      emissiveIntensity: 0.15
    });

    const gumMesh = new THREE.Mesh(gumGeo, gumMat);
    gumMesh.position.y = 0.7 * scale;
    gumMesh.castShadow = true;
    group.add(gumMesh);

    // Sugar crystal speckles
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crystalGeo = new THREE.DodecahedronGeometry(0.06 * scale);
    for (let i = 0; i < 8; i++) {
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      const a = (i / 8) * Math.PI * 2;
      crystal.position.set(
        Math.cos(a) * 0.6 * scale,
        (0.3 + Math.random() * 0.7) * scale,
        Math.sin(a) * 0.6 * scale
      );
      group.add(crystal);
    }

    return group;
  }

  // Ice Cream Mountain (Distant Scenery)
  createIceCreamMountain(scale = 1.0) {
    const group = new THREE.Group();

    // Waffle cone base
    const coneGeo = new THREE.ConeGeometry(8 * scale, 22 * scale, 16);
    coneGeo.rotateX(Math.PI);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xdf9b52, // waffle cone
      roughness: 0.9
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 7 * scale;
    group.add(cone);

    // Huge ice cream scoop top
    const scoopGeo = new THREE.SphereGeometry(7.5 * scale, 16, 16);
    const scoopColors = [0xffa5b8, 0xb8f2e6, 0xffd6a5, 0xcdb4db];
    const scoopMat = new THREE.MeshStandardMaterial({
      color: scoopColors[Math.floor(Math.random() * scoopColors.length)],
      roughness: 0.6
    });
    const scoop = new THREE.Mesh(scoopGeo, scoopMat);
    scoop.position.y = 19 * scale;
    group.add(scoop);

    // Dripping fudge frosting cap
    const dripGeo = new THREE.SphereGeometry(7.6 * scale, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dripMat = new THREE.MeshStandardMaterial({
      color: 0x4a2810, // Dark chocolate drip
      roughness: 0.25
    });
    const drip = new THREE.Mesh(dripGeo, dripMat);
    drip.position.y = 19 * scale;
    group.add(drip);

    return group;
  }

  // Cotton Candy Cloud
  createCloud(scale = 1.0, colorHex = 0xffe5ec) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.95,
      transparent: true,
      opacity: 0.88
    });

    const puffGeo = new THREE.SphereGeometry(1.6 * scale, 12, 12);
    
    // Cluster of 5 fluffy puffs
    const offsets = [
      [0, 0, 0, 1.4],
      [-1.8 * scale, -0.2 * scale, 0, 1.1],
      [1.8 * scale, -0.2 * scale, 0, 1.1],
      [-0.8 * scale, 0.8 * scale, 0.3 * scale, 1.2],
      [0.9 * scale, 0.7 * scale, -0.3 * scale, 1.2]
    ];

    offsets.forEach(([x, y, z, s]) => {
      const puff = new THREE.Mesh(puffGeo, mat);
      puff.position.set(x, y, z);
      puff.scale.setScalar(s);
      group.add(puff);
    });

    return group;
  }
}
