import React from 'react';
import { Play, Sparkles, Flame, Smartphone, Compass } from 'lucide-react';
import { soundEngine } from '../game/audio';

interface StartScreenProps {
  onStart: () => void;
  isTouch: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, isTouch }) => {
  const handlePlayClick = () => {
    // Resume audio context directly on user gesture
    soundEngine.init();
    onStart();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between items-center bg-[#0a0a0a]/95 text-white overflow-hidden select-none animate-in fade-in duration-300">
      {/* Ambient background glow from design theme */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 120%, #f27d26 0%, #0a0a0a 70%)',
        }}
      />

      {/* 3D Perspective Grid floor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ perspective: '800px' }}>
        <div
          className="absolute bottom-0 w-full h-[320px] bg-[#141414] border-t border-[#333]"
          style={{ transform: 'rotateX(65deg)', transformOrigin: 'bottom' }}
        >
          <div
            className="w-full h-full opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 40px, #fff 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #fff 41px)',
            }}
          />
          <div className="absolute left-1/4 top-1/2 w-64 h-16 bg-[#f27d26] opacity-30 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Top spacer / header */}
      <div className="relative z-10 w-full pt-8 px-6 flex justify-between items-center max-w-6xl">
        <span className="text-[10px] tracking-[0.3em] uppercase opacity-40 font-bold">ARCADE RWD SIMULATION</span>
        <span className="text-[10px] tracking-[0.3em] uppercase text-[#f27d26] font-bold">BUILD 1.04</span>
      </div>

      {/* Center Hero Block */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-2xl my-auto">
        {/* Category Tag */}
        <p className="text-[11px] sm:text-[12px] tracking-[0.4em] text-[#f27d26] uppercase font-bold mb-3">
          The Ultimate Simulation
        </p>

        {/* Huge Bold Title */}
        <h1
          className="font-heading text-5xl sm:text-7xl md:text-8xl lg:text-[100px] leading-[0.85] font-black italic tracking-tighter uppercase text-white drop-shadow-2xl"
          style={{ fontFamily: "'Archivo Black', 'Arial Black', Impact, sans-serif" }}
        >
          DRIFT //<br />
          <span className="text-white">PLAYGROUND</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-[18px] tracking-[0.25em] opacity-60 font-light uppercase mt-4 sm:mt-5 italic text-neutral-300">
          Master the slide.
        </p>

        {/* Features Row */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-lg">
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-sm">
            RWD Physics
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-sm">
            Volumetric Smoke
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-sm">
            Procedural Audio
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-sm">
            Dual Skid Marks
          </span>
        </div>

        {/* START BUTTON with Theme Border Frame */}
        <button
          id="btn-play-game"
          onClick={handlePlayClick}
          className="group relative mt-9 px-10 sm:px-14 py-4 bg-white text-black font-heading font-black uppercase tracking-widest text-base sm:text-lg hover:bg-[#f27d26] hover:text-black transition-all cursor-pointer shadow-[0_0_35px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(242,125,38,0.5)] active:scale-95"
          style={{ fontFamily: "'Archivo Black', 'Arial Black', sans-serif" }}
        >
          <span className="relative z-10 flex items-center gap-3">
            <Play className="w-5 h-5 fill-current" />
            <span>PRESS TO START</span>
          </span>
          <div className="absolute -inset-1 border border-white opacity-25 group-hover:scale-105 group-hover:border-[#f27d26] transition-transform pointer-events-none" />
        </button>

        {/* Quick controls preview */}
        <div className="mt-8 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-neutral-400 max-w-sm w-full">
          {!isTouch ? (
            <div className="flex justify-around items-center text-[10px] uppercase tracking-wider">
              <div><span className="text-white font-bold">W / S</span> Gas / Brake</div>
              <div><span className="text-white font-bold">A / D</span> Steer</div>
              <div><span className="text-[#f27d26] font-bold">SPACE</span> Handbrake</div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-300 uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-[#f27d26] shrink-0" />
              <span>Left thumb steers joystick • Right pedals for Gas, Brake & HBK</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Technical Bar */}
      <div className="relative z-10 pb-4 flex flex-col items-center w-full">
        <div className="flex gap-8 sm:gap-14 text-[9px] uppercase tracking-[0.3em] opacity-30 font-bold text-neutral-400">
          <span>V.1.04 PRODUCTION BUILD</span>
          <span className="hidden sm:inline">LATENCY: 12MS</span>
          <span>60 FPS CAPABLE</span>
        </div>
      </div>

      {/* Bottom Orange Accent Line from Design Theme */}
      <div className="w-full h-1 bg-[#f27d26] opacity-50 shrink-0" />
    </div>
  );
};
