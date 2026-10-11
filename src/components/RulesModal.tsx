import React from 'react';
import { X, Trophy, ShieldAlert, Zap, Flame, Award } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#091322] border border-white/10 p-6 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white tracking-wide">HOW TO PLAY CRICKET CLASH</h2>
              <p className="text-xs text-slate-400">The timeless hand cricket game, supercharged.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close rules modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5 text-sm text-slate-300">
          {/* Rule 1 */}
          <div className="flex gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Simultaneous Number Choice</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                On every legal ball, the <strong className="text-lime-400">Batter</strong> and the <strong className="text-amber-400">Bowler</strong> choose a number from <span className="font-mono text-white font-bold">1 to 6</span> at the exact same time.
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="flex gap-4 p-3.5 rounded-xl bg-red-500/[0.04] border border-red-500/10">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-red-300 mb-1">Matching Numbers = OUT!</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                If both players pick the <strong className="text-white">same number</strong> (e.g., both pick 4), the batter is <strong className="text-red-400">DISMISSED</strong>! A wicket falls. No runs are scored on that delivery.
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="flex gap-4 p-3.5 rounded-xl bg-lime-500/[0.04] border border-lime-500/10">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-lime-500/15 border border-lime-500/30 text-lime-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-lime-300 mb-1">Different Numbers = RUNS!</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                If the numbers differ, the batter scores whatever number they chose (<strong className="text-white">1, 2, 3, 4, 5, or 6 runs</strong>) and adds it to the team total.
              </p>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="flex gap-4 p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/10">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-300 mb-1">Overs & Innings Break</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Each over consists of 6 balls. An innings ends when all overs are bowled, or when the wicket limit is reached. In Innings 2, roles reverse and the chasing player attempts to beat the target!
              </p>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="flex gap-4 p-3.5 rounded-xl bg-purple-500/[0.04] border border-purple-500/10">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-300 mb-1">Winning the Clash</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                In the 2nd innings, if the batting team achieves <span className="font-mono text-white font-bold">First Innings Score + 1</span>, the match ends immediately with victory. If they fall short, the first team wins. Equal runs result in a tie!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-lime-500 text-slate-950 font-bold hover:bg-lime-400 transition-all font-heading tracking-wider shadow-lg shadow-lime-500/20 cursor-pointer"
          >
            GOT IT, LET'S PLAY!
          </button>
        </div>
      </div>
    </div>
  );
};
