# Drift // Playground 🏎️💨

> A high-performance, browser-based 3D drifting game engineered with Three.js, React, and TypeScript. Works seamlessly on desktop and mobile browsers with zero backend, database, or API keys required.

![Drift Playground Banner](https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80)

## 🌟 Features

- **Arcade-Realistic Drift Physics**: Rear-wheel drive dynamics, dynamic tire slip friction curves, counter-steering stabilization, throttle power oversteer, handbrake slide initiation, weight transfer pitch and roll.
- **Detailed Modern Drift Car**: Widebody aerodynamics, front carbon splitter, high-downforce GT carbon wing, dual chrome exhaust with backfire flames, projector headlights, and responsive front-wheel steering rack.
- **Dedicated Drift Map**:
  - Open asphalt staging paddock
  - Concentric circular Donut Drift Zone with center monument
  - Figure-8 intersection with clipping apexes
  - High-speed banked outer sweeper and hairpin corners with red & white rumble curbs
  - Perimeter jersey safety walls, tire barrier stacks, drift cones, industrial shipping containers, streetlight towers, and distant mountain/city skyline.
- **Procedural Sound Engine**: Web Audio API engine rumble, RPM redline limiter, tire screeching modulated by lateral slip angle and speed, backfire pops, crash impacts, and combo chimes.
- **Visual Effects**:
  - Instanced volumetric tire smoke billowing behind rear wheels
  - Continuous dual tire skid mark ribbons on the road surface
  - Golden-hour sunset atmosphere with directional shadows, soft horizon fog, and ACES Filmic tone mapping.
- **Cinematic Chase Camera**: Smooth lag and spring interpolation, dynamic drift momentum anticipation framing the slide, and speed-adaptive field of view.
- **Drift Combo & Scoring**: Real-time drift angle & speed calculation, combo multipliers (up to 5x), transition grace timer for "Manji" slides, and local high-score persistence.
- **Mobile Multi-Touch Support**:
  - Virtual analog steering joystick on the left
  - Dedicated Gas, Brake/Reverse, and Handbrake pedals on the right
  - Simultaneous multi-touch tracking and haptic vibration feedback
  - Viewport zoom/scroll prevention and landscape orientation hint.

---

## 🎮 Controls

### Desktop Keyboard
| Key | Action |
| --- | --- |
| **W** or **↑** | Accelerate / Gas |
| **S** or **↓** | Brake / Reverse |
| **A / D** or **← / →** | Steer / Counter-steer |
| **SPACE** | Handbrake (Initiate Slide) |
| **R** | Reset Car Position |

### Mobile Multi-Touch
- **Left Thumb**: Drag the virtual joystick horizontally to steer with fine analog precision.
- **Right Thumb/Fingers**: Press and hold **GAS**, tap or hold **BRAKE/REV**, and engage **HANDBRAKE** simultaneously.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed

### Local Development
```bash
# Clone the repository
git clone https://github.com/your-username/drift-playground.git
cd drift-playground

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open `http://localhost:3000` in your browser.

### Production Build
```bash
npm run build
```
This outputs an optimized static web bundle in the `dist/` directory.

---

## 🌐 Deployment

### Deploying to Vercel
This project requires zero configuration for Vercel:
1. Push your code to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Framework Preset: **Vite**
4. Root Directory: `./`
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Click **Deploy**.

### Deploying to GitHub Pages
1. In `vite.config.ts`, set `base: './'`.
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy the contents of the `dist/` folder to your `gh-pages` branch.

---

## ⚙️ Technologies Used
- **Three.js**: 3D scene graph, materials, lighting, instanced particle meshes, and procedural textures.
- **React 19 & TypeScript**: UI state management, HUD, and mobile touch interface.
- **Tailwind CSS**: Modern utility styling and responsive layouts.
- **Web Audio API**: Real-time procedural audio synthesis without external media files.

## 📄 License
MIT
