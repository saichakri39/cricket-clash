import React from 'react';
import { ArrowRight, Target, Sparkles, Trophy, Users, Shield } from 'lucide-react';
import { InningsState, MatchSettings } from '../types/game';
import { soundManager } from '../utils/sound';

interface InningsBreakScreenProps {
  innings1: InningsState;
  settings: MatchSettings;
  batter1Name: string;
  batter2Name: string;
  batter1Avatar: number;
  batter2Avatar: number;
  isHost?: boolean;
  onContinue: () => void;
}

const AVATAR_EMOJIS = ['🏏', '⚡', '🦁', '🦅', '🔥', '🎯', '👑', '🌪️'];

export const InningsBreakScreen: React.FC<InningsBreakScreenProps> = ({
  innings1,
  settings,
  batter1Name,
  batter2Name,
  batter1Avatar,
  batter2Avatar,
  isHost = true,
  onContinue,
}) => {
  const target = innings1.runs + 1;
  const totalBalls = settings.overs * 6;
  const rrr = ((target / totalBalls) * 6).toFixed(2);

  const oversCompleted = Math.floor(innings1.legalBalls / 6);
  const remBalls = innings1.legalBalls % 6;
  const overStr = `${oversCompleted}.${remBalls}`;

  const handleContinueClick = () => {
    soundManager.playClick();
    onContinue();
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="pitch-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5" />
            <span>MID-INNINGS INTERVAL</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-white">
            INNINGS BREAK
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {batter1Name} finished their batting effort. Time to switch sides!
          </p>
        </div>

        {/* 1st Innings Score Summary Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/10 mb-6 text-center space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1ST INNINGS TOTAL
          </div>
          <div className="font-sports font-black text-5xl sm:text-6xl text-white">
            {innings1.runs}
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-amber-400">{innings1.wickets}</span>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Scored in <strong className="text-white">{overStr}</strong> / {settings.overs}.0 overs
          </div>
        </div>

        {/* The Target Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-lime-500/15 via-emerald-950/40 to-slate-900 border border-lime-500/30 mb-8 glow-lime">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-lime-400">
              <Target className="w-5 h-5" />
              <span className="font-heading font-black text-base uppercase tracking-wider text-white">
                TARGET TO WIN
              </span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-lime-500/20 text-lime-300 font-mono font-bold">
              {totalBalls} BALLS CHASE
            </span>
          </div>

          <div className="text-center space-y-1 my-3">
            <div className="font-sports font-black text-6xl text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-emerald-300 to-amber-300">
              {target}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              <strong className="text-white">{batter2Name}</strong> needs <strong className="text-lime-300">{target} runs</strong> from {totalBalls} deliveries to claim victory.
            </p>
            <p className="text-xs text-slate-400">
              Required Run Rate (RRR): <span className="font-mono text-amber-300 font-bold">{rrr}</span> runs/over
            </p>
          </div>
        </div>

        {/* Roles Reversal Indicator */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-center text-sm">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-2xl mb-1">{AVATAR_EMOJIS[batter2Avatar - 1] || '🏏'}</div>
            <div className="font-heading font-bold text-white truncate">{batter2Name}</div>
            <div className="text-[10px] text-lime-400 uppercase font-bold tracking-wider mt-0.5">
              Now Batting
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-2xl mb-1">{AVATAR_EMOJIS[batter1Avatar - 1] || '🎯'}</div>
            <div className="font-heading font-bold text-white truncate">{batter1Name}</div>
            <div className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mt-0.5">
              Now Bowling
            </div>
          </div>
        </div>

        {/* Continue Action */}
        <button
          onClick={handleContinueClick}
          className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-black font-heading text-lg uppercase tracking-wider shadow-lg shadow-lime-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>START 2ND INNINGS</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
