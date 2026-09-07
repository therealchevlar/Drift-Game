/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DriftGameEngine } from './game/gameEngine';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { StartScreen } from './components/StartScreen';
import { CarPhysicsState, DriftScoreState } from './types';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DriftGameEngine | null>(null);

  const [hasStarted, setHasStarted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [lowQuality, setLowQuality] = useState(false);
  const [fps, setFps] = useState(60);

  const [physicsState, setPhysicsState] = useState<CarPhysicsState>({
    speedKmh: 0,
    engineRpm: 900,
    gear: 1,
    driftAngle: 0,
    isDrifting: false,
    isRearSlipping: false,
    lateralG: 0,
    steeringAngle: 0,
    wheelRotSpeed: 0,
    exhaustFlame: false,
    colliding: false,
  });

  const [scoreState, setScoreState] = useState<DriftScoreState>({
    currentPoints: 0,
    combo: 0,
    multiplier: 1.0,
    totalScore: 0,
    bestScore: 0,
    isChainActive: false,
    chainTimerPct: 0,
    driftRatingText: '',
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Instantiate game engine
    const engine = new DriftGameEngine(containerRef.current);
    engineRef.current = engine;

    setIsTouch(engine.inputManager.isTouchDevice);

    engine.onPhysicsUpdate = (state) => {
      setPhysicsState(state);
    };

    engine.onScoreUpdate = (score) => {
      setScoreState(score);
    };

    engine.onFpsUpdate = (currentFps) => {
      setFps(currentFps);
    };

    // Auto-start engine render loop so the camera & environment are rendered behind start screen
    engine.start();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = useCallback(() => {
    setHasStarted(true);
  }, []);

  const handleResetCar = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resetCar();
    }
  }, []);

  const handleToggleQuality = useCallback(() => {
    setLowQuality((prev) => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.setQuality(next);
      }
      return next;
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#0a0a0a] touch-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none" />

      {/* Start Screen Overlay */}
      {!hasStarted && (
        <StartScreen onStart={handleStartGame} isTouch={isTouch} />
      )}

      {/* In-Game HUD */}
      {hasStarted && (
        <HUD
          physics={physicsState}
          score={scoreState}
          fps={fps}
          onReset={handleResetCar}
          isTouch={isTouch}
          lowQuality={lowQuality}
          onToggleQuality={handleToggleQuality}
        />
      )}

      {/* Mobile Multi-touch Controls Overlay */}
      {hasStarted && isTouch && engineRef.current && (
        <TouchControls inputManager={engineRef.current.inputManager} />
      )}
    </div>
  );
}
