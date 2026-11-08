/**
 * UI - High polish Candyland HUD, Start Screen, Combo Popups, and Game Over Modal
 */
export class UI {
  constructor(callbacks) {
    this.callbacks = callbacks; // onStart, onRestart, onToggleMute, onMoveLeft, onMoveRight, onJump, onDrop

    this.scoreEl = document.getElementById('score-val');
    this.candyEl = document.getElementById('candy-val');
    this.distanceEl = document.getElementById('dist-val');
    this.comboContainer = document.getElementById('combo-badge');
    this.powerupBar = document.getElementById('powerup-bar');
    this.powerupFill = document.getElementById('powerup-fill');
    this.powerupLabel = document.getElementById('powerup-label');

    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalDistanceEl = document.getElementById('final-dist');
    this.finalCandiesEl = document.getElementById('final-candies');
    this.highScoreEl = document.getElementById('high-score');
    this.startHighScoreEl = document.getElementById('start-high-score');
    this.newBestBadge = document.getElementById('new-best-badge');
    this.muteBtn = document.getElementById('mute-btn');

    this.setupListeners();
    this.loadHighScore();
  }

  setupListeners() {
    document.getElementById('start-btn').addEventListener('click', () => {
      this.callbacks.onStart();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      this.callbacks.onRestart();
    });

    this.muteBtn.addEventListener('click', () => {
      const isMuted = this.callbacks.onToggleMute();
      this.muteBtn.innerText = isMuted ? '🔇' : '🔊';
      this.muteBtn.setAttribute('aria-label', isMuted ? 'Unmute Audio' : 'Mute Audio');
    });

    // Mobile On-Screen Touch Buttons
    const btnLeft = document.getElementById('touch-left');
    const btnRight = document.getElementById('touch-right');
    const btnJump = document.getElementById('touch-jump');

    if (btnLeft && btnRight && btnJump) {
      btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); this.callbacks.onMoveLeft(); });
      btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.callbacks.onMoveRight(); });
      btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); this.callbacks.onJump(); });

      // Click fallback for testing touch buttons with mouse
      btnLeft.addEventListener('mousedown', () => this.callbacks.onMoveLeft());
      btnRight.addEventListener('mousedown', () => this.callbacks.onMoveRight());
      btnJump.addEventListener('mousedown', () => this.callbacks.onJump());
    }

    // Touch swipe gestures on the entire window
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) > 30) {
          if (absX > absY) {
            if (dx > 0) this.callbacks.onMoveRight();
            else this.callbacks.onMoveLeft();
          } else {
            if (dy < 0) this.callbacks.onJump();
            else this.callbacks.onDrop();
          }
        }
      }
    }, { passive: true });
  }

  loadHighScore() {
    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem('marshmallow_runner_high_score') || '0', 10);
    } catch {
      hs = 0;
    }
    this.highScore = isNaN(hs) ? 0 : hs;
    if (this.startHighScoreEl) {
      this.startHighScoreEl.innerText = this.highScore.toLocaleString();
    }
  }

  saveHighScore(score) {
    if (score > this.highScore) {
      this.highScore = Math.floor(score);
      try {
        localStorage.setItem('marshmallow_runner_high_score', this.highScore.toString());
      } catch {
        // storage disabled or quota exceeded
      }
      return true; // new high score
    }
    return false;
  }

  showStart() {
    this.startScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.loadHighScore();
  }

  hideStart() {
    this.startScreen.classList.add('hidden');
  }

  updateHUD(score, candies, distance) {
    this.scoreEl.innerText = Math.floor(score).toLocaleString();
    this.candyEl.innerText = candies.toLocaleString();
    this.distanceEl.innerText = `${Math.floor(distance)}m`;
  }

  showCombo(combo) {
    if (combo < 2) return;
    const words = ['SWEET!', 'TASTY!', 'CRUNCHY!', 'DELICIOUS!', 'SUGAR RUSH!', 'DIVINE!'];
    const word = words[Math.min(combo - 2, words.length - 1)];

    this.comboContainer.innerText = `x${combo} ${word}`;
    this.comboContainer.className = 'combo-badge active';

    clearTimeout(this.comboTimeout);
    this.comboTimeout = setTimeout(() => {
      this.comboContainer.className = 'combo-badge hidden';
    }, 1200);
  }

  showScorePopup(amount, prefix = '') {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    const el = document.createElement('div');
    el.className = 'floating-score';
    el.innerText = prefix ? `${prefix} +${amount}` : `+${amount}`;
    el.style.left = `${50 + (Math.random() - 0.5) * 22}%`;
    el.style.top = `${40 + (Math.random() - 0.5) * 12}%`;
    overlay.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 800);
  }

  updatePowerup(type, timeLeft, totalDuration) {
    if (timeLeft <= 0) {
      this.powerupBar.classList.add('hidden');
      return;
    }

    this.powerupBar.classList.remove('hidden');
    const pct = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));
    this.powerupFill.style.width = `${pct}%`;

    const names = {
      sugarRush: '⚡ SUGAR RUSH!',
      floatWings: '🪽 COTTON GLIDE',
      shield: '🛡️ SUGAR SHIELD'
    };
    this.powerupLabel.innerText = `${names[type] || 'POWER-UP'} (${timeLeft.toFixed(1)}s)`;
  }

  showGameOver(score, candies, distance) {
    const isNewBest = this.saveHighScore(score);

    this.finalScoreEl.innerText = Math.floor(score).toLocaleString();
    this.finalCandiesEl.innerText = candies.toLocaleString();
    this.finalDistanceEl.innerText = `${Math.floor(distance)}m`;
    this.highScoreEl.innerText = this.highScore.toLocaleString();

    if (isNewBest && score > 0) {
      this.newBestBadge.classList.remove('hidden');
    } else {
      this.newBestBadge.classList.add('hidden');
    }

    this.gameOverScreen.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverScreen.classList.add('hidden');
  }
}
