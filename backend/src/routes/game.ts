import { Router, Request, Response, NextFunction } from 'express';
import { GameService } from '@/services/gameService';
import { PaymentService } from '@/services/paymentService';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => 
    Promise.resolve(fn(req, res, next)).catch(next);

const authAsyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => 
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);

router.get('/round', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const round = await GameService.getCurrentRound();
  if (!round) {
    return res.status(500).json({ error: 'Failed to get current round' });
  }

  let userBet = null;
  if (req.user) {
    const bets = await GameService.getUserBets(req.user.userId, round.id);
    if (bets.length > 0) {
      userBet = bets[0];
    }
  }

  res.json({ round, userBet });
}));

router.post('/bet', authenticateToken, authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { selection, amount } = req.body;

  if (!selection || !['MESSI', 'RONALDO'].includes(selection)) {
    return res.status(400).json({ error: 'Invalid selection' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount' });
  }

  const result = await GameService.placeBet(req.user!.userId, { selection, amount });
  res.json({ success: true, bet: result.bet, newBalance: result.newBalance, newWithdrawable: result.newWithdrawable });
}));

router.post('/settle', asyncHandler(async (req: Request, res: Response) => {
  const now = Math.floor(Date.now() / 1000);
  
  const round = await prisma.round.findFirst({
    where: {
      status: 'ACTIVE',
      endTimestamp: { lte: now }
    },
    orderBy: { startTimestamp: 'desc' }
  });

  if (!round) {
    return res.status(400).json({ error: 'No round ready for settlement' });
  }

  const result = await GameService.settleRound();
  res.json({ success: true, ...result });
}));

router.get('/my-bets', authenticateToken, authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const bets = await GameService.getUserBets(req.user!.userId);
  res.json({ bets });
}));

router.get('/transactions', authenticateToken, authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transactions = await GameService.getUserTransactions(req.user!.userId);
  res.json({ transactions });
}));

router.get('/vault', asyncHandler(async (req: Request, res: Response) => {
  const vault = await GameService.getGlobalVault();
  res.json({ vault });
}));

// ---- Payment Requests (top-up / withdraw forms) ----
router.post('/payment-requests', authenticateToken, authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, coins, packageLabel, platform, txnRef, screenshot, accountNumber } = req.body;
  const result = await PaymentService.createRequest(req.user!.userId, {
    type, coins: Number(coins), packageLabel, platform, txnRef, screenshot, accountNumber
  });
  res.json({ success: true, request: result });
}));

router.get('/payment-requests', authenticateToken, authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requests = await PaymentService.listMine(req.user!.userId);
  res.json({ requests });
}));

export default router;