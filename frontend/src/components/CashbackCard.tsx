import { useEffect, useState } from 'react';
import { HandCoins } from 'lucide-react';
import { api } from '../services/api';
import { useLang } from '../i18n';
import { hapticSuccess, hapticWarning } from '../utils/telegram';
import { sound } from '../utils/audio';

interface CashbackCardProps {
  onClaimed?: () => void;
}

export const CashbackCard: React.FC<CashbackCardProps> = ({ onClaimed }) => {
  const [cashback, setCashback] = useState<number | null>(null);
  const [lastClaimed, setLastClaimed] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    let cancelled = false;

    const fetchMe = async () => {
      try {
        const { user } = await api.getMe();
        if (!cancelled && user && typeof user.cashbackBalance === 'number') {
          setCashback(user.cashbackBalance);
        }
      } catch {
        /* backend unreachable - keep last known value */
      }
    };

    fetchMe();
    const interval = setInterval(fetchMe, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const claimable = (cashback ?? 0) > 0;

  const handleClaim = async () => {
    if (claiming) return;
    sound.playClick();
    hapticSuccess();
    setClaiming(true);
    try {
      const res = await api.claimCashback();
      sound.playWin();
      setLastClaimed(res.claimed);
      setCashback(0);
      onClaimed?.();
    } catch {
      hapticWarning();
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-md pointer-events-none" />

      <div
        title={t('cashbackTip')}
        className="relative w-full bg-gradient-to-r from-[#161B22]/90 via-emerald-950/50 to-[#161B22]/90 backdrop-blur-md border border-emerald-500/40 rounded-2xl px-3 py-2 flex items-center justify-between select-none overflow-hidden"
      >
        {/* Left: label */}
        <div className="flex items-center gap-1.5 z-10 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <HandCoins className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-300/90 block leading-none">
              {t('cashbackTitle')}
            </span>
            <span className="text-[8px] font-mono text-gray-500 block mt-0.5 truncate">
              {t('cashbackTip')}
            </span>
          </div>
        </div>

        {/* Right: pending amount / claim button / claimed flash */}
        <div className="z-10 shrink-0 pl-2">
          {claimable ? (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className={`flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-black font-extrabold text-[11px] px-2.5 py-1 rounded-lg shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60 ${claiming ? 'animate-pulse' : ''}`}
            >
              <HandCoins className="w-3 h-3 stroke-[3]" />
              {(cashback ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
          ) : lastClaimed !== null ? (
            <span className="font-mono font-black text-xs text-emerald-400">
              +${lastClaimed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : (
            <span className={`font-mono font-bold text-sm ${cashback === null ? 'text-gray-500' : 'text-gray-400'}`}>
              {cashback === null ? '$ —' : `$${cashback.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
