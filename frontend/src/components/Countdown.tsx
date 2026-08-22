import { motion } from 'framer-motion';

interface CountdownProps {
  seconds: number;
  isEnded: boolean;
}

export function Countdown({ seconds, isEnded }: CountdownProps) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <motion.div
      className="flex items-center justify-center gap-2 text-3xl font-mono font-bold"
      animate={isEnded ? { scale: [1, 1.05, 1] } : {}}
      transition={isEnded ? { duration: 0.5, repeat: Infinity } : {}}
    >
      <span className="w-16 text-center bg-dark-800 rounded-lg px-2 py-1 border border-dark-600">
        {minutes.toString().padStart(2, '0')}
      </span>
      <span className="text-gold-500 animate-pulse">:</span>
      <span className="w-16 text-center bg-dark-800 rounded-lg px-2 py-1 border border-dark-600">
        {secs.toString().padStart(2, '0')}
      </span>
    </motion.div>
  );
}