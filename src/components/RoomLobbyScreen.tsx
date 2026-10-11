import React, { useState } from 'react';
import { Copy, Check, Users, Share2, Sparkles, LogOut, ArrowRight, Loader2 } from 'lucide-react';
import { RoomSanitizedState } from '../types/game';
import { soundManager } from '../utils/sound';

interface RoomLobbyScreenProps {
  roomState: RoomSanitizedState;
  currentUserId: string;
  onLeaveRoom: () => void;
  onHostProceed: () => void;
}

const AVATAR_EMOJIS = ['🏏', '⚡', '🦁', '🦅', '🔥', '🎯', '👑', '🌪️'];

export const RoomLobbyScreen: React.FC<RoomLobbyScreenProps> = ({
  roomState,
  currentUserId,
  onLeaveRoom,
  onHostProceed,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = roomState.hostId === currentUserId;
  const playersCount = roomState.playerOrder.length;
  const isFull = playersCount >= 2;

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${roomState.roomCode}`
    : '';

  const handleCopyCode = async () => {
    soundManager.playClick();
    try {
      await navigator.clipboard.writeText(roomState.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    soundManager.playClick();
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Leave room action */}
      <button
        onClick={() => {
          soundManager.playClick();
          onLeaveRoom();
        }}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 mb-6 transition-colors cursor-pointer group"
      >
        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>LEAVE ROOM</span>
      </button>

      <div className="pitch-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>MULTIPLAYER DRESSING ROOM</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-white">
            {isFull ? 'OPPONENT READY!' : 'WAITING FOR OPPONENT'}
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {isFull
              ? 'Both players have entered the arena. Proceed to toss to decide batting or bowling!'
              : 'Share the room code or invitation link with your friend to jump straight into the match.'}
          </p>
        </div>

        {/* Room Code Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/10 text-center space-y-4 mb-8">
          <div className="text-xs uppercase font-bold tracking-widest text-slate-400">
            ROOM INVITATION CODE
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-cyan-300 to-amber-300 select-all">
            {roomState.roomCode}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleCopyCode}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold font-heading uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-lime-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'CODE COPIED!' : 'COPY CODE'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-heading uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-lime-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? 'LINK COPIED!' : 'COPY INVITE LINK'}</span>
            </button>
          </div>
        </div>

        {/* Players Status List */}
        <div className="space-y-3 mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            CONTENDERS ({playersCount}/2)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Player 1 (Host) */}
            {roomState.playerOrder[0] && roomState.players[roomState.playerOrder[0]] && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-lime-500/15 border border-lime-500/30 flex items-center justify-center text-2xl">
                  {AVATAR_EMOJIS[roomState.players[roomState.playerOrder[0]].avatarSeed - 1] || '🏏'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-heading truncate">
                      {roomState.players[roomState.playerOrder[0]].name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-lime-500/20 text-lime-400 border border-lime-500/30">
                      HOST
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Connected</span>
                  </div>
                </div>
              </div>
            )}

            {/* Player 2 (Guest or Waiting) */}
            {roomState.playerOrder[1] && roomState.players[roomState.playerOrder[1]] ? (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-2xl">
                  {AVATAR_EMOJIS[roomState.players[roomState.playerOrder[1]].avatarSeed - 1] || '⚡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-heading truncate">
                      {roomState.players[roomState.playerOrder[1]].name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      GUEST
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Connected</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-white/15 bg-white/[0.01] flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-center text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <div className="font-bold text-slate-400 font-heading">Waiting for Friend...</div>
                  <div className="text-xs text-slate-500">Send them the room code above</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {isFull ? (
          <div>
            {isHost ? (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onHostProceed();
                }}
                className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-black font-heading text-lg uppercase tracking-wider shadow-lg shadow-lime-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>PROCEED TO MATCH SETTINGS & TOSS</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center text-sm text-slate-300 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Waiting for the Host to launch the toss...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Keep this window open. Match will sync automatically as soon as your friend joins!</span>
          </div>
        )}
      </div>
    </div>
  );
};
