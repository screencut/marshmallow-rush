import * as THREE from 'three';

/**
 * TextureGenerator - Procedural high-polish Candyland textures
 * Generates crisp canvas-based textures for wafer roads, lollipop swirls,
 * peppermint candy canes, and drop shadows with zero external image asset dependencies.
 * Includes graceful headless Node.js fallbacks for testing.
 */
export class TextureGenerator {
  static isCanvasAvailable() {
    return typeof document !== 'undefined' && typeof document.createElement === 'function';
  }

  /**
   * Procedural Neapolitan Wafer Biscuit Texture
   * Golden vanilla baked biscuit with waffle grid indentations and powdered sugar speckles.
   */
  static createWaferTexture() {
    if (!this.isCanvasAvailable()) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base golden baked biscuit color
    ctx.fillStyle = '#fce2bc';
    ctx.fillRect(0, 0, 256, 256);

    // Waffle grid cells
    const cellSize = 32;
    const inset = 5;

    for (let x = 0; x < 256; x += cellSize) {
      for (let y = 0; y < 256; y += cellSize) {
        // Outer waffle border highlight
        ctx.fillStyle = '#fff4db';
        ctx.fillRect(x, y, cellSize, cellSize);

        // Deep waffle indent
        ctx.fillStyle = '#e8b883';
        ctx.fillRect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2);

        // Cell shadow on top-left of indent
        ctx.fillStyle = '#c7915b';
        ctx.fillRect(x + inset, y + inset, cellSize - inset * 2, 2);
        ctx.fillRect(x + inset, y + inset, 2, cellSize - inset * 2);

        // Cell highlight on bottom-right of indent
        ctx.fillStyle = '#fffaea';
        ctx.fillRect(x + inset, y + cellSize - inset - 2, cellSize - inset * 2, 2);
        ctx.fillRect(x + cellSize - inset - 2, y + inset, 2, cellSize - inset * 2);
      }
    }

    // Biscuit crumb pores
    for (let i = 0; i < 300; i++) {
      const px = Math.random() * 256;
      const py = Math.random() * 256;
      const r = Math.random() * 1.5 + 0.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(180, 110, 60, 0.25)' : 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 6);
    return texture;
  }

  /**
   * Procedural Candy Swirl Spiral Texture for Lollipops
   */
  static createLollipopSwirlTexture(primaryColor = '#ff3366', secondaryColor = '#ffffff') {
    if (!this.isCanvasAvailable()) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128;
    const cy = 128;

    // Fill primary
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 256, 256);

    // Draw spiral arms
    const arms = 6;
    ctx.fillStyle = secondaryColor;

    for (let a = 0; a < arms; a++) {
      ctx.beginPath();
      const baseAngle = (a / arms) * Math.PI * 2;
      for (let r = 0; r < 128; r += 2) {
        const theta = baseAngle + r * 0.08;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        const width = 8 + r * 0.08;
        ctx.arc(x, y, width * 0.5, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Glossy rim highlight
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 126, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Procedural Peppermint Candy Cane Spiral Stripes Texture
   */
  static createCandyCaneTexture() {
    if (!this.isCanvasAvailable()) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);

    // Diagonal stripes
    ctx.fillStyle = '#ff1e42';
    const stripeWidth = 24;
    const step = 48;

    for (let x = -128; x < 256; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + 128, 128);
      ctx.lineTo(x + 128, 128);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  }

  /**
   * Procedural Soft Blob Drop Shadow Texture
   * Radial gradient circle for character ground landing shadow
   */
  static createDropShadowTexture() {
    if (!this.isCanvasAvailable()) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    grad.addColorStop(0, 'rgba(60, 15, 30, 0.55)');
    grad.addColorStop(0.5, 'rgba(60, 15, 30, 0.28)');
    grad.addColorStop(0.85, 'rgba(60, 15, 30, 0.08)');
    grad.addColorStop(1.0, 'rgba(60, 15, 30, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }
}
