# 🌐 IoT Based VR Lab (V-Lab 3D)

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=three.js)](https://threejs.org/)
[![WebXR](https://img.shields.io/badge/WebXR-Ready-blueviolet?logo=webxr)](https://immersiveweb.dev/)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20VR%20%7C%20Mobile-blue)](#controls--navigation)
[![GitHub Pages](https://img.shields.io/badge/Demo-Live%20on%20GitHub%20Pages-brightgreen)](https://sayanhalder607.github.io/IOT-VR-LAB/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**A 3D WebXR Virtual Electronics & IoT Classroom with Real-Time Circuit Simulation, Dual Arduino (C++) & Raspberry Pi (Python) Interpreters, and 14 Guided Hands-On Experiments.**

[Explore Live Demo](https://sayanhalder607.github.io/IOT-VR-LAB/) • [Quick Start](#-quick-start) • [Guided Experiments](#-guided-experiments-curriculum) • [Unity Package](#-unity-3d-classroom-integration) • [Documentation](#-architecture--technical-deep-dive)

</div>

---

## 📖 Overview

**IoT Based VR Lab** is an interactive, browser-native 3D virtual reality laboratory designed for electronics, embedded systems, and Internet of Things (IoT) education. Users can physically navigate a 26 × 25 metre virtual classroom, approach 14 dedicated experiment tables, wire complex breadboard circuits in full 3D, write and compile microcontroller firmware, and watch the physical simulation respond in real time.

Built on **pure HTML5, CSS3, vanilla JavaScript, and Three.js (r128)**, the entire project runs offline with **zero external build steps or server dependencies**. It is optimized for standard desktop browsers, mobile touch devices, and **WebXR headsets** such as the Meta Quest 2 / 3 / Pro.

---

## ✨ Key Highlights

- 🥽 **WebXR & Virtual Reality Native**: Walk inside the classroom using VR 6DOF headsets (Meta Quest, HTC Vive) or desktop WASD controls. Examine microcontrollers and components up close.
- ⚡ **Real-Time Circuit Solver Engine**: Custom nodal breadboard net graph simulation calculating pin voltages, current flow, logic levels (HIGH/LOW), analog sensor reads, and PWM signals.
- 💻 **Dual Embedded Interpreters**:
  - **Arduino C++**: Supports `pinMode`, `digitalWrite`, `digitalRead`, `analogRead`, `analogWrite`, `Serial.print`/`println`, `delay`, `millis`, variables, loops, and conditional structures.
  - **Raspberry Pi Python**: Supports `RPi.GPIO` (`setmode`, `setup`, `output`, `input`, `cleanup`), `time.sleep`, print output, functions, and control flow.
- 🔌 **60+ Electronic Component Models**: Arduino Uno, Raspberry Pi 4, breadboards, LEDs, RGB LEDs, 7-segment displays, DHT11 (temp & humidity), DS18B20 (1-Wire temp), HC-SR04 ultrasonic distance sensor, PIR motion detector, LDR photoresistor, potentiometers, push buttons, buzzers, relays, DC motors, water flow sensors, pulse oximeter sensors, and more.
- 🛠️ **3D Workbench & Wiring Tool**: Inspect table circuits with smooth 3D orbit controls, place and rotate components, and draw wires in multiple standardized color codes (red, black, blue, green, yellow, orange, purple, white).
- 🎛️ **Interactive Sensor HUD & Serial Monitor**: Real-time slider and toggle controls for environmental variables (temperature, distance, motion, water flow, pulse) with live streaming serial terminal output.
- 🏢 **Dynamic Classroom Environment**: Interactive wall switchboard controlling 12 overhead ceiling lights and 6 air conditioning units, teacher demonstration podium, whiteboards, and educational IoT posters.
- 🎮 **Unity 3D Integration**: Includes Unity Editor scripts (`VLabClassroomSetup.cs`) and player locomotion controller (`Walker.cs`) supporting Built-in, URP, and HDRP pipelines.
- 🔒 **Zero-Config Client-Side Persistence**: Built-in user authentication with PBKDF2 salted password hashing and project saving/loading using browser `localStorage`.

---

## 🔬 Guided Experiments Curriculum

The laboratory includes 14 pre-assembled, fully functional experiment tables equipped with verified circuits and ready-to-run firmware:

| Table | Experiment Title | Platform | Key Sensors & Actuators | Learning Objectives |
| :---: | :--- | :---: | :--- | :--- |
| **01** | **LED & DHT11 Sensor Interfacing** | Arduino Uno | DHT11 Sensor, LED, Resistor | Digital humidity/temperature acquisition, threshold-triggered alerts. |
| **02** | **Ultrasonic & PIR Sensor Interfacing** | Arduino Uno | HC-SR04 Ultrasonic, PIR Motion | Dual-sensor obstacle detection and proximity distance calculation. |
| **03** | **Traffic Light Simulator** | Arduino Uno | Red/Yellow/Green LEDs, 220Ω Resistors | Timed state-machine sequencing for municipal traffic management. |
| **04** | **Water Flow Detection** | Arduino Uno | Water Flow Sensor, Indicator LED | Pulse counting and liquid volume calculation in fluid pipelines. |
| **05** | **LED & Push Button Control** | Raspberry Pi 4 | Tactile Button, LED, 330Ω Resistor | GPIO input pull-up/pull-down edge detection and digital output. |
| **06** | **Motion Sensor Alarm using PIR** | Raspberry Pi 4 | PIR Motion Sensor, Active Buzzer | Intruder security alert systems with continuous polling in Python. |
| **07** | **DHT11 with Raspberry Pi** | Raspberry Pi 4 | DHT11 Sensor, 10kΩ Pull-up Resistor | Python-based environmental telemetry and data logging. |
| **08** | **DS18B20 Temperature Sensor** | Raspberry Pi 4 | DS18B20 1-Wire Probe, 4.7kΩ Resistor | High-precision digital temperature measurement via 1-Wire protocol. |
| **09** | **DC & Stepper Motor Control** | Raspberry Pi 4 | DC Motor, Driver / H-Bridge | PWM speed modulation and directional motor control. |
| **10** | **Home Automation Controller** | Raspberry Pi 4 | 5V Relay Module, AC Lamp, Switch | High-voltage load switching and smart appliance automation. |
| **11** | **Smart Traffic Light Controller** | Arduino Uno | Multi-lane LEDs, Traffic Sensors | Adaptive traffic signal timing based on real-time lane congestion. |
| **12** | **Smart Health Monitoring System** | Arduino Uno | Pulse Oximeter, Temp Sensor, Buzzer | Vital signs monitoring (heart rate, temperature) with critical alarms. |
| **13** | **Custom Arduino Sandbox** | Arduino Uno | Blank Full-size Breadboard | Freeform breadboard prototyping bench with Arduino Uno. |
| **14** | **Custom Raspberry Pi Sandbox** | Raspberry Pi 4 | Blank Full-size Breadboard | Freeform breadboard prototyping bench with Raspberry Pi 4. |

---

## 🎮 Controls & Navigation

### 🖥️ Desktop (Keyboard & Mouse)
- `W`, `A`, `S`, `D` or `Arrow Keys` — Walk forward, left, backward, right
- `Shift` (Hold) — Sprint / run through the room
- `Left Click + Drag` — Look around / rotate camera angle
- `Left Click` — Interact with buttons, wall switches, and tables
- `Esc` — Release mouse cursor focus

### 📱 Mobile & Tablet (Touch)
- **Virtual On-Screen Joystick (Bottom-Left)** — 360° walking locomotion
- **Touch & Drag** — Rotate camera perspective
- **Tap** — Press HUD buttons, trigger experiment runs, or open workbench

### 🥽 WebXR Headset (Meta Quest 2 / 3 / Pro)
- Click **"Enter VR"** in headset browser (e.g., Meta Quest Browser)
- **Left Thumbstick** — Smooth walking locomotion
- **Right Thumbstick** — Snap / smooth turning
- **Controller Trigger / Index Point** — Press interactive 3D buttons and switches

---

## 🚀 Quick Start

### Option 1: Python Static Server (Recommended)

No compilation or package installation is required:

```bash
# Clone the repository
git clone https://github.com/SayanHalder607/IOT-VR-LAB.git
cd IOT-VR-LAB

# Launch Python built-in HTTP server
python -m http.server 8000
```
Open your browser and navigate to **[http://localhost:8000](http://localhost:8000)**.

> **Direct Classroom Access:** Append `#classroom` to skip the login screen:
> [http://localhost:8000/#classroom](http://localhost:8000/#classroom)

---

### Option 2: Node.js

```bash
# Using npx serve
npx serve . -l 8000

# Or via npm scripts
npm start
```

---

## 🏗️ Architecture & Technical Deep-Dive

```
               ┌────────────────────────────────────────────────────────┐
               │                     index.html                         │
               │         (Shell, Auth, Dashboard, 3D Canvas)            │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌────────────────────────┐                     ┌───────────────────────────┐
     │      src/room.js       │                     │        src/app.js         │
     │  Walkable 3D Classroom │◄───────────────────►│   3D Circuit Workbench    │
     │  14 Tables, VR, Lights │   Table Attachment  │   Orbit, Wire, Edit Tools │
     └────────────┬───────────┘                     └─────────────┬─────────────┘
                  │                                               │
                  │             ┌───────────────────┐             │
                  └────────────►│    src/core.js    │◄────────────┘
                                │  Netlist Solver   │
                                │  Breadboard Nets  │
                                └─────────┬─────────┘
                                          │
                                          ▼
                                ┌───────────────────┐
                                │ src/interpreter.js│
                                │ Arduino C++ &     │
                                │ Python Evaluator  │
                                └─────────┬─────────┘
                                          │
                                          ▼
                                ┌───────────────────┐
                                │    src/data.js    │
                                │ 64 Component Defs │
                                │ 14 Experiment DB  │
                                └───────────────────┘
```

1. **`src/data.js`**:
   - `DEFS`: Defines physical geometry, 3D meshes, terminal offsets, and pin mappings for 60+ components.
   - `EXPS`: Full database of all 14 experiments including component placement coordinates, wire netlists, starter code, and active sensor bindings.
2. **`src/interpreter.js` (`CircuitInterpreter`)**:
   - Parses and executes C++ Arduino sketches and Python RPi scripts step-by-step.
   - Handles simulated time loops, delays, variable registers, mathematical evaluations, and serial output buffers.
3. **`src/core.js` (`makeSim`)**:
   - Constructs a graph of electrical nets from breadboard tie-points and jumper wires.
   - Simulates component behavior (LED forward voltage, resistor drops, buzzer frequency states, sensor data feeds).
4. **`src/app.js`**:
   - The interactive workbench: manages raycasting, 3D part movement, wire drawing algorithms, color palettes, and rotation.
5. **`src/room.js`**:
   - Builds the 26 × 25 m classroom procedural architecture, ceilings, lighting fixtures, furniture, table layouts, wall switchboard, and WebXR VR session controller.
6. **`src/site.js`**:
   - View switcher (`auth`, `dash`, `room`, `bench`), PBKDF2 local account manager, and project save/load subsystem.

---

## 📦 Unity 3D Classroom Integration

The repository includes ready-to-use Unity classroom tools located in `unity/Assets/VLab_Classroom`:

- **`VLabClassroomSetup.cs`**: Custom Unity Editor menu script (`VLab > Add Classroom To Scene`) that automatically builds the entire classroom geometry, assigns colliders, generates materials, and arranges lighting.
- **`Walker.cs`**: Complete first-person controller script (WASD, mouse look, run modifier, cursor locking).
- **Pipeline Support**: Fully compatible with Unity's **Built-in Render Pipeline**, **Universal Render Pipeline (URP)**, and **High Definition Render Pipeline (HDRP)**.

---

## 📁 Repository Structure

```
IOT-VR-LAB/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automated GitHub Pages CI/CD workflow
├── src/
│   ├── app.js                    # 3D circuit workbench editor & wiring tools
│   ├── core.js                   # Breadboard netlist solver & physics simulation
│   ├── data.js                   # 60+ component specifications & 14 experiments
│   ├── interpreter.js            # Line-by-line Arduino C++ and Python interpreter
│   ├── room.js                   # 3D walkable classroom, lighting, and WebXR controller
│   └── site.js                   # State manager, local authentication, and projects
├── unity/
│   ├── Assets/
│   │   └── VLab_Classroom/
│   │       ├── Editor/
│   │       │   └── VLabClassroomSetup.cs  # Unity classroom setup editor automation
│   │       └── Scripts/
│   │           └── Walker.cs              # Unity first-person walking script
│   └── README.txt                # Unity import instructions & pipeline setup guide
├── vendor/
│   └── three.min.js              # Three.js r128 (bundled offline)
├── .gitignore                    # Git ignore file for Web, Node, OS, and Unity
├── .prettierrc                   # Prettier code formatting rules
├── CONTRIBUTING.md               # Guidelines for contributing to the project
├── index.html                    # Main entry point & WebXR application shell
├── LICENSE                       # MIT Open-Source License
├── package.json                  # Project manifest, scripts, and metadata
├── README.md                     # Comprehensive documentation
└── styles.css                    # Responsive HUD, workbench, and UI styling
```

---

## 🌐 Live Demo & GitHub Pages

The project is hosted and running live via GitHub Pages at:
👉 **[https://sayanhalder607.github.io/IOT-VR-LAB/](https://sayanhalder607.github.io/IOT-VR-LAB/)**

### Deploying to Your Own Fork:
1. Go to your repository **Settings** on GitHub.
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment > Source**, choose **Deploy from a branch**.
4. Set the branch to **`main`** and the folder to **`/ (root)`**, then click **Save**.
5. Your live WebXR lab will be automatically published within 1–2 minutes!

---

## 🤝 Contributing

Contributions are warmly welcomed! Whether you want to add new IoT experiments, design additional sensor models, or enhance the WebXR interactions:

1. Fork the repository.
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: Add new sensor experiment'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author & Maintainer

**Sayan Halder**  
- GitHub: [@SayanHalder607](https://github.com/SayanHalder607)
- Repository: [https://github.com/SayanHalder607/IOT-VR-LAB](https://github.com/SayanHalder607/IOT-VR-LAB)
