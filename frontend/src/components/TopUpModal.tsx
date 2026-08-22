import { useState } from 'react';
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { sound } from '../utils/audio';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUp: (amount: number) => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  onTopUp,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const quickAmounts = [25, 50, 100, 250, 500, 1000];

  const handleDeposit = () => {
    const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (finalAmount > 0) {
      sound.playBetPlaced();
      onTopUp(finalAmount);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#161B22] border border-amber-500/40 rounded-2xl w-full max-w-xs p-4 shadow-2xl shadow-amber-500/10 text-left animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-lg bg-[#0D1117] border border-[#30363D]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Instant Balance Top Up</h3>
            <p className="text-[10px] text-gray-400">Add free demo tokens or reload balance</p>
          </div>
        </div>

        {/* Quick Amounts Grid */}
        <div className="grid grid-cols-3 gap-2 my-3">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                sound.playChip();
                setSelectedAmount(amt);
                setCustomAmount('');
              }}
              className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all active:scale-95 cursor-pointer ${
                selectedAmount === amt && !customAmount
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-[#0D1117] text-gray-200 border-[#30363D] hover:border-gray-500'
              }`}
            >
              +${amt}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="mb-4">
          <label className="text-[10px] text-gray-400 font-mono block mb-1">
            Custom Amount ($)
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(0);
            }}
            placeholder="Enter custom amount..."
            className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Deposit Action */}
        <button
          onClick={handleDeposit}
          disabled={showSuccess}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {showSuccess ? (
            <>
              <Check className="w-4 h-4 text-black stroke-[3]" />
              <span>Balance Added!</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Deposit +${customAmount || selectedAmount}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};