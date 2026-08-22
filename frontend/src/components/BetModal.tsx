import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: 'MESSI' | 'RONALDO', amount: number) => void;
  balance: number;
  loading: boolean;
}

const QUICK_BETS = [0.1, 0.5, 1, 5, 10];

export function BetModal({ isOpen, onClose, onConfirm, balance, loading }: BetModalProps) {
  const [selection, setSelection] = useState<'MESSI' | 'RONALDO'>('MESSI');
  const [amount, setAmount] = useState(1);

  const handleQuickBet = (value: number) => {
    setAmount(value);
  };

  const handleConfirm = () => {
    if (amount > balance) return;
    onConfirm(selection, amount);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-dark-800 rounded-2xl border border-dark-600 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Place Bet</h2>
              <button
                onClick={onClose}
                className="text-dark-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setSelection('MESSI')}
                className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${
                  selection === 'MESSI'
                    ? 'border-messi-500 bg-messi-500/20 text-messi-400'
                    : 'border-dark-600 bg-dark-700 text-dark-300 hover:border-dark-500'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">⚽</span>
                  <span>Messi</span>
                </div>
              </button>
              <button
                onClick={() => setSelection('RONALDO')}
                className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${
                  selection === 'RONALDO'
                    ? 'border-ronaldo-500 bg-ronaldo-500/20 text-ronaldo-400'
                    : 'border-dark-600 bg-dark-700 text-dark-300 hover:border-dark-500'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span>Ronaldo</span>
                </div>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-dark-400 mb-2">Amount</label>
              <div className="flex gap-2 mb-3">
                {QUICK_BETS.map((bet) => (
                  <button
                    key={bet}
                    onClick={() => handleQuickBet(bet)}
                    disabled={loading || bet > balance}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      amount === bet
                        ? 'bg-gold-500 text-dark-950'
                        : bet > balance
                        ? 'bg-dark-700 text-dark-500 border border-dark-600 cursor-not-allowed'
                        : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500 hover:bg-dark-600'
                    }`}
                  >
                    {bet}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white text-lg font-mono focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              />
              <p className="text-xs text-dark-500 mt-1 text-right">
                Balance: <span className="text-gold-500 font-mono">{balance.toFixed(2)}</span>
              </p>
            </div>

            <button
              onClick={handleConfirm}
              disabled={loading || amount <= 0 || amount > balance}
              className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Placing...' : `Bet ${amount.toFixed(2)} on ${selection}`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}