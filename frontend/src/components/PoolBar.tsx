import { Trophy } from 'lucide-react';
import { useLang } from '../i18n';

interface PoolBarProps {
  messiPool: number;
  ronaldoPool: number;
}

export const PoolBar: React.FC<PoolBarProps> = ({ messiPool, ronaldoPool }) => {
  const { t } = useLang();
  const totalPool = messiPool + ronaldoPool;
  const messiPct = totalPool > 0 ? (messiPool / totalPool) * 100 : 50;
  const ronaldoPct = 100 - messiPct;

  // Multipliers formula (House edge ~11%: Multiplier = (TotalPool * 0.89) / SidePool
  const messiMultiplier = messiPool > 0 ? ((totalPool * 0.89) / messiPool) : null;
  const ronaldoMultiplier = ronaldoPool > 0 ? ((totalPool * 0.89) / ronaldoPool) : null;

  return (
    <div className="w-full bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg">
      {/* Top Header info */}
      <div className="flex items-center justify-between text-xs mb-2 font-mono">
        <div className="flex items-center gap-1.5 text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-sm shadow-blue-400 live-dot" />
          <span className="font-extrabold font-sans tracking-wide">MESSI</span>
          <span className="bg-blue-950/80 border border-blue-600/40 text-blue-300 px-1.5 py-[1px] rounded font-bold text-[11px]">
            {messiMultiplier ? `${messiMultiplier.toFixed(2)}x` : '—'}
          </span>
        </div>

        <div className="text-gray-400 text-[11px] font-mono flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-400" />
          <span>{t('poolLabel')} ${totalPool.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1.5 text-red-400">
          <span className="bg-red-950/80 border border-red-600/40 text-red-300 px-1.5 py-[1px] rounded font-bold text-[11px]">
            {ronaldoMultiplier ? `${ronaldoMultiplier.toFixed(2)}x` : '—'}
          </span>
          <span className="font-extrabold font-sans tracking-wide">RONALDO</span>
          <span className="w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400 live-dot" />
        </div>
      </div>

      {totalPool === 0 ? (
        /* Empty state — no real bets yet */
        <div className="h-4 rounded-full bg-[#0D1117] border border-[#30363D]/80 flex items-center justify-center">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{t('noBetsYet')}</span>
        </div>
      ) : (
        <>
          {/* Dual Progress Bar */}
          <div className="relative h-4 bg-[#0D1117] rounded-full overflow-hidden flex border border-white/10 shadow-inner shadow-black/40">
            {/* Messi Blue Fill */}
            <div
              style={{ width: `${messiPct}%` }}
              className="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 transition-all duration-500 ease-out relative flex items-center justify-start px-2"
            >
              <span className="text-[10px] font-black text-white drop-shadow-xs z-10">
                {messiPct.toFixed(0)}%
              </span>
            </div>

            {/* Center Split Indicator */}
            <div className="w-[3px] bg-white/90 rounded-full shadow-md z-20 h-full" />

            {/* Ronaldo Red Fill */}
            <div
              style={{ width: `${ronaldoPct}%` }}
              className="h-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 transition-all duration-500 ease-out relative flex items-center justify-end px-2"
            >
              <span className="text-[10px] font-black text-white drop-shadow-xs z-10">
                {ronaldoPct.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Pool Amounts under bar */}
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mt-1 px-1">
            <span className="text-blue-300 font-semibold">${messiPool.toLocaleString()}</span>
            <span className="text-gray-500 uppercase tracking-widest text-[9px] font-sans font-bold">vs</span>
            <span className="text-red-300 font-semibold">${ronaldoPool.toLocaleString()}</span>
          </div>
        </>
      )}
    </div>
  );
};
