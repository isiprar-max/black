# APEX / NIGHTSHIFT — PC & Mobile Racing Game

A **complete rebuild** of APEX, designed as a polished, full-window night-racing game for the PISQ Grade 11 General Science Physics Codelab performance task. Inspired by the atmosphere of modern arcade street racers, but with original graphics and an educational physics engine. It does not use copyrighted game art or imply affiliation with Need for Speed or Gran Turismo.

## Run it on PC

1. Extract the ZIP into its own folder.
2. Double-click `index.html` in Chrome, Edge, Firefox or Safari.
3. Click **START ENGINE**.
4. Use **W / Up Arrow** for gas, **S / Down Arrow** to brake, **A/D / Left/Right** to steer, and **Shift / Space** for nitro.
5. Use the icons at the top-right to pause, tune vehicle physics, open the physics lab, and toggle sound.
6. Complete a lap to see the **Race Again** / **Continue Next Lap** menu.

The four game files work locally without installation, a server, paid assets or internet. No framework or API keys are required.

## Run it on mobile

Upload these **four extracted files** to any static website host (for example, GitHub Pages or Netlify) and visit the HTTPS link on your phone. The layout automatically changes for narrow displays. On-screen buttons control steering, accelerator, brake and nitro. For a quick test, hosting through a computer on the same network also works, but using a static host is the easiest way to share the game.

## What's improved over the previous build

- Full-screen arcade racing presentation (rather than a small canvas embedded in a long webpage)
- Behind-the-car perspective, continuous curved highway and city scenery
- Custom supercar rear artwork, traffic vehicles, glowing streetlamps, neon billboards, city skyline and speed effects
- Nitro boost, acceleration/braking, steering, traffic collisions and speed penalties
- **One repeating circuit** with time attack, personal best, lap completion, **Race Again** and **Continue Next Lap**
- Mobile-specific driving controls and compact on-screen dashboard
- Dedicated tune/garage panel and dedicated physics lab that don't obstruct normal driving
- Real motion readouts and speed–time graph, with three independent manual comparisons (12 checks)

## Physics concepts (SI units)

| Concept | Equation | How the game uses it |
|---|---|---|
| Speed/velocity | `v = v0 + a Δt` | Integrated every 1/120 second |
| Displacement | `Δx ≈ ((v0 + v) / 2) Δt` | Distance travelled around the circuit |
| Acceleration | `a = Δv / Δt` | Calculated from the live speed change |
| Angular velocity | `ω = v / r` | Wheel rotation from rolling without slipping |
| Angular displacement | `θ = Δx / r` | Accumulates with total distance travelled |
| Centripetal acceleration | `ac = v² / R` | Tested against the approximate grip limit `μg` |

User-adjustable variables: **engine acceleration (m/s²), braking deceleration (m/s²), wheel radius (m), and tyre grip coefficient (dimensionless)**.

**Model assumptions:** planar road with fixed gravitational acceleration `g = 9.81 m/s²`, simplified assisted steering, roll without slip, simplified aerodynamic drag proportional to speed², and capped frictional grip. The visuals use mathematical perspective but are **not a photo-realistic 3D simulation**, and are not intended to model a full professional racing engine. The experiment calculator separately assumes *constant acceleration, no air resistance, and no reversal of direction during the test*.

## Independent numerical test cases

Expected answers are manually derived and separately specified as constants rather than calculated using the program's function.

| Case | Initial speed v0 | Accel a | Time t | Radius r | Expected v | Expected Δx | Expected ω | Expected θ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0 m/s | 2 m/s² | 5 s | 0.32 m | 10 m/s | 25 m | 31.25 rad/s | 78.125 rad |
| 2 | 4 m/s | 1.5 m/s² | 6 s | 0.28 m | 13 m/s | 51 m | 46.428571 rad/s | 182.142857 rad |
| 3 | 8 m/s | -1.2 m/s² | 4 s | 0.35 m | 3.2 m/s | 22.4 m | 9.142857 rad/s | 64 rad |

The Physics Lab displays the matching manual and program output values side by side. Floating-point comparisons are evaluated to a numerical tolerance of 1e-7 before rounding for display.

### Case 1 calculation in full
`v = 0 + 2(5) = 10 m/s`
`Δx = 0(5) + (1/2)(2)(5²) = 25 m`
`ω = 10 / 0.32 = 31.25 rad/s`
`θ = 25 / 0.32 = 78.125 rad`

## Files
- `index.html`: game shell, overlays, controls and the Physics Lab
- `styles.css`: responsive visual design for desktop and mobile
- `game.js`: animation renderer, driving model, controls, course, UI, experiment calculations and automated tests
- `README.md`: run instructions, rubrics and validation evidence

## Suggested 5–8-minute video outline
- **0:00–0:30**: Introduce project, user and real-life relevance.
- **0:30–1:45**: Explain velocity, acceleration, displacement, and rotational motion with SI units.
- **1:45–4:00**: Demonstrate the car on PC/mobile and change wheel radius, engine acceleration and grip; show lap restart and graph.
- **4:00–5:30**: Show actual `game.js` calculation functions, one full manual test calculation, and three validation cases.
- **5:30–6:30**: Explain model assumptions and constraints, design improvement, credits, and each student's contributions.

The graded project expects students to understand their final code, make their own meaningful contribution and disclose AI assistance.

## Credits
Original offline procedural racing graphics and JavaScript physics simulation; assistance with implementation and debugging by OpenAI ChatGPT. Visual inspiration: arcade racing games. No third-party artwork or purchased models are included. All effects are drawn procedurally by Canvas API and CSS.
