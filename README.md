# Cairo Drive (تجربة قيادة واقعية في شوارع وقرى وكباري القاهرة)
### Production-Grade 3D Open-World Driving Simulator for Modern Web Browsers

**Cairo Drive** is a high-performance, client-side 3D driving simulator set exclusively in the real streets, alleys, roundabouts, and elevated flyover bridges of Cairo, Egypt.

---

## 1. Technical Stack

- **Language & Bundler:** TypeScript (Strict Mode) + Vite 6
- **3D Graphics:** Three.js r186 (WebGL2Renderer) + `EffectComposer` (UnrealBloomPass, OutputPass) + PCFSoftShadowMap
- **Physics Engine:** `@dimforge/rapier3d-compat` (Rust-compiled WebAssembly) utilizing `DynamicRayCastVehicleController`
- **UI & Telemetry:** React 19 + Zustand + Tailwind CSS + `lil-gui`
- **Audio:** Native Web Audio API procedural synthesis (100% synthesized, 0 external audio files)
- **Geographic Pipeline:** OpenStreetMap (OSM) WGS84 geographic coordinate projection into metric local coordinates centered at Midan Tahrir
- **Testing:** Vitest

---

## 2. Core Features & Geographic Scope

### A. Real Cairo Locations
1. **Midan Tahrir (ميدان التحرير):** Circular 3-lane roundabout with central obelisk monument, stone fountains, and radiating avenues.
2. **The Nile Corniche (كورنيش النيل):** Wide multi-lane riverfront avenue along the reflective Nile River with date palm trees, cast-iron railings, and traditional wooden Felucca boats with lateen sails.
3. **6th of October Flyover Bridge (كباري القاهرة - كوبري 6 أكتوبر):** Multi-level elevated highway rising to $Y=14\text{m}$, snaking meters away from residential apartment balconies, equipped with concrete jersey barriers and metallic expansion joints that produce physical bumps and audio thuds every 35 meters.
4. **Qasr El Nil Bridge (كوبري قصر النيل):** Historical bridge crossing the Nile towards Gezira Island / Zamalek.
5. **Downtown (وسط البلد):** Talaat Harb street and roundabout with Haussmannian-Arabesque facades and ground-floor cafes.
6. **Narrow Alleys (الحواري والشوارع الضيقة - خان الخليلي والدرب الأحمر):** Claustrophobic 6m–8m streets with unplastered red-brick towers (`طوب أحمر`), wooden Mashrabiya balconies, and parked microbuses.
7. **Egyptian Speed Bumps (`مطبات صناعية وعشوائية`):** Realistic physical speed bump colliders that compress vehicle suspension and launch the chassis if hit at speed.

### B. True Vehicle Physics Simulation
- **Raycast Suspension:** 4 independent wheels casting physics rays with spring-damper dynamics ($F = -k \cdot x - c \cdot v$).
- **Drivetrain & Transmission:** Simulated torque curve (900 – 7,200 RPM) paired with a 6-speed automated transmission and reverse.
- **Tire Traction:** Pacejka-lite friction model calculating longitudinal slip and lateral slip angle $\alpha$.
- **Handbrake Drifting (`Spacebar`):** Locks rear wheels, cuts rear lateral grip by 75%, allowing authentic drifting around Cairo roundabouts and bridge hairpins.
- **Vehicle Recovery (`R` key):** Flips overturned vehicle upright safely.

### C. Procedural Web Audio Engine
- **Engine Sound:** Sawtooth + triangle dual oscillators modulated by RPM and engine load with waveshaping rasp distortion.
- **Exhaust Backfires:** Bursts of filtered noise on throttle release at high RPM.
- **Tire Screech:** Bandpass-filtered white noise buffer scaling with lateral slip velocity.
- **Egyptian Horn (Klaxon):** Authentic dual-tone sine oscillators ($440\text{Hz} + 520\text{Hz}$) configured with characteristic Cairo rhythmic motifs (`Ta-Ta... Ta!`).
- **Suspension Thuds:** Low-frequency impact drop ($75\text{Hz} \to 22\text{Hz}$) on speed bumps and bridge joints.

### D. Dynamic AI Traffic Ecosystem
- Autonomous traffic agents following Cairo road network waypoints:
  - **Egyptian White Microbuses (ميكروباص):** Toyota HiAce style, aggressive lane changes, occasional shoulder stops to pick up passengers.
  - **Cairo Taxis (تاكسي العاصمة):** Black-and-white sedans weaving through traffic.
  - **Tuk-Tuks (توكتوك):** Three-wheeled agile vehicles navigating narrow alleys.
  - **Spatial Proximity Horns:** Traffic vehicles honk if blocked or cut off by the player.

---

## 3. Quick Start & Commands

```bash
# Install dependencies
bun install

# Run local development server
bun run dev

# Run automated unit tests (Vitest)
bun run test

# Run full Playwright E2E browser test suite
bun run test:e2e

# Build for production
bun run build
```

---

## 4. Controls Reference

| Control | Key / Action | Description |
| :--- | :--- | :--- |
| **Throttle (بنزين)** | `W` or `↑` | Accelerate forward |
| **Brake / Reverse (فرامل ورجوع)** | `S` or `↓` | Brake and reverse |
| **Steering (توجيه)** | `A` / `D` or `←` / `→` | Speed-sensitive steering |
| **Handbrake (فرامل يد)** | `Spacebar` | Lock rear wheels & drift |
| **Camera View (الكاميرا)** | `C` | Chase, Close, Hood, Interior, Orbit |
| **Egyptian Horn (الكلاكس)** | `H` | Rhythmic Cairo horn |
| **Headlights (الكشافات)** | `L` | Toggle LED spotlights |
| **Recover Vehicle (استعدال)** | `R` | Flip vehicle upright |
| **Gamepad** | Analog Sticks / Triggers | Full gamepad support |
