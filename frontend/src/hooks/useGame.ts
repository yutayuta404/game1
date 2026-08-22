import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import type { RoundState, Bet, SettleResult } from '@/types';

export function useGame(_userId: string | null) {
  const [round, setRound] = useState<RoundState | null>(null);
  const [userBet, setUserBet] = useState<Bet | null>(null);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settlingRef = useRef(false);

  const fetchRound = useCallback(async () => {
    try {
      const data = await api.getCurrentRound();
      setRound(data.round);
      setUserBet(data.userBet);
      setIsConnected(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
    }
  }, []);

  const placeBet = async (selection: 'MESSI' | 'RONALDO', amount: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.placeBet(selection, amount);
      setUserBet(result.bet);
      setIsConnected(true);
      return { success: true, newBalance: result.newBalance };
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const settle = async () => {
    if (settlingRef.current) return;
    settlingRef.current = true;
    setSettling(true);
    setError(null);
    try {
      const result = await api.settleRound();
      setSettleResult(result);
      setIsConnected(true);
      return { success: true, result };
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
      return { success: false, error: err.message };
    } finally {
      setSettling(false);
      settlingRef.current = false;
      // Refetch round after settlement
      setTimeout(fetchRound, 1000);
    }
  };

  useEffect(() => {
    fetchRound();

    intervalRef.current = setInterval(() => {
      if (round && round.status === 'ACTIVE') {
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = Math.max(0, round.endTimestamp - now);
        
        setRound((prev: RoundState | null) => prev ? {
          ...prev,
          timeRemaining,
          messiPercentage: (prev.totalMessi + prev.totalRonaldo) > 0 
            ? (prev.totalMessi / (prev.totalMessi + prev.totalRonaldo)) * 100 
            : 50,
          ronaldoPercentage: (prev.totalMessi + prev.totalRonaldo) > 0 
            ? (prev.totalRonaldo / (prev.totalMessi + prev.totalRonaldo)) * 100 
            : 50,
        } : null);

        if (timeRemaining === 0) {
          fetchRound();
        }
      } else {
        fetchRound();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchRound, round]);

  return {
    round,
    userBet,
    loading,
    settling,
    settleResult,
    error,
    isConnected,
    placeBet,
    settle,
    fetchRound,
    clearSettleResult: () => setSettleResult(null),
  };
}