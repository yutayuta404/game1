import { PrismaClient } from '../generated/prisma/client';
import {
  TransactionType as TransactionTypeEnum,
  RoundStatus as RoundStatusEnum,
  WinnerSide as WinnerSideEnum,
  Selection as SelectionEnum
} from '../generated/prisma/enums';

export type { PrismaClient };
export type User = import('../generated/prisma/models').UserModel;
export type Round = import('../generated/prisma/models').RoundModel;
export type Bet = import('../generated/prisma/models').BetModel;
export type GlobalVault = import('../generated/prisma/models').GlobalVaultModel;
export type TransactionType = typeof TransactionTypeEnum[keyof typeof TransactionTypeEnum];
export type RoundStatus = typeof RoundStatusEnum[keyof typeof RoundStatusEnum];
export type WinnerSide = typeof WinnerSideEnum[keyof typeof WinnerSideEnum];
export type Selection = typeof SelectionEnum[keyof typeof SelectionEnum];

// Runtime enum values
export const TransactionType = TransactionTypeEnum;
export const RoundStatus = RoundStatusEnum;
export const WinnerSide = WinnerSideEnum;
export const Selection = SelectionEnum;

export interface JWTPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface SettleResult {
  round: Round;
  winner: WinnerSide;
  jackpotHit: boolean;
  jackpotAmount: number;
  totalWinningPool: number;
  payouts: Array<{
    userId: string;
    betAmount: number;
    payout: number;
  }>;
}

export interface RoundState {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  status: RoundStatus;
  totalMessi: number;
  totalRonaldo: number;
  timeRemaining: number;
  messiPercentage: number;
  ronaldoPercentage: number;
}

export interface BetRequest {
  selection: Selection;
  amount: number;
}

export interface TopUpRequest {
  username: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
}