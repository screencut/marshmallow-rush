import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * Character - "Mallow the Marshmallow"
 * Procedurally modelled cute marshmallow with expressive face, waffle hat,
 * squishy bounce animations, footstep dust, jumping physics, and landing drop shadow.
 */
export class Character {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    // Movement & Lane constants
    this.lanes = [-2.4, 0, 2.4];
    this.currentLane = 1; // Middle lane (0-indexed: 0=left, 1=center, 2=right)
    this.targetX = 0;
    this.x = 0;
    this.laneSpeed = 16.0;

    // Vertical Jump Physics
    this.y = 0;
    this.groundY = 0.85; // Marshmallow center height when on ground
    this.vy = 0;
    this.gravity = -38.0;
    this.jumpForce = 14.5;
    this.doubleJumpForce = 13.0;
    this.isGrounded = true;
    this.canDoubleJump = true;
    this.isFloating = false; // Cotton candy powerup

    // Falling / Death State
    this.isFalling = false;
    this.fallY = 0;
    this.fallRotX = 0;
    this.fallRotZ = 0;

    // Animation & Squash state
    this.runAnimTime = 0;
    this.squashY = 1.0;
    this.squashTargetY = 1.0;
    this.tiltZ = 0;
    this.blinkTimer = 2.0;
    this.isBlinking = false;
    this.hatWobble = 0;

    // Power-up visual effects
    this.isInvincible = false;
    this.hasShield = false;

    // Build 3D Model & Ground Drop Shadow
    this.buildModel();
    this.buildDropShadow();
    this.scene.add(this.mesh);
  }

  buildModel() {
    // Marshmallow Body: Soft rounded cylinder with pill bulge
    const bodyGeo = new THREE.CylinderGeometry(0.68, 0.72, 1.25, 32, 8);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const r = Math.sqrt(pos.getX(i)**2 + pos.getZ(i)**2);
      if (r > 0.01) {
        const bulge = 1.0 + 0.08 * (1.0 - (y / 0.625)**2);
        pos.setX(i, pos.getX(i) * bulge);
        pos.setZ(i, pos.getZ(i) * bulge);
      }
    }
    bodyGeo.computeVertexNormals();

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfffaf5, // Creamy marshmallow white
      roughness: 0.6,
      metalness: 0.02,
      emissive: 0x221111,
      emissiveIntensity: 0.08
    });

    this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.mesh.add(this.bodyMesh);

    // Cute Face Container
    this.faceGroup = new THREE.Group();
    this.faceGroup.position.set(0, 0.1, 0.72);

    // Chocolate Drop Eyes
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x24140e, // Dark glossy chocolate
      roughness: 0.2,
      metalness: 0.1
    });
    const eyeGeo = new THREE.SphereGeometry(0.1, 16, 16);
    eyeGeo.scale(1, 1.3, 0.5);

    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.25, 0.08, 0);

    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.position.set(0.25, 0.08, 0);

    // Eye Sparkle highlights (pure white gleam in top right of eyes)
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const glintGeo = new THREE.SphereGeometry(0.038, 8, 8);

    this.leftGlint = new THREE.Mesh(glintGeo, glintMat);
    this.leftGlint.position.set(-0.22, 0.13, 0.05);

    this.rightGlint = new THREE.Mesh(glintGeo, glintMat);
    this.rightGlint.position.set(0.28, 0.13, 0.05);

    this.faceGroup.add(this.leftEye);
    this.faceGroup.add(this.rightEye);
    this.faceGroup.add(this.leftGlint);
    this.faceGroup.add(this.rightGlint);

    // Blushing Cheeks (Sweet strawberry pink)
    const blushMat = new THREE.MeshBasicMaterial({
      color: 0xff85a2,
      transparent: true,
      opacity: 0.75
    });
    const blushGeo = new THREE.SphereGeometry(0.12, 16, 16);
    blushGeo.scale(1.2, 0.6, 0.2);

    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.42, -0.05, -0.02);
    leftBlush.rotation.z = 0.1;

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.42, -0.05, -0.02);
    rightBlush.rotation.z = -0.1;

    this.faceGroup.add(leftBlush);
    this.faceGroup.add(rightBlush);

    // Sweet Smiling Mouth (Chocolate curve)
    const mouthGeo = new THREE.TorusGeometry(0.1, 0.026, 8, 16, Math.PI);
    this.mouthMesh = new THREE.Mesh(mouthGeo, eyeMat);
    this.mouthMesh.rotation.z = Math.PI;
    this.mouthMesh.position.set(0, -0.12, 0.02);
    this.faceGroup.add(this.mouthMesh);

    // Surprised Open ":O" Mouth (Used when airborne in jumps)
    const surprisedGeo = new THREE.TorusGeometry(0.065, 0.025, 8, 16);
    this.surprisedMouth = new THREE.Mesh(surprisedGeo, eyeMat);
    this.surprisedMouth.position.set(0, -0.11, 0.02);
    this.surprisedMouth.visible = false;
    this.faceGroup.add(this.surprisedMouth);

    this.mesh.add(this.faceGroup);

    // Mini Waffle Hat with Cherry
    this.hatGroup = new THREE.Group();
    this.hatGroup.position.set(0.12, 0.72, 0);
    this.hatGroup.rotation.z = -0.18; // Jaunty tilt!

    // Waffle Cone
    const coneGeo = new THREE.ConeGeometry(0.32, 0.55, 16);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xe6a15c, // Golden waffle wafer
      roughness: 0.7,
      metalness: 0.0
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.castShadow = true;
    this.hatGroup.add(coneMesh);

    // Glazed Candied Cherry on Top of Hat
    const cherryGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const cherryMat = new THREE.MeshStandardMaterial({
      color: 0xff1040,
      roughness: 0.15,
      metalness: 0.2,
      emissive: 0x440010
    });
    const cherryMesh = new THREE.Mesh(cherryGeo, cherryMat);
    cherryMesh.position.set(0, 0.35, 0);
    cherryMesh.castShadow = true;
    this.hatGroup.add(cherryMesh);

    // Little cherry stem
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.14);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d7023 });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.set(0.04, 0.44, 0);
    stemMesh.rotation.z = 0.4;
    this.hatGroup.add(stemMesh);

    this.mesh.add(this.hatGroup);

    // Cute Little Marshmallow Feet
    const footGeo = new THREE.SphereGeometry(0.18, 16, 12);
    footGeo.scale(1.1, 0.7, 1.4);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0xffeff0, // Slightly pinkish marshmallow
      roughness: 0.6
    });

    this.leftFoot = new THREE.Mesh(footGeo, footMat);
    this.leftFoot.position.set(-0.35, -0.65, 0.1);
    this.leftFoot.castShadow = true;
    this.mesh.add(this.leftFoot);

    this.rightFoot = new THREE.Mesh(footGeo, footMat);
    this.rightFoot.position.set(0.35, -0.65, 0.1);
    this.rightFoot.castShadow = true;
    this.mesh.add(this.rightFoot);

    // Cute Marshmallow Paws/Hands
    const handGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const handMat = new THREE.MeshStandardMaterial({ color: 0xfffaf5, roughness: 0.6 });

    this.leftHand = new THREE.Mesh(handGeo, handMat);
    this.leftHand.position.set(-0.78, -0.05, 0.05);
    this.leftHand.castShadow = true;
    this.mesh.add(this.leftHand);

    this.rightHand = new THREE.Mesh(handGeo, handMat);
    this.rightHand.position.set(0.78, -0.05, 0.05);
    this.rightHand.castShadow = true;
    this.mesh.add(this.rightHand);

    // Protective Sugar Bubble Shield
    const shieldGeo = new THREE.SphereGeometry(1.2, 24, 24);
    this.shieldMat = new THREE.MeshStandardMaterial({
      color: 0x60efff,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.0,
      emissive: 0x00b4d8,
      emissiveIntensity: 0.4
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.visible = false;
    this.mesh.add(this.shieldMesh);

    // Funfetti Candy Sprinkles on Mallow's Body
    const sprinkleColors = [0xff3366, 0x00f5d4, 0xffd166, 0x9b5de5, 0xff99c8];
    const sprGeo = new THREE.CapsuleGeometry(0.035, 0.1, 4, 6);
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2 + 0.3;
      if (angle > Math.PI * 0.3 && angle < Math.PI * 0.7) continue;

      const sprMat = new THREE.MeshBasicMaterial({
        color: sprinkleColors[i % sprinkleColors.length]
      });
      const spr = new THREE.Mesh(sprGeo, sprMat);
      spr.position.set(
        Math.cos(angle) * 0.69,
        (Math.random() - 0.5) * 0.65,
        Math.sin(angle) * 0.69
      );
      spr.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.mesh.add(spr);
    }

    // Cute Cotton Candy Glider Wings (shown when floating)
    this.wingsGroup = new THREE.Group();
    this.wingsGroup.position.set(0, 0.25, -0.65);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x90e0ef,
      roughness: 0.3,
      emissive: 0x00b4d8,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85
    });

    const wingGeo = new THREE.ConeGeometry(0.4, 0.9, 12);
    wingGeo.rotateX(Math.PI / 2);

    this.leftWing = new THREE.Mesh(wingGeo, wingMat);
    this.leftWing.position.set(-0.55, 0, 0);
    this.leftWing.rotation.z = 0.5;
    this.wingsGroup.add(this.leftWing);

    this.rightWing = new THREE.Mesh(wingGeo, wingMat);
    this.rightWing.position.set(0.55, 0, 0);
    this.rightWing.rotation.z = -0.5;
    this.wingsGroup.add(this.rightWing);

    this.wingsGroup.visible = false;
    this.mesh.add(this.wingsGroup);

    // Flip animation state
    this.isFlipping = false;
    this.flipProgress = 0;

    // Initial position
    this.mesh.position.set(0, this.groundY, 0);
  }

  buildDropShadow() {
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    shadowGeo.rotateX(-Math.PI / 2);

    const shadowTex = TextureGenerator.createDropShadowTexture();
    this.dropShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      color: 0x3d0e20,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });

    this.dropShadow = new THREE.Mesh(shadowGeo, this.dropShadowMat);
    this.dropShadow.position.set(0, 0.02, 0);
    this.scene.add(this.dropShadow);
  }

  moveLeft() {
    if (this.isFalling) return;
    if (this.currentLane > 0) {
      this.currentLane--;
      this.targetX = this.lanes[this.currentLane];
      this.tiltZ = 0.28; // Lean left
    }
  }

  moveRight() {
    if (this.isFalling) return;
    if (this.currentLane < this.lanes.length - 1) {
      this.currentLane++;
      this.targetX = this.lanes[this.currentLane];
      this.tiltZ = -0.28; // Lean right
    }
  }

  jump() {
    if (this.isFalling) return false;

    if (this.isGrounded) {
      this.isGrounded = false;
      this.vy = this.jumpForce;
      this.canDoubleJump = true;
      this.squashTargetY = 1.35; // stretch on jump launch
      return 'jump';
    } else if (this.canDoubleJump) {
      this.canDoubleJump = false;
      this.vy = this.doubleJumpForce;
      this.squashTargetY = 1.25;
      this.isFlipping = true;
      this.flipProgress = 0;
      return 'doubleJump';
    }
    return false;
  }

  dropFast() {
    if (!this.isGrounded && this.vy > -12) {
      this.vy = -26; // quick stomp down
    }
  }

  setShield(active) {
    this.hasShield = active;
    this.shieldMesh.visible = active;
    if (active) {
      this.shieldMat.opacity = 0.45;
    } else {
      this.shieldMat.opacity = 0.0;
    }
  }

  setInvincible(active) {
    this.isInvincible = active;
  }

  setFloating(active) {
    this.isFloating = active;
    if (this.wingsGroup) {
      this.wingsGroup.visible = active;
    }
  }

  startFall() {
    if (this.isFalling) return;
    this.isFalling = true;
    this.fallY = this.y;
    this.fallRotX = 0;
    this.fallRotZ = 0;
    this.vy = -4.0;
    if (this.dropShadow) this.dropShadow.visible = false;
  }

  reset() {
    this.currentLane = 1;
    this.targetX = this.lanes[1];
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.canDoubleJump = true;
    this.isFalling = false;
    this.isFloating = false;
    this.isFlipping = false;
    this.flipProgress = 0;
    this.hatWobble = 0;
    if (this.wingsGroup) this.wingsGroup.visible = false;
    this.setShield(false);
    this.setInvincible(false);
    this.mesh.position.set(0, this.groundY, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);
    this.bodyMat.color.setHex(0xfffaf5);
    this.mouthMesh.visible = true;
    this.surprisedMouth.visible = false;
    if (this.dropShadow) {
      this.dropShadow.visible = true;
      this.dropShadow.position.set(0, 0.02, 0);
      this.dropShadow.scale.set(1, 1, 1);
      this.dropShadowMat.opacity = 0.45;
    }
  }

  update(delta, runSpeed, audioManager) {
    const dt = Math.min(delta, 0.05);

    // Fall into hole sequence
    if (this.isFalling) {
      this.vy += this.gravity * dt * 0.9;
      this.y += this.vy * dt;
      this.fallRotX += dt * 4.0;
      this.fallRotZ += dt * 5.0;

      this.mesh.position.y = this.groundY + this.y;
      this.mesh.rotation.x = this.fallRotX;
      this.mesh.rotation.z = this.fallRotZ;
      this.mesh.scale.multiplyScalar(Math.max(0.01, 1.0 - dt * 1.8));

      if (this.dropShadow) this.dropShadow.visible = false;
      return;
    }

    // 1. Smooth Lane Interpolation (Left/Right)
    const dx = this.targetX - this.x;
    this.x += dx * Math.min(1.0, this.laneSpeed * dt);
    this.mesh.position.x = this.x;

    // Lean decay
    this.tiltZ = THREE.MathUtils.lerp(this.tiltZ, 0, dt * 8.0);
    this.mesh.rotation.z = this.tiltZ;
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, (this.targetX - this.x) * -0.15, dt * 10);

    // 2. Vertical Jump & Gravity Physics
    const effectiveGravity = this.isFloating ? this.gravity * 0.35 : this.gravity;
    if (!this.isGrounded) {
      this.vy += effectiveGravity * dt;
      this.y += this.vy * dt;

      // Facial expression: surprised cute ":O" mouth while airborne
      this.mouthMesh.visible = false;
      this.surprisedMouth.visible = true;

      if (this.y <= 0) {
        // Landed on ground level
        this.y = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.canDoubleJump = true;
        this.squashTargetY = 0.72; // deep landing squash
        this.hatWobble = 0.35; // bounce jaunty waffle hat!
        this.mouthMesh.visible = true;
        this.surprisedMouth.visible = false;
        if (audioManager) audioManager.playStep();
      }
    } else {
      this.mouthMesh.visible = true;
      this.surprisedMouth.visible = false;
    }

    // 3. Running Bounce & Feet Pumping (when on ground)
    if (this.isGrounded) {
      this.runAnimTime += dt * (runSpeed * 1.3);
      const bob = Math.abs(Math.sin(this.runAnimTime)) * 0.16;
      this.mesh.position.y = this.groundY + this.y + bob;

      // Feet trot animation
      const footAngle = Math.sin(this.runAnimTime) * 0.55;
      this.leftFoot.position.z = Math.sin(this.runAnimTime) * 0.28;
      this.leftFoot.position.y = -0.65 + Math.max(0, -Math.sin(this.runAnimTime)) * 0.18;
      this.rightFoot.position.z = -Math.sin(this.runAnimTime) * 0.28;
      this.rightFoot.position.y = -0.65 + Math.max(0, Math.sin(this.runAnimTime)) * 0.18;

      // Hands swing opposite to feet
      this.leftHand.position.z = -Math.sin(this.runAnimTime) * 0.3;
      this.rightHand.position.z = Math.sin(this.runAnimTime) * 0.3;
      this.leftHand.rotation.x = footAngle;
      this.rightHand.rotation.x = -footAngle;

      // Footstep sound when hitting ground
      if (Math.sin(this.runAnimTime) > 0.95 && audioManager) {
        audioManager.playStep();
      }
    } else {
      // In air: tuck feet and hands up cute
      this.mesh.position.y = this.groundY + this.y;
      this.leftFoot.position.set(-0.35, -0.55, 0.15);
      this.rightFoot.position.set(0.35, -0.55, 0.15);
      this.leftHand.position.set(-0.78, 0.18, 0.1);
      this.rightHand.position.set(0.78, 0.18, 0.1);
      this.leftHand.rotation.x = 0;
      this.rightHand.rotation.x = 0;
    }

    // 4. Update Ground Drop Shadow
    if (this.dropShadow) {
      this.dropShadow.visible = true;
      this.dropShadow.position.x = this.x;
      this.dropShadow.position.z = this.mesh.position.z;

      const heightRatio = Math.max(0, 1.0 - this.y / 3.2);
      const shadowScale = 0.55 + 0.45 * heightRatio;
      this.dropShadow.scale.set(shadowScale, 1, shadowScale);
      this.dropShadowMat.opacity = 0.48 * heightRatio;
    }

    // 5. Squash & Stretch smooth spring interpolation
    this.squashTargetY = THREE.MathUtils.lerp(this.squashTargetY, 1.0, dt * 10.0);
    this.squashY = THREE.MathUtils.lerp(this.squashY, this.squashTargetY, dt * 14.0);

    const factorXZ = 1.0 / Math.sqrt(Math.max(0.1, this.squashY));
    this.mesh.scale.set(factorXZ, this.squashY, factorXZ);

    // Hat wobble spring
    this.hatWobble = THREE.MathUtils.lerp(this.hatWobble, 0, dt * 8.0);
    this.hatGroup.rotation.z = -0.18 + Math.sin(Date.now() * 0.02) * this.hatWobble;

    // 6. Random Eye Blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      if (!this.isBlinking) {
        this.isBlinking = true;
        this.leftEye.scale.set(1, 0.1, 0.5);
        this.rightEye.scale.set(1, 0.1, 0.5);
        if (this.leftGlint) this.leftGlint.visible = false;
        if (this.rightGlint) this.rightGlint.visible = false;
        setTimeout(() => {
          this.leftEye.scale.set(1, 1.3, 0.5);
          this.rightEye.scale.set(1, 1.3, 0.5);
          if (this.leftGlint) this.leftGlint.visible = true;
          if (this.rightGlint) this.rightGlint.visible = true;
          this.isBlinking = false;
        }, 120);
      }
      this.blinkTimer = 2.5 + Math.random() * 3.0;
    }

    // 7. Shield / Invincibility visual pulse
    if (this.hasShield) {
      this.shieldMesh.rotation.y += dt * 2.0;
      this.shieldMesh.rotation.x += dt * 1.2;
    }

    if (this.isInvincible) {
      const hue = (Date.now() % 2000) / 2000;
      this.bodyMat.color.setHSL(hue, 0.7, 0.85);
      this.bodyMat.emissive.setHSL(hue, 0.9, 0.3);
    } else {
      this.bodyMat.color.setHex(0xfffaf5);
      this.bodyMat.emissive.setHex(0x221111);
    }

    // 8. Cotton Candy Glider Wings Flapping
    if (this.isFloating && this.wingsGroup) {
      const flap = Math.sin(Date.now() * 0.018) * 0.45;
      this.leftWing.rotation.y = flap;
      this.rightWing.rotation.y = -flap;
    }

    // 9. Double Jump Front Flip
    if (this.isFlipping) {
      this.flipProgress += dt * 15.0;
      this.mesh.rotation.x = this.flipProgress;
      if (this.flipProgress >= Math.PI * 2) {
        this.isFlipping = false;
        this.mesh.rotation.x = 0;
      }
    }
  }
}
