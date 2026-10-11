import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Bot, Swords, Sparkles, Check, AlertCircle } from 'lucide-react';
import { GameMode, AIDifficulty } from '../types/game';
import { BOT_PROFILES, getRandomBot, BotProfile } from '../utils/ai';
import { soundManager } from '../utils/sound';
import { safeGetStorage, safeSetStorage } from '../utils/storage';

interface PlayerSetupScreenProps {
  gameMode: GameMode;
  initialRoomCode?: string;
  onBack: () => void;
  onSubmitVsComputer: (playerName: string, difficulty: AIDifficulty, bot: BotProfile, avatarSeed: number) => void;
  onSubmitCreateRoom: (playerName: string, avatarSeed: number) => void;
  onSubmitJoinRoom: (playerName: string, roomCode: string, avatarSeed: number) => void;
}

const AVATAR_EMOJIS = ['🏏', '⚡', '🦁', '🦅', '🔥', '🎯', '👑', '🌪️'];

export const PlayerSetupScreen: React.FC<PlayerSetupScreenProps> = ({
  gameMode,
  initialRoomCode = '',
  onBack,
  onSubmitVsComputer,
  onSubmitCreateRoom,
  onSubmitJoinRoom,
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return safeGetStorage('cricket_clash_player_name', 'Striker');
  });
  const [avatarSeed, setAvatarSeed] = useState(1);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [selectedBot, setSelectedBot] = useState<BotProfile>(() => getRandomBot('medium'));
  const [nameError, setNameError] = useState('');

  // Multiplayer sub-action
  const [multiplayerAction, setMultiplayerAction] = useState<'create' | 'join'>(
    initialRoomCode ? 'join' : 'create'
  );
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [roomError, setRoomError] = useState('');

  // Update selected bot when difficulty changes
  useEffect(() => {
    setSelectedBot(getRandomBot(difficulty));
  }, [difficulty]);

  const handleDifficultySelect = (diff: AIDifficulty) => {
    soundManager.playClick();
    setDifficulty(diff);
  };

  const validate = (): boolean => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setNameError('Please enter a player name');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 15) {
      setNameError('Name cannot exceed 15 characters');
      return false;
    }
    setNameError('');
    safeSetStorage('cricket_clash_player_name', trimmed);
    return true;
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    if (!validate()) return;

    const trimmed = playerName.trim();

    if (gameMode === 'vs_computer') {
      onSubmitVsComputer(trimmed, difficulty, selectedBot, avatarSeed);
    } else {
      if (multiplayerAction === 'create') {
        onSubmitCreateRoom(trimmed, avatarSeed);
      } else {
        const cleanCode = roomCodeInput.trim().toUpperCase();
        if (!cleanCode || cleanCode.length < 4) {
          setRoomError('Please enter a valid 6-character room code');
          return;
        }
        setRoomError('');
        onSubmitJoinRoom(trimmed, cleanCode, avatarSeed);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => {
          soundManager.playClick();
          onBack();
        }}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>BACK TO MENU</span>
      </button>

      {/* Main Setup Card */}
      <div className="pitch-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
              {gameMode === 'vs_computer' ? 'PLAYER & AI SETUP' : 'ONLINE MULTIPLAYER SETUP'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Customize your profile and choose your challenge.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center">
            {gameMode === 'vs_computer' ? <Bot className="w-6 h-6" /> : <Swords className="w-6 h-6" />}
          </div>
        </div>

        <form onSubmit={handleProceed} className="space-y-6">
          {/* Player Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              YOUR PLAYER NAME
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  if (nameError) setNameError('');
                }}
                maxLength={15}
                placeholder="Enter your name (e.g. Dhoni7)"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-white/15 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 text-white font-medium text-sm transition-all"
              />
            </div>
            {nameError && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {nameError}
              </p>
            )}
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              CHOOSE YOUR BADGE
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
              {AVATAR_EMOJIS.map((emoji, idx) => {
                const seed = idx + 1;
                const isSelected = avatarSeed === seed;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setAvatarSeed(seed);
                    }}
                    className={`h-12 rounded-xl border flex items-center justify-center text-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-lime-500/20 border-lime-400 text-white shadow-lg shadow-lime-500/20 scale-105'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/25 text-slate-300'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {/* VS COMPUTER: AI Difficulty Selection */}
          {gameMode === 'vs_computer' && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  SELECT DIFFICULTY
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((lvl) => {
                    const isSelected = difficulty === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleDifficultySelect(lvl)}
                        className={`py-3 px-2 rounded-xl border font-heading font-bold uppercase tracking-wider text-xs sm:text-sm transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? lvl === 'easy'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20'
                              : lvl === 'medium'
                              ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-lg shadow-blue-500/20'
                              : 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20'
                            : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <span>{lvl}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bot Opponent Card */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                  {AVATAR_EMOJIS[selectedBot.avatarSeed - 1] || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white font-heading text-lg truncate">
                      {selectedBot.name}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${selectedBot.badgeColor}`}>
                      {selectedBot.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                    {selectedBot.bio}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PLAY WITH FRIEND: Create Room vs Join Room */}
          {gameMode === 'online_friend' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setMultiplayerAction('create');
                  }}
                  className={`py-3 rounded-xl border text-xs sm:text-sm font-bold font-heading uppercase tracking-wider transition-all cursor-pointer ${
                    multiplayerAction === 'create'
                      ? 'bg-lime-500/20 border-lime-400 text-lime-300 shadow-lg shadow-lime-500/20'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  Create New Room
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setMultiplayerAction('join');
                  }}
                  className={`py-3 rounded-xl border text-xs sm:text-sm font-bold font-heading uppercase tracking-wider transition-all cursor-pointer ${
                    multiplayerAction === 'join'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  Join with Code
                </button>
              </div>

              {multiplayerAction === 'join' && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    ROOM CODE
                  </label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => {
                      setRoomCodeInput(e.target.value.toUpperCase());
                      if (roomError) setRoomError('');
                    }}
                    maxLength={8}
                    placeholder="ENTER 6-DIGIT CODE (e.g. CRIC77)"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white font-mono font-bold tracking-widest text-center text-lg uppercase"
                  />
                  {roomError && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {roomError}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Ask your friend for their 6-digit room code or paste from an invite link.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-black font-heading text-lg uppercase tracking-wider shadow-lg shadow-lime-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{gameMode === 'vs_computer' ? 'CONFIGURE MATCH SETTINGS' : multiplayerAction === 'create' ? 'CREATE ROOM & CONTINUE' : 'JOIN ROOM'}</span>
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
