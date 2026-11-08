import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// Test Character logic (independent of WebGL canvas)
describe('Character Physics and Movement', async () => {
  const THREE = await import('three');
  const { Character } = await import('../src/game/Character.js');

  const scene = new THREE.Scene();
  let character;

  before(() => {
    character = new Character(scene);
  });

  test('Character starts at center lane and grounded', () => {
    assert.equal(character.currentLane, 1);
    assert.equal(character.targetX, 0);
    assert.equal(character.isGrounded, true);
    assert.equal(character.isFalling, false);
  });

  test('Move left shifts to lane 0 (x = -2.4)', () => {
    character.moveLeft();
    assert.equal(character.currentLane, 0);
    assert.equal(character.targetX, -2.4);
    assert.ok(character.tiltZ > 0, 'Character should tilt when leaning left');

    // Cannot move left further than lane 0
    character.moveLeft();
    assert.equal(character.currentLane, 0);
    assert.equal(character.targetX, -2.4);
  });

  test('Move right shifts to lane 1 and then lane 2 (x = 2.4)', () => {
    character.moveRight();
    assert.equal(character.currentLane, 1);
    assert.equal(character.targetX, 0);

    character.moveRight();
    assert.equal(character.currentLane, 2);
    assert.equal(character.targetX, 2.4);
    assert.ok(character.tiltZ < 0, 'Character should tilt when leaning right');

    // Cannot move right further than lane 2
    character.moveRight();
    assert.equal(character.currentLane, 2);
    assert.equal(character.targetX, 2.4);
  });

  test('Jump triggers vertical velocity and unsets grounded', () => {
    character.reset();
    const jumpResult = character.jump();
    assert.equal(jumpResult, 'jump');
    assert.equal(character.isGrounded, false);
    assert.ok(character.vy > 0);
    assert.equal(character.canDoubleJump, true);
  });

  test('Double jump while airborne triggers double jump and flip', () => {
    const doubleJumpResult = character.jump();
    assert.equal(doubleJumpResult, 'doubleJump');
    assert.equal(character.canDoubleJump, false);
    assert.equal(character.isFlipping, true);
    assert.ok(character.vy > 0);

    // Third jump should fail
    const thirdJump = character.jump();
    assert.equal(thirdJump, false);
  });

  test('Landing resets jump state and triggers squash', () => {
    // Simulate falling to ground
    character.y = 0.5;
    character.vy = -5.0;
    // Step frames until landing
    for (let i = 0; i < 8; i++) {
      character.update(0.04, 16.0, null);
    }
    assert.equal(character.isGrounded, true);
    assert.equal(character.y, 0);
    assert.equal(character.canDoubleJump, true);
    assert.ok(character.squashTargetY < 1.0, 'Landing should trigger squash');
  });

  test('Drop fast rapidly increases downward velocity when in air', () => {
    character.reset();
    character.jump();
    character.dropFast();
    assert.ok(character.vy <= -20, 'Drop fast should set steep downward velocity');
  });

  test('Drop shadow exists and updates with character position', () => {
    assert.ok(character.dropShadow);
    character.targetX = 2.4;
    character.x = 2.4;
    character.mesh.position.z = -15.0;
    character.update(0.016, 16.0, null);
    assert.equal(character.dropShadow.position.x, 2.4);
    assert.equal(character.dropShadow.position.z, -15.0);
  });

  test('Airborne jump changes expression to surprised open mouth', () => {
    character.reset();
    character.jump();
    character.update(0.016, 16.0, null);
    assert.equal(character.surprisedMouth.visible, true);
    assert.equal(character.mouthMesh.visible, false);
  });

  test('Shield activation and deactivation', () => {
    character.setShield(true);
    assert.equal(character.hasShield, true);
    assert.equal(character.shieldMesh.visible, true);

    character.setShield(false);
    assert.equal(character.hasShield, false);
    assert.equal(character.shieldMesh.visible, false);
  });
});

describe('World & Hole Collision Detection', async () => {
  const THREE = await import('three');
  const { World } = await import('../src/game/World.js');
  const { Collectibles } = await import('../src/game/Collectibles.js');

  const scene = new THREE.Scene();
  const collectibles = new Collectibles(scene);
  let world;

  before(() => {
    world = new World(scene, collectibles);
  });

  test('World generates runway with segments', () => {
    assert.ok(world.segments.length > 0);
    assert.equal(world.segments.length, world.numSegments);
    // First segment should be fully safe
    assert.deepEqual(world.segments[0].lanes, [true, true, true]);
  });

  test('checkHoleFall detects solid ground as safe', () => {
    const seg = world.segments[0];
    const isFall = world.checkHoleFall(0, seg.z, 0, 0, true);
    assert.equal(isFall, false, 'Player on solid ground should not fall');
  });

  test('checkHoleFall detects hole when player is on ground', () => {
    const segWithHole = world.segments.find(s => s.hasHole);
    if (segWithHole) {
      const holeLane = segWithHole.lanes.findIndex(l => !l);
      if (holeLane !== -1) {
        const x = world.laneX[holeLane];
        const isFall = world.checkHoleFall(x, segWithHole.z, 0, 0, true); // y=0 (on ground)
        assert.equal(isFall, true, 'Player in hole lane on ground should fall');
      }
    }
  });

  test('checkHoleFall returns safe if player is jumping over hole (y > 0.25)', () => {
    const segWithHole = world.segments.find(s => s.hasHole);
    if (segWithHole) {
      const holeLane = segWithHole.lanes.findIndex(l => !l);
      if (holeLane !== -1) {
        const x = world.laneX[holeLane];
        const isFall = world.checkHoleFall(x, segWithHole.z, 1.5, -2.0, false);
        assert.equal(isFall, false, 'Jumping over a hole should be safe');
      }
    }
  });

  test('checkHoleFall returns safe during jump launch frame (vy > 0 and !isGrounded even if y <= 0.25)', () => {
    const segWithHole = world.segments.find(s => s.hasHole);
    if (segWithHole) {
      const holeLane = segWithHole.lanes.findIndex(l => !l);
      if (holeLane !== -1) {
        const x = world.laneX[holeLane];
        // Right after jump: y=0.15, vy=14.0, isGrounded=false
        const isFall = world.checkHoleFall(x, segWithHole.z, 0.15, 14.0, false);
        assert.equal(isFall, false, 'Jump launch frame must be safe over hole');
      }
    }
  });

  test('Guaranteed fair track: no consecutive full chasms over 200 segments', () => {
    world.initTrack();
    let consecutiveChasms = 0;
    let maxConsecutiveChasms = 0;

    for (let i = 0; i < 200; i++) {
      world.spawnSegment(false);
      const lastSeg = world.segments[world.segments.length - 1];
      if (lastSeg.isChasm) {
        consecutiveChasms++;
        if (consecutiveChasms > maxConsecutiveChasms) {
          maxConsecutiveChasms = consecutiveChasms;
        }
      } else {
        consecutiveChasms = 0;
      }
    }

    assert.equal(maxConsecutiveChasms <= 1, true, 'Full chasm must never repeat consecutively');
  });

  test('Guaranteed safe landing segment immediately after any full chasm', () => {
    world.initTrack();
    for (let i = 0; i < 150; i++) {
      world.spawnSegment(false);
      const segs = world.segments;
      const cur = segs[segs.length - 2];
      const next = segs[segs.length - 1];
      if (cur && cur.isChasm) {
        assert.deepEqual(next.lanes, [true, true, true], 'Segment after chasm must be completely solid safe ground');
      }
    }
  });
});

describe('TextureGenerator Headless Fallback', async () => {
  const { TextureGenerator } = await import('../src/game/TextureGenerator.js');

  test('TextureGenerator returns null in headless node without errors', () => {
    assert.equal(TextureGenerator.isCanvasAvailable(), false);
    assert.equal(TextureGenerator.createWaferTexture(), null);
    assert.equal(TextureGenerator.createLollipopSwirlTexture(), null);
    assert.equal(TextureGenerator.createCandyCaneTexture(), null);
    assert.equal(TextureGenerator.createDropShadowTexture(), null);
  });
});

describe('Audio Manager Synthesizer Notes', async () => {
  const { AudioManager } = await import('../src/game/AudioManager.js');
  const audio = new AudioManager();

  test('Scale notes frequencies are positive and ascending', () => {
    assert.ok(audio.scale.length >= 7);
    for (let i = 0; i < audio.scale.length - 1; i++) {
      assert.ok(audio.scale[i] > 0);
      assert.ok(audio.scale[i] < audio.scale[i + 1]);
    }
  });

  test('Melody sequence has valid note indices and durations', () => {
    assert.ok(audio.melody.length > 0);
    audio.melody.forEach(item => {
      assert.ok(item.note >= 0 && item.note < audio.scale.length);
      assert.ok(item.dur > 0);
    });
  });

  test('Toggle mute flips isMuted state', () => {
    assert.equal(audio.isMuted, false);
    const muted = audio.toggleMute();
    assert.equal(muted, true);
    assert.equal(audio.isMuted, true);
    const unmuted = audio.toggleMute();
    assert.equal(unmuted, false);
    assert.equal(audio.isMuted, false);
  });

  test('playGameOver method exists on AudioManager', () => {
    assert.equal(typeof audio.playGameOver, 'function');
  });
});
