import React from 'react';
import { ShieldAlert, Zap, Flame, Award } from 'lucide-react';

interface BallOutcomeBannerProps {
  result: {
    batterPick: number;
    bowlerPick: number;
    isOut: boolean;
    runs: number;
    batterName: string;
    bowlerName: string;
  };
}

export const BallOutcomeBanner: React.FC<BallOutcomeBannerProps> = ({ result }) => {
  const isWicket = result.isOut;
  const isSix = result.runs === 6;
  const isFour = result.runs === 4;

  let title = `${result.runs} RUNS!`;
  let subtitle = `${result.batterName} takes ${result.runs} off the delivery`;
  let bannerClass = 'from-blue-600/20 via-slate-900/90 to-blue-900/20 border-blue-500/40 text-blue-300';
  let Icon = Zap;

  if (isWicket) {
    title = 'WICKET! DISMISSED!';
    subtitle = `Numbers matched (${result.batterPick} vs ${result.bowlerPick})! ${result.bowlerName} strikes!`;
    bannerClass = 'from-red-600/30 via-slate-900/90 to-rose-900/30 border-red-500/50 text-red-300 glow-red';
    Icon = ShieldAlert;
  } else if (isSix) {
    title = 'MAXIMUM! HUGE SIX!';
    subtitle = 'Dispatched high and handsome over the ropes!';
    bannerClass = 'from-amber-500/30 via-slate-900/90 to-yellow-900/30 border-amber-400/50 text-amber-300 glow-gold animate-boundary';
    Icon = Flame;
  } else if (isFour) {
    title = 'CRACKING FOUR!';
    subtitle = 'Pierces the field with precision and speeds to the fence!';
    bannerClass = 'from-purple-500/30 via-slate-900/90 to-indigo-900/30 border-purple-400/50 text-purple-300 animate-boundary';
    Icon = Award;
  }

  return (
    <div className="w-full max-w-3xl mx-auto my-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`p-4 rounded-2xl border bg-gradient-to-r ${bannerClass} shadow-2xl relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Main Title & Tagline */}
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
              isWicket
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : isSix
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-white/10 border-white/20 text-white'
            }`}>
              <Icon className="w-6 h-6" />
            </div>

            <div>
              <div className="font-heading font-black text-2xl sm:text-3xl tracking-wide uppercase text-white drop-shadow">
                {title}
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Both Picks Revealed */}
          <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-xl border border-white/10">
            {/* Batter Pick */}
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-lime-400">BATTER</div>
              <div className="font-sports font-black text-2xl text-white">
                {result.batterPick}
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500">vs</div>

            {/* Bowler Pick */}
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-cyan-400">BOWLER</div>
              <div className="font-sports font-black text-2xl text-white">
                {result.bowlerPick}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
