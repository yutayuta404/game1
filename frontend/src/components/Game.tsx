import { useState } from 'react';
import { motion } from 'framer-motion';
import { Countdown } from './Countdown';
import { PoolProgress } from './PoolProgress';
import { BallDrop } from './BallDrop';
import { BetModal } from './BetModal';
import type { RoundState, Bet, SettleResult } from '@/types';

interface GameProps {
  round: RoundState | null;
  userBet: Bet | null;
  balance: number;
  loading: boolean;
  settling: boolean;
  settleResult: SettleResult | null;
  error: string | null;
  onPlaceBet: (selection: 'MESSI' | 'RONALDO', amount: number) => Promise<{ success: boolean; newBalance?: number }>;
  onSettle: () => Promise<{ success: boolean }>;
  onClearSettleResult: () => void;
}

export function Game({
  round,
  userBet,
  balance,
  loading,
  settling,
  settleResult,
  error,
  onPlaceBet,
  onSettle,
  onClearSettleResult,
}: GameProps) {
  const [betModalOpen, setBetModalOpen] = useState(false);

  const canSettle = round && round.status === 'ACTIVE' && round.timeRemaining === 0;
  const isSettled = round && (round.status === 'SETTLED' || round.status === 'CANCELLED');

  const handleBetClick = (_selection: 'MESSI' | 'RONALDO') => {
    if (!round || round.status !== 'ACTIVE') return;
    if (round.timeRemaining === 0) return;
    setBetModalOpen(true);
  };

  const handleBetConfirm = async (selection: 'MESSI' | 'RONALDO', amount: number) => {
    const result = await onPlaceBet(selection, amount);
    if (result.success && result.newBalance !== undefined) {
      // Balance will be updated by parent
    }
  };

  const handleSettle = async () => {
    const result = await onSettle();
    if (result.success) {
      // Result will be shown via settleResult
    }
  };

  if (!round) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Balance */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-dark-700"
      >
        <div>
          <p className="text-xs text-dark-400">Balance</p>
          <p className="text-2xl font-bold font-mono text-gold-500">{balance.toFixed(2)}</p>
        </div>
        <a
          href="https://t.me/your_support_username"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gold-500/20 border border-gold-500 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/30 transition-colors"
        >
          💬 Contact Support
        </a>
      </motion.div>

      {/* Round Status & Countdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-dark-800/50 rounded-xl border border-dark-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Round #{round.id.slice(0, 8)}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            round.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
            round.status === 'SETTLED' ? 'bg-blue-500/20 text-blue-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {round.status}
          </span>
        </div>

        {round.status === 'ACTIVE' && (
          <div className="text-center">
            <Countdown seconds={round.timeRemaining} isEnded={round.timeRemaining === 0} />
            <p className="text-sm text-dark-400 mt-2">
              {round.timeRemaining === 0 ? 'Round ended - Click Settle to see winner!' : 'Time remaining'}
            </p>
          </div>
        )}

        {round.status === 'SETTLED' && settleResult && (
          <div className="text-center">
            <div className="text-3xl font-bold mb-2" style={{ color: settleResult.winner === 'MESSI' ? '#0078D4' : '#E53935' }}>
              {settleResult.winner} Wins!
            </div>
            {settleResult.jackpotHit && settleResult.jackpotAmount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500 px-4 py-2 rounded-full mt-2"
              >
                <span>💰 JACKPOT HIT!</span>
                <span className="font-mono text-gold-500">+{settleResult.jackpotAmount.toFixed(2)}</span>
              </motion.div>
            )}
          </div>
        )}

        {round.status === 'CANCELLED' && (
          <div className="text-center text-red-400">
            <p className="font-medium">Round Cancelled</p>
            <p className="text-sm text-dark-400 mt-1">Only one side received bets. All bets refunded.</p>
          </div>
        )}
      </motion.div>

      {/* Pool Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 bg-dark-800/50 rounded-xl border border-dark-700"
      >
        <h3 className="text-lg font-semibold mb-4">Pool Distribution</h3>
        <PoolProgress
          messiPercent={round.messiPercentage}
          ronaldoPercent={round.ronaldoPercentage}
          totalMessi={round.totalMessi}
          totalRonaldo={round.totalRonaldo}
        />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-dark-900/50 rounded-lg p-3 border border-dark-700">
            <p className="text-xs text-dark-400">Messi Pool</p>
            <p className="text-xl font-bold font-mono text-messi-400">{round.totalMessi.toFixed(2)}</p>
          </div>
          <div className="bg-dark-900/50 rounded-lg p-3 border border-dark-700">
            <p className="text-xs text-dark-400">Ronaldo Pool</p>
            <p className="text-xl font-bold font-mono text-ronaldo-400">{round.totalRonaldo.toFixed(2)}</p>
          </div>
        </div>
      </motion.div>

      {/* Ball Drop Animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        {isSettled && settleResult ? (
          <BallDrop
            winner={settleResult.winner}
            jackpotHit={settleResult.jackpotHit}
            jackpotAmount={settleResult.jackpotAmount}
            onComplete={onClearSettleResult}
          />
        ) : (
          <div className="h-64 bg-dark-900/50 rounded-xl border border-dark-700 flex items-center justify-center">
            <div className="text-center text-dark-500">
              <p className="text-lg font-medium mb-2">Ball Drop Animation</p>
              <p className="text-sm">Will play when round settles</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Bet Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-3"
      >
        <button
          onClick={() => handleBetClick('MESSI')}
          disabled={round.status !== 'ACTIVE' || round.timeRemaining === 0 || loading}
          className={`relative py-4 rounded-xl font-medium transition-all border-2 ${
            round.status !== 'ACTIVE' || round.timeRemaining === 0
              ? 'bg-dark-700 border-dark-600 text-dark-500 cursor-not-allowed'
              : 'bg-messi-500/10 border-messi-500/50 text-messi-400 hover:bg-messi-500/20 hover:border-messi-500 active:scale-95'
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">⚽</span>
            <span className="font-bold">Messi</span>
            <span className="text-xs opacity-75">{round.totalMessi.toFixed(2)} units</span>
          </div>
          {userBet?.selection === 'MESSI' && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              ✓
            </span>
          )}
        </button>

        <button
          onClick={() => handleBetClick('RONALDO')}
          disabled={round.status !== 'ACTIVE' || round.timeRemaining === 0 || loading}
          className={`relative py-4 rounded-xl font-medium transition-all border-2 ${
            round.status !== 'ACTIVE' || round.timeRemaining === 0
              ? 'bg-dark-700 border-dark-600 text-dark-500 cursor-not-allowed'
              : 'bg-ronaldo-500/10 border-ronaldo-500/50 text-ronaldo-400 hover:bg-ronaldo-500/20 hover:border-ronaldo-500 active:scale-95'
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">🏆</span>
            <span className="font-bold">Ronaldo</span>
            <span className="text-xs opacity-75">{round.totalRonaldo.toFixed(2)} units</span>
          </div>
          {userBet?.selection === 'RONALDO' && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              ✓
            </span>
          )}
        </button>
      </motion.div>

      {/* Settle Button */}
      {canSettle && (
        <motion.button
          onClick={handleSettle}
          disabled={settling}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {settling ? 'Settling...' : '🎲 Settle & See Winner'}
        </motion.button>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Bet Modal */}
      <BetModal
        isOpen={betModalOpen}
        onClose={() => setBetModalOpen(false)}
        onConfirm={handleBetConfirm}
        balance={balance}
        loading={loading}
      />
    </div>
  );
}