export interface User {
  id: string;
  username: string;
  balance: number;
  withdrawableBalance: number;
  createdAt: string;
}

export interface Round {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  status: 'ACTIVE' | 'SETTLED' | 'CANCELLED';
  totalMessi: number;
  totalRonaldo: number;
  winner?: 'MESSI' | 'RONALDO';
  jackpotHit: boolean;
  jackpotWonAmount: number;
}

export interface RoundState {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  status: 'ACTIVE' | 'SETTLED' | 'CANCELLED';
  totalMessi: number;
  totalRonaldo: number;
  timeRemaining: number;
  messiPercentage: number;
  ronaldoPercentage: number;
}

export interface Bet {
  id: string;
  roundId: string;
  userId: string;
  selection: 'MESSI' | 'RONALDO';
  amount: number;
  claimed: boolean;
  createdAt: string;
  round?: Round;
}

export interface LedgerTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'TOPUP' | 'BET' | 'WIN' | 'REFUND';
  referenceId: string | null;
  createdAt: string;
}

export interface GlobalVault {
  id: string;
  houseFeeBalance: number;
  jackpotVaultBalance: number;
}

export interface SettleResult {
  round: Round;
  winner: 'MESSI' | 'RONALDO';
  jackpotHit: boolean;
  jackpotAmount: number;
  totalWinningPool: number;
  payouts: Array<{
    userId: string;
    betAmount: number;
    payout: number;
  }>;
}

export interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RoundResponse {
  round: RoundState;
  userBet: Bet | null;
}

export interface BetRequest {
  selection: 'MESSI' | 'RONALDO';
  amount: number;
}

export interface BetResponse {
  success: boolean;
  bet: Bet;
  newBalance: number;
}

export type WinnerSide = 'MESSI' | 'RONALDO';