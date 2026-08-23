import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { TabType, TeamSide, RoundHistoryItem, BetItem, ChatMessage } from '../types/clash';
import { HeaderBar } from '../components/HeaderBar';
import { CountdownTimer } from '../components/CountdownTimer';
import { HistoryRibbon } from '../components/HistoryRibbon';
import { BottomTabBar } from '../components/BottomTabBar';
import { PoolBar } from '../components/PoolBar';
import { CashbackCard } from '../components/CashbackCard';
import { LiveBetsCard } from '../components/LiveBetsCard';
import { ProfileTab } from '../components/ProfileTab';
import { BallDropCanvas } from '../components/BallDropCanvas';
import { BettingPad } from '../components/BettingPad';
import { ChatTab } from '../components/ChatTab';
import { PaymentFormModal } from '../components/PaymentFormModal';
import { RoundResultModal } from '../components/RoundResultModal';
import { sound } from '../utils/audio';
import { useAuth } from '../hooks/useAuth';
import { getInitData, getTelegramUsername, hapticLight, hapticSuccess, hapticWarning } from '../utils/telegram';
import { api } from '../services/api';
import { useLang } from '../i18n';

// Matches backend NET_POOL_RATE (89%) so displayed multipliers equal real payouts
const NET_POOL_RATE_UI = 0.89;

export default function GamePage() {
  const { user, loading: authLoading, login, loginTelegram, logout, updateBalance, refresh: refreshAuth } = useAuth();
  const { t } = useLang();
  const tRef = useRef(t);
  tRef.current = t;

  // Local system notice shown atop the real chat feed (re-created per language)
  const WELCOME_MESSAGE: ChatMessage = useMemo(() => ({
    id: 'welcome',
    type: 'system',
    text: t('welcomeMessage'),
    timestamp: Date.now(),
  }), [t]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('game');
  const [loginUsername, setLoginUsername] = useState<string>('');

  // User State
  const [balance, setBalance] = useState<number>(1250);
  const [withdrawable, setWithdrawable] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [paymentModal, setPaymentModal] = useState<null | 'topup' | 'withdraw'>(null);
  const [betError, setBetError] = useState<string | null>(null);

  // Round State
  const [roundId, setRoundId] = useState<number>(1042);
  const [phase, setPhase] = useState<'betting' | 'dropping' | 'finished'>('betting');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [messiPool, setMessiPool] = useState<number>(0);
  const [ronaldoPool, setRonaldoPool] = useState<number>(0);

  // User Active Bet on this round
  const [userCurrentBet, setUserCurrentBet] = useState<{
    side: TeamSide;
    amount: number;
    estPayout: number;
  } | null>(null);

  // Live Bets Table State (real bets, polled from backend)
  const [activeBets, setActiveBets] = useState<BetItem[]>([]);

  // Chat Feed State (real messages, polled from backend)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const welcomeRef = useRef(WELCOME_MESSAGE);
  welcomeRef.current = WELCOME_MESSAGE;
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // History Ribbon State (real settled rounds, polled from backend)
  const [history, setHistory] = useState<RoundHistoryItem[]>([]);

  // Result Modal State
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    winner: TeamSide;
    multiplier: number;
    totalPool: number;
    winningPool: number;
    userWinnings: number | null;
  } | null>(null);

  // Auto Bet state (prepaid rounds)
  const [autoBet, setAutoBet] = useState<{ side: TeamSide; amount: number; remaining: number } | null>(null);
  const autoPlacedRoundRef = useRef<number>(-1);

  // Refs for timer callbacks to avoid stale closures
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const roundIdRef = useRef(roundId);
  roundIdRef.current = roundId;
  const messiPoolRef = useRef(messiPool);
  messiPoolRef.current = messiPool;
  const ronaldoPoolRef = useRef(ronaldoPool);
  ronaldoPoolRef.current = ronaldoPool;
  const userCurrentBetRef = useRef(userCurrentBet);
  userCurrentBetRef.current = userCurrentBet;

  // Sync balance from user
  useEffect(() => {
    if (user?.balance !== undefined) {
      setBalance(user.balance);
      setWithdrawable(user.withdrawableBalance ?? 0);
    }
  }, [user]);

  // Telegram Mini App: passwordless auto-login (no-op in regular browsers)
  const tgAutoLoginRef = useRef(false);
  useEffect(() => {
    if (tgAutoLoginRef.current || authLoading || user) return;
    const initData = getInitData();
    if (initData) {
      tgAutoLoginRef.current = true;
      loginTelegram(initData);
      return;
    }
    const tgName = getTelegramUsername();
    if (tgName) {
      tgAutoLoginRef.current = true;
      login(tgName);
    }
  }, [authLoading, user, login, loginTelegram]);

  // Sound Toggle Handler
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
  };

  // Place Bet Action Handler
  const handlePlaceBet = async (side: TeamSide, amount: number, fromAutoEscrow: boolean = false) => {
    if (phase !== 'betting' || amount <= 0) return;
    if (!fromAutoEscrow && amount > balance) return;
    if (fromAutoEscrow && !autoBet) return;

    if (!fromAutoEscrow) {
      // Stakes never create withdrawable — only payouts/refunds at settlement do
      setBalance((prev) => prev - amount);
    }

    hapticSuccess(); // bet placed
    if (side === 'messi') {
      setMessiPool((prev) => prev + amount);
    } else {
      setRonaldoPool((prev) => prev + amount);
    }

    const total = messiPoolRef.current + ronaldoPoolRef.current + amount;
    const currentSidePool = (side === 'messi' ? messiPoolRef.current : ronaldoPoolRef.current) + amount;
    const multiplier = (total * 0.96) / currentSidePool;
    const estPayout = amount * multiplier;

    const newBet: BetItem = {
      id: `user-bet-${Date.now()}`,
      roundId,
      user: t('you'),
      avatar: 'ME',
      side,
      amount,
      estPayout,
      multiplier,
      timestamp: Date.now(),
      isUser: true,
    };

    setActiveBets((prev) => [newBet, ...prev]);
    setUserCurrentBet({
      side,
      amount: (userCurrentBet?.amount || 0) + amount,
      estPayout: (userCurrentBet?.estPayout || 0) + estPayout,
    });

    const prevBalanceEntry = { userCurrentBet };
    setActiveBets((prev) => [newBet, ...prev]);
    setUserCurrentBet({
      side,
      amount: (userCurrentBet?.amount || 0) + amount,
      estPayout: (userCurrentBet?.estPayout || 0) + estPayout,
    });

    // Persist to backend; on failure revert ALL optimistic updates so UI never lies
    try {
      const result = await api.placeBet(side === 'messi' ? 'MESSI' : 'RONALDO', amount);
      if (result?.newBalance !== undefined) {
        updateBalance(result.newBalance);
        setBalance(result.newBalance);
      }
      if ((result as any)?.newWithdrawable !== undefined) {
        setWithdrawable((result as any).newWithdrawable);
      }
      // Announce high bets in chat only once the bet is actually saved
      if (amount >= 100) {
        const whaleNotice: ChatMessage = {
          id: `whale-${Date.now()}`,
          type: 'whale',
          text: t('highRollerMsg', { n: amount, side: side === 'messi' ? 'Team Messi' : 'Team Ronaldo' }),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, whaleNotice]);
      }
    } catch (err) {
      setBalance((b) => b + amount);
      if (side === 'messi') {
        setMessiPool((p) => Math.max(0, p - amount));
      } else {
        setRonaldoPool((p) => Math.max(0, p - amount));
      }
      setActiveBets((prev) => prev.filter((b) => b.id !== newBet.id));
      setUserCurrentBet(prevBalanceEntry.userCurrentBet);
      hapticWarning();
      const msg = err instanceof Error ? err.message : t('betFailed');
      setBetError(msg.startsWith('Session expired') ? msg : t('betNotPlaced', { msg }));
      setTimeout(() => setBetError(null), 5000);
    }
  };

  // ---- Auto Bet (prepaid rounds) ----
  const startAuto = (side: TeamSide, amt: number, rounds: number) => {
    const n = Math.max(1, Math.min(1440, rounds));
    const total = amt * n;
    if (total <= 0 || total > balance) return;
    // Escrow ALL rounds upfront
    setBalance((b) => b - total);
    setAutoBet({ side, amount: amt, remaining: n });
    api.reportAudit('AUTO_START', { side, amount: amt, rounds: n, totalCost: total });
  };

  const cancelAuto = () => {
    setAutoBet((ab) => {
      if (!ab) return null;
      // Refund only unplaced rounds — current round funds stay committed
      const refund = ab.remaining * ab.amount;
      if (refund > 0) setBalance((b) => b + refund);
      api.reportAudit('AUTO_CANCEL', {
        side: ab.side,
        amountPerRound: ab.amount,
        refundedRounds: ab.remaining,
        refundAmount: refund,
      });
      return null;
    });
  };

  // Place one auto bet at the start of each betting round
  useEffect(() => {
    if (phase !== 'betting' || !autoBet || timeLeft <= 0) return;
    if (autoPlacedRoundRef.current === roundId) return; // one per round
    autoPlacedRoundRef.current = roundId;
    handlePlaceBet(autoBet.side, autoBet.amount, true);
    setAutoBet((p) =>
      !p ? null : p.remaining - 1 <= 0 ? null : { ...p, remaining: p.remaining - 1 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundId]);

  // Chat message send handler
  const handleSendMessage = (text: string) => {
    if (!user) return;
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      type: 'user',
      user: user.username,
      text,
      timestamp: Date.now(),
      isUser: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    api.sendChat(text).catch(() => {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    });
  };

  // ---- Real-data polling (chat / recent bets / settled history) ----
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const chatCountRef = useRef(1); // welcome message

  // Manual refresh: latest poll functions, callable from the header button
  const pollFnsRef = useRef<{ round?: () => void; chat?: () => void; bets?: () => void; history?: () => void }>({});
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = useCallback(() => {
    if (refreshing) return;
    hapticLight();
    setRefreshing(true);
    pollFnsRef.current.round?.();
    pollFnsRef.current.chat?.();
    pollFnsRef.current.bets?.();
    pollFnsRef.current.history?.();
    refreshAuth();
    setTimeout(() => setRefreshing(false), 800);
  }, [refreshing, refreshAuth]);

  useEffect(() => {
    if (!user) return;

    const pollChat = async () => {
      try {
        const { messages: rows } = await api.getChat();
        const mapped: ChatMessage[] = rows.map((r) => ({
          id: r.id,
          type: 'user' as const,
          user: r.username,
          avatar: r.username.slice(0, 2).toUpperCase(),
          text: r.text,
          timestamp: new Date(r.createdAt).getTime(),
          isUser: r.userId === user.id,
        }));
        setMessages([welcomeRef.current, ...mapped]);
        if (activeTabRef.current !== 'chat' && mapped.length > chatCountRef.current) {
          setUnreadChatCount((c) => Math.min(99, c + (mapped.length - chatCountRef.current)));
        }
        chatCountRef.current = mapped.length;
      } catch { /* offline — keep last */ }
    };

    const pollBets = async () => {
      try {
        const { bets } = await api.getRecentBets();
        setActiveBets(bets.map((b) => {
          const side: TeamSide = b.selection === 'MESSI' ? 'messi' : 'ronaldo';
          const total = messiPoolRef.current + ronaldoPoolRef.current;
          const sidePool = side === 'messi' ? messiPoolRef.current : ronaldoPoolRef.current;
          const mult = sidePool > 0 ? (total * NET_POOL_RATE_UI) / sidePool : 1.9;
          return {
            id: b.id,
            roundId: roundIdRef.current,
            user: b.user,
            avatar: b.user.slice(0, 2).toUpperCase(),
            side,
            amount: b.amount,
            estPayout: b.amount * mult,
            multiplier: mult,
            timestamp: new Date(b.createdAt).getTime(),
            isUser: b.user === user.username,
          };
        }));
      } catch { /* offline — keep last */ }
    };

    const pollHistory = async () => {
      try {
        const { rounds } = await api.getRoundHistory();
        setHistory(rounds.map((r) => ({
          roundId: r.endTimestamp,
          winner: r.winner === 'MESSI' ? 'messi' : 'ronaldo',
          multiplier: r.totalMessi > 0 && r.totalRonaldo > 0
            ? ((r.totalMessi + r.totalRonaldo) * 0.89) / (r.winner === 'MESSI' ? r.totalMessi : r.totalRonaldo)
            : 0,
          totalPool: (r.totalMessi || 0) + (r.totalRonaldo || 0),
          messiPool: r.totalMessi || 0,
          ronaldoPool: r.totalRonaldo || 0,
          timestamp: r.endTimestamp * 1000,
        })));
      } catch { /* offline — keep last */ }
    };

    pollChat();
    pollBets();
    pollHistory();
    pollFnsRef.current.chat = () => void pollChat();
    pollFnsRef.current.bets = () => void pollBets();
    pollFnsRef.current.history = () => void pollHistory();
    const chatTimer = setInterval(pollChat, 4000);
    const betsTimer = setInterval(pollBets, 5000);
    const historyTimer = setInterval(pollHistory, 15000);
    return () => {
      clearInterval(chatTimer);
      clearInterval(betsTimer);
      clearInterval(historyTimer);
    };
  }, [user]);

  // ---- Server-authoritative round sync ----
  const serverDeadlineRef = useRef<number>(0);
  const serverRoundIdRef = useRef<string>('');
  const pendingDropRoundRef = useRef<string | null>(null);
  const witnessedRoundRef = useRef<string>('');
  const settlePayoutRef = useRef<number | null>(null);
  const seenResultIdRef = useRef<string>('');
  const [forcedWinner, setForcedWinner] = useState<TeamSide | null>(null);

  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const applyResult = (lastResult: any) => {
      if (!lastResult || lastResult.roundId === seenResultIdRef.current) return;

      // Verdict may land BEFORE our local countdown notices the deadline
      // (server clock ahead, throttled background timers). If it's for the
      // round we just watched, jump straight into the drop — otherwise the
      // rush poll would dismiss it as already-seen and the ball would never
      // spawn, leaving the UI stuck without a result popup.
      if (
        phaseRef.current === 'betting' &&
        witnessedRoundRef.current === lastResult.roundId &&
        lastResult.winner
      ) {
        pendingDropRoundRef.current = lastResult.roundId;
        settlePayoutRef.current = lastResult.myPayout ?? null;
        setForcedWinner(lastResult.winner === 'MESSI' ? 'messi' : 'ronaldo');
        setPhase('dropping');
      } else if (phaseRef.current === 'dropping' && pendingDropRoundRef.current === lastResult.roundId) {
        settlePayoutRef.current = lastResult.myPayout;
        setForcedWinner(lastResult.winner === 'MESSI' ? 'messi' : 'ronaldo');
      }
      seenResultIdRef.current = lastResult.roundId;
    };

    const sync = async () => {
      try {
        const { round, userBet, lastResult } = await api.getCurrentRound();
        if (stopped) return;
        // Remember which round we are actually watching live while betting,
        // so a verdict that races ahead of the countdown can be attributed.
        if (phaseRef.current === 'betting' && round.id !== serverRoundIdRef.current) {
          witnessedRoundRef.current = round.id;
          pendingDropRoundRef.current = null;
          settlePayoutRef.current = null;
        }
        setMessiPool(round.totalMessi || 0);
        setRonaldoPool(round.totalRonaldo || 0);
        serverDeadlineRef.current = round.endTimestamp * 1000;

        // Countdown must be MONOTONIC within a round: device clocks drift
        // against the server, and re-deriving timeLeft from the raw
        // timestamp each poll can add skew-seconds back (countdown crawling
        // upward / snapping to :59 mid-round). Only a genuinely new round
        // may raise the timer.
        const isNewRound = round.id !== serverRoundIdRef.current;
        const serverSecs = Math.max(0, Math.ceil((round.endTimestamp * 1000 - Date.now()) / 1000));
        if (isNewRound) {
          setTimeLeft(serverSecs);
        } else {
          setTimeLeft((prev) => Math.min(prev, serverSecs));
        }
        serverRoundIdRef.current = round.id;

        // Restore an open bet placed earlier in this round (e.g. after reload)
        if (userBet && !userCurrentBetRef.current && phaseRef.current === 'betting') {
          const side: TeamSide = userBet.selection === 'MESSI' ? 'messi' : 'ronaldo';
          setUserCurrentBet({ side, amount: userBet.amount, estPayout: userBet.amount * 1.9 });
        }

        applyResult(lastResult);
      } catch { /* offline — retry next tick */ }
    };

    sync();
    pollFnsRef.current.round = () => void sync();
    const t = setInterval(sync, 1400);
    return () => { stopped = true; clearInterval(t); };
  }, [user]);

  // Local ticker counts down against the server deadline between polls
  useEffect(() => {
    const timer = setInterval(() => {
      if (phaseRef.current !== 'betting' || !serverDeadlineRef.current) return;
      const remainingMs = serverDeadlineRef.current - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft((prev) => {
        if (secs < prev && secs <= 5 && secs > 0) sound.playTick();
        return secs;
      });
      if (remainingMs <= 0) {
        pendingDropRoundRef.current = serverRoundIdRef.current;
        setForcedWinner(null);
        setPhase('dropping');
      }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Faster polling while a drop awaits its server verdict
  useEffect(() => {
    if (phase !== 'dropping') return;
    const rush = setInterval(async () => {
      try {
        const { lastResult } = await api.getCurrentRound();
        if (!lastResult) return;
        seenResultIdRef.current = lastResult.roundId;
        // Apply the verdict for the round we're dropping on — idempotent,
        // and NOT gated on the seen-guard so a pre-seen result still lands.
        if (pendingDropRoundRef.current === lastResult.roundId && lastResult.winner) {
          if (settlePayoutRef.current === null || settlePayoutRef.current === undefined) {
            settlePayoutRef.current = lastResult.myPayout;
          }
          setForcedWinner(lastResult.winner === 'MESSI' ? 'messi' : 'ronaldo');
        }
      } catch { /* keep waiting */ }
    }, 1200);

    // Failsafe: if no verdict ever arrives (backend unreachable), move on
    // after 15s instead of hanging on SETTLING forever.
    const failsafe = setTimeout(() => {
      if (phaseRef.current !== 'dropping') return;
      setResultModal(null);
      setRoundId((prev) => prev + 1);
      setPhase('betting');
      setTimeLeft(60);
      setUserCurrentBet(null);
      setActiveBets([]);
      setMessiPool(0);
      setRonaldoPool(0);
      setForcedWinner(null);
      pendingDropRoundRef.current = null;
      settlePayoutRef.current = null;
    }, 15000);

    return () => {
      clearInterval(rush);
      clearTimeout(failsafe);
    };
  }, [phase]);

  // Ball Drop Landing Callback — winner & payout come from the SERVER
  const handleBallLanded = useCallback((winner: TeamSide) => {
    setPhase('finished');

    const total = messiPoolRef.current + ronaldoPoolRef.current;
    const winPool = winner === 'messi' ? messiPoolRef.current : ronaldoPoolRef.current;
    const winningMultiplier = winPool > 0 ? (total * NET_POOL_RATE_UI) / winPool : 0;

    const bet = userCurrentBetRef.current;
    let userWinnings: number | null = null;
    if (bet) {
      if (bet.side === winner) {
        userWinnings = settlePayoutRef.current ?? 0;
        hapticSuccess();
      } else {
        userWinnings = 0;
        hapticWarning();
      }
    }

    // Pull authoritative balances — server already credited/debited
    refreshAuth();

    setHistory((prev) => [{
      roundId: roundIdRef.current,
      winner,
      multiplier: winningMultiplier,
      totalPool: total,
      messiPool: messiPoolRef.current,
      ronaldoPool: ronaldoPoolRef.current,
      timestamp: Date.now(),
    }, ...prev.slice(0, 19)]);

    setMessages((prev) => [...prev, {
      id: `result-${Date.now()}`,
      type: 'system',
      text: tRef.current('roundSettledMsg', {
        side: winner === 'messi' ? 'Team Messi' : 'Team Ronaldo',
        mult: winningMultiplier.toFixed(2),
        total: total.toLocaleString(),
      }),
      timestamp: Date.now(),
    }]);

    setResultModal({
      isOpen: true,
      winner,
      multiplier: winningMultiplier,
      totalPool: total,
      winningPool: winPool,
      userWinnings,
    });

    setTimeout(() => {
      setResultModal(null);
      setRoundId((prev) => prev + 1);
      setPhase('betting');
      setTimeLeft(60);
      setUserCurrentBet(null);
      setActiveBets([]);
      setMessiPool(0);
      setRonaldoPool(0);
      setForcedWinner(null);
      pendingDropRoundRef.current = null;
      settlePayoutRef.current = null;
    }, 4500);
  }, []);

  if (authLoading) {
    return (
      <div className="w-full min-h-screen bg-[#05070A] flex items-center justify-center p-0 md:py-4">
        <main
          id="mobile-app-root"
          className="w-full max-w-md min-h-screen md:min-h-[820px] md:max-h-[900px] relative flex flex-col bg-[#0D1117] text-white overflow-hidden md:rounded-3xl md:border md:border-[#30363D] md:shadow-2xl"
        >
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-[#05070A] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0D1117] border border-[#30363D] rounded-2xl p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-600 via-amber-500 to-red-600 flex items-center justify-center">
              <span className="text-2xl">⚽</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1">0X<span className="text-amber-400">DUEL</span></h1>
            <p className="text-gray-400 text-sm">{t('loginTagline')}</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder={t('enterUsername')}
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#161B22] border border-[#30363D] rounded-xl text-white focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <button
              onClick={async () => {
                if (!loginUsername.trim()) return;
                const result = await login(loginUsername.trim());
                if (result.success) {
                  sound.playBetPlaced();
                }
              }}
              disabled={authLoading || !loginUsername.trim()}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-sm rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? t('loggingIn') : t('startPlaying')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#05070A] flex items-center justify-center p-0 md:py-4">
      {/* Restrict to mobile-only container with max-w-md */}
      <main
        id="mobile-app-root"
        className="w-full max-w-md min-h-screen md:min-h-[820px] md:max-h-[900px] relative flex flex-col bg-[#0D1117] text-white overflow-hidden md:rounded-3xl md:border md:border-[#30363D] md:shadow-2xl"
      >
        {/* 1. Persistent Header Bar */}
        <HeaderBar
          roundId={roundId}
          balance={balance}
          onOpenTopUp={() => setPaymentModal('topup')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onRefresh={handleManualRefresh}
          refreshing={refreshing}
        />

        {/* 2. Persistent History Ribbon */}
        <HistoryRibbon history={history} />

        {/* 3. Tab Views Content (Internal Scroll Area) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* GAME TAB */}
          {activeTab === 'game' && (
            <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 pb-20 no-scrollbar">
              {/* Claimable cashback (1% of your bets) */}
              <CashbackCard onClaimed={refreshAuth} />

              {/* Countdown timer + progress bar */}
              <CountdownTimer timeLeft={timeLeft} phase={phase} />

              {/* Dual-colored Pool Bar */}
              <PoolBar messiPool={messiPool} ronaldoPool={ronaldoPool} />

              {/* Matter.js BallDrop Canvas (h-64 touch-friendly height) */}
              <BallDropCanvas
                phase={phase}
                forcedWinner={forcedWinner}
                onBallLanded={handleBallLanded}
              />

              {/* Betting Control Pad */}
              <BettingPad
                balance={balance}
                phase={phase}
                messiPool={messiPool}
                ronaldoPool={ronaldoPool}
                userCurrentBet={userCurrentBet}
                onPlaceBet={handlePlaceBet}
                autoBet={autoBet}
                onStartAuto={startAuto}
                onCancelAuto={cancelAuto}
              />

              {/* Live Bets feed (inline on game page) */}
              <LiveBetsCard bets={activeBets} />
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <ChatTab
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <ProfileTab
              username={user?.username || ''}
              balance={balance}
              withdrawable={withdrawable}
              cashback={user?.cashbackBalance ?? 0}
              roundId={roundId}
              sessionBets={activeBets.filter((b) => b.isUser).length}
              sessionStaked={activeBets.filter((b) => b.isUser).reduce((s, b) => s + b.amount, 0)}
              onLogout={() => {
                logout();
                setLoginUsername('');
              }}
              onOpenTopUp={() => setPaymentModal('topup')}
              onWithdraw={() => setPaymentModal('withdraw')}
            />
          )}
        </div>

        {/* 4. Persistent Bottom Tab Navigation Bar */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={(tab: TabType) => {
            setActiveTab(tab);
            if (tab === 'chat') {
              setUnreadChatCount(0);
            }
          }}
          activeBetsCount={activeBets.length}
          unreadChatCount={unreadChatCount}
        />

        {/* Overlays & Modals */}
        {betError && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-950/95 border border-red-500/60 text-red-200 text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl max-w-[85%] text-center animate-in fade-in">
            {betError}
          </div>
        )}
        {paymentModal && (
          <PaymentFormModal
            mode={paymentModal}
            withdrawable={withdrawable}
            onClose={() => {
              setPaymentModal(null);
              refreshAuth();
            }}
          />
        )}

        {resultModal && resultModal.isOpen && (
          <RoundResultModal
            roundId={roundId}
            winner={resultModal.winner}
            multiplier={resultModal.multiplier}
            totalPool={resultModal.totalPool}
            winningPool={resultModal.winningPool}
            userWinnings={resultModal.userWinnings}
            onClose={() => setResultModal(null)}
          />
        )}
      </main>
    </div>
  );
}