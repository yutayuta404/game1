export type TabType = 'game' | 'bets' | 'chat' | 'profile';

export type TeamSide = 'messi' | 'ronaldo';

export interface RoundHistoryItem {
  roundId: number;
  winner: TeamSide;
  multiplier: number;
  totalPool: number;
  messiPool: number;
  ronaldoPool: number;
  timestamp: number;
}

export interface BetItem {
  id: string;
  roundId: number;
  user: string;
  avatar: string;
  side: TeamSide;
  amount: number;
  estPayout: number;
  multiplier: number;
  timestamp: number;
  isUser?: boolean;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'system' | 'whale';
  user?: string;
  avatar?: string;
  badge?: string;
  text: string;
  side?: TeamSide;
  amount?: number;
  timestamp: number;
  isUser?: boolean;
}

export interface RoundState {
  roundId: number;
  phase: 'betting' | 'dropping' | 'finished';
  timeLeft: number;
  messiPool: number;
  ronaldoPool: number;
  totalBetsCount: number;
  winningSide?: TeamSide;
}