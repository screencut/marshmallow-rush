# 🍬 Marshmallow Rush: Candyland Cruise

[![Vite](https://img.shields.io/badge/Vite-8.3.6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested%2022%2F22-729B1B?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-pink?style=for-the-badge)](LICENSE)

An ultra-polished, candy-coated 3D endless runner built with **pure Three.js** and **procedural Web Audio**. Play as **Mallow**, an adventurous marshmallow navigating wafer tracks, leaping over molten strawberry pits, dodging treacherous chasms, and snatching sweet treats across a pastel dreamscape.

🎮 **[Play Live on GitHub Pages](https://screencut.github.io/marshmallow-rush/)**

---

## 🌟 Key Highlights & Architecture

### 🍡 Procedural Character ("Mallow")
- **Squash & Stretch Dynamics**: Mallow compresses upon landing, elongates during takeoff, and dynamically banks into turns with spring oscillations.
- **Dynamic Expressions**: Eyes blink periodically; mouth transitions dynamically from a joyful smile while running to a wide `:O` expression mid-air.
- **Spring-Rigged Waffle Hat**: Topped with a candy cane cherry that tilts with inertial delay.
- **Dynamic Contact Drop Shadows**: Ray-marched contact shadow directly under the player that grows softer and expands as Mallow jumps higher.

### 🍭 Procedural Candyland World
- **3-Lane Neapolitan Wafer Tracks**: Procedurally rendered waffle grid patterns on vanilla, strawberry, and chocolate road slabs.
- **Fair Procedural Obstacle Generation**: Algorithmic obstacle distribution guaranteeing fair play (no impossible triple chasms; safe landing pads guaranteed after every pit).
- **Molten Candy Abyss**: Vibrant pink/purple glow and point lights radiating beneath every chasm.
- **Warning Crystal Beacons**: Pulsing neon sugar crystals flanking hazard rims to telegraph upcoming jumps.

### 🎵 100% Procedural Synthesized Web Audio
- Zero external MP3/WAV assets needed — instant zero-latency loading.
- Custom chiptune synth engine built from scratch using native Web Audio API oscillators, biquad filters, and gain envelopes:
  - Upbeat Candyland BGM melody loop
  - Springy squish steps & jump sound effects
  - Melodic ascending combo chime scale (Sweet! Super! Mega!)
  - Power-up whooshes and game over fanfares

### 📱 Responsive & Mobile First
- Full touch support with on-screen virtual buttons for mobile and tablet devices.
- Keyboard layout (`WASD` / Arrow keys / Spacebar) for desktop.
- 60 FPS performance verified across mobile browsers and desktop WebGL.

---

## 🕹️ Controls

| Action | Desktop Keyboard | Mobile Touch |
| :--- | :--- | :--- |
| **Move Left / Right** | `A` / `D` or `←` / `→` | `⬅️` / `➡️` On-Screen Buttons |
| **Jump** | `Space` or `W` / `↑` | `⬆️` On-Screen Button |
| **Double Jump** | Tap `Jump` again mid-air | Tap `⬆️` again mid-air |
| **Fast Drop / Dive** | `S` or `↓` | Swipe Down / Tap Dive |
| **Toggle Mute** | Sound Icon in HUD | Sound Icon in HUD |

---

## 📂 Project Directory Structure

```text
marshmallow-rush/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Actions deployment
├── dist/                       # Optimized production build artifacts
├── src/
│   ├── game/
│   │   ├── AudioManager.js     # Web Audio API procedural synthesizer
│   │   ├── Character.js        # Mallow 3D procedural mesh & animation rig
│   │   ├── Collectibles.js     # Jellybeans, sugar stars, and power-up magnets
│   │   ├── Game.js             # Master game loop, camera choreography, scoring
│   │   ├── ParticleSystem.js   # Confetti bursts, dust poofs, rainbow speed trails
│   │   ├── TextureGenerator.js # HTML5 Canvas procedural texture generator
│   │   ├── UI.js               # HUD pills, modal menus, combo popups
│   │   └── World.js            # Endless chunk generation & hazard collision
│   ├── main.js                 # Entry point & game bootstrap
│   └── style.css               # Fredoka candy typography & responsive styling
├── tests/
│   └── game.test.js            # Vitest suite (22 unit tests for physics & logic)
├── index.html                  # Main HTML5 canvas shell
├── package.json                # Project dependencies & scripts
├── vite.config.js              # Vite configuration
└── README.md                   # Repository documentation
```

---

## 🛠️ Local Development & Scripts

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/screencut/marshmallow-rush.git
cd marshmallow-rush

# Install dependencies
npm install
```

### Running Locally
```bash
npm run dev
```
Open `http://localhost:3000` to play!

### Running Unit Tests
```bash
npm test
```
Executes all 22 Vitest test suites covering player movement, physics ticks, safe chunk generation, and collision detection.

### Production Build
```bash
npm run build
```
Generates an optimized, tree-shaken static bundle in the `dist/` folder.

---

## 🤖 Engineered with Google Antigravity & Gemini 3.8 Flash

Designed and implemented end-to-end with **Gemini 3.8 Flash** utilizing the `/boost` strategic thinking mode.

---

## 📄 License
Released under the [MIT License](LICENSE).
