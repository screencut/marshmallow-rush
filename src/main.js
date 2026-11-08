import { Game } from './game/Game.js';
import './style.css';

function initGame() {
  const container = document.getElementById('canvas-container');
  if (container && !window.game) {
    window.game = new Game(container);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
