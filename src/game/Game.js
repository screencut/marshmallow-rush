import * as THREE from 'three';
import { Character } from './Character.js';
import { World } from './World.js';
import { Collectibles } from './Collectibles.js';
import { ParticleSystem } from './ParticleSystem.js';
import { AudioManager } from './AudioManager.js';
import { UI } from './UI.js';

/**
 * Game - Master Game Engine
 * Manages Three.js rendering, lighting, camera choreography, game loop,
 * speed progression, hole collisions, combo streaks, and state transitions.
 */
export class Game {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // Game States: 'START', 'PLAYING', 'FALLING', 'GAME_OVER'
    this.state = 'START';

    // Game Metrics
    this.score = 0;
    this.candies = 0;
    this.distance = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.baseSpeed = 16.0;
    this.maxSpeed = 30.0;
    this.runSpeed = this.baseSpeed;

    // Power-up state
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.powerupDuration = 0;

    // Camera shake
    this.shakeIntensity = 0;

    // Init Three.js Environment
    this.initScene();
    this.initAudio();
    this.initSubsystems();
    this.initUI();
    this.initControls();

    // Start Render Loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffc2d1); // Warm pastel cotton candy pink
    this.scene.fog = new THREE.FogExp2(0xffc2d1, 0.0075); // Atmospheric sugar haze

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 350);
    this.camera.position.set(0, 4.5, 9.0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // Candyland Soft Lighting
    const hemiLight = new THREE.HemisphereLight(0xffc2d1, 0xd8b4e2, 0.85);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    // Warm Sun Directional Light
    this.sunLight = new THREE.DirectionalLight(0xfff7ee, 1.4);
    this.sunLight.position.set(20, 35, 25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target); // Required in Three.js for directional light target updates

    // Handle Window Resize
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      if (h <= 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    });
  }

  initAudio() {
    this.audio = new AudioManager();
  }

  initSubsystems() {
    this.particles = new ParticleSystem(this.scene);
    this.collectibles = new Collectibles(this.scene);
    this.character = new Character(this.scene);
    this.world = new World(this.scene, this.collectibles);
  }

  initUI() {
    this.ui = new UI({
      onStart: () => this.startGame(),
      onRestart: () => this.restartGame(),
      onToggleMute: () => this.audio.toggleMute(),
      onMoveLeft: () => this.onMoveLeft(),
      onMoveRight: () => this.onMoveRight(),
      onJump: () => this.onJump(),
      onDrop: () => this.onDrop()
    });
  }

  initControls() {
    window.addEventListener('keydown', (e) => {
      if (this.state === 'START' || this.state === 'GAME_OVER') {
        if (e.code === 'Space' || e.code === 'Enter') {
          if (this.state === 'START') this.startGame();
          else this.restartGame();
          return;
        }
      }

      if (this.state !== 'PLAYING') return;

      // Key repeat guard: prevent continuous holding from consuming double jump unintentionally
      if (e.repeat) return;

      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          this.onMoveLeft();
          break;
        case 'KeyA':
          this.onMoveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.onMoveRight();
          break;
        case 'KeyD':
          this.onMoveRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          e.preventDefault();
          this.onJump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.onDrop();
          break;
      }
    });
  }

  onMoveLeft() {
    if (this.state === 'PLAYING') {
      this.character.moveLeft();
    }
  }

  onMoveRight() {
    if (this.state === 'PLAYING') {
      this.character.moveRight();
    }
  }

  onJump() {
    if (this.state === 'PLAYING') {
      const jumpResult = this.character.jump();
      if (jumpResult === 'jump') {
        this.audio.playJump();
        this.particles.emitFootstepSparkles(this.character.x, this.character.groundY, this.character.mesh.position.z);
      } else if (jumpResult === 'doubleJump') {
        this.audio.playDoubleJump();
        this.particles.emitCandyBurst(this.character.x, this.character.groundY + this.character.y, this.character.mesh.position.z, 8);
      }
    }
  }

  onDrop() {
    if (this.state === 'PLAYING') {
      this.character.dropFast();
    }
  }

  startGame() {
    this.audio.startMusic();
    this.audio.playUI();
    this.ui.hideStart();
    this.resetGameplay();
    this.state = 'PLAYING';
  }

  restartGame() {
    this.audio.playUI();
    this.audio.startMusic();
    this.ui.hideGameOver();
    this.resetGameplay();
    this.state = 'PLAYING';
  }

  resetGameplay() {
    this.score = 0;
    this.candies = 0;
    this.distance = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.runSpeed = this.baseSpeed;
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.shakeIntensity = 0;

    this.character.reset();
    this.collectibles.clear();
    this.particles.clear();
    this.world.initTrack();

    this.ui.updateHUD(0, 0, 0);
    this.ui.updatePowerup(null, 0, 1);
  }

  applyPowerup(type) {
    this.activePowerup = type;
    this.powerupDuration = type === 'sugarRush' ? 7.5 : (type === 'floatWings' ? 8.5 : 999);
    this.powerupTimer = this.powerupDuration;
    this.audio.playPowerup();

    if (type === 'sugarRush') {
      this.character.setInvincible(true);
      this.shakeIntensity = 0.25;
    } else if (type === 'floatWings') {
      this.character.setFloating(true);
    } else if (type === 'shield') {
      this.character.setShield(true);
    }
  }

  expirePowerup() {
    if (this.activePowerup === 'sugarRush') {
      this.character.setInvincible(false);
    } else if (this.activePowerup === 'floatWings') {
      this.character.setFloating(false);
    } else if (this.activePowerup === 'shield') {
      this.character.setShield(false);
    }
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.ui.updatePowerup(null, 0, 1);
  }

  triggerHoleFall() {
    // If shield is active, shield absorbs the fall!
    if (this.character.hasShield) {
      this.character.setShield(false);
      this.activePowerup = null;
      this.ui.updatePowerup(null, 0, 1);
      this.audio.playJump();
      this.character.jump(); // Bounce back up!
      this.particles.emitCandyBurst(this.character.x, this.character.groundY, this.character.mesh.position.z, 20);
      return;
    }

    // Fall into hole!
    this.state = 'FALLING';
    this.character.startFall();
    this.audio.stopMusic();
    this.audio.playFall();
    this.audio.playGameOver();
    this.particles.emitHoleSplash(this.character.x, 0, this.character.mesh.position.z);
    this.shakeIntensity = 0.45;

    // Transition to Game Over screen after falling animation
    setTimeout(() => {
      this.state = 'GAME_OVER';
      this.ui.showGameOver(this.score, this.candies, this.distance);
    }, 1100);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    // 1. START Screen Idle Animation
    if (this.state === 'START') {
      const t = Date.now() * 0.0018;
      this.character.mesh.position.y = this.character.groundY + Math.abs(Math.sin(t * 3)) * 0.25;
      this.character.mesh.rotation.y = Math.sin(t * 1.5) * 0.35;
      this.camera.position.set(Math.sin(t * 0.5) * 2.5, 4.0, 8.5);
      this.camera.lookAt(0, 1.2, 0);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 2. PLAYING Loop
    if (this.state === 'PLAYING') {
      // Smooth gradual speed progression (ramps over ~700m)
      const speedFactor = Math.min(1.0, this.distance / 700.0);
      const targetSpeed = this.baseSpeed + speedFactor * (this.maxSpeed - this.baseSpeed);
      const effectiveSpeed = (this.activePowerup === 'sugarRush') ? targetSpeed * 1.35 : targetSpeed;
      this.runSpeed = effectiveSpeed;

      // Advance Character along -Z
      this.character.mesh.position.z -= this.runSpeed * delta;
      const playerZ = this.character.mesh.position.z;

      // Update Character Physics & Animation first so y, vy, isGrounded are fresh
      this.character.update(delta, this.runSpeed, this.audio);

      // Update distance & score
      this.distance += this.runSpeed * delta * 0.5;
      const scoreMultiplier = (this.combo > 1 ? this.combo : 1) * (this.activePowerup === 'sugarRush' ? 2 : 1);
      this.score += this.runSpeed * delta * 4.0 * scoreMultiplier;

      // Combo Decay
      if (this.comboTimer > 0) {
        this.comboTimer -= delta;
        if (this.comboTimer <= 0) {
          this.combo = 0;
        }
      }

      // Update Powerup Timer
      if (this.activePowerup) {
        if (this.activePowerup !== 'shield') {
          this.powerupTimer -= delta;
          this.ui.updatePowerup(this.activePowerup, this.powerupTimer, this.powerupDuration);
          if (this.powerupTimer <= 0) {
            this.expirePowerup();
          }
        } else {
          this.ui.updatePowerup('shield', 1, 1);
        }

        // Rainbow dash particles
        if (this.activePowerup === 'sugarRush') {
          this.particles.emitRainbowTrail(this.character.x, this.character.groundY + this.character.y * 0.5, playerZ);
        }
      }

      // Check Hole Hazard Fall!
      // If character is invincible (Sugar Rush), they surf right over holes!
      if (!this.character.isInvincible) {
        const isFallingIntoHole = this.world.checkHoleFall(
          this.character.x,
          playerZ,
          this.character.y,
          this.character.vy,
          this.character.isGrounded
        );

        if (isFallingIntoHole) {
          this.triggerHoleFall();
        }
      }

      // Footstep particles when running on ground
      if (this.character.isGrounded && Math.random() > 0.65) {
        this.particles.emitFootstepSparkles(this.character.x, this.character.groundY, playerZ);
      }

      // Update Collectibles & Magnet
      const isMagnet = this.activePowerup === 'sugarRush';
      this.collectibles.update(
        delta,
        { x: this.character.x, y: this.character.groundY + this.character.y, z: playerZ },
        isMagnet,
        (item) => {
          if (item.type === 'powerup') {
            this.applyPowerup(item.powerType);
            this.particles.emitCandyBurst(item.mesh.position.x, item.mesh.position.y, item.mesh.position.z, 24);
            this.ui.showScorePopup(500, 'POWER-UP!');
          } else {
            // Candy or Star
            this.candies++;
            this.combo++;
            this.comboTimer = 2.8;
            const points = (item.type === 'star' ? 300 : 100) * (this.combo > 1 ? this.combo : 1);
            this.score += points;
            this.audio.playCollect(this.combo);
            this.ui.showCombo(this.combo);
            this.ui.showScorePopup(points);
            this.particles.emitCandyBurst(item.mesh.position.x, item.mesh.position.y, item.mesh.position.z, 14);
          }
        }
      );

      // Update World & Scenery
      this.world.update(playerZ);

      // Update HUD
      this.ui.updateHUD(this.score, this.candies, this.distance);
    } else if (this.state === 'FALLING') {
      // Continue updating character falling animation
      this.character.update(delta, this.runSpeed, this.audio);
    }

    // 4. Update Particle Systems
    const curZ = this.character.mesh.position.z;
    this.particles.update(delta, curZ);

    // 5. Update Sun Light follow player (Fixed: X is 20, Z tracks player + 25)
    this.sunLight.position.set(20, 35, curZ + 25);
    this.sunLight.target.position.set(0, 0, curZ);
    this.sunLight.target.updateMatrixWorld();

    // 6. Camera Follow Choreography
    let targetCamX = this.character.x * 0.45;
    let targetCamY = 3.6 + Math.max(0, this.character.y * 0.4);
    let targetCamZ = curZ + 7.2;

    // Apply Screen Shake if active
    if (this.shakeIntensity > 0) {
      targetCamX += (Math.random() - 0.5) * this.shakeIntensity;
      targetCamY += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 0.9);
    }

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, delta * 12.0);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, delta * 10.0);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, delta * 16.0);

    // Dynamic FOV zoom during Sugar Rush
    const targetFov = (this.activePowerup === 'sugarRush') ? 68 : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 4.0);
      this.camera.updateProjectionMatrix();
    }

    // Camera LookAt slightly ahead of Mallow
    const lookTarget = new THREE.Vector3(
      this.character.x * 0.3,
      1.2 + this.character.y * 0.3,
      curZ - 7.0
    );
    this.camera.lookAt(lookTarget);

    // Subtle camera roll/tilt when turning
    const targetRoll = (this.character.targetX - this.character.x) * -0.015;
    this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, targetRoll, delta * 6.0);

    // 7. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}
