import { Trophy, TrendingUp, Sparkles, X, Coins, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { TeamSide } from '../types/clash';
import { useLang } from '../i18n';
import messiCutout from '../assets/messi-cutout.png';
import ronaldoCutout from '../assets/ronaldo-cutout.png';

interface RoundResultModalProps {
  roundId: number;
  winner: TeamSide;
  multiplier: number;
  totalPool: number;
  winningPool: number;
  userWinnings: number | null;
  onClose: () => void;
}

export const RoundResultModal: React.FC<RoundResultModalProps> = ({
  roundId,
  winner,
  multiplier,
  totalPool,
  winningPool,
  userWinnings,
  onClose,
}) => {
  const isMessi = winner === 'messi';
  const isUserWinner = userWinnings !== null && userWinnings > 0;
  const { t } = useLang();

  const playerCutout = isMessi ? messiCutout : ronaldoCutout;
  const playerName = isMessi ? 'Lionel Messi' : 'Cristiano Ronaldo';
  const teamLabel = isMessi ? t('teamMessi') : t('teamRonaldo');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-[#161B22] border rounded-2xl w-full max-w-xs p-5 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden ${
          isMessi
            ? 'border-blue-500/60 shadow-blue-500/20'
            : 'border-red-500/60 shadow-red-500/20'
        }`}
      >
        {/* Background Ambient Glow */}
        <div
          className={`absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-25 pointer-events-none ${
            isMessi ? 'bg-blue-500' : 'bg-red-500'
          }`}
        />
        <div
          className={`absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isMessi ? 'bg-cyan-400' : 'bg-amber-500'
          }`}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-lg bg-[#0D1117] border border-[#30363D] z-20 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Ribbon */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-widest">
            {t('settlementTitle', { n: roundId })}
          </span>
        </div>

        {/* Winner Player Photo with Glowing Radial Aura */}
        <div className="relative flex justify-center items-center my-3">
          {/* Radial Glow Aura */}
          <div
            className={`absolute w-28 h-28 rounded-full blur-xl opacity-75 animate-pulse ${
              isMessi
                ? 'bg-gradient-to-tr from-blue-600 via-sky-400 to-blue-500'
                : 'bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500'
            }`}
          />

          {/* Cutout Frame Container */}
          <div
            className={`relative w-24 h-24 rounded-full p-1 border-2 overflow-hidden shadow-2xl flex items-center justify-center ${
              isMessi
                ? 'bg-gradient-to-b from-blue-900 via-blue-950 to-black border-blue-400 shadow-blue-500/50'
                : 'bg-gradient-to-b from-red-900 via-red-950 to-black border-red-400 shadow-red-500/50'
            }`}
          >
            <img
              src={playerCutout}
              alt={playerName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top scale-110"
            />
          </div>

          {/* Victory Badge */}
          <div
            className={`absolute -bottom-2 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-md ${
              isMessi
                ? 'bg-blue-600 border-blue-300 text-white'
                : 'bg-red-600 border-red-300 text-white'
            }`}
          >
            {t('winnerBadge')}
          </div>        </div>

        {/* Winner Title */}
        <div className="mt-4 mb-3">
          <h2 className="text-xl font-black text-white tracking-tight">
            {teamLabel} {t('victorious')}
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {playerName}
          </p>
        </div>

        {/* Settlement Metrics Grid: Winning Pool, Multiplier, User Profit */}
        <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-2.5 divide-y divide-[#30363D]/60 text-left">
          <div className="flex items-center justify-between py-1 text-xs">
            <span className="text-gray-400 font-mono flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {t('totalWinningPool')}
            </span>
            <span className="font-mono font-bold text-white">
              ${(winningPool || totalPool).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 text-xs">
            <span className="text-gray-400 font-mono flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              {t('payoutMultiplier')}
            </span>
            <span className="font-mono font-bold text-amber-400">
              {multiplier.toFixed(2)}x
            </span>
          </div>

          <div className="flex items-center justify-between py-1 text-xs">
            <span className="text-gray-400 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {t('yourSettlement')}
            </span>
            {userWinnings !== null && userWinnings > 0 ? (
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                +${userWinnings.toFixed(2)}
              </span>
            ) : userWinnings === 0 ? (
              <span className="font-mono font-bold text-rose-400">
                -$0.00
              </span>
            ) : (
              <span className="font-mono text-gray-500">
                {t('noBet')}
              </span>
            )}
          </div>
        </div>

        {/* User Win / Loss Highlight Callout */}
        {userWinnings !== null && (
          <div
            className={`mt-3 p-2.5 rounded-xl border text-xs font-mono ${
              isUserWinner
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            {isUserWinner ? (
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1 font-bold text-xs text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('payoutCredited')} +${userWinnings.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-emerald-400/80">{t('addedToBalance')}</p>
              </div>
            ) : (
              <div className="text-[11px]">{t('settledReadyNext')}</div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-3.5 w-full py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
        >
          {t('nextRound')}
        </button>
      </div>
    </div>
  );
};