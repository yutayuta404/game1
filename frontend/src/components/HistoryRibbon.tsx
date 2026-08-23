import { useState } from 'react';
import { History, X } from 'lucide-react';
import type { RoundHistoryItem } from '../types/clash';
import { sound } from '../utils/audio';
import { useLang } from '../i18n';

interface HistoryRibbonProps {
  history: RoundHistoryItem[];
}

export const HistoryRibbon: React.FC<HistoryRibbonProps> = ({ history }) => {
  const [selectedRound, setSelectedRound] = useState<RoundHistoryItem | null>(null);
  const { t } = useLang();

  // Compute Messi vs Ronaldo win stats
  const messiWins = history.filter((h) => h.winner === 'messi').length;
  const total = history.length || 1;
  const messiPct = Math.round((messiWins / total) * 100);

  return (
    <div className="w-full bg-[#11161D] border-b border-[#30363D] py-1.5 px-3 select-none">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
          <History className="w-3 h-3 text-gray-400" />
          <span>{t('last10Rounds')}</span>
        </div>

        {/* Win Ratio Ticker */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-blue-400 font-bold">M: {messiPct}%</span>
          <span className="text-gray-600">•</span>
          <span className="text-red-400 font-bold">R: {100 - messiPct}%</span>
        </div>
      </div>

      {/* Horizontal Scroll Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
        {history.slice(0, 10).map((item) => {
          const isMessi = item.winner === 'messi';
          return (
            <button
              key={item.roundId}
              onClick={() => {
                sound.playClick();
                setSelectedRound(item);
              }}
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-transform active:scale-90 ${
                isMessi
                  ? 'bg-blue-950/60 border-blue-600/50 text-blue-300 hover:border-blue-400'
                  : 'bg-red-950/60 border-red-600/50 text-red-300 hover:border-red-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isMessi ? 'bg-blue-400 shadow-sm shadow-blue-400' : 'bg-red-400 shadow-sm shadow-red-400'
                }`}
              />
              <span>#{item.roundId}</span>
              <span className="text-gray-300 font-sans font-black">{isMessi ? 'M' : 'R'}</span>
              <span className="text-gray-400 text-[9px]">{item.multiplier.toFixed(2)}x</span>
            </button>
          );
        })}
      </div>

      {/* Round Details Mini-Modal */}
      {selectedRound && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 w-full max-w-xs shadow-xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-white">
                  {t('roundNo', { n: selectedRound.roundId })}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                    selectedRound.winner === 'messi'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'bg-red-600/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {selectedRound.winner === 'messi' ? t('messiWon') : t('ronaldoWon')}
                </span>
              </div>
              <button
                onClick={() => setSelectedRound(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#30363D]">
                <span className="text-gray-400">{t('winningMultiplier')}</span>
                <span className="text-amber-400 font-bold">{selectedRound.multiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#30363D]">
                <span className="text-gray-400">{t('totalPoolVolume')}</span>
                <span className="text-gray-200 font-bold">${selectedRound.totalPool.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#30363D]">
                <span className="text-blue-400">{t('messiPool')}</span>
                <span className="text-blue-300 font-bold">${selectedRound.messiPool.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-red-400">{t('ronaldoPool')}</span>
                <span className="text-red-300 font-bold">${selectedRound.ronaldoPool.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedRound(null)}
              className="mt-4 w-full py-1.5 bg-[#21262D] hover:bg-[#30363D] text-gray-200 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};