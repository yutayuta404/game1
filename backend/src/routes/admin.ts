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
