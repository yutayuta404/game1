import { useState } from 'react';
import { Users, DollarSign, ArrowUpRight, User, Star } from 'lucide-react';
import type { BetItem } from '../types/clash';
import { sound } from '../utils/audio';

interface LiveBetsTabProps {
  bets: BetItem[];
  messiPool: number;
  ronaldoPool: number;
}

export const LiveBetsTab: React.FC<LiveBetsTabProps> = ({
  bets,
  messiPool,
  ronaldoPool,
}) => {
  const [filter, setFilter] = useState<'all' | 'messi' | 'ronaldo' | 'my'>('all');

  const filteredBets = bets.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'messi') return b.side === 'messi';
    if (filter === 'ronaldo') return b.side === 'ronaldo';
    if (filter === 'my') return b.isUser;
    return true;
  });

  const totalPool = messiPool + ronaldoPool;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0D1117] select-none">
      {/* Live Volume & Pool Quick Banner */}
      <div className="p-3 bg-[#161B22] border-b border-[#30363D] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Players: <strong className="text-white">{bets.length}</strong></span>
          </div>
          <div className="text-xs font-mono text-amber-400 font-bold">
            Total Pool: ${totalPool.toLocaleString()}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => {
              sound.playClick();
              setFilter('all');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500 text-black shadow-xs shadow-amber-500/20'
                : 'bg-[#0D1117] text-gray-400 border border-[#30363D] hover:text-white'
            }`}
          >
            All ({bets.length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFilter('messi');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
              filter === 'messi'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-[#0D1117] text-blue-400 border border-blue-900/50 hover:bg-blue-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Messi</span>
            <span className="text-[10px] opacity-80 font-mono">
              ({bets.filter((b) => b.side === 'messi').length})
            </span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFilter('ronaldo');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
              filter === 'ronaldo'
                ? 'bg-red-600 text-white shadow-xs shadow-red-500/20'
                : 'bg-[#0D1117] text-red-400 border border-red-900/50 hover:bg-red-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>Ronaldo</span>
            <span className="text-[10px] opacity-80 font-mono">
              ({bets.filter((b) => b.side === 'ronaldo').length})
            </span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFilter('my');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 ml-auto ${
              filter === 'my'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0D1117] text-emerald-400 border border-emerald-900/50 hover:bg-emerald-950/40'
            }`}
          >
            <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
            <span>My Bets</span>
          </button>
        </div>
      </div>

      {/* Table Header Columns */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#11161D] border-b border-[#30363D] text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold sticky top-0 z-10">
        <div className="col-span-4 flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>User</span>
        </div>
        <div className="col-span-3 text-center">Side</div>
        <div className="col-span-2 text-right">Amount</div>
        <div className="col-span-3 text-right">Est. Payout</div>
      </div>

      {/* Scrollable Bets List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 divide-y divide-[#30363D]/40 pb-20">
        {filteredBets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-2">
            <DollarSign className="w-8 h-8 stroke-1 text-gray-600" />
            <p className="text-xs">No active bets match this filter</p>
          </div>
        ) : (
          filteredBets.map((bet) => {
            const isMessi = bet.side === 'messi';
            return (
              <div
                key={bet.id}
                className={`grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg text-xs transition-colors ${
                  bet.isUser
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'hover:bg-[#161B22]'
                }`}
              >
                {/* User Column */}
                <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#21262D] flex items-center justify-center text-xs flex-shrink-0 border border-[#30363D] text-gray-400">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="truncate font-semibold text-gray-200 text-[11px]">
                    {bet.isUser ? (
                      <span className="text-amber-400 font-bold">You</span>
                    ) : (
                      bet.user
                    )}
                  </span>
                </div>

                {/* Side Column */}
                <div className="col-span-3 flex justify-center">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isMessi
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-600/40'
                        : 'bg-red-950/80 text-red-300 border border-red-600/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isMessi ? 'bg-blue-400' : 'bg-red-400'
                      }`}
                    />
                    <span>{isMessi ? 'Messi' : 'Ronaldo'}</span>
                  </span>
                </div>

                {/* Amount Column */}
                <div className="col-span-2 text-right font-mono font-bold text-gray-200 text-[11px]">
                  ${bet.amount.toLocaleString()}
                </div>

                {/* Est. Payout Column */}
                <div className="col-span-3 text-right font-mono font-bold text-emerald-400 text-[11px] flex items-center justify-end gap-0.5">
                  <span>${bet.estPayout.toFixed(1)}</span>
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};