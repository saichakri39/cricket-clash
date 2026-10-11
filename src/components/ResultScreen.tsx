import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles, ChevronDown, ChevronUp, Award, Flame } from 'lucide-react';
import { InningsState, MatchSettings } from '../types/game';
import { soundManager } from '../utils/sound';

interface ResultScreenProps {
  innings1: InningsState;
  innings2: InningsState;
  settings: MatchSettings;
  player1Name: string;
  player2Name: string;
  player1Avatar: number;
  player2Avatar: number;
  winnerId?: string | 'tie';
  winReason?: string;
  currentUserId?: string;
  isComputerMode: boolean;
  onPlayAgain: () => void;
  onReturnHome: () => void;
  rematchRequested?: boolean;
}

const AVATAR_EMOJIS = ['🏏', '⚡', '🦁', '🦅', '🔥', '🎯', '👑', '🌪️'];

export const ResultScreen: React.FC<ResultScreenProps> = ({
  innings1,
  innings2,
  settings,
  player1Name,
  player2Name,
  player1Avatar,
  player2Avatar,
  winnerId,
  winReason,
  currentUserId = 'player1',
  isComputerMode,
  onPlayAgain,
  onReturnHome,
  rematchRequested = false,
}) => {
  const [showFullScorecard, setShowFullScorecard] = useState(false);

  // Compute winner if not provided
  let determinedWinner = winnerId;
  let determinedReason = winReason;

  if (!determinedWinner) {
    const target = innings1.runs + 1;
    if (innings2.runs >= target) {
      determinedWinner = innings2.batterId;
      const wicketsLeft = settings.wickets - innings2.wickets;
      determinedReason = `Won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}!`;
    } else if (innings2.runs === innings1.runs) {
      determinedWinner = 'tie';
      determinedReason = 'Match tied in a dramatic nail-biter!';
    } else {
      determinedWinner = innings1.batterId;
      const runDiff = innings1.runs - innings2.runs;
      determinedReason = `Won by ${runDiff} run${runDiff === 1 ? '' : 's'}!`;
    }
  }

  const isUserWinner = isComputerMode
    ? determinedWinner === 'player1'
    : determinedWinner === currentUserId;
  const isTie = determinedWinner === 'tie';

  // Fire celebratory sound & confetti on mount
  useEffect(() => {
    if (isUserWinner) {
      soundManager.playVictory();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a3e635', '#f59e0b', '#06b6d4', '#10b981'],
        });
      } catch {
        // Confetti optional
      }
    } else if (isTie) {
      soundManager.playVictory();
    }
  }, [isUserWinner, isTie]);

  const handlePlayAgainClick = () => {
    soundManager.playClick();
    onPlayAgain();
  };

  const handleHomeClick = () => {
    soundManager.playClick();
    onReturnHome();
  };

  const inn1Overs = `${Math.floor(innings1.legalBalls / 6)}.${innings1.legalBalls % 6}`;
  const inn2Overs = `${Math.floor(innings2.legalBalls / 6)}.${innings2.legalBalls % 6}`;

  // Find batter names correctly across both solo and multiplayer modes
  const firstBattingName = isComputerMode
    ? (innings1.batterId === 'player1' ? player1Name : player2Name)
    : (innings1.batterId === currentUserId ? player1Name : player2Name);
  const secondBattingName = isComputerMode
    ? (innings2.batterId === 'player1' ? player1Name : player2Name)
    : (innings2.batterId === currentUserId ? player1Name : player2Name);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="pitch-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        {/* Banner */}
        <div className="text-center space-y-2 mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            isTie
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
              : isUserWinner
              ? 'bg-lime-500/20 border border-lime-500/40 text-lime-300 glow-lime'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}>
            <Trophy className="w-4 h-4" />
            <span>
              {isTie
                ? 'MATCH TIED!'
                : isUserWinner
                ? 'VICTORY! CHAMPIONS!'
                : 'DEFEAT! BETTER LUCK NEXT TIME'}
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black font-heading text-white">
            {isTie
              ? 'HONORS EVEN!'
              : isUserWinner
              ? 'YOU WON THE CLASH!'
              : `${isComputerMode ? player2Name : 'OPPONENT'} WINS!`}
          </h2>

          <p className="text-base text-slate-300 font-medium max-w-md mx-auto">
            {determinedReason}
          </p>
        </div>

        {/* Scorecard Comparison Card */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Innings 1 Card */}
          <div className={`p-4 rounded-xl border text-center ${
            determinedWinner === innings1.batterId
              ? 'bg-lime-500/10 border-lime-400/50 glow-lime'
              : 'bg-white/[0.03] border-white/10'
          }`}>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              1ST INNINGS • {firstBattingName}
            </div>
            <div className="font-sports font-black text-4xl text-white">
              {innings1.runs}
              <span className="text-slate-500 text-2xl mx-1">/</span>
              <span className="text-amber-400 text-3xl">{innings1.wickets}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {inn1Overs} / {settings.overs}.0 Overs
            </div>
            {determinedWinner === innings1.batterId && (
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-lime-500/20 text-lime-400">
                WINNER
              </span>
            )}
          </div>

          {/* Innings 2 Card */}
          <div className={`p-4 rounded-xl border text-center ${
            determinedWinner === innings2.batterId
              ? 'bg-lime-500/10 border-lime-400/50 glow-lime'
              : 'bg-white/[0.03] border-white/10'
          }`}>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              2ND INNINGS • {secondBattingName}
            </div>
            <div className="font-sports font-black text-4xl text-white">
              {innings2.runs}
              <span className="text-slate-500 text-2xl mx-1">/</span>
              <span className="text-amber-400 text-3xl">{innings2.wickets}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {inn2Overs} / {settings.overs}.0 Overs
            </div>
            {determinedWinner === innings2.batterId && (
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-lime-500/20 text-lime-400">
                WINNER
              </span>
            )}
          </div>
        </div>

        {/* Detailed Timeline Accordion */}
        <div className="mb-8">
          <button
            onClick={() => setShowFullScorecard(!showFullScorecard)}
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs font-bold font-heading text-slate-300 hover:text-white uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-lime-400" />
              <span>{showFullScorecard ? 'HIDE BALL-BY-BALL ANALYSIS' : 'VIEW BALL-BY-BALL ANALYSIS'}</span>
            </span>
            {showFullScorecard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFullScorecard && (
            <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-4 text-xs animate-in fade-in duration-200">
              {/* Innings 1 Deliveries */}
              <div>
                <div className="font-bold text-white mb-2 font-heading uppercase tracking-wide">
                  1st Innings Deliveries ({firstBattingName})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {innings1.ballHistory.map((b, idx) => (
                    <span
                      key={idx}
                      title={`Ball ${b.overStr}: Bat ${b.batterPick} vs Bowl ${b.bowlerPick}`}
                      className={`px-2 py-1 rounded font-mono font-bold text-[11px] ${
                        b.isOut
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : b.runs >= 4
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border border-white/10'
                      }`}
                    >
                      {b.isOut ? 'W' : b.runs}
                    </span>
                  ))}
                </div>
              </div>

              {/* Innings 2 Deliveries */}
              <div className="pt-2 border-t border-white/10">
                <div className="font-bold text-white mb-2 font-heading uppercase tracking-wide">
                  2nd Innings Deliveries ({secondBattingName})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {innings2.ballHistory.map((b, idx) => (
                    <span
                      key={idx}
                      title={`Ball ${b.overStr}: Bat ${b.batterPick} vs Bowl ${b.bowlerPick}`}
                      className={`px-2 py-1 rounded font-mono font-bold text-[11px] ${
                        b.isOut
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : b.runs >= 4
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-white/5 text-slate-300 border border-white/10'
                      }`}
                    >
                      {b.isOut ? 'W' : b.runs}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handlePlayAgainClick}
            className="py-4 px-6 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-black font-heading text-lg uppercase tracking-wider shadow-lg shadow-lime-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{rematchRequested ? 'WAITING FOR OPPONENT...' : 'PLAY AGAIN'}</span>
          </button>

          <button
            onClick={handleHomeClick}
            className="py-4 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold font-heading text-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5 text-slate-400" />
            <span>RETURN TO MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
