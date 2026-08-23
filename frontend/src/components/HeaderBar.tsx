import React from 'react';
import { Coins, Plus, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../utils/audio';

export const BallMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1024 1024" className={className} aria-hidden="true">
    <defs>
      <mask id="ball-knock-header">
        <rect width="1024" height="1024" fill="white" />
        <path d="M512 640 L398 556 L442 420 L582 420 L626 556 Z" fill="black" />
        <g stroke="black" strokeWidth="30" strokeLinecap="round" fill="none">
          <path d="M512 640 L512 700" />
          <path d="M398 556 L342 574" />
          <path d="M442 420 L404 372" />
          <path d="M582 420 L620 372" />
          <path d="M626 556 L682 574" />
        </g>
      </mask>
    </defs>
    <circle cx="512" cy="512" r="300" fill="#FFFFFF" mask="url(#ball-knock-header)" />
  </svg>
);

interface HeaderBarProps {
  roundId: number;
  balance: number;
  onOpenTopUp: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  roundId,
  balance,
  onOpenTopUp,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <>
    <header className="w-full bg-[#161B22]/95 backdrop-blur-md border-b border-[#30363D] px-3 py-2.5 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* App Logo & Round ID */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-amber-500 to-red-600 flex items-center justify-center shadow-md shadow-amber-500/10">
          <BallMark className="w-5 h-5" />
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

      {/* Countdown Timer removed — now lives in the game tab between Jackpot and Pools */}

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
    </>
  );
};