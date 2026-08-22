import { Trophy } from 'lucide-react';

interface PoolBarProps {
  messiPool: number;
  ronaldoPool: number;
}

export const PoolBar: React.FC<PoolBarProps> = ({ messiPool, ronaldoPool }) => {
  const totalPool = messiPool + ronaldoPool;
  const messiPct = totalPool > 0 ? (messiPool / totalPool) * 100 : 50;
  const ronaldoPct = 100 - messiPct;

  // Multipliers formula (House edge ~4%): Multiplier = (TotalPool * 0.96) / SidePool
  const messiMultiplier = messiPool > 0 ? ((totalPool * 0.96) / messiPool) : 1.92;
  const ronaldoMultiplier = ronaldoPool > 0 ? ((totalPool * 0.96) / ronaldoPool) : 1.92;

  return (
    <div className="w-full bg-[#161B22] border border-[#30363D] rounded-xl p-2.5 shadow-md">
      {/* Top Header info */}
      <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
        <div className="flex items-center gap-1.5 text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-xs shadow-blue-400" />
          <span className="font-extrabold font-sans tracking-wide">MESSI</span>
          <span className="bg-blue-950/80 border border-blue-600/40 text-blue-300 px-1.5 py-0.2 rounded font-bold text-[11px]">
            {messiMultiplier.toFixed(2)}x
          </span>
        </div>

        <div className="text-gray-400 text-[11px] font-mono flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-400" />
          <span>Pool: ${totalPool.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1.5 text-red-400">
          <span className="bg-red-950/80 border border-red-600/40 text-red-300 px-1.5 py-0.2 rounded font-bold text-[11px]">
            {ronaldoMultiplier.toFixed(2)}x
          </span>
          <span className="font-extrabold font-sans tracking-wide">RONALDO</span>
          <span className="w-2 h-2 rounded-full bg-red-400 shadow-xs shadow-red-400" />
        </div>
      </div>

      {/* Dual Progress Bar */}
      <div className="relative h-4 bg-[#0D1117] rounded-full overflow-hidden flex border border-[#30363D]/80">
        {/* Messi Blue Fill */}
        <div
          style={{ width: `${messiPct}%` }}
          className="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 transition-all duration-300 relative flex items-center justify-start px-2"
        >
          <span className="text-[10px] font-black text-white drop-shadow-xs z-10">
            {messiPct.toFixed(0)}%
          </span>
        </div>

        {/* Center Split Indicator */}
        <div className="w-1 bg-white shadow-md shadow-white z-20 h-full" />

        {/* Ronaldo Red Fill */}
        <div
          style={{ width: `${ronaldoPct}%` }}
          className="h-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 transition-all duration-300 relative flex items-center justify-end px-2"
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
    </div>
  );
};