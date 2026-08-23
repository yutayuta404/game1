import { Activity, ArrowUpRight } from 'lucide-react';
import type { BetItem } from '../types/clash';
import { useLang } from '../i18n';

interface LiveBetsCardProps {
  bets: BetItem[];
  max?: number;
}

export const LiveBetsCard: React.FC<LiveBetsCardProps> = ({ bets, max = 6 }) => {
  const { t } = useLang();
  const recent = bets.slice(0, max);

  return (
    <div className="w-full bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg overflow-hidden select-none">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-[#30363D]/70 bg-white/[0.03]">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold text-gray-200 tracking-tight">{t('liveBets')}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot ml-0.5" />
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          {bets.length === 1 ? t('betThisRound', { n: bets.length }) : t('betsThisRound', { n: bets.length })}
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-[#30363D]/40 max-h-64 overflow-y-auto no-scrollbar">
        {recent.length === 0 ? (
          <p className="text-center text-[11px] text-gray-500 py-6 font-mono">
            {t('noBetsYet')}.
          </p>
        ) : (
          recent.map((bet) => {
            const isMessi = bet.side === 'messi';
            return (
              <div
                key={bet.id}
                className={`grid grid-cols-12 gap-2 items-center px-3 py-2 text-xs transition-colors ${
                  bet.isUser
                    ? 'bg-amber-500/10 border-l-2 border-amber-400'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* User */}
                <div className="col-span-4 min-w-0">
                  <span
                    className={`truncate block font-semibold text-[11px] ${
                      bet.isUser ? 'text-amber-400 font-bold' : 'text-gray-200'
                    }`}
                  >
                    {bet.isUser ? t('you') : bet.user}
                  </span>
                </div>

                {/* Side */}
                <div className="col-span-3 flex justify-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isMessi
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-600/40'
                        : 'bg-red-950/80 text-red-300 border border-red-600/40'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${isMessi ? 'bg-blue-400' : 'bg-red-400'}`} />
                    {isMessi ? 'Messi' : 'Ronaldo'}
                  </span>
                </div>

                {/* Amount */}
                <div className="col-span-2 text-right font-mono font-bold text-gray-200 text-[11px]">
                  ${bet.amount.toLocaleString()}
                </div>

                {/* Est payout */}
                <div className="col-span-3 text-right font-mono font-bold text-emerald-400 text-[11px] flex items-center justify-end gap-0.5">
                  ${bet.estPayout.toFixed(1)}
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