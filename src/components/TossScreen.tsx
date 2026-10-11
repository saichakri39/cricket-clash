import React, { useState, useEffect } from 'react';
import { Coins, Sparkles, Check, ChevronRight, Swords } from 'lucide-react';
import { TossInfo } from '../types/game';
import { soundManager } from '../utils/sound';

interface TossScreenProps {
  player1Name: string;
  player2Name: string;
  player1Avatar: number;
  player2Avatar: number;
  isComputerMode: boolean;
  tossInfo?: TossInfo;
  isHost?: boolean;
  currentUserId?: string;
  onCoinFlippedVsComputer: (call: 'heads' | 'tails') => void;
  onTossDecisionVsComputer: (winner: 'player1' | 'player2', decision: 'bat' | 'bowl') => void;
  onCallTossMultiplayer?: (call: 'heads' | 'tails') => void;
  onTossDecisionMultiplayer?: (decision: 'bat' | 'bowl') => void;
}

const AVATAR_EMOJIS = ['🏏', '⚡', '🦁', '🦅', '🔥', '🎯', '👑', '🌪️'];

export const TossScreen: React.FC<TossScreenProps> = ({
  player1Name,
  player2Name,
  player1Avatar,
  player2Avatar,
  isComputerMode,
  tossInfo,
  currentUserId,
  onCoinFlippedVsComputer,
  onTossDecisionVsComputer,
  onCallTossMultiplayer,
  onTossDecisionMultiplayer,
}) => {
  // Local state for vs_computer mode
  const [localFlipping, setLocalFlipping] = useState(false);
  const [localCall, setLocalCall] = useState<'heads' | 'tails' | null>(null);
  const [localCoinResult, setLocalCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [localWinner, setLocalWinner] = useState<'player1' | 'player2' | null>(null);
  const [localDecision, setLocalDecision] = useState<'bat' | 'bowl' | null>(null);

  // Derived state depending on mode
  const isFlipping = isComputerMode ? localFlipping : (tossInfo?.isFlipping || false);
  const coinResult = isComputerMode ? localCoinResult : tossInfo?.coinResult;
  const tossWinnerId = isComputerMode ? localWinner : tossInfo?.winnerId;
  const decision = isComputerMode ? localDecision : tossInfo?.decision;

  const isMultiplayerWinner = tossInfo?.winnerId === currentUserId;
  const isCaller = isComputerMode || tossInfo?.callerId === currentUserId;

  const handleCall = (call: 'heads' | 'tails') => {
    soundManager.playCoinToss();
    if (isComputerMode) {
      setLocalCall(call);
      setLocalFlipping(true);

      setTimeout(() => {
        const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === call;
        const winner = won ? 'player1' : 'player2';

        setLocalCoinResult(result);
        setLocalFlipping(false);
        setLocalWinner(winner);

        if (winner === 'player2') {
          // Computer chooses: 65% bat first, 35% bowl first
          const botChoice: 'bat' | 'bowl' = Math.random() < 0.65 ? 'bat' : 'bowl';
          setTimeout(() => {
            setLocalDecision(botChoice);
            onTossDecisionVsComputer('player2', botChoice);
          }, 1500);
        }
      }, 2200);

      onCoinFlippedVsComputer(call);
    } else {
      if (onCallTossMultiplayer) {
        onCallTossMultiplayer(call);
      }
    }
  };

  const handleDecision = (dec: 'bat' | 'bowl') => {
    soundManager.playClick();
    if (isComputerMode) {
      setLocalDecision(dec);
      onTossDecisionVsComputer('player1', dec);
    } else {
      if (onTossDecisionMultiplayer) {
        onTossDecisionMultiplayer(dec);
      }
    }
  };

  // Determine display text for winner
  let winnerName = '';
  if (isComputerMode) {
    if (localWinner === 'player1') winnerName = player1Name;
    if (localWinner === 'player2') winnerName = player2Name;
  } else if (tossInfo?.winnerId) {
    winnerName = tossInfo.winnerId === tossInfo.callerId ? player2Name : player1Name;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="pitch-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Coins className="w-3.5 h-3.5" />
            <span>THE OFFICIAL MATCH TOSS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-white">
            COIN TOSS CEREMONY
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Winner chooses whether to set the target or chase under the floodlights.
          </p>
        </div>

        {/* Players Face-off Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-lime-500/20 border border-lime-500/40 mx-auto flex items-center justify-center text-3xl mb-2">
              {AVATAR_EMOJIS[player1Avatar - 1] || '🏏'}
            </div>
            <div className="font-bold font-heading text-white text-lg truncate">{player1Name}</div>
            <div className="text-[10px] text-lime-400 uppercase font-bold tracking-wider">Player 1</div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 mx-auto flex items-center justify-center text-3xl mb-2">
              {AVATAR_EMOJIS[player2Avatar - 1] || '⚡'}
            </div>
            <div className="font-bold font-heading text-white text-lg truncate">{player2Name}</div>
            <div className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
              {isComputerMode ? 'Computer' : 'Player 2'}
            </div>
          </div>
        </div>

        {/* 3D Coin Graphic & Spin State */}
        <div className="flex flex-col items-center justify-center my-6">
          <div
            className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isFlipping
                ? 'animate-coin-spin bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 glow-gold'
                : coinResult
                ? 'bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 border-4 border-amber-300 glow-gold scale-105'
                : 'bg-gradient-to-tr from-slate-700 via-amber-600 to-slate-800 border-2 border-amber-500/40'
            }`}
          >
            {isFlipping ? (
              <Coins className="w-12 h-12 text-slate-900 animate-spin" />
            ) : coinResult ? (
              <div className="text-center">
                <span className="font-heading font-black text-2xl uppercase tracking-wider text-slate-950">
                  {coinResult}
                </span>
                <div className="text-[10px] font-bold text-slate-800 uppercase tracking-widest -mt-1">
                  LANDED
                </div>
              </div>
            ) : (
              <Coins className="w-12 h-12 text-amber-300" />
            )}
          </div>

          {/* Status text */}
          <div className="mt-4 text-center">
            {isFlipping ? (
              <div className="text-amber-400 font-heading font-bold text-lg tracking-wider animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>COIN IS IN THE AIR...</span>
              </div>
            ) : coinResult ? (
              <div className="space-y-1">
                <div className="text-xl font-black font-heading text-white">
                  Toss Result: <span className="text-amber-400 uppercase">{coinResult}</span>!
                </div>
                <div className="text-sm font-semibold text-lime-400">
                  🏆 {winnerName} won the toss!
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-300 font-medium">
                {isCaller
                  ? 'Call Heads or Tails to spin the coin!'
                  : `Waiting for ${player2Name} to call Heads or Tails...`}
              </div>
            )}
          </div>
        </div>

        {/* Phase 1: Call Heads or Tails */}
        {!coinResult && !isFlipping && (
          <div className="space-y-3 pt-4">
            {isCaller ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleCall('heads')}
                  className="py-4 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-white font-heading font-bold text-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>CALL HEADS</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-amber-400" />
                </button>
                <button
                  onClick={() => handleCall('tails')}
                  className="py-4 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-white font-heading font-bold text-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>CALL TAILS</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-amber-400" />
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400 animate-pulse">
                Your opponent has the call. Coin flip will commence shortly...
              </div>
            )}
          </div>
        )}

        {/* Phase 2: Toss Decision (Bat or Bowl) */}
        {coinResult && !isFlipping && !decision && (
          <div className="space-y-4 pt-6 border-t border-white/10">
            {((isComputerMode && localWinner === 'player1') || (!isComputerMode && isMultiplayerWinner)) ? (
              <div className="space-y-3">
                <div className="text-center text-sm font-bold uppercase tracking-wider text-slate-200">
                  YOU WON THE TOSS! WHAT WOULD YOU LIKE TO DO?
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleDecision('bat')}
                    className="p-4 rounded-xl bg-gradient-to-br from-lime-500/20 to-emerald-500/10 border border-lime-400/50 hover:border-lime-400 text-white font-heading font-black text-xl uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center gap-1 shadow-lg shadow-lime-500/20 hover:scale-[1.02]"
                  >
                    <span className="text-2xl">🏏</span>
                    <span>BAT FIRST</span>
                    <span className="text-[11px] text-slate-300 font-normal">Set the target total</span>
                  </button>

                  <button
                    onClick={() => handleDecision('bowl')}
                    className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-400/50 hover:border-cyan-400 text-white font-heading font-black text-xl uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center gap-1 shadow-lg shadow-cyan-500/20 hover:scale-[1.02]"
                  >
                    <span className="text-2xl">🎯</span>
                    <span>BOWL FIRST</span>
                    <span className="text-[11px] text-slate-300 font-normal">Chase the target</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                <div className="text-base font-bold text-white font-heading">
                  {winnerName} is deciding to Bat or Bowl...
                </div>
                <p className="text-xs text-slate-400">
                  The match will begin as soon as their decision is locked in.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Phase 3: Decision made announcement */}
        {decision && (
          <div className="mt-6 p-4 rounded-xl bg-lime-500/10 border border-lime-500/30 text-center space-y-1 animate-in fade-in duration-300">
            <div className="text-base font-black font-heading text-white">
              {winnerName} elected to <span className="text-lime-400 uppercase">{decision}</span> first!
            </div>
            <p className="text-xs text-slate-300">
              Taking positions on the field. Match starting now...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
