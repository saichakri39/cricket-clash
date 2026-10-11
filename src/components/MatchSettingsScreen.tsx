import React, { useState } from 'react';
import { ArrowLeft, Clock, ShieldCheck, Flame, Check, Play } from 'lucide-react';
import { MatchSettings } from '../types/game';
import { soundManager } from '../utils/sound';

interface MatchSettingsScreenProps {
  initialSettings?: MatchSettings;
  player1Name: string;
  player2Name: string;
  isHost?: boolean;
  onBack: () => void;
  onConfirmSettings: (settings: MatchSettings) => void;
}

export const MatchSettingsScreen: React.FC<MatchSettingsScreenProps> = ({
  initialSettings = { overs: 2, wickets: 3 },
  player1Name,
  player2Name,
  isHost = true,
  onBack,
  onConfirmSettings,
}) => {
  const [overs, setOvers] = useState<number>(initialSettings.overs);
  const [wickets, setWickets] = useState<number>(initialSettings.wickets);

  const OVER_OPTIONS = [
    { value: 1, label: '1 Over', desc: 'Lightning Quick (6 balls)' },
    { value: 2, label: '2 Overs', desc: 'Standard Clash (12 balls)' },
    { value: 5, label: '5 Overs', desc: 'Full Championship (30 balls)' },
  ];

  const WICKET_OPTIONS = [
    { value: 1, label: '1 Wicket', desc: 'Sudden Death' },
    { value: 2, label: '2 Wickets', desc: 'Fast & Furious' },
    { value: 3, label: '3 Wickets', desc: 'Balanced Match' },
    { value: 5, label: '5 Wickets', desc: 'Deep Batting' },
    { value: 10, label: '10 Wickets', desc: 'All-Out Classic' },
  ];

  const handleStart = () => {
    soundManager.playClick();
    onConfirmSettings({ overs, wickets });
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
        <span>BACK</span>
      </button>

      {/* Main Settings Card */}
      <div className="pitch-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
              MATCH SETTINGS
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Configure overs and wicket limits for this fixture.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Overs Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                OVERS PER INNINGS
              </label>
              <span className="text-xs text-lime-400 font-mono font-bold">
                {overs * 6} TOTAL BALLS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {OVER_OPTIONS.map((opt) => {
                const isSelected = overs === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!isHost}
                    onClick={() => {
                      soundManager.playClick();
                      setOvers(opt.value);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-lime-500/20 border-lime-400 text-white shadow-lg shadow-lime-500/20 scale-[1.02]'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading font-black text-xl text-white">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wickets Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                WICKET LIMIT
              </label>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {wickets} WICKET{wickets === 1 ? '' : 'S'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {WICKET_OPTIONS.map((opt) => {
                const isSelected = wickets === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!isHost}
                    onClick={() => {
                      soundManager.playClick();
                      setWickets(opt.value);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="font-heading font-black text-lg text-white">
                      {opt.value}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fixture Summary Box */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-lime-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-heading">
                MATCH PREVIEW SUMMARY
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-bold">CONTENDERS</div>
                <div className="text-white font-semibold truncate mt-0.5">
                  {player1Name} <span className="text-lime-400">vs</span> {player2Name}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-bold">RULES FORMAT</div>
                <div className="text-white font-semibold mt-0.5">
                  {overs} Over{overs === 1 ? '' : 's'} • {wickets} Wicket{wickets === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3">
              Each delivery is decided simultaneously. Coin toss winner determines batting or bowling first.
            </p>
          </div>

          {/* Proceed Button */}
          <div className="pt-2">
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-black font-heading text-lg uppercase tracking-wider shadow-lg shadow-lime-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>PROCEED TO COIN TOSS</span>
              <Play className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
