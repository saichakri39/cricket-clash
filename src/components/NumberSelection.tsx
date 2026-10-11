import React, { useEffect } from 'react';
import { Sparkles, Check, Clock, ShieldAlert } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface NumberSelectionProps {
  onPickNumber: (num: number) => void;
  disabled?: boolean;
  selectedNumber: number | null;
  isUserBatting: boolean;
  opponentHasLocked?: boolean;
  isWaitingForOpponent?: boolean;
}

const BUTTON_CONFIGS = [
  { num: 1, label: 'Single', color: 'from-emerald-600/30 to-emerald-900/40 border-emerald-500/40 hover:border-emerald-400 text-emerald-300' },
  { num: 2, label: 'Double', color: 'from-teal-600/30 to-teal-900/40 border-teal-500/40 hover:border-teal-400 text-teal-300' },
  { num: 3, label: 'Triple', color: 'from-blue-600/30 to-blue-900/40 border-blue-500/40 hover:border-blue-400 text-blue-300' },
  { num: 4, label: 'Boundary 4', color: 'from-purple-600/30 to-purple-900/40 border-purple-500/40 hover:border-purple-400 text-purple-300 font-bold' },
  { num: 5, label: 'Quick 5', color: 'from-orange-600/30 to-orange-900/40 border-orange-500/40 hover:border-orange-400 text-orange-300' },
  { num: 6, label: 'Maximum 6', color: 'from-amber-500/35 to-yellow-900/40 border-amber-400/50 hover:border-amber-400 text-amber-300 font-bold' },
];

export const NumberSelection: React.FC<NumberSelectionProps> = ({
  onPickNumber,
  disabled = false,
  selectedNumber,
  isUserBatting,
  opponentHasLocked = false,
  isWaitingForOpponent = false,
}) => {
  // Keyboard listener for 1..6
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || selectedNumber !== null) return;
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 6) {
        soundManager.playClick();
        onPickNumber(keyNum);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, selectedNumber, onPickNumber]);

  const handleButtonClick = (num: number) => {
    if (disabled || selectedNumber !== null) return;
    soundManager.playClick();
    onPickNumber(num);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Action prompt banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <span className="font-heading font-black text-lg text-white uppercase tracking-wider">
            {isUserBatting ? 'CHOOSE YOUR SHOT' : 'CHOOSE YOUR DELIVERY'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
            Keys 1-6
          </span>
        </div>

        {/* Multiplayer status badge */}
        {opponentHasLocked && !selectedNumber && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Opponent has locked in! Choose your move!</span>
          </div>
        )}

        {selectedNumber !== null && isWaitingForOpponent && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-500/15 border border-lime-500/30 text-lime-400 text-xs font-semibold animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Move locked! Waiting for opponent...</span>
          </div>
        )}
      </div>

      {/* 6 Large Interactive Number Buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {BUTTON_CONFIGS.map((cfg) => {
          const isSelected = selectedNumber === cfg.num;
          return (
            <button
              key={cfg.num}
              type="button"
              disabled={disabled || selectedNumber !== null}
              onClick={() => handleButtonClick(cfg.num)}
              className={`relative h-28 sm:h-32 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center p-2 cursor-pointer ${
                isSelected
                  ? 'bg-lime-500/25 border-lime-400 text-lime-300 shadow-xl shadow-lime-500/30 scale-105 z-10'
                  : disabled || selectedNumber !== null
                  ? 'bg-slate-900/40 border-white/5 text-slate-500 cursor-not-allowed opacity-60'
                  : `bg-gradient-to-b ${cfg.color} hover:scale-105 hover:shadow-lg`
              }`}
            >
              {/* Keyboard indicator badge */}
              <div className="absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400">
                {cfg.num}
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center shadow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {/* Huge Number */}
              <div className="font-sports font-black text-4xl sm:text-5xl tracking-tight">
                {cfg.num}
              </div>

              {/* Sub-label */}
              <div className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-90 truncate max-w-full">
                {cfg.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Hint */}
      <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 py-1">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          {isUserBatting
            ? 'Avoid the bowler\'s number to score runs. If numbers match, you are OUT!'
            : 'Match the batter\'s number to take a wicket!'}
        </span>
      </div>
    </div>
  );
};
