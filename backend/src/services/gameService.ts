import { prisma } from '../lib/prisma';
import { RoundStatus, WinnerSide, Selection, TransactionType } from '../types';
import { SettleResult, RoundState, BetRequest } from '../types';

const ROUND_DURATION = 60; // 60-second rounds
const HOUSE_FEE_RATE = 0.10; // 10%
const JACKPOT_FEE_RATE = 0.01; // 1%
const NET_POOL_RATE = 0.89; // 89%
const JACKPOT_ODDS = 2076; // 1 in 2,076

export class GameService {
  static async getCurrentRound(): Promise<RoundState | null> {
    const now = Math.floor(Date.now() / 1000);
    
    let round = await prisma.round.findFirst({
      where: {
        status: RoundStatus.ACTIVE,
        endTimestamp: { gte: now }
      },
      orderBy: { startTimestamp: 'desc' }
    });

    if (!round) {
      round = await this.createNewRound();
    }

    return this.formatRoundState(round, now);
  }

  static async createNewRound(): Promise<any> {
    const now = Math.floor(Date.now() / 1000);
    const startTimestamp = now;
    const endTimestamp = now + ROUND_DURATION;

    const round = await prisma.round.create({
      data: {
        startTimestamp,
        endTimestamp,
        status: RoundStatus.ACTIVE,
        totalMessi: 0,
        totalRonaldo: 0
      }
    });

    return round;
  }

  static formatRoundState(round: any, now: number): RoundState {
    const totalPool = round.totalMessi + round.totalRonaldo;
    const timeRemaining = Math.max(0, round.endTimestamp - now);
    
    return {
      id: round.id,
      startTimestamp: round.startTimestamp,
      endTimestamp: round.endTimestamp,
      status: round.status,
      totalMessi: round.totalMessi,
      totalRonaldo: round.totalRonaldo,
      timeRemaining,
      messiPercentage: totalPool > 0 ? (round.totalMessi / totalPool) * 100 : 50,
      ronaldoPercentage: totalPool > 0 ? (round.totalRonaldo / totalPool) * 100 : 50
    };
  }

  static async placeBet(userId: string, betData: BetRequest): Promise<{ bet: any; newBalance: number; newWithdrawable: number | null }> {
    const now = Math.floor(Date.now() / 1000);
    
    const round = await prisma.round.findFirst({
      where: {
        status: RoundStatus.ACTIVE,
        endTimestamp: { gte: now }
      },
      orderBy: { startTimestamp: 'desc' }
    });

    if (!round) {
      throw new Error('No active round available');
    }

    if (round.endTimestamp <= now) {
      throw new Error('Round has ended, cannot place bet');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.balance < betData.amount) {
      throw new Error('Insufficient balance');
    }

    if (betData.amount <= 0) {
      throw new Error('Bet amount must be positive');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Deduct from balance only — withdrawable grows exclusively from
      // actual payouts/refunds at settlement, never from stakes placed.
      const newBalance = user.balance - betData.amount;

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: newBalance
        }
      });

      // Create bet
      const bet = await tx.bet.create({
        data: {
          roundId: round.id,
          userId,
          selection: betData.selection,
          amount: betData.amount
        }
      });

      // Update round totals
      if (betData.selection === Selection.MESSI) {
        await tx.round.update({
          where: { id: round.id },
          data: { totalMessi: { increment: betData.amount } }
        });
      } else {
        await tx.round.update({
          where: { id: round.id },
          data: { totalRonaldo: { increment: betData.amount } }
        });
      }

      // Create ledger transaction
      await tx.ledgerTransaction.create({
        data: {
          userId,
          amount: -betData.amount,
          type: TransactionType.BET,
          referenceId: bet.id
        }
      });

      // Update global vault with fees
      const houseFee = betData.amount * HOUSE_FEE_RATE;
      const jackpotFee = betData.amount * JACKPOT_FEE_RATE;
      
      await tx.globalVault.upsert({
        where: { id: 'singleton' },
        update: {
          houseFeeBalance: { increment: houseFee },
          jackpotVaultBalance: { increment: jackpotFee }
        },
        create: {
          id: 'singleton',
          houseFeeBalance: houseFee,
          jackpotVaultBalance: jackpotFee
        }
      });

      return { bet, newBalance: updatedUser.balance, newWithdrawable: updatedUser.withdrawableBalance };
    });

    await prisma.auditEvent.create({
      data: {
        userId,
        username: user.username,
        type: 'BET',
        detail: JSON.stringify({ roundId: result.bet.roundId, betId: result.bet.id, selection: betData.selection, amount: betData.amount, balanceAfter: result.newBalance })
      }
    });

    return result;
  }

  static async settleRound(): Promise<SettleResult> {
    const now = Math.floor(Date.now() / 1000);

    const round = await prisma.round.findFirst({
      where: {
        status: RoundStatus.ACTIVE,
        endTimestamp: { lte: now }
      },
      orderBy: { startTimestamp: 'desc' },
      include: {
        bets: {
          include: { user: true }
        }
      }
    });

    if (!round) {
      throw new Error('No round ready for settlement');
    }

    if (round.status !== RoundStatus.ACTIVE) {
      throw new Error('Round already settled or cancelled');
    }

    const totalMessi = round.totalMessi;
    const totalRonaldo = round.totalRonaldo;
    const totalPool = totalMessi + totalRonaldo;

    // Check if uncontested (only one side has bets)
    if (totalMessi === 0 || totalRonaldo === 0) {
      return this.cancelRound(round);
    }

    // Generate random winner (50/50)
    const winner = Math.random() < 0.5 ? WinnerSide.MESSI : WinnerSide.RONALDO;
    
    // Check for jackpot (1 in 2,076)
    const jackpotRoll = Math.floor(Math.random() * JACKPOT_ODDS) + 1;
    const jackpotHit = jackpotRoll === 1;

    // Get jackpot vault balance
    const vault = await prisma.globalVault.findUnique({ where: { id: 'singleton' } });
    const jackpotVaultBalance = vault?.jackpotVaultBalance || 0;
    const jackpotWonAmount = jackpotHit ? jackpotVaultBalance : 0;

    // Calculate net prize pool (97% of total bets)
    const netBasePool = totalPool * NET_POOL_RATE;
    const totalWinningPool = netBasePool + jackpotWonAmount;

    // Calculate payouts for winning side
    const winningSideTotal = winner === WinnerSide.MESSI ? totalMessi : totalRonaldo;
    const winningBets = round.bets.filter((b: any) => b.selection === winner);

    const payouts: SettleResult['payouts'] = [];

    await prisma.$transaction(async (tx) => {
      for (const bet of winningBets) {
        const payout = (bet.amount / winningSideTotal) * totalWinningPool;
        
        // Credit user balance
        await tx.user.update({
          where: { id: bet.userId },
          data: {
            balance: { increment: payout },
            withdrawableBalance: { increment: payout }
          }
        });

        // Mark bet as claimed
        await tx.bet.update({
          where: { id: bet.id },
          data: { claimed: true }
        });

        // Create ledger transaction for win
        await tx.ledgerTransaction.create({
          data: {
            userId: bet.userId,
            amount: payout,
            type: TransactionType.WIN,
            referenceId: bet.id
          }
        });

        payouts.push({
          userId: bet.userId,
          betAmount: bet.amount,
          payout
        });
      }

      // Update round with settlement results
      await tx.round.update({
        where: { id: round.id },
        data: {
          status: RoundStatus.SETTLED,
          winner,
          jackpotHit,
          jackpotWonAmount
        }
      });

      // Reset jackpot vault if hit
      if (jackpotHit) {
        await tx.globalVault.update({
          where: { id: 'singleton' },
          data: { jackpotVaultBalance: 0 }
        });
      }

      // Create next round
      await this.createNewRound();
    });

    const usernameFor = (id: string) => round.bets.find((b: any) => b.userId === id)?.user?.username || 'unknown';
    await this.writeAudits([
      {
        userId: 'system', username: 'system', type: 'ROUND_SETTLED',
        detail: { roundId: round.id, winner, totalMessi, totalRonaldo, jackpotHit, jackpotWonAmount, payoutCount: payouts.length }
      },
      ...payouts.map((p) => ({
        userId: p.userId,
        username: usernameFor(p.userId),
        type: 'WIN',
        detail: { roundId: round.id, winner, betAmount: p.betAmount, payout: Math.round(p.payout * 100) / 100 }
      })),
      ...round.bets
        .filter((b: any) => b.selection !== winner)
        .map((b: any) => ({
          userId: b.userId,
          username: b.user?.username || 'unknown',
          type: 'LOSS',
          detail: { roundId: round.id, winner, betAmount: b.amount }
        }))
    ]);

    return {
      round: (await prisma.round.findUnique({ where: { id: round.id } }))!,
      winner,
      jackpotHit,
      jackpotAmount: jackpotWonAmount,
      totalWinningPool,
      payouts
    };
  }

  /** Fire-and-forget audit writes (never block settlement flow). */
  private static async writeAudits(events: { userId: string; username: string; type: string; detail: any }[]) {
    try {
      await prisma.auditEvent.createMany({
        data: events.map((e) => ({ userId: e.userId, username: e.username, type: e.type, detail: JSON.stringify(e.detail) }))
      });
    } catch (err) {
      console.error('audit write failed:', err);
    }
  }

  private static async cancelRound(round: any): Promise<SettleResult> {
    const bets = round.bets;

    await prisma.$transaction(async (tx) => {
      for (const bet of bets) {
        // Refund full bet amount (restores unlock status)
        await tx.user.update({
          where: { id: bet.userId },
          data: {
            balance: { increment: bet.amount },
            withdrawableBalance: { increment: bet.amount }
          }
        });

        await tx.bet.update({
          where: { id: bet.id },
          data: { claimed: true }
        });

        await tx.ledgerTransaction.create({
          data: {
            userId: bet.userId,
            amount: bet.amount,
            type: TransactionType.REFUND,
            referenceId: bet.id
          }
        });
      }

      await tx.round.update({
        where: { id: round.id },
        data: { status: RoundStatus.CANCELLED }
      });

      await this.createNewRound();
    });

    await this.writeAudits([
      {
        userId: 'system', username: 'system', type: 'ROUND_CANCELLED',
        detail: { roundId: round.id, reason: 'uncontested', refundCount: bets.length }
      },
      ...bets.map((b: any) => ({
        userId: b.userId,
        username: b.user?.username || 'unknown',
        type: 'REFUND',
        detail: { roundId: round.id, betAmount: b.amount }
      }))
    ]);

    return {
      round: (await prisma.round.findUnique({ where: { id: round.id } }))!,
      winner: WinnerSide.MESSI, // arbitrary
      jackpotHit: false,
      jackpotAmount: 0,
      totalWinningPool: 0,
      payouts: bets.map((b: any) => ({
        userId: b.userId,
        betAmount: b.amount,
        payout: b.amount // full refund
      }))
    };
  }

  static async getUserBets(userId: string, roundId?: string) {
    const where: any = { userId };
    if (roundId) where.roundId = roundId;

    return prisma.bet.findMany({
      where,
      include: { round: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getUserTransactions(userId: string, limit = 50) {
    return prisma.ledgerTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  static async getGlobalVault() {
    let vault = await prisma.globalVault.findUnique({ where: { id: 'singleton' } });
    if (!vault) {
      vault = await prisma.globalVault.create({
        data: { id: 'singleton', houseFeeBalance: 0, jackpotVaultBalance: 0 }
      });
    }
    return vault;
  }

  static async adminTopUp(username: string, amount: number, type: 'CREDIT' | 'DEBIT') {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new Error('User not found');
    }

    const actualAmount = type === 'CREDIT' ? Math.abs(amount) : -Math.abs(amount);
    const txType = type === 'CREDIT' ? TransactionType.TOPUP : TransactionType.BET;

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: actualAmount } }
      });

      await tx.ledgerTransaction.create({
        data: {
          userId: user.id,
          amount: actualAmount,
          type: txType,
          referenceId: `admin-${type.toLowerCase()}`
        }
      });

      return updatedUser;
    });
  }
}