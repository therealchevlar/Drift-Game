import React, { useRef, useState, useEffect, useCallback } from 'react';
import { InputManager } from '../game/input';
import { Smartphone, RotateCw, ArrowLeft, ArrowRight, Disc, Sliders } from 'lucide-react';

interface TouchControlsProps {
  inputManager: InputManager;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ inputManager }) => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false);

  // Steering Mode: 'arrows' (default as requested) or 'joystick'
  const [steerMode, setSteerMode] = useState<'arrows' | 'joystick'>('arrows');

  // Arrow steering states
  const [leftSteerActive, setLeftSteerActive] = useState(false);
  const [rightSteerActive, setRightSteerActive] = useState(false);
  const leftActiveRef = useRef(false);
  const rightActiveRef = useRef(false);
  const leftPointerId = useRef<number | null>(null);
  const rightPointerId = useRef<number | null>(null);

  // Joystick state
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickPointerId = useRef<number | null>(null);

  // Pedal button active states
  const [throttleActive, setThrottleActive] = useState(false);
  const [brakeActive, setBrakeActive] = useState(false);
  const [handbrakeActive, setHandbrakeActive] = useState(false);

  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Sync arrow steering into InputManager
  const updateArrowSteer = useCallback((left: boolean, right: boolean) => {
    if (left && !right) {
      inputManager.setMobileSteer(-1.0);
    } else if (right && !left) {
      inputManager.setMobileSteer(1.0);
    } else {
      inputManager.setMobileSteer(0.0);
    }
  }, [inputManager]);

  // Arrow Left handlers
  const handleLeftDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    leftPointerId.current = e.pointerId;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    leftActiveRef.current = true;
    setLeftSteerActive(true);
    updateArrowSteer(true, rightActiveRef.current);
    if (navigator.vibrate) navigator.vibrate(15);
  }, [updateArrowSteer]);

  const handleLeftUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (leftPointerId.current === e.pointerId) {
      leftPointerId.current = null;
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    leftActiveRef.current = false;
    setLeftSteerActive(false);
    updateArrowSteer(false, rightActiveRef.current);
  }, [updateArrowSteer]);

  // Arrow Right handlers
  const handleRightDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    rightPointerId.current = e.pointerId;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    rightActiveRef.current = true;
    setRightSteerActive(true);
    updateArrowSteer(leftActiveRef.current, true);
    if (navigator.vibrate) navigator.vibrate(15);
  }, [updateArrowSteer]);

  const handleRightUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (rightPointerId.current === e.pointerId) {
      rightPointerId.current = null;
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    rightActiveRef.current = false;
    setRightSteerActive(false);
    updateArrowSteer(leftActiveRef.current, false);
  }, [updateArrowSteer]);

  // Joystick handlers
  const handleJoystickStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    joystickPointerId.current = e.pointerId;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    setJoystickActive(true);

    if (joystickBaseRef.current) {
      const rect = joystickBaseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dx = e.clientX - centerX;
      const maxRadius = rect.width / 2;
      const clampedX = Math.max(-maxRadius, Math.min(maxRadius, dx));
      const steerVal = clampedX / maxRadius;

      setJoystickPos({ x: clampedX, y: 0 });
      inputManager.setMobileSteer(steerVal);
    }
  }, [inputManager]);

  const handleJoystickMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current !== e.pointerId || !joystickBaseRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const dx = e.clientX - centerX;
    const maxRadius = rect.width / 2;
    const clampedX = Math.max(-maxRadius, Math.min(maxRadius, dx));
    const steerVal = clampedX / maxRadius;

    setJoystickPos({ x: clampedX, y: 0 });
    inputManager.setMobileSteer(steerVal);
  }, [inputManager]);

  const handleJoystickEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }

    joystickPointerId.current = null;
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    inputManager.setMobileSteer(0);
  }, [inputManager]);

  // Button Handlers with Pointer Capture
  const handleThrottleDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setThrottleActive(true);
    inputManager.setMobileThrottle(1.0);
  }, [inputManager]);

  const handleThrottleUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setThrottleActive(false);
    inputManager.setMobileThrottle(0);
  }, [inputManager]);

  const handleBrakeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBrakeActive(true);
    inputManager.setMobileBrake(1.0);
  }, [inputManager]);

  const handleBrakeUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBrakeActive(false);
    inputManager.setMobileBrake(0);
  }, [inputManager]);

  const handleHandbrakeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHandbrakeActive(true);
    inputManager.setMobileHandbrake(true);
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [inputManager]);

  const handleHandbrakeUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHandbrakeActive(false);
    inputManager.setMobileHandbrake(false);
  }, [inputManager]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 sm:p-6 touch-none font-sans">
      {/* Subtle Portrait Orientation Notice */}
      {isPortrait && !dismissRotatePrompt && (
        <div className="pointer-events-auto self-center mt-12 bg-[#0a0a0a]/90 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded shadow-2xl flex items-center gap-3">
          <RotateCw className="w-4 h-4 text-[#f27d26] shrink-0" />
          <span className="text-[11px] uppercase tracking-wider text-neutral-200 font-bold">
            Rotate device to landscape for optimal drift controls
          </span>
          <button
            onClick={() => setDismissRotatePrompt(true)}
            className="text-[10px] bg-white/10 text-neutral-400 hover:text-white px-2 py-0.5 rounded ml-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1" />

      {/* BOTTOM TOUCH CONTROLS BAR */}
      <div className="flex items-end justify-between w-full pointer-events-none pb-2 sm:pb-4">
        {/* LEFT SIDE: STEERING CONTROL (ARROWS BY DEFAULT) */}
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          {/* Steering Mode Toggle Pill */}
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-white/15 p-0.5 rounded text-[10px] font-bold">
            <button
              id="btn-steer-mode-arrows"
              onClick={() => {
                setSteerMode('arrows');
                inputManager.setMobileSteer(0);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded uppercase tracking-wider transition-colors ${
                steerMode === 'arrows'
                  ? 'bg-[#f27d26] text-black font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>◀ ▶ ARROWS</span>
            </button>
            <button
              id="btn-steer-mode-stick"
              onClick={() => {
                setSteerMode('joystick');
                inputManager.setMobileSteer(0);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded uppercase tracking-wider transition-colors ${
                steerMode === 'joystick'
                  ? 'bg-[#f27d26] text-black font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>STICK</span>
            </button>
          </div>

          {steerMode === 'arrows' ? (
            /* DUAL ARROW BUTTONS (LEFT & RIGHT) */
            <div className="flex items-center gap-3">
              {/* STEER LEFT BUTTON */}
              <button
                id="btn-mobile-steer-left"
                onPointerDown={handleLeftDown}
                onPointerUp={handleLeftUp}
                onPointerCancel={handleLeftUp}
                className={`w-20 h-24 sm:w-24 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none shadow-xl ${
                  leftSteerActive
                    ? 'bg-[#f27d26] border-[#f27d26] text-black scale-95 shadow-[0_0_35px_rgba(242,125,38,0.6)]'
                    : 'bg-[#111111]/80 backdrop-blur-md border-white/30 text-white hover:border-white/50 active:scale-95'
                }`}
                style={{
                  touchAction: 'none',
                  fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif",
                }}
              >
                <ArrowLeft className={`w-8 h-8 sm:w-10 sm:h-10 transition-transform ${leftSteerActive ? '-translate-x-1' : ''}`} />
                <span className="text-[11px] sm:text-xs tracking-wider uppercase font-black">
                  LEFT
                </span>
              </button>

              {/* STEER RIGHT BUTTON */}
              <button
                id="btn-mobile-steer-right"
                onPointerDown={handleRightDown}
                onPointerUp={handleRightUp}
                onPointerCancel={handleRightUp}
                className={`w-20 h-24 sm:w-24 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none shadow-xl ${
                  rightSteerActive
                    ? 'bg-[#f27d26] border-[#f27d26] text-black scale-95 shadow-[0_0_35px_rgba(242,125,38,0.6)]'
                    : 'bg-[#111111]/80 backdrop-blur-md border-white/30 text-white hover:border-white/50 active:scale-95'
                }`}
                style={{
                  touchAction: 'none',
                  fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif",
                }}
              >
                <ArrowRight className={`w-8 h-8 sm:w-10 sm:h-10 transition-transform ${rightSteerActive ? 'translate-x-1' : ''}`} />
                <span className="text-[11px] sm:text-xs tracking-wider uppercase font-black">
                  RIGHT
                </span>
              </button>
            </div>
          ) : (
            /* ANALOG JOYSTICK SLIDER */
            <div
              id="mobile-steer-joystick"
              ref={joystickBaseRef}
              onPointerDown={handleJoystickStart}
              onPointerMove={handleJoystickMove}
              onPointerUp={handleJoystickEnd}
              onPointerCancel={handleJoystickEnd}
              className={`relative w-36 h-24 rounded-2xl border-2 transition-colors flex items-center justify-center backdrop-blur-md shadow-2xl ${
                joystickActive
                  ? 'border-white/40 bg-white/15 shadow-[0_0_25px_rgba(255,255,255,0.15)]'
                  : 'border-white/20 bg-black/60'
              }`}
              style={{ touchAction: 'none' }}
            >
              {/* Steer knob */}
              <div
                className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center transition-transform shadow-lg ${
                  joystickActive
                    ? 'bg-[#f27d26] border-transparent text-black scale-105 shadow-[0_0_20px_rgba(242,125,38,0.5)]'
                    : 'bg-white/20 border-white/40 text-white'
                }`}
                style={{
                  transform: `translate3d(${joystickPos.x}px, 0, 0)`,
                  transition: joystickActive ? 'none' : 'transform 0.15s ease-out',
                  fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif",
                }}
              >
                <span className="font-black italic text-[10px] tracking-wider uppercase">STEER</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: PEDALS (HBK, BRAKE, GAS) */}
        <div className="pointer-events-auto flex gap-3 sm:gap-5 items-end">
          {/* Column: HBK + BRAKE */}
          <div className="flex flex-col gap-2.5 sm:gap-3 items-center">
            {/* HANDBRAKE BUTTON */}
            <button
              id="btn-mobile-handbrake"
              onPointerDown={handleHandbrakeDown}
              onPointerUp={handleHandbrakeUp}
              onPointerCancel={handleHandbrakeUp}
              className={`w-16 h-12 sm:w-20 sm:h-14 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                handbrakeActive
                  ? 'bg-[#f27d26] border-[#f27d26] text-black opacity-100 scale-95 shadow-[0_0_30px_rgba(242,125,38,0.5)]'
                  : 'bg-[#111111]/80 backdrop-blur-md border-white/30 text-white opacity-80 hover:opacity-100 active:scale-95'
              }`}
              style={{
                touchAction: 'none',
                fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif",
              }}
            >
              <span className="font-black italic text-xs sm:text-sm uppercase tracking-wider">HBK</span>
            </button>

            {/* BRAKE / REVERSE BUTTON */}
            <button
              id="btn-mobile-brake"
              onPointerDown={handleBrakeDown}
              onPointerUp={handleBrakeUp}
              onPointerCancel={handleBrakeUp}
              className={`w-16 h-22 sm:w-20 sm:h-26 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                brakeActive
                  ? 'bg-white text-black border-white scale-95 shadow-[0_0_25px_rgba(255,255,255,0.4)]'
                  : 'bg-[#111111]/80 backdrop-blur-md border-white/30 text-white active:scale-95'
              }`}
              style={{
                touchAction: 'none',
                fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif",
              }}
            >
              <span className="font-black italic text-sm sm:text-base uppercase tracking-wider">BRAKE</span>
            </button>
          </div>

          {/* GAS / ACCELERATOR BUTTON */}
          <button
            id="btn-mobile-throttle"
            onPointerDown={handleThrottleDown}
            onPointerUp={handleThrottleUp}
            onPointerCancel={handleThrottleUp}
            className={`w-20 h-36 sm:w-24 sm:h-42 bg-[#f27d26] border-2 border-[#f27d26] rounded-xl flex items-center justify-center text-black shadow-[0_0_30px_rgba(242,125,38,0.4)] transition-all cursor-pointer ${
              throttleActive
                ? 'bg-[#ffa45b] border-white scale-95 shadow-[0_0_45px_rgba(242,125,38,0.8)]'
                : 'hover:bg-[#ff8f3e] active:scale-95'
            }`}
            style={{
              touchAction: 'none',
              fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif",
            }}
          >
            <span className="font-black italic text-xl sm:text-2xl uppercase tracking-wider">GAS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

