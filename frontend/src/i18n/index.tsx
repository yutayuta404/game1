import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'my';

// NOTE: bet buttons (BET MESSI / BET RONALDO), numbers and the 0XDUEL brand
// intentionally stay in English in both languages.
const en = {
  // Tabs
  tabGame: 'Game',
  tabChat: 'Chat',
  tabProfile: 'Profile',

  // Header
  roundNo: 'Round #{n}',
  topUp: 'Top Up',
  withdraw: 'Withdraw',
  muteSound: 'Mute sound',
  unmuteSound: 'Unmute sound',

  // Countdown / canvas
  dropping: 'DROPPING',
  dropBang: 'DROP!',
  settling: 'SETTLING',

  // History ribbon
  last10Rounds: 'Last 10 Rounds',
  messiWon: 'Messi Won',
  ronaldoWon: 'Ronaldo Won',
  winningMultiplier: 'Winning Multiplier',
  totalPoolVolume: 'Total Pool Volume',
  messiPool: 'Messi Pool',
  ronaldoPool: 'Ronaldo Pool',
  close: 'Close',

  // Pool bar
  poolLabel: 'Pool:',
  noBetsYet: 'No bets yet — be the first',

  // Jackpot
  jackpotPot: 'Jackpot Pot',
  jackpotOddsVal: '1 in 2,076',
  jackpotTip: 'Grows with every bet (1% of each wager)',

  // Live bets
  liveBets: 'Live Bets',
  betThisRound: '{n} bet this round',
  betsThisRound: '{n} bets this round',
  you: 'You',

  // Profile
  playerRound: 'Player · Round #{n}',
  active: 'Active',
  totalBalance: 'Total Balance',
  withdrawable: 'Withdrawable',
  lockedFunds: 'Locked (needs play)',
  unlockHint: 'Only winnings and refunds become withdrawable. Deposits and the $100 signup bonus stay locked.',
  betsPlaced: 'Bets Placed',
  totalStaked: 'Total Staked',
  houseRules: 'House Rules',
  prizePool: 'Prize pool',
  houseFee: 'House fee',
  jackpotFee: 'Jackpot fee',
  jackpotOdds: 'Jackpot odds',
  transactionHistory: 'Transaction History',
  loading: 'Loading…',
  noPaymentsYet: 'No deposits or withdrawals yet.',
  logOut: 'Log Out',
  language: 'Language',
  langEnName: 'English',
  langMyName: 'မြန်မာ',

  // Status chips
  TOPUP: 'TOPUP',
  WITHDRAW: 'WITHDRAW',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',

  // Betting pad
  lockedBet: 'Locked Bet:',
  onSide: 'on',
  est: 'Est.',
  amountPlaceholder: 'Amount',
  autoBetBtn: 'AUTO BET — up to 1440 prepaid rounds',
  autoLeft: '{n} left',
  confirmBetOn: 'Confirm your bet on',
  payoutMultiplier: 'Payout multiplier',
  potentialWin: 'Potential win',
  cancelBtn: 'Cancel',
  confirmN: 'Confirm ${n}',
  autoBetTitle: 'Auto Bet',
  autoBetDesc: 'Prepay up to 1,440 rounds at ${amt} each. Bets repeat every round on your chosen side. Cancel anytime — current round stays committed.',
  roundsMax: 'Rounds (max 1440)',
  totalPrepaid: 'Total prepaid',
  balanceAfter: 'Balance after',
  insufficientBalance: 'Insufficient balance',
  roundInProgress: 'Round in progress',
  startAuto: 'Start Auto — ${n}',
  insufficientTopUpHint: 'Insufficient balance. Tap + Top Up to deposit.',

  // Chat
  communityFeed: 'Community Live Feed',
  chatting: '{n} chatting',
  highRollerAlert: 'High Roller Alert',
  systemNotice: 'System Notice',
  typeMessage: 'Type a message...',
  quick1: 'Messi GOAT!',
  quick2: 'CR7 Siuuu!',
  quick3: 'All In!',
  quick4: 'Next round bounce!',
  quick5: 'Big Win!',

  // GamePage
  welcomeMessage: 'Welcome to 0XDUEL! Pick your side: Team Messi vs Team Ronaldo. 60s per round!',
  loginTagline: 'Messi vs Ronaldo — 60s Prediction Duels',
  enterUsername: 'Enter username...',
  loggingIn: 'Logging in...',
  startPlaying: 'Start Playing',
  highRollerMsg: 'High Roller: You placed ${n} on {side}!',
  roundSettledMsg: 'Round settled: {side} won! {mult}x (${total} pool).',
  betNotPlaced: 'Bet not placed: {msg}',
  betFailed: 'Bet failed',

  // Round result modal
  settlementTitle: 'Round #{n} Settlement',
  winnerBadge: 'WINNER',
  victorious: 'VICTORIOUS',
  teamMessi: 'TEAM MESSI',
  teamRonaldo: 'TEAM RONALDO',
  totalWinningPool: 'Total Winning Pool',
  yourSettlement: 'Your Settlement',
  noBet: 'No Bet',
  payoutCredited: 'PAYOUT CREDITED:',
  addedToBalance: 'Added directly to your balance',
  settledReadyNext: 'Round bets settled. Ready for next drop.',
  nextRound: 'Next Round (60s)',

  // Payment form modal
  imageTooLarge: 'Image too large (max 2 MB)',
  errTopupMissing: 'Select platform and enter your Transaction No/ID',
  errWithdrawInvalid: 'Check amount (≤ withdrawable), platform and account number',
  requestSubmitted: 'Request Submitted!',
  topupSuccessNote: 'Our Care Team will verify your transfer and credit your coins shortly.',
  withdrawSuccessNote: 'Coins have been held in escrow. Payout will be sent within 24 hours.',
  pendingReview: 'Pending review',
  back: 'Back',
  paymentFormMain: 'Payment',
  paymentFormAccent: 'Form',
  paymentInfo: 'Payment Info',
  nameLabel: 'Name:',
  payNoLabel: 'Pay No:',
  selectCoinPackage: 'Select Coin Package',
  coinsWord: 'Coins',
  selectPlatform: 'Select Platform',
  selectPlatformPh: 'Select platform',
  txnNoId: 'Transaction No/ID',
  txnRefPh: 'Transfer reference / txn ID',
  txnHint: 'Copy it from your banking app receipt after paying to {phone}.',
  paymentScreenshot: 'Payment Screenshot',
  attachReceipt: 'Attach a screenshot of your payment receipt.',
  chooseImage: 'Choose Image',
  withdrawalInfo: 'Withdrawal Info',
  coinsAmount: 'Amount of Coins',
  accountNumber: 'Your Account Number (Pay No)',
  egPhone: 'e.g. 09xxxxxxxxx',
  escrowHint: 'Coins are deducted immediately and held in escrow. If rejected, they refund automatically.',
  viewProcess: 'View Payment Process',
  hideProcess: 'Hide Payment Process',
  topupProcessTitle: 'Payment Process —',
  topupStep1: '* Send MMK via Kpay / Wave / Ayapay to {phone} (Nyein Chan Latt)',
  topupStep2: '* Select the coin package above',
  topupStep3: '* Enter your Transaction No/ID after transferring',
  topupStep4: '* Attach the payment screenshot and hit Submit',
  topupStep5: '* Our Care Team verifies and credits your coins 🎉',
  withdrawProcessTitle: 'Withdrawal Process —',
  withdrawStep1: '* Enter coin amount (must be ≤ withdrawable)',
  withdrawStep2: '* Choose payout platform + your account number',
  withdrawStep3: '* Coins are held immediately upon submission',
  withdrawStep4: '* Care Team sends MMK within 24h of approval',
  withdrawStep5: '* Rejected requests auto-refund your coins',
  ok: 'OK',
  submitting: 'Submitting…',
  submit: 'Submit',
  reviewNote: 'Requests are reviewed by our Care Team before coins are credited.',
  submissionFailed: 'Submission failed',
};

export type TKey = keyof typeof en;

const my: Record<TKey, string> = {
  // Tabs
  tabGame: 'ဂိမ်း',
  tabChat: 'ချတ်',
  tabProfile: 'ပရိုဖိုင်',

  // Header
  roundNo: 'ပွဲ #{n}',
  topUp: 'ငွေသွင်း',
  withdraw: 'ငွေထုတ်',
  muteSound: 'အသံပိတ်',
  unmuteSound: 'အသံဖွင့်',

  // Countdown / canvas
  dropping: 'ကျဆင်းနေ',
  dropBang: 'ကျော်!',
  settling: 'စောင့်ဆိုင်းနေ',

  // History ribbon
  last10Rounds: 'ပွဲ 10 ကြိမ် ရလဒ်',
  messiWon: 'Messi နိုင်',
  ronaldoWon: 'Ronaldo နိုင်',
  winningMultiplier: 'နိုင်ငွေ မြှင့်ကိန်း',
  totalPoolVolume: 'စုစုပေါင်း လောင်းကြေး',
  messiPool: 'Messi ဘက် လောင်းငွေ',
  ronaldoPool: 'Ronaldo ဘက် လောင်းငွေ',
  close: 'ပိတ်မည်',

  // Pool bar
  poolLabel: 'စုစုပေါင်း:',
  noBetsYet: 'လောင်းကြေး မရှိသေးပါ — ပထမဆုံး ဖြစ်ပါ',

  // Jackpot
  jackpotPot: 'ဂျက်ပေါ့ ငွေအိတ်',
  jackpotOddsVal: '2,076 တွင် 1',
  jackpotTip: 'လောင်းကြေးတိုင်းဖြင့် တိုးပွားသည် (တစ်ခုလျှင် 1%)',

  // Live bets
  liveBets: 'တိုက်ရိုက် လောင်းကြေး',
  betThisRound: 'ဤပွဲတွင် လောင်းကြေး {n} ခု',
  betsThisRound: 'ဤပွဲတွင် လောင်းကြေး {n} ခု',
  you: 'ကိုယ်',

  // Profile
  playerRound: 'ကစားသမား · ပွဲ #{n}',
  active: 'လှုပ်ရှားနေ',
  totalBalance: 'စုစုပေါင်း လက်ကျန်',
  withdrawable: 'ထုတ်ယူနိုင်သော ငွေ',
  lockedFunds: 'ပိတ်ထားသောငွေ (ကစားရန် လို)',
  unlockHint: 'နိုင်ငွေနှင့် ပြန်ရရှိသောငွေများသာ ထုတ်ယူနိုင်ပါသည်။ ငွေသွင်းမှုများနှင့် $100 အခမဲ့ဘောနပ်စ်သည် ပိတ်လျက်ရှိပါမည်။',
  betsPlaced: 'ထားခဲ့သော လောင်းကြေး',
  totalStaked: 'စုစုပေါင်း လောင်းကြေး',
  houseRules: 'စည်းကမ်းချက်များ',
  prizePool: 'ဆုငွေအိတ်',
  houseFee: 'ပလက်ဖောင်း ကြေး',
  jackpotFee: 'ဂျက်ပေါ့ ကြေး',
  jackpotOdds: 'ဂျက်ပေါ့ အခွင့်အလမ်း',
  transactionHistory: 'ငွေလွှဲပြောင်းမှု မှတ်တမ်း',
  loading: 'ဖွင့်နေသည်…',
  noPaymentsYet: 'ငွေသွင်း / ငွေထုတ် မှတ်တမ်း မရှိသေးပါ။',
  logOut: 'ထွက်မည်',
  language: 'ဘာသာစကား',
  langEnName: 'English',
  langMyName: 'မြန်မာ',

  // Status chips
  TOPUP: 'ငွေသွင်း',
  WITHDRAW: 'ငွေထုတ်',
  PENDING: 'စေင့်ဆိုင်း',
  APPROVED: 'အတည်ပြုပြီး',
  REJECTED: 'ပယ်ဖျက်',

  // Betting pad
  lockedBet: 'သော့ပိတ် လောင်းကြေး:',
  onSide: 'ဘက်သို့',
  est: 'ခန့်မှန်း',
  amountPlaceholder: 'ပမာဏ',
  autoBetBtn: 'AUTO လောင်း — ကြိုပေးချေ ပွဲ 1440 အထိ',
  autoLeft: '{n} ပွဲ ကျန်',
  confirmBetOn: 'သင့်လောင်းကြေး အတည်ပြုရန်',
  payoutMultiplier: 'ဆုငွေ မြှင့်ကိန်း',
  potentialWin: 'ဖြစ်နိုင်ခြေ အနိုင်ငွေ',
  cancelBtn: 'ပယ်ဖျက်',
  confirmN: '${n} အတည်ပြု',
  autoBetTitle: 'Auto လောင်း',
  autoBetDesc: 'တစ်ပွဲ ${amt} နှုန်းဖြင့် ပွဲ 1,440 အထိ ကြိုပေးချေပါ။ ရွေးထားသော ဘက်တွင် ပွဲတိုင်း အလိုအလျောက် လောင်းမည်။ အချိန်မရွေး ပယ်ဖျက်နိုင်သည် — လက်ရှိပွဲမူ ဆက်တည်ရှိမည်။',
  roundsMax: 'ပွဲအရေအတွက် (အများဆုံး 1440)',
  totalPrepaid: 'ကြိုပေးချေ စုစုပေါင်း',
  balanceAfter: 'ကျန်ရှိမည့် လက်ကျန်',
  insufficientBalance: 'လက်ကျန် မလုံလောက်ပါ',
  roundInProgress: 'ပွဲ ကစားနေဆဲ',
  startAuto: 'Auto စတင် — ${n}',
  insufficientTopUpHint: 'လက်ကျန် မလုံလောက်ပါ။ + ငွေသွင်း နှိပ်၍ ငွေသွင်းပါ။',

  // Chat
  communityFeed: 'အသိုင်းအဝိုင်း တိုက်ရိုက်ပြောဆိုမှု',
  chatting: '{n} ဦး ပြောနေ',
  highRollerAlert: 'လောင်းကြေးကြီး အကြောင်းကြားချက်',
  systemNotice: 'စနစ် အကြောင်းကြားချက်',
  typeMessage: 'စာတို ရိုက်ထည့်ပါ...',
  quick1: 'Messi အကောင်းဆုံး!',
  quick2: 'CR7 Siuuu!',
  quick3: 'အကုန် ထည့်!',
  quick4: 'နောက်ပွဲ စောင့်နေ!',
  quick5: 'ကြီးကြီး နိုင်!',

  // GamePage
  welcomeMessage: '0XDUEL မှ ကြိုဆိုပါသည်! သင်နှစ်သက်သော ဘက်ကို ရွေးပါ- Team Messi vs Team Ronaldo။ ပွဲတစ်ပွဲ 60 စက္ကန့်!',
  loginTagline: 'Messi vs Ronaldo — 60 စက္ကန့် ခန့်မှန်းချက် ပြိုင်ပွဲ',
  enterUsername: 'အသုံးပြုသူအမည် ထည့်ပါ...',
  loggingIn: 'ဝင်ရောက်နေသည်...',
  startPlaying: 'ကစားမည်',
  highRollerMsg: 'High Roller: {side} ဘက်သို့ ${n} လောင်းလိုက်ပါသည်!',
  roundSettledMsg: 'ပွဲ ပြီးဆုံး: {side} နိုင်ပါသည်! {mult}x (${total} စုစုပေါင်း)။',
  betNotPlaced: 'လောင်းကြေး မထားနိုင်ပါ: {msg}',
  betFailed: 'လောင်းကြေး မအောင်မြင်ပါ',

  // Round result modal
  settlementTitle: 'ပွဲ #{n} ရလဒ်',
  winnerBadge: 'အနိုင်ရသူ',
  victorious: 'အနိုင်ရ',
  teamMessi: 'TEAM MESSI',
  teamRonaldo: 'TEAM RONALDO',
  totalWinningPool: 'နိုင်ဘက် စုစုပေါင်း',
  yourSettlement: 'သင့် ရလဒ်',
  noBet: 'လောင်းမထားပါ',
  payoutCredited: 'ဆုငွေ ရရှိ:',
  addedToBalance: 'သင့် လက်ကျန်သို့ တိုက်ရိုက် ထည့်သွင်းပြီး',
  settledReadyNext: 'လောင်းကြေးများ တွက်ချေပြီး။ နောက်ပွဲ အသင့်။',
  nextRound: 'နောက်ပွဲ (60s)',

  // Payment form modal
  imageTooLarge: 'ပုံ ကြီးလွန်းသည် (အများဆုံး 2 MB)',
  errTopupMissing: 'ပလက်ဖောင်း ရွေးပြီး Transaction နံပါတ်/ID ထည့်ပါ',
  errWithdrawInvalid: 'ပမာဏ (ထုတ်နိုင်ငွေအောက်)၊ ပလက်ဖောင်းနှင့် အကောင့်နံပါတ် စစ်ဆေးပါ',
  requestSubmitted: 'တောင်းဆိုမှု ပေးပို့ပြီး!',
  topupSuccessNote: 'ကျွန်ုပ်တို့ Care Team မှ သင်၏ လွှဲပြောင်းမှုကို စစ်ဆေး၍ coin များ မကြာမီ ထည့်သွင်းပေးပါမည်။',
  withdrawSuccessNote: 'Coin များကို စောင့်ကြည့်ငွေအဖြစ် ထားရှိပြီးပါပြီ။ 24 နာရီအတွင်း ပေးပို့ပါမည်။',
  pendingReview: 'စစ်ဆေးနေသည်',
  back: 'နောက်သို့',
  paymentFormMain: 'ငွေပေးချေမှု',
  paymentFormAccent: 'ပုံစံ',
  paymentInfo: 'ငွေပေးချေမှု အချက်အလက်',
  nameLabel: 'အမည်:',
  payNoLabel: 'Pay No:',
  selectCoinPackage: 'Coin Package ရွေးချယ်ပါ',
  coinsWord: 'Coin',
  selectPlatform: 'ပလက်ဖောင်း ရွေးချယ်ပါ',
  selectPlatformPh: 'ပလက်ဖောင်း ရွေးပါ',
  txnNoId: 'Transaction နံပါတ်/ID',
  txnRefPh: 'လွှဲပြောင်းမှု reference / txn ID',
  txnHint: '{phone} သို့ ပေးချေပြီးပါက banking app ပြေစာမှ ကူးယူပါ။',
  paymentScreenshot: 'ငွေပေးချေမှု ဓာတ်ပုံ',
  attachReceipt: 'ငွေပေးချေမှု ပြေစာ ဓာတ်ပုံ ထည့်ပါ။',
  chooseImage: 'ပုံရွေးပါ',
  withdrawalInfo: 'ငွေထုတ်မှု အချက်အလက်',
  coinsAmount: 'Coin ပမာဏ',
  accountNumber: 'သင့် အကောင့်နံပါတ် (Pay No)',
  egPhone: 'ဥပမာ - 09xxxxxxxxx',
  escrowHint: 'Coin များကို ချက်ချင်း နုတ်ယူကာ စောင့်ကြည့်ထားရှိပါမည်။ ပယ်ဖျက်ပါက အလိုအလျောက် ပြန်ရရှိပါမည်။',
  viewProcess: 'ငွေပေးချေမှု လုပ်ငန်းစဉ် ကြည့်ရန်',
  hideProcess: 'ငွေပေးချေမှု လုပ်ငန်းစဉ် ဖျောက်ရန်',
  topupProcessTitle: 'ငွေပေးချေမှု လုပ်ငန်းစဉ် —',
  topupStep1: '* Kpay / Wave / Ayapay ဖြင့် {phone} (Nyein Chan Latt) သို့ MMK ပေးပို့ပါ',
  topupStep2: '* အပေါ်မှ coin package ရွေးပါ',
  topupStep3: '* လွှဲပြောင်းပြီးပါက Transaction နံပါတ်/ID ထည့်ပါ',
  topupStep4: '* ငွေပေးချေမှု ဓာတ်ပုံ ထည့်ကာ Submit နှိပ်ပါ',
  topupStep5: '* Care Team မှ စစ်ဆေး၍ coin များ ထည့်ပေးပါမည် 🎉',
  withdrawProcessTitle: 'ငွေထုတ်မှု လုပ်ငန်းစဉ် —',
  withdrawStep1: '* Coin ပမာဏ ထည့်ပါ (ထုတ်နိုင်ငွေအောက် ဖြစ်ရမည်)',
  withdrawStep2: '* ပလက်ဖောင်းနှင့် သင့်အကောင့်နံပါတ် ရွေးပါ',
  withdrawStep3: '* ပေးပို့သည့်နှစ်ချက် Coin များ ချက်ချင်း ထားရှိပါမည်',
  withdrawStep4: '* အတည်ပြုပြီး 24 နာရီအတွင်း Care Team မှ MMK ပေးပို့ပါမည်',
  withdrawStep5: '* ပယ်ဖျက်သော တောင်းဆိုမှုများတွင် coin များ အလိုအလျောက် ပြန်ရရှိပါမည်',
  ok: 'OK',
  submitting: 'ပေးပို့နေသည်…',
  submit: 'ပေးပို့မည်',
  reviewNote: 'coin များ မထည့်သွင်းမီ ကျွန်ုပ်တို့ Care Team မှ စစ်ဆေးပါမည်။',
  submissionFailed: 'ပေးပို့မှု မအောင်မြင်ပါ',
};

const dict: Record<Lang, Record<TKey, string>> = { en, my };

const LANG_KEY = 'oxduel_lang';

type Vars = Record<string, string | number>;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Vars) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => en[k],
});

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'my' ? 'my' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch { /* private mode */ }
    document.documentElement.lang = l === 'my' ? 'my' : 'en';
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Vars) => {
      let s: string = dict[lang][key] ?? en[key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(String(v));
        }
      }
      return s;
    },
    [lang]
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
