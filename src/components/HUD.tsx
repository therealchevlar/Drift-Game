import React from 'react';
import { CarPhysicsState, DriftScoreState } from '../types';
import { soundEngine } from '../game/audio';
import { Volume2, VolumeX, RotateCcw, Download } from 'lucide-react';

interface HUDProps {
  physics: CarPhysicsState;
  score: DriftScoreState;
  fps: number;
  onReset: () => void;
  isTouch: boolean;
  lowQuality: boolean;
  onToggleQuality: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  physics,
  score,
  fps,
  onReset,
  isTouch,
  lowQuality,
  onToggleQuality,
}) => {
  const [muted, setMuted] = React.useState(soundEngine.getMuted());

  const toggleSound = () => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
  };

  const rpmPercent = Math.min(100, Math.max(0, (physics.engineRpm / 7800) * 100));
  const isRedline = physics.engineRpm > 6800;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* TOP-LEFT: CURRENT SCORE & COMBO */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 flex flex-col gap-0.5 z-20 pointer-events-auto">
        <div className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Current Score</div>
        <div
          className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white tabular-nums leading-tight"
          style={{ fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif" }}
        >
          {score.totalScore.toLocaleString()}
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span
            className="text-[#f27d26] font-black italic text-xl sm:text-2xl"
            style={{ fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif" }}
          >
            x{score.multiplier.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">Combo</span>
        </div>
        <div className="text-[9px] uppercase tracking-widest opacity-30 font-bold mt-1">
          BEST // {score.bestScore.toLocaleString()}
        </div>
      </div>

      {/* TOP-CENTER: ACTIVE DRIFT COMBO & POINTS */}
      {(score.currentPoints > 0 || score.isChainActive) && (
        <div className="absolute top-6 md:top-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          {score.driftRatingText && (
            <span
              className="text-[10px] sm:text-xs tracking-[0.4em] font-black italic uppercase text-[#f27d26] mb-1"
              style={{ fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif" }}
            >
              {score.driftRatingText}
            </span>
          )}
          <div
            className="text-3xl sm:text-5xl font-black italic tracking-tighter text-[#f27d26] drop-shadow-[0_0_30px_rgba(242,125,38,0.5)] tabular-nums"
            style={{ fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif" }}
          >
            +{score.currentPoints.toLocaleString()}
          </div>
          {score.isChainActive && (
            <div className="w-32 sm:w-44 h-1 bg-white/10 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#f27d26] transition-all duration-75"
                style={{ width: `${score.chainTimerPct * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* TOP-RIGHT: UTILITIES & VELOCITY SPEEDOMETER */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 flex flex-col items-end gap-1.5 z-20 pointer-events-auto">
        {/* Utility controls bar */}
        <div className="flex items-center gap-1.5 mb-1">
          <a
            id="btn-download-zip"
            href="/drift-playground.zip"
            download="drift-playground.zip"
            className="flex items-center gap-1 px-2 py-1 bg-[#f27d26]/20 hover:bg-[#f27d26]/30 border border-[#f27d26]/40 text-[10px] font-bold text-[#f27d26] uppercase tracking-wider rounded transition-colors active:scale-95"
            title="Download Complete Project ZIP (GitHub & Vercel Ready)"
          >
            <Download className="w-3 h-3 text-[#f27d26]" />
            <span className="hidden sm:inline">ZIP</span>
          </a>
          <button
            id="btn-quality"
            onClick={onToggleQuality}
            className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-neutral-300 uppercase tracking-wider rounded transition-colors"
            title="Toggle Graphics Quality"
          >
            {lowQuality ? 'FAST' : 'HD'}
          </button>
          <button
            id="btn-sound"
            onClick={toggleSound}
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-neutral-300 rounded transition-colors"
            title="Toggle Audio"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-neutral-200" />}
          </button>
          <button
            id="btn-reset"
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] font-bold text-neutral-200 uppercase tracking-wider rounded transition-colors active:scale-95"
            title="Reset Car (R)"
          >
            <RotateCcw className="w-3 h-3 text-[#f27d26]" />
            <span>RESET</span>
          </button>
        </div>

        {/* Velocity readout */}
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Velocity</div>
          <div
            className="text-5xl sm:text-6xl font-black italic tracking-tighter text-white tabular-nums leading-none"
            style={{ fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif" }}
          >
            {physics.speedKmh}
            <span className="text-lg sm:text-xl ml-1.5 opacity-40 not-italic font-sans font-bold">KM/H</span>
          </div>
        </div>

        {/* Gear & Drift Angle */}
        <div className="flex items-center gap-3 text-right mt-1">
          {physics.driftAngle > 5 && (
            <span
              className="text-[#f27d26] font-black italic text-xs tracking-wider"
              style={{ fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif" }}
            >
              {physics.driftAngle}° SLIP
            </span>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">GEAR</span>
            <span
              className="font-black italic text-base text-white ml-1"
              style={{ fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif" }}
            >
              {physics.gear}
            </span>
          </div>
        </div>

        {/* Tachometer / RPM Bar */}
        <div className="w-28 sm:w-36 h-1 bg-white/10 overflow-hidden mt-1">
          <div
            className={`h-full transition-all duration-75 ${
              isRedline ? 'bg-rose-500 animate-pulse' : 'bg-[#f27d26]'
            }`}
            style={{ width: `${rpmPercent}%` }}
          />
        </div>
      </div>

      {/* BOTTOM-LEFT: DESKTOP CONTROLS OVERVIEW */}
      {!isTouch && (
        <div className="absolute bottom-8 left-8 z-20 hidden md:flex flex-col gap-1 text-[10px] uppercase tracking-widest opacity-40 font-bold pointer-events-none">
          <div>W / S — GAS & BRAKE</div>
          <div>A / D — STEER & COUNTER</div>
          <div>SPACE — HANDBRAKE SLIDE</div>
          <div>R — RESET POSITION</div>
        </div>
      )}

      {/* BOTTOM-CENTER: STATUS METADATA BAR */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="flex gap-8 sm:gap-12 text-[9px] uppercase tracking-[0.3em] opacity-30 font-bold whitespace-nowrap">
          <span>V.1.04 PRODUCTION BUILD</span>
          <span className="hidden sm:inline">LATENCY: 12MS</span>
          <span>FPS: {fps}</span>
        </div>
      </div>

      {/* BOTTOM ORANGE ACCENT LINE */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-[#f27d26] opacity-50 pointer-events-none" />
    </div>
  );
};
