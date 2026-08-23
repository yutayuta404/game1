import { useRef, useState } from 'react';
import {
  ArrowLeft, ChevronDown, Camera, CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../utils/audio';
import { useLang } from '../i18n';

interface PaymentFormModalProps {
  mode: 'topup' | 'withdraw';
  withdrawable: number;
  onClose: () => void;
  onSubmitted?: () => void;
}

const PACKAGES = [
  { mmk: 3000, coins: 3000 },
  { mmk: 5000, coins: 5000 },
  { mmk: 9000, coins: 9000 },
  { mmk: 20000, coins: 21500 }, // bonus tier
];

const PLATFORMS = [
  { name: 'Kpay', logoBg: 'bg-[#0085C9]', logoText: 'KBZ Pay', textColor: 'text-white' },
  { name: 'Wave', logoBg: 'bg-[#FFE600]', logoText: 'WAVE money', textColor: 'text-slate-900' },
  { name: 'Ayapay', logoBg: 'bg-gradient-to-br from-red-500 to-red-700', logoText: 'AYA PAY', textColor: 'text-white' },
] as const;

const inputCls = 'w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2.5 text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-400 placeholder-gray-500';
const labelCls = 'text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-1';

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  mode, withdrawable, onClose, onSubmitted,
}) => {
  const [pkgIdx, setPkgIdx] = useState(1);
  const [platform, setPlatform] = useState<string>('');
  const [platformOpen, setPlatformOpen] = useState(false);
  const [txnRef, setTxnRef] = useState('');
  const [screenshot, setScreenshot] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [showProcess, setShowProcess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useLang();

  const pkg = PACKAGES[pkgIdx];
  const isTopup = mode === 'topup';
  const amt = Number(amount) || 0;

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setError(t('imageTooLarge')); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setScreenshot(String(reader.result || ''));
    reader.readAsDataURL(f);
  };

  const canSubmitTopup = !!(platform && txnRef.trim());
  const canSubmitWithdraw = !!(amt > 0 && amt <= withdrawable && platform && accountNumber.trim());

  const submit = async () => {
    if (submitting) return;
    setError('');
    if (isTopup && !canSubmitTopup) { setError(t('errTopupMissing')); return; }
    if (!isTopup && !canSubmitWithdraw) { setError(t('errWithdrawInvalid')); return; }
    setSubmitting(true);
    try {
      await api.createPaymentRequest(isTopup ? {
        type: 'TOPUP',
        coins: pkg.coins,
        packageLabel: `${pkg.mmk.toLocaleString()} MMK · ${pkg.coins.toLocaleString()} ${t('coinsWord')}`,
        platform,
        txnRef,
        screenshot: screenshot || undefined,
      } : {
        type: 'WITHDRAW',
        coins: amt,
        platform,
        accountNumber,
        txnRef: txnRef || undefined,
      });
      sound.playBetPlaced();
      setDone(true);
      onSubmitted?.();
      setTimeout(onClose, 1600);
    } catch (e: any) {
      setError(e?.message || t('submissionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- success screen ---------- */
  if (done) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-xs bg-[#161B22] border border-emerald-500/50 rounded-2xl shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-extrabold text-white mt-3">{t('requestSubmitted')}</h2>
          <p className="text-xs text-gray-400 leading-relaxed mt-1.5">
            {isTopup ? t('topupSuccessNote') : t('withdrawSuccessNote')}
          </p>
          <span className="inline-block mt-3 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-mono uppercase tracking-widest">
            {t('pendingReview')}
          </span>
        </div>
      </div>
    );
  }

  /* ---------- main form ---------- */
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto no-scrollbar bg-[#0D1117] border border-[#30363D] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="sticky top-0 z-40 bg-[#0D1117]/95 backdrop-blur px-4 py-3 flex items-center gap-3 border-b border-[#30363D]">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#161B22] border border-[#30363D] text-gray-400 hover:text-white active:scale-95 transition-all cursor-pointer"
            aria-label={t('back')}
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <h1 className="text-base font-extrabold text-white tracking-tight">
            {t('paymentFormMain')} <span className="text-amber-400">{t('paymentFormAccent')}</span>
          </h1>
        </div>

        <div className="px-4 pb-5 pt-4 space-y-4">
          {/* ===== TOPUP ONLY ===== */}
          {isTopup && (
            <>
              <div>
                <SectionLabel>{t('paymentInfo')}</SectionLabel>
                <p className="text-gray-500 text-xs font-mono -mt-0.5">
                  {t('nameLabel')} Nyein Chan Latt · {t('payNoLabel')}&nbsp;<span className="text-amber-400">09260096272</span>
                </p>
              </div>

              {/* Coin package */}
              <div>
                <SectionLabel>{t('selectCoinPackage')}</SectionLabel>
                <div className="relative">
                  <select
                    value={pkgIdx}
                    onChange={(e) => { sound.playChip(); setPkgIdx(Number(e.target.value)); }}
                    className={`${inputCls} appearance-none pr-9 cursor-pointer`}
                  >
                    {PACKAGES.map((p, i) => (
                      <option key={i} value={i}>
                        {p.mmk.toLocaleString()} MMK → {p.coins.toLocaleString()} {t('coinsWord')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Platform */}
              <div>
                <SectionLabel>{t('selectPlatform')}</SectionLabel>
                <div className="relative">
                  <button
                    onClick={() => setPlatformOpen((o) => !o)}
                    className={`${inputCls} flex items-center justify-between cursor-pointer`}
                  >
                    <span className={platform ? '' : 'text-gray-500'}>{platform || t('selectPlatformPh')}</span>
                    <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${platformOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {platformOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-xl z-30">
                      {PLATFORMS.map((pl) => (
                        <button
                          key={pl.name}
                          onClick={() => { sound.playClick(); setPlatform(pl.name); setPlatformOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                        >
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-[7px] font-black leading-tight text-center px-0.5 shrink-0 ${pl.logoBg} ${pl.textColor}`}>
                            {pl.logoText}
                          </span>
                          <span className="text-white font-bold text-xs">{pl.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction No */}
              <div>
                <SectionLabel>{t('txnNoId')}</SectionLabel>
                <input
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  placeholder={t('txnRefPh')}
                  className={inputCls}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  {t('txnHint', { phone: '09260096272' })}
                </p>
              </div>

              {/* Screenshot dropzone */}
              <div>
                <SectionLabel>{t('paymentScreenshot')}</SectionLabel>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-44 bg-[#10161d] border border-dashed border-[#30363D] hover:border-amber-400/60 rounded-xl flex items-center justify-center cursor-pointer transition-colors overflow-hidden"
                >
                  {screenshot ? (
                    <img src={screenshot} alt="receipt" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-6 text-center">
                      <Camera className="w-8 h-8 text-amber-400/70" />
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {t('attachReceipt')}
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                <div className="flex justify-center mt-2.5">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-8 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" /> {t('chooseImage')}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ===== WITHDRAW ONLY ===== */}
          {!isTopup && (
            <>
              <SectionLabel>{t('withdrawalInfo')}</SectionLabel>
              <div className="flex items-center justify-between bg-[#161B22] border border-emerald-500/40 rounded-xl px-4 py-3">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{t('withdrawable')}</span>
                <span className="font-mono font-black text-emerald-400">
                  ${withdrawable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <SectionLabel>{t('coinsAmount')}</SectionLabel>
                <input
                  type="number"
                  min="1"
                  max={withdrawable}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>

              <SectionLabel>{t('selectPlatform')}</SectionLabel>
              <div className="relative">
                <button
                  onClick={() => setPlatformOpen((o) => !o)}
                  className={`${inputCls} flex items-center justify-between cursor-pointer`}
                >
                  <span className={platform ? '' : 'text-gray-500'}>{platform || t('selectPlatformPh')}</span>
                  <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${platformOpen ? 'rotate-180' : ''}`} />
                </button>
                {platformOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-xl z-30">
                    {PLATFORMS.map((pl) => (
                      <button
                        key={pl.name}
                        onClick={() => { sound.playClick(); setPlatform(pl.name); setPlatformOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                      >
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-[7px] font-black leading-tight text-center px-0.5 shrink-0 ${pl.logoBg} ${pl.textColor}`}>
                          {pl.logoText}
                        </span>
                        <span className="text-white font-bold text-xs">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <SectionLabel>{t('accountNumber')}</SectionLabel>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={t('egPhone')}
                className={inputCls}
              />
              <p className="text-[10px] text-gray-500 -mt-2">
                {t('escrowHint')}
              </p>
            </>
          )}

          {/* Payment process info */}
          <button
            onClick={() => setShowProcess((v) => !v)}
            className="mx-auto block text-[10px] font-mono text-amber-400 underline underline-offset-2 cursor-pointer"
          >
            {showProcess ? t('hideProcess') : t('viewProcess')}
          </button>
          {showProcess && (
            <div className="bg-[#10161d] border border-[#30363D] rounded-xl p-4 space-y-2 text-xs text-gray-300 leading-relaxed">
              {isTopup ? (
                <>
                  <p className="font-bold text-white">{t('topupProcessTitle')}</p>
                  <p>{t('topupStep1', { phone: '09260096272' })}</p>
                  <p>{t('topupStep2')}</p>
                  <p>{t('topupStep3')}</p>
                  <p>{t('topupStep4')}</p>
                  <p>{t('topupStep5')}</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-white">{t('withdrawProcessTitle')}</p>
                  <p>{t('withdrawStep1')}</p>
                  <p>{t('withdrawStep2')}</p>
                  <p>{t('withdrawStep3')}</p>
                  <p>{t('withdrawStep4')}</p>
                  <p>{t('withdrawStep5')}</p>
                </>
              )}
              <button
                onClick={() => setShowProcess(false)}
                className="w-full mt-2 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs rounded-lg active:scale-95 transition-all cursor-pointer"
              >
                {t('ok')}
              </button>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-red-400 text-xs text-center font-mono">{error}</p>}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={submitting || (isTopup ? !canSubmitTopup : !canSubmitWithdraw)}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>

          <p className="text-center text-[10px] text-gray-600">
            {t('reviewNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ---------- subcomponents ---------- */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className={labelCls}>{children}</label>
);