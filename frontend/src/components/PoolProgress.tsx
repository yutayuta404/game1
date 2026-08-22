import { motion } from 'framer-motion';

interface PoolProgressProps {
  messiPercent: number;
  ronaldoPercent: number;
  totalMessi: number;
  totalRonaldo: number;
}

export function PoolProgress({ messiPercent, ronaldoPercent, totalMessi, totalRonaldo }: PoolProgressProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-messi-500 font-medium">Messi</span>
        <span className="text-ronaldo-500 font-medium">Ronaldo</span>
      </div>
      <div className="relative h-6 bg-dark-800 rounded-full overflow-hidden border border-dark-600">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-messi-500 to-messi-600"
          initial={{ width: 0 }}
          animate={{ width: `${messiPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute top-0 right-0 h-full bg-gradient-to-l from-ronaldo-500 to-ronaldo-600"
          initial={{ width: 0 }}
          animate={{ width: `${ronaldoPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {messiPercent > 0 && messiPercent < 100 && (
          <div className="absolute top-0 bottom-0 border-x border-white/30" style={{ left: `${messiPercent}%` }} />
        )}
      </div>
      <div className="flex justify-between text-xs text-dark-400 mt-1">
        <span>{totalMessi.toFixed(2)}</span>
        <span>{totalRonaldo.toFixed(2)}</span>
      </div>
    </div>
  );
}