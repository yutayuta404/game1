import { useEffect, useState } from 'react';
import { Coins, LogOut, Plus, Minus, User as UserIcon, Flame, HandCoins, Globe } from 'lucide-react';
import { sound } from '../utils/audio';
import { api } from '../services/api';
import { useLang, type Lang } from '../i18n';

interface ProfileTabProps {
  username: string;
  balance: number;
  withdrawable: number;
  cashback: number;
  roundId: number;
  sessionBets: number;
  sessionStaked: number;
  onLogout: () => void;
  onOpenTopUp: () => void;
  onWithdraw: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  username,
  balance,
  withdrawable,
  cashback,
  roundId,
  sessionBets,
  sessionStaked,
  onLogout,
  onOpenTopUp,
  onWithdraw,
}) => {
  const [payments, setPayments] = useState<any[] | null>(null);
  const [claiming, setClaiming] = useState(false);
  const { t, lang, setLang } = useLang();

  const handleClaim = async () => {
    if (claiming || cashback <= 0) return;
    sound.playClick();
    setClaiming(true);
    try {
      await api.claimCashback();
      sound.playWin();
    } catch {
      /* stale amount — next refresh fixes it */
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api.getMyPayments()
      .then((r) => { if (!cancelled) setPayments(r.requests || []); })
      .catch(() => { if (!cancelled) setPayments([]); });
    return () => { cancelled = true; };
  }, []);
  const initial = (username || 'P').charAt(0).toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 pb-24 no-scrollbar select-none">
      {/* Identity card */}
      <div className="relative w-full bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-amber-500 to-red-600 flex items-center justify-center shadow-md shadow-amber-500/20">
              <span className="text-2xl font-black text-white drop-shadow-md">{initial}</span>
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#161B22] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-black text-white tracking-tight truncate flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-gray-400" />
              {username || 'Player'}
            </h2>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5">
              {t('playerRound', { n: roundId })}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                {t('active')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance card */}
      <div className="w-full bg-gradient-to-r from-[#161B22] via-amber-950/30 to-[#161B22] border border-amber-500/40 rounded-2xl p-4 shadow-lg relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" /> {t('totalBalance')}
            </p>
            <p className="text-2xl font-mono font-black text-amber-400 mt-0.5">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onOpenTopUp();
              }}
              className="flex items-center justify-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              {t('topUp')}
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onWithdraw();
              }}
              disabled={withdrawable <= 0}
              className="flex items-center justify-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 font-extrabold text-xs px-3 py-2 rounded-xl active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
              {t('withdraw')}
            </button>
          </div>
        </div>

        {/* Withdrawable split */}
        <div className="relative mt-3 pt-3 border-t border-[#30363D]/70 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-400">{t('withdrawable')}</span>
            <span className="font-bold text-emerald-400">
              ${withdrawable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-400">{t('lockedFunds')}</span>
            <span className={`font-bold ${(balance - withdrawable) > 0 ? 'text-orange-300' : 'text-gray-500'}`}>
              ${Math.max(0, balance - withdrawable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[9px] text-gray-500 leading-relaxed pt-0.5">
            {t('unlockHint')}
          </p>
          {/* Pending cashback + claim */}
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#30363D]/70">
            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
              <HandCoins className="w-3 h-3 text-emerald-400" /> {t('cashbackTitle')}
            </span>
            {cashback > 0 ? (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] px-2 py-0.5 rounded-md active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                {t('cashbackClaim')} ${cashback.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </button>
            ) : (
              <span className="font-bold text-gray-500">$0.00</span>
            )}
          </div>
        </div>
      </div>

      {/* Session stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">{t('betsPlaced')}</p>
          <p className="text-xl font-mono font-black text-white mt-1">{sessionBets}</p>
        </div>
        <div className="bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">{t('totalStaked')}</p>
          <p className="text-xl font-mono font-black text-emerald-400 mt-1">
            ${sessionStaked.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Fee system info */}
      <div className="w-full bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 space-y-1.5 shadow-lg">
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-1">{t('houseRules')}</p>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-gray-400">{t('prizePool')}</span>
          <span className="font-bold text-white">89%</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-gray-400">{t('houseFee')}</span>
          <span className="font-bold text-blue-300">10%</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-gray-400 flex items-center gap-1">
            <HandCoins className="w-3 h-3 text-emerald-400" /> {t('cashbackRate')}
          </span>
          <span className="font-bold text-emerald-400">1%</span>
        </div>
      </div>

      {/* Language selector */}
      <div className="w-full bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg">
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-blue-400" /> {t('language')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'en' as Lang, label: 'English', flag: '🇬🇧' },
            { id: 'my' as Lang, label: 'မြန်မာ', flag: '🇲🇲' },
          ]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                if (lang !== opt.id) {
                  sound.playClick();
                  setLang(opt.id);
                }
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                lang === opt.id
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-400 shadow-sm shadow-amber-500/20'
                  : 'bg-[#0D1117] text-gray-300 border-[#30363D] hover:border-gray-500'
              }`}
            >
              <span>{opt.flag}</span>
              <span>{opt.label}</span>
              {lang === opt.id && <span className="ml-0.5">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="w-full bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363D]/70 bg-white/[0.03]">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">{t('transactionHistory')}</p>
        </div>
        <div className="divide-y divide-[#30363D]/40 max-h-72 overflow-y-auto no-scrollbar">
          {payments === null ? (
            <p className="text-center text-[11px] text-gray-500 py-5 font-mono">{t('loading')}</p>
          ) : payments.length === 0 ? (
            <p className="text-center text-[11px] text-gray-500 py-6 font-mono">
              {t('noPaymentsYet')}
            </p>
          ) : (
            payments.map((pr) => {
              const isTopupReq = pr.type === 'TOPUP';
              const statusChip =
                pr.status === 'APPROVED'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                  : pr.status === 'REJECTED'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse';
              return (
                <div key={pr.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                        isTopupReq
                          ? 'bg-blue-950/60 text-blue-300 border-blue-600/40'
                          : 'bg-violet-950/60 text-violet-300 border-violet-600/40'
                      }`}>
                        {t(pr.type as 'TOPUP' | 'WITHDRAW')}
                      </span>
                      <span className={`font-mono font-bold text-sm ${isTopupReq ? 'text-emerald-400' : 'text-orange-300'}`}>
                        {isTopupReq ? '+' : '−'}{Number(pr.coins).toLocaleString()} 🪙
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                      {pr.platform}{pr.txnRef ? ` · ${pr.txnRef}` : ''} ·{' '}
                      {new Date(pr.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusChip}`}>
                    {t(pr.status as 'PENDING' | 'APPROVED' | 'REJECTED')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => {
          sound.playClick();
          onLogout();
        }}
        className="w-full py-3 bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 font-extrabold text-xs rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        {t('logOut')}
      </button>
    </div>
  );
};