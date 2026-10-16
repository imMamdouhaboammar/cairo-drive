import React from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { Engine } from './core/Engine';
import { PhysicsWorld } from './core/PhysicsWorld';
import { InputManager } from './core/InputManager';
import { CairoWorldBuilder } from './world/CairoWorldBuilder';
import { CairoTraffic } from './world/CairoTraffic';
import { RaycastVehicle } from './vehicle/RaycastVehicle';
import { SoundSynthesizer } from './audio/SoundSynthesizer';
import { TuningGUI } from './ui/TuningGUI';
import { HUD } from './ui/HUD';
import { useGameStore } from './state/gameStore';

async function bootstrap() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui-root') as HTMLElement;

  if (!canvas || !uiRoot) {
    throw new Error('Canvas or UI root element not found');
  }

  // 1. Initialize Rapier3D WASM Physics
  const physics = new PhysicsWorld();
  await physics.init();

  // 2. Initialize Three.js Engine & Post-processing
  const engine = new Engine(canvas);

  // 3. Initialize Input Manager
  const input = new InputManager();

  // 4. Initialize Procedural Audio Synthesizer
  const audio = new SoundSynthesizer();

  // Resume Web Audio on first user interaction
  const resumeAudio = () => {
    audio.init();
    audio.resumeIfSuspended();
    window.removeEventListener('click', resumeAudio);
    window.removeEventListener('keydown', resumeAudio);
  };
  window.addEventListener('click', resumeAudio);
  window.addEventListener('keydown', resumeAudio);

  // 5. Build Master Cairo Open-World (Corniche, Bridges, Midans, Haras, Bumps)
  const worldBuilder = new CairoWorldBuilder(engine.scene, physics);
  await worldBuilder.build();

  // 6. Build Player Vehicle (Raycast Suspension Sedan)
  // Spawns on Midan Tahrir / Downtown avenue
  const vehicle = new RaycastVehicle(physics, [0, 1.2, 0]);
  engine.scene.add(vehicle.visualGroup);

  // 7. Initialize Dynamic Cairo Traffic (Microbuses, Taxis, Tuk-tuks)
  const traffic = new CairoTraffic(engine.scene, audio);
  traffic.init(24);

  const tuningGUI = new TuningGUI(vehicle, engine);

  // 9. Mount React HUD
  const handleCameraCycle = () => {
    const newMode = engine.cycleCameraMode();
    useGameStore.getState().setCameraMode(newMode);
  };

  const handleHorn = () => {
    audio.playCairoHornPattern();
  };

  const handleRecover = () => {
    vehicle.recover();
  };

  const handleTeleport = (landmark: any) => {
    vehicle.teleport(
      landmark.position[0],
      landmark.position[1],
      landmark.position[2],
      landmark.rotationY
    );
  };

  const handleHeadlights = () => {
    vehicle.toggleHeadlights();
  };

  const handlePresetSelect = (preset: 'drift' | 'suv' | 'microbus') => {
    vehicle.applyPreset(preset);
    useGameStore.getState().setActivePreset(preset);
  };

  const handleToggleTuning = () => {
    tuningGUI.toggleOpen();
  };

  const handleToggleMute = () => {
    useGameStore.getState().toggleMute();
  };

  const handleStartAudio = () => {
    resumeAudio();
    useGameStore.getState().setAudioStarted(true);
  };

  const reactRoot = ReactDOM.createRoot(uiRoot);
  reactRoot.render(
    <React.StrictMode>
      <HUD
        inputManager={input}
        onCameraClick={handleCameraCycle}
        onHornClick={handleHorn}
        onRecoverClick={handleRecover}
        onTeleportClick={handleTeleport}
        onHeadlightsClick={handleHeadlights}
        onPresetSelect={handlePresetSelect}
        onTuningClick={handleToggleTuning}
        onMuteClick={handleToggleMute}
        onStartAudioClick={handleStartAudio}
      />
    </React.StrictMode>
  );

  // 10. Master 60 FPS Game Loop
  let lastTime = performance.now();
  let lastUiUpdate = 0;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const deltaTime = Math.min((now - lastTime) / 1000, 0.05); // Clamp dt to prevent spiral
    lastTime = now;

    // 1. Process User Inputs
    const inputState = input.update(deltaTime);

    if (inputState.cameraToggle) {
      handleCameraCycle();
    }

    // 2. Step Physics Simulation
    physics.step(deltaTime);

    // 3. Update Vehicle Physics & Dynamics
    const telemetry = vehicle.update(inputState, deltaTime);

    // 4. Update Sound Synthesizer
    audio.update(telemetry, inputState.horn);

    // 5. Update Dynamic AI Traffic
    const playerPos = vehicle.visualGroup.position;
    traffic.update(deltaTime, playerPos, telemetry.speedKmh);

    // 6. Update Camera Follow & Atmosphere
    engine.updateCamera(vehicle.visualGroup, telemetry.speedKmh, telemetry.isBraking, deltaTime);

    // 7. Render Three.js Scene via Postprocessing Composer
    engine.render();

    // 8. Update UI Store (throttled to ~15 FPS to eliminate React reconciliation churn)
    if (now - lastUiUpdate > 66) {
      lastUiUpdate = now;
      useGameStore.getState().setTelemetry(telemetry);
      useGameStore.getState().setTrafficList(traffic.getTrafficData());
    }
  }

  animate();
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error in Cairo Drive:', err);
});
