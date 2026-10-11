import React, { useState } from 'react';
import { Volume2, VolumeX, HelpCircle, Home, Wifi, WifiOff } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface HeaderProps {
  onGoHome: () => void;
  onOpenRules: () => void;
  isMatchActive?: boolean;
  onlineConnected?: boolean;
  roomCode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onGoHome,
  onOpenRules,
  isMatchActive = false,
  onlineConnected,
  roomCode,
}) => {
  const [muted, setMuted] = useState(soundManager.isMuted());
  const [showConfirmHome, setShowConfirmHome] = useState(false);

  const handleToggleMute = () => {
    const isNowMuted = soundManager.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      soundManager.playClick();
    }
  };

  const handleHomeClick = () => {
    soundManager.playClick();
    if (isMatchActive) {
      setShowConfirmHome(true);
    } else {
      onGoHome();
    }
  };

  return (
    <>
      <header className="relative z-40 w-full border-b border-white/10 bg-[#070e1b]/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Title */}
          <div
            onClick={handleHomeClick}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-lime-500/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🏏</span>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#070e1b]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-xl sm:text-2xl font-black tracking-wider text-white group-hover:text-lime-400 transition-colors">
                  CRICKET<span className="text-lime-400">CLASH</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-lime-500/10 text-lime-400 border border-lime-500/30 rounded">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden xs:block -mt-0.5 tracking-wide">
                YOUR MATCH. YOUR RULES.
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Room code badge if connected */}
            {roomCode && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                ROOM: {roomCode}
              </div>
            )}

            {/* Socket connection indicator if multiplayer */}
            {onlineConnected !== undefined && (
              <div
                title={onlineConnected ? 'Online Server Connected' : 'Reconnecting to Server...'}
                className={`p-2 rounded-xl border flex items-center justify-center transition-colors ${
                  onlineConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                }`}
              >
                {onlineConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </div>
            )}

            {/* Rules Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenRules();
              }}
              title="How to play"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-lime-400" />
              <span className="hidden sm:inline font-heading font-bold uppercase tracking-wider">
                Rules
              </span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={handleToggleMute}
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-lime-400" />
              )}
            </button>

            {/* Home Button */}
            <button
              onClick={handleHomeClick}
              title="Return to Menu"
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Confirmation Modal before exiting active match */}
      {showConfirmHome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0b1626] border border-white/10 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold font-heading text-white">Leave Active Match?</h3>
            <p className="text-sm text-slate-400">
              The match is currently in progress. If you return to the home screen, your ongoing game progress will be forfeited.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmHome(false)}
                className="px-4 py-2 rounded-xl text-slate-300 hover:bg-white/5 font-semibold text-sm transition-colors cursor-pointer"
              >
                Stay & Play
              </button>
              <button
                onClick={() => {
                  setShowConfirmHome(false);
                  onGoHome();
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors cursor-pointer font-heading"
              >
                Quit Match
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
