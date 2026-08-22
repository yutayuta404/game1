import { prisma } from '../lib/prisma';
import {
  TransactionType,
  PaymentType,
  PaymentStatus,
} from '../generated/prisma/enums';

export interface CreatePaymentInput {
  type: 'TOPUP' | 'WITHDRAW';
  coins: number;
  packageLabel?: string;
  platform?: string;
  txnRef?: string;
  screenshot?: string;
  accountNumber?: string;
}

const PLATFORMS = ['Kpay', 'Wave', 'Ayapay'];

export class PaymentService {
  static async createRequest(userId: string, data: CreatePaymentInput) {
    const coins = Number(data.coins);
    if (!coins || coins <= 0) throw new Error('Invalid coin amount');

    const type = data.type === 'WITHDRAW' ? PaymentType.WITHDRAW : PaymentType.TOPUP;

    if (type === PaymentType.TOPUP) {
      if (!data.platform || !PLATFORMS.includes(data.platform)) {
        throw new Error('Select a valid platform');
      }
      if (!data.txnRef || !data.txnRef.trim()) {
        throw new Error('Transaction No/ID is required');
      }
      return prisma.paymentRequest.create({
        data: {
          userId,
          type,
          packageLabel: data.packageLabel ?? null,
          coins,
          platform: data.platform,
          txnRef: data.txnRef.trim(),
          screenshot: data.screenshot ?? null,
          status: PaymentStatus.PENDING
        }
      });
    }

    // WITHDRAW — escrow funds immediately so they can't be double-spent
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');
      if (coins > user.withdrawableBalance) {
        throw new Error('Amount exceeds withdrawable balance');
      }
      if (!data.accountNumber || !data.accountNumber.trim()) {
        throw new Error('Payout account number is required');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: coins },
          withdrawableBalance: { decrement: coins }
        }
      });

      await tx.ledgerTransaction.create({
        data: {
          userId,
          amount: -coins,
          type: TransactionType.WITHDRAW,
          referenceId: null
        }
      });

      return tx.paymentRequest.create({
        data: {
          userId,
          type,
          coins,
          platform: (data.platform && PLATFORMS.includes(data.platform)) ? data.platform : 'Kpay',
          accountNumber: data.accountNumber.trim(),
          txnRef: data.txnRef ?? null,
          screenshot: data.screenshot ?? null,
          status: PaymentStatus.PENDING
        }
      });
    });
  }

  static async listMine(userId: string) {
    return prisma.paymentRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  static async listAll() {
    return prisma.paymentRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { username: true } } }
    });
  }

  /** Admin approve/reject. Rejecting a WITHDRAW refunds the escrow. */
  static async review(id: string, approve: boolean) {
    const req = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!req) throw new Error('Payment request not found');
    if (req.status !== PaymentStatus.PENDING) {
      throw new Error('Request already reviewed');
    }

    if (!approve) {
      // Refund escrowed withdrawals on rejection
      if (req.type === PaymentType.WITHDRAW) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: req.userId },
            data: {
              balance: { increment: req.coins },
              withdrawableBalance: { increment: req.coins }
            }
          }),
          prisma.ledgerTransaction.create({
            data: {
              userId: req.userId,
              amount: req.coins,
              type: TransactionType.REFUND,
              referenceId: req.id
            }
          })
        ]);
      }
      return prisma.paymentRequest.update({
        where: { id },
        data: { status: PaymentStatus.REJECTED, reviewedAt: new Date() }
      });
    }

    // Approving a TOPUP credits the balance now (locked until played)
    if (req.type === PaymentType.TOPUP) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: req.userId },
          data: { balance: { increment: req.coins } }
        }),
        prisma.ledgerTransaction.create({
          data: {
            userId: req.userId,
            amount: req.coins,
            type: TransactionType.TOPUP,
            referenceId: req.id
          }
        })
      ]);
    }
    // Approved WITHDRAW: coins already escrowed at request time; payout is manual/offline

    return prisma.paymentRequest.update({
      where: { id },
      data: { status: PaymentStatus.APPROVED, reviewedAt: new Date() }
    });
  }
}
