import React from 'react';
import { Bot, Users, Trophy, Play, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface LandingScreenProps {
  onSelectMode: (mode: 'vs_computer' | 'online_friend') => void;
  onOpenRules: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onSelectMode,
  onOpenRules,
}) => {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
      {/* Stadium Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-semibold mb-6 animate-pulse">
        <Sparkles className="w-3.5 h-3.5" />
        <span>AUTHENTIC HAND CRICKET LEAGUE</span>
      </div>

      {/* Main Title & Hero Branding */}
      <div className="text-center space-y-3 mb-10 max-w-2xl">
        <div className="inline-flex items-center justify-center gap-3">
          <span className="text-4xl sm:text-6xl animate-bounce">🏏</span>
          <h1 className="text-5xl sm:text-7xl font-black font-heading tracking-tight text-white drop-shadow-md">
            CRICKET <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-400 to-amber-300">CLASH</span>
          </h1>
        </div>
        <p className="text-xl sm:text-2xl font-heading font-bold text-slate-300 tracking-wider">
          "Your Match. Your Rules."
        </p>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl mx-auto">
          The beloved schoolyard hand cricket game reborn with high-octane stadium visuals, tactical computer bots, and real-time multiplayer duels.
        </p>
      </div>

      {/* Game Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-10">
        {/* Play vs Computer Card */}
        <div
          onClick={() => {
            soundManager.playClick();
            onSelectMode('vs_computer');
          }}
          className="group relative pitch-card rounded-2xl p-6 sm:p-8 cursor-pointer hover:border-lime-500/50 hover:glow-lime transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-sports">
            SOLO / AI
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-500/20 to-emerald-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 mb-5 group-hover:scale-110 transition-transform">
            <Bot className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-white mb-2 group-hover:text-lime-300 transition-colors">
            PLAY VS COMPUTER
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Test your wits against intelligent bots with Easy, Medium, and Hard tactical personalities. Chases, mind-games, and death-over battles.
          </p>

          <div className="flex items-center justify-between text-sm font-bold text-lime-400 group-hover:translate-x-1 transition-transform">
            <span className="flex items-center gap-1.5 font-heading tracking-wider">
              ENTER ARENA <ChevronRight className="w-4 h-4" />
            </span>
            <div className="w-8 h-8 rounded-full bg-lime-500/10 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
          </div>
        </div>

        {/* Play with Friend Card */}
        <div
          onClick={() => {
            soundManager.playClick();
            onSelectMode('online_friend');
          }}
          className="group relative pitch-card rounded-2xl p-6 sm:p-8 cursor-pointer hover:border-cyan-500/50 hover:shadow-[0_0_25px_-4px_rgba(6,182,212,0.45)] transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold font-sports">
            ONLINE LIVE
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-white mb-2 group-hover:text-cyan-300 transition-colors">
            PLAY WITH FRIEND
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Create a private room, send a quick invite link or 6-digit code, and battle your friends live with server-synced hidden moves!
          </p>

          <div className="flex items-center justify-between text-sm font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
            <span className="flex items-center gap-1.5 font-heading tracking-wider">
              CREATE / JOIN ROOM <ChevronRight className="w-4 h-4" />
            </span>
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Rules Snapshot Bar */}
      <div className="w-full max-w-3xl rounded-xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-heading">HAND CRICKET RULES IN A NUTSHELL</h4>
            <p className="text-xs text-slate-400">
              Pick 1 to 6. <span className="text-red-400 font-semibold">Matching = OUT</span>, <span className="text-lime-400 font-semibold">Different = Batter scores!</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenRules();
          }}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
        >
          View Full Rules
        </button>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-3xl mt-8 text-center">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
          <div className="text-xs text-slate-400 font-medium">Over Formats</div>
          <div className="text-base font-bold text-white font-heading mt-0.5">1, 2, or 5 Overs</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
          <div className="text-xs text-slate-400 font-medium">Wicket Limit</div>
          <div className="text-base font-bold text-white font-heading mt-0.5">1 to 10 Wickets</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
          <div className="text-xs text-slate-400 font-medium">Coin Toss</div>
          <div className="text-base font-bold text-white font-heading mt-0.5">3D Animated Flip</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
          <div className="text-xs text-slate-400 font-medium">Multiplayer</div>
          <div className="text-base font-bold text-white font-heading mt-0.5">Real-time Sync</div>
        </div>
      </div>
    </div>
  );
};
