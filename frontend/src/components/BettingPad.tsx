import { useState } from 'react';
import { DollarSign, CheckCircle2, AlertCircle, X, Repeat, Zap } from 'lucide-react';
import type { TeamSide } from '../types/clash';
import { sound } from '../utils/audio';
import { hapticLight, hapticSuccess, hapticWarning } from '../utils/telegram';
import { useLang } from '../i18n';
import messiCutout from '../assets/messi-cutout.png';
import ronaldoCutout from '../assets/ronaldo-cutout.png';

interface BettingPadProps {
  balance: number;
  phase: 'betting' | 'dropping' | 'finished';
  messiPool: number;
  ronaldoPool: number;
  userCurrentBet: { side: TeamSide; amount: number; estPayout: number } | null;
  onPlaceBet: (side: TeamSide, amount: number) => void;
  autoBet: { side: TeamSide; amount: number; remaining: number } | null;
  onStartAuto: (side: TeamSide, amount: number, rounds: number) => void;
  onCancelAuto: () => void;
}

export const BettingPad: React.FC<BettingPadProps> = ({
  balance,
  phase,
  messiPool,
  ronaldoPool,
  userCurrentBet,
  onPlaceBet,
  autoBet,
  onStartAuto,
  onCancelAuto,
}) => {
  const [amount, setAmount] = useState<number>(100);
  const [customInput, setCustomInput] = useState<string>('100');
  const [pendingBet, setPendingBet] = useState<{ side: TeamSide; amount: number } | null>(null);
  const [autoOpen, setAutoOpen] = useState<boolean>(false);
  const [autoSide, setAutoSide] = useState<TeamSide>('messi');
  const [autoRounds, setAutoRounds] = useState<string>('10');
  const { t } = useLang();

  const totalPool = messiPool + ronaldoPool;
  const messiMultiplier = messiPool > 0 ? (totalPool * 0.89) / messiPool : null;
  const ronaldoMultiplier = ronaldoPool > 0 ? (totalPool * 0.89) / ronaldoPool : null;

  const estMessiWin = amount * (messiMultiplier ?? 1.9);
  const estRonaldoWin = amount * (ronaldoMultiplier ?? 1.9);

  const presets = [100, 1000, 10000, 100000];

  const fmtPreset = (val: number) => (val >= 1000 ? `+$${val / 1000}K` : `+$${val}`);

  const handlePreset = (val: number) => {
    sound.playChip();
    hapticLight();
    const newAmount = Math.min(val, balance);
    setAmount(newAmount);
    setCustomInput(newAmount.toString());
  };

  const handleMultiply = (multiplier: number) => {
    sound.playChip();
    hapticLight();
    const newAmount = Math.min(Math.max(1, Math.round(amount * multiplier)), balance);
    setAmount(newAmount);
    setCustomInput(newAmount.toString());
  };

  const handleMax = () => {
    sound.playChip();
    hapticLight();
    setAmount(balance);
    setCustomInput(balance.toString());
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAmount(Math.min(num, balance));
    }
  };

  const isBetDisabled = phase !== 'betting' || amount <= 0 || amount > balance || !!autoBet;

  // Auto-bet config
  const autoRoundsNum = Math.max(0, Math.min(1440, parseInt(autoRounds) || 0));
  const autoCost = amount * autoRoundsNum;
  const autoStartable = phase === 'betting' && autoRoundsNum >= 1 && autoCost <= balance && !autoBet;

  return (
    <>
    <div className="w-full bg-[#161B22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg select-none space-y-2.5">
      {/* Current Active Round Bet Notification if user already bet */}
      {userCurrentBet && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-2 flex items-center justify-between text-xs font-mono text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {t('lockedBet')} <strong className="text-white">${userCurrentBet.amount}</strong>{' '}
              <strong className={userCurrentBet.side === 'messi' ? 'text-blue-400' : 'text-red-400'}>
                {userCurrentBet.side === 'messi' ? 'Messi' : 'Ronaldo'}
              </strong>{' '}
              {t('onSide')}
            </span>
          </div>
          <span className="text-amber-400 font-bold">
            {t('est')} +${userCurrentBet.estPayout.toFixed(2)}
          </span>
        </div>
      )}

      {/* Amount Input & Quick Modifiers */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <input
            type="number"
            min="1"
            max={balance}
            value={customInput}
            onChange={handleCustomChange}
            disabled={phase !== 'betting'}
            placeholder={t('amountPlaceholder')}
            className="w-full pl-7 pr-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-shadow disabled:opacity-50"
          />
        </div>

        {/* 1/2 and 2X Buttons */}
        <button
          onClick={() => handleMultiply(0.5)}
          disabled={phase !== 'betting' || amount <= 1}
          className="px-2.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] disabled:opacity-40 text-gray-300 rounded-lg text-xs font-mono font-bold active:scale-95 transition-transform cursor-pointer"
        >
          ½
        </button>
        <button
          onClick={() => handleMultiply(2)}
          disabled={phase !== 'betting' || amount * 2 > balance}
          className="px-2.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] disabled:opacity-40 text-gray-300 rounded-lg text-xs font-mono font-bold active:scale-95 transition-transform cursor-pointer"
        >
          2×
        </button>
        <button
          onClick={handleMax}
          disabled={phase !== 'betting' || balance <= 0}
          className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 disabled:opacity-40 rounded-lg text-xs font-mono font-bold active:scale-95 transition-transform cursor-pointer"
        >
          MAX
        </button>
      </div>

      {/* Preset Chips */}
      <div className="grid grid-cols-4 gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            disabled={phase !== 'betting' || preset > balance}
            className={`py-1 rounded-md text-[11px] font-mono font-bold border transition-all active:scale-95 cursor-pointer ${
              amount === preset
                ? 'bg-amber-500 text-black border-amber-400 shadow-xs shadow-amber-500/20'
                : 'bg-[#0D1117] text-gray-300 border-[#30363D] hover:border-gray-500 disabled:opacity-30'
            }`}
          >
            {fmtPreset(preset)}
          </button>
        ))}
      </div>

      {/* Auto Bet */}
      {autoBet ? (
        <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300">
            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>
              AUTO <strong className={autoBet.side === 'messi' ? 'text-blue-400' : 'text-red-400'}>
                {autoBet.side === 'messi' ? 'MESSI' : 'RONALDO'}
              </strong>{' '}
              ${autoBet.amount} × <strong className="text-white">{autoBet.remaining}</strong> {t('autoLeft', { n: autoBet.remaining })}
            </span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onCancelAuto();
            }}
            className="text-[10px] font-mono font-bold text-red-300 hover:text-red-200 border border-red-500/40 hover:border-red-400 px-2 py-0.5 rounded-md active:scale-95 transition-all cursor-pointer"
          >
            {t('cancelBtn')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            sound.playClick();
            setAutoOpen(true);
          }}
          disabled={phase !== 'betting'}
          className="w-full py-1.5 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-300 font-mono font-bold text-[11px] rounded-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <Repeat className="w-3 h-3" />
          {t('autoBetBtn')}
        </button>
      )}

      {/* Side-by-Side Main Action Buttons: Bet Messi vs Bet Ronaldo with Cutout Portraits */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {/* Bet Messi Button (Blue with Messi cutout) */}
        <button
          id="btn-bet-messi"
          onClick={() => {
            sound.playClick();
            hapticLight();
            setPendingBet({ side: 'messi', amount });
          }}
          disabled={isBetDisabled}
          className="relative group h-24 rounded-2xl overflow-hidden text-left p-2.5 flex flex-col justify-between border border-white/25 shadow-xl shadow-black/50 backdrop-blur-xl bg-gradient-to-br from-blue-400/35 via-blue-700/40 to-blue-950/70 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {/* iOS-style top sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 via-white/5 to-transparent z-10" />
          {/* Inner ring highlight */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl z-10" />

          {/* Messi Cutout Image - zoomed, bleeding off the right edge */}
          <div className="absolute inset-y-0 right-0 w-24 pointer-events-none z-10">
            <img
              src={messiCutout}
              alt="Messi"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{ WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent 98%)', maskImage: 'linear-gradient(to left, black 55%, transparent 98%)' }}
              className="w-full h-full object-cover object-top scale-[1.7] origin-top opacity-90 group-hover:opacity-100 transition-all duration-300"
            />
          </div>

          {/* Dark Gradient Overlay Mask behind text for crisp legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-950/70 to-transparent pointer-events-none z-10" />

          {/* Foreground Text & Stats */}
          <div className="relative z-20">
            <h3 className="font-black text-sm tracking-tight text-white leading-none drop-shadow-md">
              BET MESSI
            </h3>
          </div>

          <div className="relative z-20 flex items-center justify-between pt-1 border-t border-blue-400/20 text-[10px] font-mono">
            <span className="bg-blue-900/90 border border-blue-400/40 px-1.5 py-0.5 rounded text-blue-200 font-bold">
              {messiMultiplier ? `${messiMultiplier.toFixed(2)}x` : '—'}
            </span>
            <span className="text-blue-100 font-bold">
              Win: ${(estMessiWin || 0).toFixed(1)}
            </span>
          </div>
        </button>

        {/* Bet Ronaldo Button (Red with Ronaldo cutout) */}
        <button
          id="btn-bet-ronaldo"
          onClick={() => {
            sound.playClick();
            hapticLight();
            setPendingBet({ side: 'ronaldo', amount });
          }}
          disabled={isBetDisabled}
          className="relative group h-24 rounded-2xl overflow-hidden text-left p-2.5 flex flex-col justify-between border border-white/25 shadow-xl shadow-black/50 backdrop-blur-xl bg-gradient-to-br from-red-400/35 via-red-700/40 to-red-950/70 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {/* iOS-style top sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 via-white/5 to-transparent z-10" />
          {/* Inner ring highlight */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl z-10" />

          {/* Ronaldo Cutout Image - zoomed, bleeding off the right edge */}
          <div className="absolute inset-y-0 right-0 w-24 pointer-events-none z-10">
            <img
              src={ronaldoCutout}
              alt="Ronaldo"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{ WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent 98%)', maskImage: 'linear-gradient(to left, black 55%, transparent 98%)' }}
              className="w-full h-full object-cover object-top scale-[1.7] origin-top opacity-90 group-hover:opacity-100 transition-all duration-300"
            />
          </div>

          {/* Dark Gradient Overlay Mask behind text for crisp legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/90 via-red-950/70 to-transparent pointer-events-none z-10" />

          {/* Foreground Text & Stats */}
          <div className="relative z-20">
            <h3 className="font-black text-sm tracking-tight text-white leading-none drop-shadow-md">
              BET RONALDO
            </h3>
          </div>

          <div className="relative z-20 flex items-center justify-between pt-1 border-t border-red-400/20 text-[10px] font-mono">
            <span className="bg-red-900/90 border border-red-400/40 px-1.5 py-0.5 rounded text-red-200 font-bold">
              {ronaldoMultiplier ? `${ronaldoMultiplier.toFixed(2)}x` : '—'}
            </span>
            <span className="text-red-100 font-bold">
              Win: ${(estRonaldoWin || 0).toFixed(1)}
            </span>
          </div>
        </button>
      </div>

      {amount > balance && (
        <div className="flex items-center justify-center gap-1 text-[11px] text-red-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{t('insufficientTopUpHint')}</span>
        </div>
      )}
    </div>
      {/* Bet Confirmation Modal — outside backdrop-blur container so fixed isn't clipped (fixes overlap over BET buttons) */}
      {pendingBet && (() => {
        const isMessi = pendingBet.side === 'messi';
        const mult = (isMessi ? messiMultiplier : ronaldoMultiplier) ?? 1.9;
        const estWin = pendingBet.amount * mult;
        return (
          <div
            className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPendingBet(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`bg-[#161B22] border rounded-2xl w-full max-w-xs p-5 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150 relative ${
                isMessi
                  ? 'border-blue-500/60 shadow-blue-500/20'
                  : 'border-red-500/60 shadow-red-500/20'
              }`}
            >
              {/* Close */}
              <button
                onClick={() => setPendingBet(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-lg bg-[#0D1117] border border-[#30363D]"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Player cutout thumb */}
              <div
                className={`relative w-20 h-20 mx-auto mt-2 mb-3 rounded-full overflow-hidden border-2 ${
                  isMessi ? 'border-blue-400' : 'border-red-400'
                }`}
              >
                <img
                  src={isMessi ? messiCutout : ronaldoCutout}
                  alt={isMessi ? 'Messi' : 'Ronaldo'}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="w-full h-full object-cover object-top scale-125"
                />
              </div>

              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                {t('confirmBetOn')}
              </p>
              <h2
                className={`text-xl font-black tracking-tight ${
                  isMessi ? 'text-blue-400' : 'text-red-400'
                }`}
              >
                {isMessi ? 'MESSI' : 'RONALDO'}
              </h2>

              <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-2.5 divide-y divide-[#30363D]/60 text-left my-3 font-mono text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">{t('amountPlaceholder')}</span>
                  <span className="font-bold text-white">${pendingBet.amount}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">{t('payoutMultiplier')}</span>
                  <span className="font-bold text-amber-400">{mult.toFixed(2)}x</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">{t('potentialWin')}</span>
                  <span className="font-bold text-emerald-400">+${estWin.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setPendingBet(null)}
                  className="py-2.5 bg-[#21262D] hover:bg-[#30363D] text-gray-300 font-extrabold text-xs rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  onClick={() => {
                    if (phase !== 'betting') {
                      hapticWarning();
                      setPendingBet(null);
                      return;
                    }
                    sound.playBetPlaced();
                    hapticSuccess();
                    onPlaceBet(pendingBet.side, pendingBet.amount);
                    setPendingBet(null);
                  }}
                  disabled={phase !== 'betting'}
                  className={`py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40 ${
                    phase !== 'betting' ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  {t('confirmN', { n: pendingBet.amount })}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Auto-Bet Configuration Modal — outside container */}
      {autoOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAutoOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#161B22] border border-violet-500/50 rounded-2xl w-full max-w-xs p-5 shadow-2xl shadow-violet-500/10 text-left animate-in fade-in zoom-in-95 duration-150 relative"
          >
            <button
              onClick={() => setAutoOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-lg bg-[#0D1117] border border-[#30363D]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-violet-400" />
              {t('autoBetTitle')}
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
              {t('autoBetDesc', { amt: amount })}
            </p>

            {/* Side picker */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(['messi', 'ronaldo'] as TeamSide[]).map((side) => (
                <button
                  key={side}
                  onClick={() => {
                    sound.playChip();
                    setAutoSide(side);
                  }}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all active:scale-95 cursor-pointer ${
                    autoSide === side
                      ? side === 'messi'
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-red-600 text-white border-red-400'
                      : 'bg-[#0D1117] text-gray-300 border-[#30363D]'
                  }`}
                >
                  {side === 'messi' ? 'MESSI' : 'RONALDO'}
                </button>
              ))}
            </div>

            {/* Rounds input */}
            <label className="text-[10px] text-gray-400 font-mono block mt-3 mb-1">
              {t('roundsMax')}
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={autoRounds}
              onChange={(e) => setAutoRounds(e.target.value)}
              placeholder="10"
              disabled={phase !== 'betting'}
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-violet-400 disabled:opacity-50"
            />
            <div className="flex gap-1.5 mt-1.5">
              {[10, 50, 100, 500, 1440].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    sound.playChip();
                    setAutoRounds(String(r));
                  }}
                  className={`flex-1 py-1 rounded-md text-[10px] font-mono font-bold border transition-all active:scale-95 cursor-pointer ${
                    autoRoundsNum === r
                      ? 'bg-violet-500 text-black border-violet-400'
                      : 'bg-[#0D1117] text-gray-300 border-[#30363D]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Cost summary */}
            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-2.5 mt-3 space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{t('totalPrepaid')}</span>
                <span className={`font-bold ${autoCost > balance ? 'text-red-400' : 'text-amber-400'}`}>
                  ${autoCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('balanceAfter')}</span>
                <span className="font-bold text-gray-200">
                  ${(Math.max(0, balance - autoCost)).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (!autoStartable) return;
                sound.playBetPlaced();
                onStartAuto(autoSide, amount, autoRoundsNum);
                setAutoOpen(false);
              }}
              disabled={!autoStartable}
              className="mt-3.5 w-full py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-400 hover:from-violet-400 hover:to-fuchsia-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {autoCost > balance
                ? t('insufficientBalance')
                : phase !== 'betting'
                ? t('roundInProgress')
                : t('startAuto', { n: autoCost.toLocaleString() })}
            </button>
          </div>
        </div>
      )}
    </>
  );
};