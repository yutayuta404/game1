import { Router, Request, Response, NextFunction } from 'express';
import { GameService } from '../services/gameService';
import { PaymentService } from '../services/paymentService';
import { requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => 
    Promise.resolve(fn(req, res, next)).catch(next);

router.post('/topup', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { username, amount, type } = req.body;

  if (!username || !amount || !type) {
    return res.status(400).json({ error: 'Username, amount, and type are required' });
  }

  if (!['CREDIT', 'DEBIT'].includes(type)) {
    return res.status(400).json({ error: 'Type must be CREDIT or DEBIT' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  const user = await GameService.adminTopUp(username, amount, type);
  res.json({ success: true, user: { id: user.id, username: user.username, balance: user.balance } });
}));

router.get('/users', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json({ users });
}));

router.get('/rounds', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const rounds = await prisma.round.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      bets: true
    }
  });
  res.json({ rounds });
}));

router.get('/vault', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const vault = await GameService.getGlobalVault();
  res.json({ vault });
}));

// ---- Audit trail: global feed + per-user drill-down ----
router.get('/audit', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const take = Math.min(Number(req.query.limit) || 200, 500);
  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json({ events });
}));

router.get('/users/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bets: { orderBy: { createdAt: 'desc' }, take: 100 },
      transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
      payments: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const audits = await prisma.auditEvent.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const chatMessages = await prisma.chatMessage.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const { bets, transactions, payments, ...safeUser } = user;
  res.json({ user: safeUser, bets, transactions, payments, audits, chatMessages });
}));

export default router;
// ---- Payment request review (approve credits topups; reject refunds withdrawals) ----
router.get('/payment-requests', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const requests = await PaymentService.listAll();
  res.json({ requests });
}));

router.post('/payment-requests/:id/review', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { approve } = req.body;
  const result = await PaymentService.review(String(req.params.id), Boolean(approve));
  res.json({ success: true, request: result });
}));
