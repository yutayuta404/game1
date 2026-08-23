import { useState, useEffect, useRef, useCallback } from 'react';
import type { TabType, TeamSide, RoundHistoryItem, BetItem, ChatMessage } from '../types/clash';
import { HeaderBar } from '../components/HeaderBar';
import { CountdownTimer } from '../components/CountdownTimer';
import { HistoryRibbon } from '../components/HistoryRibbon';
import { BottomTabBar } from '../components/BottomTabBar';
import { PoolBar } from '../components/PoolBar';
import { JackpotPot } from '../components/JackpotPot';
import { LiveBetsCard } from '../components/LiveBetsCard';
import { ProfileTab } from '../components/ProfileTab';
import { BallDropCanvas } from '../components/BallDropCanvas';
import { BettingPad } from '../components/BettingPad';
import { ChatTab } from '../components/ChatTab';
import { PaymentFormModal } from '../components/PaymentFormModal';
import { RoundResultModal } from '../components/RoundResultModal';
import { sound } from '../utils/audio';
import { useAuth } from '../hooks/useAuth';
import { getInitData, getTelegramUsername, hapticSuccess, hapticWarning } from '../utils/telegram';
import { api } from '../services/api';

// Initial Mock Seed Data
const INITIAL_HISTORY: RoundHistoryItem[] = [
  { roundId: 1041, winner: 'messi', multiplier: 1.85, totalPool: 6800, messiPool: 3600, ronaldoPool: 3200, timestamp: Date.now() - 35000 },
  { roundId: 1040, winner: 'ronaldo', multiplier: 2.12, totalPool: 5400, messiPool: 2900, ronaldoPool: 2500, timestamp: Date.now() - 70000 },
  { roundId: 1039, winner: 'messi', multiplier: 1.91, totalPool: 7200, messiPool: 3700, ronaldoPool: 3500, timestamp: Date.now() - 105000 },
  { roundId: 1038, winner: 'ronaldo', multiplier: 2.05, totalPool: 6100, messiPool: 3200, ronaldoPool: 2900, timestamp: Date.now() - 140000 },
  { roundId: 1037, winner: 'messi', multiplier: 1.88, totalPool: 8300, messiPool: 4400, ronaldoPool: 3900, timestamp: Date.now() - 175000 },
  { roundId: 1036, winner: 'messi', multiplier: 1.94, totalPool: 4900, messiPool: 2500, ronaldoPool: 2400, timestamp: Date.now() - 210000 },
  { roundId: 1035, winner: 'ronaldo', multiplier: 2.20, totalPool: 9100, messiPool: 5000, ronaldoPool: 4100, timestamp: Date.now() - 245000 },
  { roundId: 1034, winner: 'ronaldo', multiplier: 2.15, totalPool: 6400, messiPool: 3400, ronaldoPool: 3000, timestamp: Date.now() - 280000 },
  { roundId: 1033, winner: 'messi', multiplier: 1.82, totalPool: 7600, messiPool: 4100, ronaldoPool: 3500, timestamp: Date.now() - 315000 },
  { roundId: 1032, winner: 'messi', multiplier: 1.89, totalPool: 5800, messiPool: 3000, ronaldoPool: 2800, timestamp: Date.now() - 350000 },
];

const RANDOM_USERS = [
  { name: 'CryptoKing', avatar: 'CK', badge: 'VIP 3' },
  { name: 'Satoshi99', avatar: 'S9', badge: 'VIP 2' },
  { name: 'BarcaFan10', avatar: 'BF', badge: 'PRO' },
  { name: 'Madridista7', avatar: 'M7', badge: 'PRO' },
  { name: 'MoonWalker', avatar: 'MW', badge: 'VIP 1' },
  { name: 'ApexPredator', avatar: 'AP', badge: 'ELITE' },
  { name: 'LuckyStrike', avatar: 'LS', badge: 'PRO' },
  { name: 'GoldDigger', avatar: 'GD', badge: 'VIP 4' },
  { name: 'CR7Prime', avatar: 'C7', badge: 'LEGEND' },
  { name: 'LeoAnkara', avatar: 'LA', badge: 'LEGEND' },
];

const CHAT_SEED: ChatMessage[] = [
  {
    id: 'c-1',
    type: 'system',
    text: 'Welcome to 0XDUEL! Pick your side: Team Messi vs Team Ronaldo. 30s per round!',
    timestamp: Date.now() - 60000,
  },
  {
    id: 'c-2',
    type: 'user',
    user: 'BarcaFan10',
    avatar: 'BF',
    badge: 'PRO',
    text: 'Messi is on a 3-round streak! Locking in $100 on Leo.',
    timestamp: Date.now() - 40000,
  },
  {
    id: 'c-3',
    type: 'user',
    user: 'Madridista7',
    avatar: 'M7',
    badge: 'PRO',
    text: 'Ronaldo bounce is due this round, watch the physics right peg!',
    timestamp: Date.now() - 25000,
  },
  {
    id: 'c-4',
    type: 'whale',
    text: 'High Roller Alert: @GoldDigger placed $450 on Ronaldo at 2.15x payout!',
    timestamp: Date.now() - 15000,
  },
];

export default function GamePage() {
  const { user, loading: authLoading, login, loginTelegram, logout, updateBalance, refresh: refreshAuth } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('game');
  const [loginUsername, setLoginUsername] = useState<string>('');

  // User State
  const [balance, setBalance] = useState<number>(1250);
  const [withdrawable, setWithdrawable] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [paymentModal, setPaymentModal] = useState<null | 'topup' | 'withdraw'>(null);

  // Round State
  const [roundId, setRoundId] = useState<number>(1042);
  const [phase, setPhase] = useState<'betting' | 'dropping' | 'finished'>('betting');
  const [timeLeft, setTimeLeft] = useState<number>(28);
  const [messiPool, setMessiPool] = useState<number>(3420);
  const [ronaldoPool, setRonaldoPool] = useState<number>(2890);

  // User Active Bet on this round
  const [userCurrentBet, setUserCurrentBet] = useState<{
    side: TeamSide;
    amount: number;
    estPayout: number;
  } | null>(null);

  // Live Bets Table State
  const [activeBets, setActiveBets] = useState<BetItem[]>([
    {
      id: 'b-1',
      roundId: 1042,
      user: 'GoldDigger',
      avatar: 'GD',
      side: 'ronaldo',
      amount: 450,
      estPayout: 967.5,
      multiplier: 2.15,
      timestamp: Date.now() - 15000,
    },
    {
      id: 'b-2',
      roundId: 1042,
      user: 'BarcaFan10',
      avatar: 'BF',
      side: 'messi',
      amount: 100,
      estPayout: 185.0,
      multiplier: 1.85,
      timestamp: Date.now() - 22000,
    },
    {
      id: 'b-3',
      roundId: 1042,
      user: 'Satoshi99',
      avatar: 'S9',
      side: 'messi',
      amount: 250,
      estPayout: 462.5,
      multiplier: 1.85,
      timestamp: Date.now() - 30000,
    },
    {
      id: 'b-4',
      roundId: 1042,
      user: 'MoonWalker',
      avatar: 'MW',
      side: 'ronaldo',
      amount: 75,
      estPayout: 161.25,
      multiplier: 2.15,
      timestamp: Date.now() - 35000,
    },
  ]);

  // Chat Feed State
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_SEED);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // History Ribbon State
  const [history, setHistory] = useState<RoundHistoryItem[]>(INITIAL_HISTORY);

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
      setBalance((prev) => {
        const nb = prev - amount;
        // Playing unlocks funds (capped at remaining balance)
        setWithdrawable((w) => Math.min(w + amount, nb));
        return nb;
      });
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
      user: 'You',
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

    // Announce high bets in chat
    if (amount >= 100) {
      const whaleNotice: ChatMessage = {
        id: `whale-${Date.now()}`,
        type: 'whale',
        text: `High Roller: You placed $${amount} on ${side === 'messi' ? 'Team Messi' : 'Team Ronaldo'}!`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, whaleNotice]);
    }

    // Persist to backend best-effort; local round engine stays authoritative
    try {
      const result = await api.placeBet(side === 'messi' ? 'MESSI' : 'RONALDO', amount);
      if (result?.newBalance !== undefined) {
        updateBalance(result.newBalance);
        setBalance(result.newBalance);
      }
      if ((result as any)?.newWithdrawable !== undefined) {
        setWithdrawable((result as any).newWithdrawable);
      }
    } catch (err) {
      console.error('Bet sync failed (demo continues):', err);
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
  };

  const cancelAuto = () => {
    setAutoBet((ab) => {
      if (!ab) return null;
      // Refund only unplaced rounds — current round funds stay committed
      const refund = ab.remaining * ab.amount;
      if (refund > 0) setBalance((b) => b + refund);
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
    const newMsg: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      type: 'user',
      user: 'You',
      avatar: 'ME',
      badge: 'VIP',
      text,
      timestamp: Date.now(),
      isUser: true,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // Ball Drop Landing Callback from Matter.js
  const handleBallLanded = useCallback((winner: TeamSide) => {
    setPhase('finished');

    const total = messiPoolRef.current + ronaldoPoolRef.current;
    const winPool = winner === 'messi' ? messiPoolRef.current : ronaldoPoolRef.current;
    const winningMultiplier = winPool > 0 ? (total * 0.96) / winPool : 1.92;

    let userWinnings: number | null = null;
    if (userCurrentBetRef.current) {
      if (userCurrentBetRef.current.side === winner) {
        userWinnings = userCurrentBetRef.current.amount * winningMultiplier;
        setBalance((prev) => prev + userWinnings!);
        setWithdrawable((prev) => prev + userWinnings!);
        hapticSuccess(); // won round
      } else {
        userWinnings = 0;
        hapticWarning(); // lost round
      }
    }

    // Record round history
    const newHistoryItem: RoundHistoryItem = {
      roundId: roundIdRef.current,
      winner,
      multiplier: winningMultiplier,
      totalPool: total,
      messiPool: messiPoolRef.current,
      ronaldoPool: ronaldoPoolRef.current,
      timestamp: Date.now(),
    };

    setHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);

    // Broadcast system winner alert in chat
    const winChatMsg: ChatMessage = {
      id: `result-${Date.now()}`,
      type: 'system',
      text: `Round #${roundIdRef.current} Settled: ${
        winner === 'messi' ? 'Team Messi' : 'Team Ronaldo'
      } WON! Multiplier: ${winningMultiplier.toFixed(2)}x ($${total.toLocaleString()} total pool).`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, winChatMsg]);

    // Show result celebration popup
    setResultModal({
      isOpen: true,
      winner,
      multiplier: winningMultiplier,
      totalPool: total,
      winningPool: winPool,
      userWinnings,
    });

    // Reset for next round after 5 seconds
    setTimeout(() => {
      setResultModal(null);
      setRoundId((prev) => prev + 1);
      setPhase('betting');
      setTimeLeft(30);
      setUserCurrentBet(null);
      setActiveBets([]);

      // Generate realistic initial simulated seeds for next round
      const seedMessi = 2200 + Math.floor(Math.random() * 2000);
      const seedRonaldo = 2000 + Math.floor(Math.random() * 2000);
      setMessiPool(seedMessi);
      setRonaldoPool(seedRonaldo);
    }, 4500);
  }, []);

  // Manual Trigger Demo Drop (Instant test)
  const handleManualTriggerDrop = () => {
    if (phase === 'betting') {
      setTimeLeft(0);
      setPhase('dropping');
    }
  };

  // Main 30-Second Countdown & Round Engine
  useEffect(() => {
    const timer = setInterval(() => {
      if (phaseRef.current === 'betting') {
        if (timeLeftRef.current > 0) {
          setTimeLeft((prev) => {
            const next = prev - 1;
            if (next <= 5 && next > 0) {
              sound.playTick();
            }
            return next;
          });

          // Random simulated incoming bet from other players
          if (Math.random() < 0.45) {
            const randomPlayer = RANDOM_USERS[Math.floor(Math.random() * RANDOM_USERS.length)];
            const side: TeamSide = Math.random() > 0.48 ? 'messi' : 'ronaldo';
            const amounts = [10, 25, 50, 75, 100, 150, 250, 500];
            const betAmount = amounts[Math.floor(Math.random() * amounts.length)];

            if (side === 'messi') {
              setMessiPool((p) => p + betAmount);
            } else {
              setRonaldoPool((p) => p + betAmount);
            }

            const currentTotal = messiPoolRef.current + ronaldoPoolRef.current + betAmount;
            const currentSide = (side === 'messi' ? messiPoolRef.current : ronaldoPoolRef.current) + betAmount;
            const mult = (currentTotal * 0.96) / currentSide;

            const simBet: BetItem = {
              id: `sim-bet-${Date.now()}-${Math.random()}`,
              roundId: roundIdRef.current,
              user: randomPlayer.name,
              avatar: randomPlayer.avatar,
              side,
              amount: betAmount,
              estPayout: betAmount * mult,
              multiplier: mult,
              timestamp: Date.now(),
            };

            setActiveBets((prev) => [simBet, ...prev.slice(0, 49)]);

            if (betAmount >= 250) {
              const whaleAlert: ChatMessage = {
                id: `whale-${Date.now()}-${Math.random()}`,
                type: 'whale',
                text: `High Roller Alert: @${randomPlayer.name} placed $${betAmount} on ${side === 'messi' ? 'Messi' : 'Ronaldo'}!`,
                timestamp: Date.now(),
              };
              setMessages((m) => [...m, whaleAlert]);
            }
          }

          // Random simulated chat chatter
          if (Math.random() < 0.15) {
            const chatQuotes = [
              'Leo GOAT for real',
              'Siuuu all day',
              'Pool is getting massive!',
              'Come on Ronaldo right bin!',
              'Messi 2x payout incoming!',
              'Look at that bounce trajectory',
            ];
            const randomPlayer = RANDOM_USERS[Math.floor(Math.random() * RANDOM_USERS.length)];
            const randomQuote = chatQuotes[Math.floor(Math.random() * chatQuotes.length)];
            const simChat: ChatMessage = {
              id: `chat-${Date.now()}-${Math.random()}`,
              type: 'user',
              user: randomPlayer.name,
              avatar: randomPlayer.avatar,
              badge: randomPlayer.badge,
              text: randomQuote,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, simChat]);
          }
        } else {
          // Timer reached 0 -> Trigger ball drop!
          setPhase('dropping');
        }
      }
    }, 1000);

    return () => clearInterval(timer);
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
            <p className="text-gray-400 text-sm">Messi vs Ronaldo — 30s Prediction Duels</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter username..."
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
              {authLoading ? 'Logging in...' : 'Start Playing'}
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
        />

        {/* 2. Persistent History Ribbon */}
        <HistoryRibbon history={history} />

        {/* 3. Tab Views Content (Internal Scroll Area) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* GAME TAB */}
          {activeTab === 'game' && (
            <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 pb-20 no-scrollbar">
              {/* Live Jackpot Pot ticker */}
              <JackpotPot />

              {/* Countdown timer + progress bar */}
              <CountdownTimer timeLeft={timeLeft} phase={phase} />

              {/* Dual-colored Pool Bar */}
              <PoolBar messiPool={messiPool} ronaldoPool={ronaldoPool} />

              {/* Matter.js BallDrop Canvas (h-64 touch-friendly height) */}
              <BallDropCanvas
                phase={phase}
                onBallLanded={handleBallLanded}
                onManualTriggerDrop={handleManualTriggerDrop}
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