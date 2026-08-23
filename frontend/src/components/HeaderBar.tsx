import React from 'react';
import { Coins, Plus, Volume2, VolumeX, Flame, Zap } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderBarProps {
  roundId: number;
  timeLeft: number;
  phase: 'betting' | 'dropping' | 'finished';
  balance: number;
  onOpenTopUp: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  roundId,
  timeLeft,
  phase,
  balance,
  onOpenTopUp,
  soundEnabled,
  onToggleSound,
}) => {
  const isUrgent = timeLeft <= 5 && phase === 'betting';
  const isDropping = phase === 'dropping';
  const pct = Math.max(0, Math.min(100, (timeLeft / 30) * 100));

  return (
    <>
    <header className="w-full bg-[#161B22]/95 backdrop-blur-md border-b border-[#30363D] px-3 py-2.5 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* App Logo & Round ID */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-amber-500 to-red-600 flex items-center justify-center shadow-md shadow-amber-500/10">
          <Flame className="w-4 h-4 text-white fill-amber-300" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold text-sm tracking-tight text-white">
              0X<span className="text-amber-400">DUEL</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
            Round #{roundId}
          </span>
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="flex items-center justify-center">
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-mono font-bold transition-all ${
            isDropping
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse ring-2 ring-amber-400/30'
              : isUrgent
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-bounce'
              : 'bg-[#0D1117] border-[#30363D] text-gray-200'
          }`}
        >
          {isDropping ? (
            <span className="tracking-wide text-[11px] font-sans font-black text-amber-300 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>DROPPING</span>
            </span>
          ) : (
            <>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUrgent ? 'bg-red-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
              <span className="text-xs">
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Balance & Top Up */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          className="p-1.5 rounded-md text-gray-400 hover:text-white bg-[#0D1117] border border-[#30363D] active:scale-95 transition-transform"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>

        {/* Balance Badge */}
        <div className="flex items-center gap-1 bg-[#0D1117] border border-[#30363D] px-2 py-1 rounded-lg">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-xs font-bold text-amber-400 tracking-tight">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Top Up Button */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenTopUp();
          }}
          className="flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-[11px] px-2 py-1 rounded-lg shadow-sm shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3 stroke-[3]" />
          <span>Top Up</span>
        </button>
      </div>
    </header>

    {/* Countdown progress bar */}
    <div className="w-full h-[4px] bg-[#0D1117] overflow-hidden border-b border-[#30363D]/60">
      {isDropping ? (
        <div className="h-full w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />
      ) : (
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isUrgent
              ? 'bg-red-500'
              : timeLeft <= 10
              ? 'bg-gradient-to-r from-red-400 to-amber-400'
              : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
    </>
  );
};