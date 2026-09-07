import { InputState } from '../types';

export class InputManager {
  private state: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    reset: false,
  };

  private keysDown: Record<string, boolean> = {};
  public isTouchDevice = false;

  // Mobile virtual inputs
  private mobileSteer = 0;
  private mobileThrottle = 0;
  private mobileBrake = 0;
  private mobileHandbrake = false;
  private mobileReset = false;

  constructor() {
    this.detectTouch();
    this.setupKeyboardListeners();
  }

  private detectTouch() {
    this.isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
  }

  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser default scroll for game controls
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      this.keysDown[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown[e.code] = false;
    });

    // Reset keys on window blur
    window.addEventListener('blur', () => {
      this.keysDown = {};
    });
  }

  public setMobileSteer(val: number) {
    this.mobileSteer = Math.max(-1, Math.min(1, val));
  }

  public setMobileThrottle(val: number) {
    this.mobileThrottle = Math.max(0, Math.min(1, val));
  }

  public setMobileBrake(val: number) {
    this.mobileBrake = Math.max(0, Math.min(1, val));
  }

  public setMobileHandbrake(val: boolean) {
    this.mobileHandbrake = val;
  }

  public triggerReset() {
    this.mobileReset = true;
  }

  public getInput(): InputState {
    // Keyboard inputs
    const keyThrottle = (this.keysDown['KeyW'] || this.keysDown['ArrowUp']) ? 1 : 0;
    const keyBrake = (this.keysDown['KeyS'] || this.keysDown['ArrowDown']) ? 1 : 0;
    const keySteerLeft = (this.keysDown['KeyA'] || this.keysDown['ArrowLeft']) ? 1 : 0;
    const keySteerRight = (this.keysDown['KeyD'] || this.keysDown['ArrowRight']) ? 1 : 0;
    const keyHandbrake = !!this.keysDown['Space'];
    const keyReset = !!this.keysDown['KeyR'];

    const keySteer = keySteerRight - keySteerLeft;

    // Combine keyboard and mobile touch
    this.state.throttle = Math.max(keyThrottle, this.mobileThrottle);
    this.state.brake = Math.max(keyBrake, this.mobileBrake);
    this.state.steer = Math.abs(this.mobileSteer) > 0.05 ? this.mobileSteer : keySteer;
    this.state.handbrake = keyHandbrake || this.mobileHandbrake;
    this.state.reset = keyReset || this.mobileReset;

    // Clear one-frame reset triggers
    if (this.mobileReset) {
      this.mobileReset = false;
    }

    return this.state;
  }
}
