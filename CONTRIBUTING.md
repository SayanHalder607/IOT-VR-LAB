# Contributing to IoT Based VR Lab

Thank you for your interest in contributing to **IoT Based VR Lab (V-Lab 3D)**! We welcome contributions from developers, educators, makers, and 3D graphics enthusiasts.

---

## 🛠️ Getting Started

1. **Fork the Repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/IOT-VR-LAB.git
   cd IOT-VR-LAB
   ```
3. **Launch the local development server**:
   ```bash
   # Using Python 3:
   python -m http.server 8000

   # Or using Node.js:
   npm start
   ```
4. Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 💡 How to Contribute

### 1. Adding or Modifying Experiments
- All experiment configurations live in `src/data.js` under the `EXPS` array.
- Each experiment definition includes:
  - `id`, `title`, `board` (`'Arduino'` or `'Raspberry Pi'`)
  - Component placements, breadboard coordinate offsets, and initial pin wire lists.
  - `defaultCode`: standard starter code in C++ (Arduino) or Python (RPi).
  - Sensor input controls (`inputs` array) configured for the side panel.

### 2. Expanding the Component Library
- Components and pin specifications are defined in `DEFS` inside `src/data.js`.
- If introducing an animated output (like a new display or actuator), update the simulation logic in `src/core.js` and renderer hooks in `src/app.js`.

### 3. Improving the 3D Classroom Environment
- Classroom geometry, tables, lighting, colliders, and room switchboards are constructed programmatically in `src/room.js`.
- Unity classroom assets and editor tools are located in `unity/Assets/VLab_Classroom/`.

---

## 📋 Pull Request Guidelines

1. Create a feature branch: `git checkout -b feature/my-new-feature`
2. Keep code clean and self-contained (vanilla JavaScript / Three.js r128 without external runtime dependencies).
3. Format code with Prettier before submitting:
   ```bash
   npm run format
   ```
4. Test thoroughly across desktop browsers and, if applicable, in WebXR / mobile browsers.
5. Push your branch and open a Pull Request with a clear description of the changes made.

---

## 📜 Code of Conduct

Please be respectful, collaborative, and constructive when opening issues, submitting pull requests, and participating in discussions.
