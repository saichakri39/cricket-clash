import React from 'react';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { InningsState, MatchSettings } from '../types/game';

interface MatchScoreboardProps {
  innings: InningsState;
  inningsNumber: 1 | 2;
  settings: MatchSettings;
  batterName: string;
  bowlerName: string;
  batterAvatar: number;
  bowlerAvatar: number;
  target?: number; // target runs if innings 2
  isUserBatting: boolean;
}

const AVATAR_EMOJIS = ['🏏', '⚡', '🦁', '🦅', '🔥', '🎯', '👑', '🌪️'];

export const MatchScoreboard: React.FC<MatchScoreboardProps> = ({
  innings,
  inningsNumber,
  settings,
  batterName,
  bowlerName,
  batterAvatar,
  bowlerAvatar,
  target,
  isUserBatting,
}) => {
  const oversCompleted = Math.floor(innings.legalBalls / 6);
  const ballsInCurrentOver = innings.legalBalls % 6;
  const overDisplay = `${oversCompleted}.${ballsInCurrentOver}`;
  const totalBalls = settings.overs * 6;
  const ballsRemaining = Math.max(0, totalBalls - innings.legalBalls);

  // Current Run Rate (CRR)
  const oversFloat = innings.legalBalls > 0 ? innings.legalBalls / 6 : 0;
  const crr = oversFloat > 0 ? (innings.runs / oversFloat).toFixed(2) : '0.00';

  // Target and Required Runs
  const runsNeeded = target !== undefined ? Math.max(0, target - innings.runs) : null;
  const rrr = target !== undefined && ballsRemaining > 0
    ? ((runsNeeded! / ballsRemaining) * 6).toFixed(2)
    : null;

  // Ball history for the current over
  const currentOverStartIndex = oversCompleted * 6;
  const currentOverBalls = innings.ballHistory.slice(currentOverStartIndex);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Top Banner: Match Context */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-lime-500/20 text-lime-400 border border-lime-500/30">
            {inningsNumber === 1 ? '1ST INNINGS' : '2ND INNINGS (CHASE)'}
          </span>
          <span className="text-xs text-slate-400">
            {settings.overs} Over Match • Max {settings.wickets} Wickets
          </span>
        </div>

        {target !== undefined && (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
            <Target className="w-3.5 h-3.5" />
            <span>TARGET: {target}</span>
          </div>
        )}
      </div>

      {/* Main Stadium Scoreboard Card */}
      <div className="pitch-card rounded-2xl p-5 sm:p-7 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-lime-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Players in action bar */}
        <div className="grid grid-cols-2 gap-4 pb-5 border-b border-white/10 mb-5">
          {/* Batting Player */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
            isUserBatting
              ? 'bg-lime-500/10 border-lime-500/30'
              : 'bg-white/[0.03] border-white/10'
          }`}>
            <div className="relative w-11 h-11 rounded-xl bg-lime-500/20 border border-lime-500/40 flex items-center justify-center text-2xl shrink-0">
              {AVATAR_EMOJIS[batterAvatar - 1] || '🏏'}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-lime-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                🏏
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-lime-400 flex items-center gap-1">
                <span>STRIKER (BATTING)</span>
                {isUserBatting && <span className="text-white font-mono">(YOU)</span>}
              </div>
              <div className="font-heading font-black text-white text-base sm:text-lg truncate">
                {batterName}
              </div>
            </div>
          </div>

          {/* Bowling Player */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
            !isUserBatting
              ? 'bg-cyan-500/10 border-cyan-500/30'
              : 'bg-white/[0.03] border-white/10'
          }`}>
            <div className="relative w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl shrink-0">
              {AVATAR_EMOJIS[bowlerAvatar - 1] || '🎯'}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                🎯
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 flex items-center gap-1">
                <span>ATTACK (BOWLING)</span>
                {!isUserBatting && <span className="text-white font-mono">(YOU)</span>}
              </div>
              <div className="font-heading font-black text-white text-base sm:text-lg truncate">
                {bowlerName}
              </div>
            </div>
          </div>
        </div>

        {/* Central Giant Score Display */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
          {/* Main Score (Runs / Wickets) */}
          <div className="flex items-baseline gap-3 text-center sm:text-left">
            <div className="font-sports font-black text-5xl sm:text-7xl text-white tracking-tight drop-shadow-md">
              {innings.runs}
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-amber-400">{innings.wickets}</span>
            </div>
            <div className="text-xs text-slate-400 font-heading uppercase font-bold">
              {innings.wickets >= settings.wickets ? 'ALL OUT' : 'RUNS / WICKETS'}
            </div>
          </div>

          {/* Overs Display & Rates */}
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                OVERS
              </div>
              <div className="font-sports font-black text-3xl sm:text-4xl text-lime-400">
                {overDisplay}
                <span className="text-xs text-slate-500 font-normal"> / {settings.overs}.0</span>
              </div>
            </div>

            <div className="border-l border-white/10 pl-6 space-y-1">
              <div className="text-xs text-slate-300">
                <span className="text-slate-400">CRR:</span>{' '}
                <strong className="text-white font-mono">{crr}</strong>
              </div>
              {rrr && (
                <div className="text-xs text-amber-300">
                  <span className="text-slate-400">RRR:</span>{' '}
                  <strong className="text-amber-400 font-mono">{rrr}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chasing Target Status Bar */}
        {target !== undefined && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Need <strong className="text-white font-bold text-sm">{runsNeeded}</strong> run{runsNeeded === 1 ? '' : 's'} from <strong className="text-white font-bold text-sm">{ballsRemaining}</strong> ball{ballsRemaining === 1 ? '' : 's'}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] hidden sm:block">
              Wickets in hand: <span className="text-white font-bold">{settings.wickets - innings.wickets}</span>
            </div>
          </div>
        )}

        {/* Current Over Balls Timeline Strip */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              THIS OVER ({oversCompleted + 1} OF {settings.overs})
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {ballsInCurrentOver} / 6 Balls Bowled
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((ballIdx) => {
              const record = currentOverBalls[ballIdx];
              if (!record) {
                return (
                  <div
                    key={ballIdx}
                    className="flex-1 h-9 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-center text-xs text-slate-600 font-mono"
                  >
                    •
                  </div>
                );
              }

              if (record.isOut) {
                return (
                  <div
                    key={ballIdx}
                    className="flex-1 h-9 rounded-lg bg-red-500/20 border border-red-500 text-red-400 font-bold flex items-center justify-center text-xs font-mono shadow-md shadow-red-500/20"
                    title={`Over ${record.overStr}: OUT! Batter picked ${record.batterPick}, Bowler picked ${record.bowlerPick}`}
                  >
                    W
                  </div>
                );
              }

              const isBoundary = record.runs === 4 || record.runs === 6;
              return (
                <div
                  key={ballIdx}
                  className={`flex-1 h-9 rounded-lg border font-bold flex items-center justify-center text-xs font-mono transition-transform hover:scale-105 ${
                    record.runs === 6
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20'
                      : record.runs === 4
                      ? 'bg-purple-500/25 border-purple-400 text-purple-300 shadow-md shadow-purple-500/20'
                      : 'bg-white/10 border-white/20 text-white'
                  }`}
                  title={`Over ${record.overStr}: ${record.runs} Runs (Bat: ${record.batterPick}, Bowl: ${record.bowlerPick})`}
                >
                  {record.runs}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
