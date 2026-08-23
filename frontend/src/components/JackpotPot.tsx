import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { api } from '../services/api';
import { useLang } from '../i18n';

export const JackpotPot: React.FC = () => {
  const [jackpot, setJackpot] = useState<number | null>(null);
  const { t } = useLang();

  useEffect(() => {
    let cancelled = false;

    const fetchVault = async () => {
      try {
        const { vault } = await api.getVault();
        if (!cancelled && vault && typeof vault.jackpotVaultBalance === 'number') {
          setJackpot(vault.jackpotVaultBalance);
        }
      } catch {
        /* backend unreachable - keep last known value */
      }
    };

    fetchVault();
    const interval = setInterval(fetchVault, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative w-full">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-xl bg-amber-500/10 blur-md pointer-events-none" />

      <div className="relative w-full bg-gradient-to-r from-[#161B22] via-amber-950/40 to-[#161B22] border border-amber-500/40 rounded-xl px-3 py-2 flex items-center justify-between select-none overflow-hidden">
        {/* Left: label */}
        <div className="flex items-center gap-1.5 z-10">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-300/90">
            {t('jackpotPot')}
          </span>
        </div>

        {/* Right: amount + odds */}
        <div className="flex items-center gap-2 z-10">
          <span className="text-[9px] font-mono text-gray-400 hidden xs:inline">
            {t('jackpotOddsVal')}
          </span>
          <span
            title={t('jackpotTip')}
            className="font-mono font-black text-sm text-amber-400 drop-shadow-sm animate-pulse"
          >
            {jackpot === null ? '$ —' : `$${jackpot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        </div>
      </div>
    </div>
  );
};