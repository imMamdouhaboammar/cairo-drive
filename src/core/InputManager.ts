export interface InputState {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steering: number; // -1 to 1 (left to right)
  handbrake: boolean;
  horn: boolean;
  headlightsToggle: boolean;
  cameraToggle: boolean;
  recoverVehicle: boolean;
  mapToggle: boolean;
}

export class InputManager {
  private keys: Record<string, boolean> = {};
  private rawSteering: number = 0;
  private currentSteering: number = 0;
  private currentThrottle: number = 0;
  private currentBrake: number = 0;

  // Single-frame action triggers
  public cameraPressed = false;
  public headlightsPressed = false;
  public recoverPressed = false;
  public mapPressed = false;
  public hornActive = false;

  // Virtual mobile touch controls
  public touchThrottle = 0;
  public touchBrake = 0;
  public touchSteering = 0;
  public touchHandbrake = false;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore keystrokes if typing inside an input
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

    this.keys[e.code] = true;

    if (e.code === 'KeyC') this.cameraPressed = true;
    if (e.code === 'KeyL') this.headlightsPressed = true;
    if (e.code === 'KeyR') this.recoverPressed = true;
    if (e.code === 'KeyM') this.mapPressed = true;
    if (e.code === 'KeyH') this.hornActive = true;
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
    if (e.code === 'KeyH') this.hornActive = false;
  };

  public update(deltaTime: number): InputState {
    let targetThrottle = 0;
    let targetBrake = 0;
    let targetSteering = 0;
    let handbrake = false;

    // 1. Keyboard Input
    if (this.keys['KeyW'] || this.keys['ArrowUp']) targetThrottle = 1.0;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) targetBrake = 1.0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) targetSteering -= 1.0;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) targetSteering += 1.0;
    if (this.keys['Space']) handbrake = true;

    // 2. Gamepad API
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp && gp.connected) {
      // Left stick X axis
      const stickX = gp.axes[0] ?? 0;
      if (Math.abs(stickX) > 0.08) {
        targetSteering = stickX;
      }
      // Right trigger (RT - button 7) or button A for throttle
      const rt = gp.buttons[7]?.value ?? (gp.buttons[0]?.pressed ? 1 : 0);
      if (rt > 0.05) targetThrottle = Math.max(targetThrottle, rt);

      // Left trigger (LT - button 6) for brake
      const lt = gp.buttons[6]?.value ?? 0;
      if (lt > 0.05) targetBrake = Math.max(targetBrake, lt);

      // Handbrake (Button B or X)
      if (gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) handbrake = true;

      // Horn (L1 / Button 4)
      if (gp.buttons[4]?.pressed) this.hornActive = true;

      // Camera toggle (Button Y / Button 3)
      if (gp.buttons[3]?.pressed) this.cameraPressed = true;
    }

    // 3. Touch Overrides
    if (this.touchThrottle > 0) targetThrottle = Math.max(targetThrottle, this.touchThrottle);
    if (this.touchBrake > 0) targetBrake = Math.max(targetBrake, this.touchBrake);
    if (Math.abs(this.touchSteering) > 0.05) targetSteering = this.touchSteering;
    if (this.touchHandbrake) handbrake = true;

    // 4. Smooth Filtering (speed-sensitive steering return)
    const steerSpeed = targetSteering === 0 ? 8.0 : 5.5;
    this.currentSteering += (targetSteering - this.currentSteering) * Math.min(deltaTime * steerSpeed, 1.0);
    this.currentThrottle += (targetThrottle - this.currentThrottle) * Math.min(deltaTime * 10.0, 1.0);
    this.currentBrake += (targetBrake - this.currentBrake) * Math.min(deltaTime * 12.0, 1.0);

    const state: InputState = {
      throttle: this.currentThrottle,
      brake: this.currentBrake,
      steering: this.currentSteering,
      handbrake,
      horn: this.hornActive,
      headlightsToggle: this.headlightsPressed,
      cameraToggle: this.cameraPressed,
      recoverVehicle: this.recoverPressed,
      mapToggle: this.mapPressed,
    };

    // Reset single-frame flags
    this.cameraPressed = false;
    this.headlightsPressed = false;
    this.recoverPressed = false;
    this.mapPressed = false;

    return state;
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
