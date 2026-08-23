import { Router, Request, Response, NextFunction } from 'express';
import { GameService } from '../services/gameService';
import { PaymentService } from '../services/paymentService';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

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

  try {
    const result = await GameService.placeBet(req.user!.userId, { selection, amount });
    res.json({ success: true, bet: result.bet, newBalance: result.newBalance, newWithdrawable: result.newWithdrawable });
  } catch (err: any) {
    if (err instanceof Error && err.message === 'No active round available') {
      return res.status(409).json({ error: 'Round just ended — try again in a moment' });
    }
    throw err;
  }
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

// ---- Chat (real community messages) ----
router.get('/chat', asyncHandler(async (req: Request, res: Response) => {
  const take = Math.min(Number(req.query.limit) || 50, 100);
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, userId: true, username: true, text: true, createdAt: true },
  });
  res.json({ messages: messages.reverse() });
}));

router.post('/chat', authenticateToken, authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const text = String(req.body?.text || '').trim();
  if (!text || text.length > 140) {
    return res.status(400).json({ error: 'Message must be 1-140 characters' });
  }

  const last = await prisma.chatMessage.findFirst({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  });
  if (last && Date.now() - new Date(last.createdAt).getTime() < 1500) {
    return res.status(429).json({ error: 'Sending too fast — slow down a little' });
  }

  const message = await prisma.chatMessage.create({
    data: { userId: req.user!.userId, username: req.user!.username, text },
    select: { id: true, userId: true, username: true, text: true, createdAt: true },
  });
  res.json({ message });
}));

// ---- Recent bets across all players ----
router.get('/recent-bets', asyncHandler(async (req: Request, res: Response) => {
  const take = Math.min(Number(req.query.limit) || 20, 50);
  const bets = await prisma.bet.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { username: true } } },
  });
  res.json({
    bets: bets.map((b) => ({
      id: b.id,
      roundId: b.roundId,
      user: b.user.username,
      selection: b.selection,
      amount: b.amount,
      createdAt: b.createdAt,
    })),
  });
}));

// ---- Settled round history ----
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const rounds = await prisma.round.findMany({
    where: { status: 'SETTLED' },
    orderBy: { endTimestamp: 'desc' },
    take: 10,
    include: { bets: true },
  });
  res.json({
    rounds: rounds.map((r) => ({
      id: r.id,
      winner: r.winner,
      totalMessi: r.totalMessi,
      totalRonaldo: r.totalRonaldo,
      endTimestamp: r.endTimestamp,
      betCount: r.bets.length,
    })),
  });
}));

// ---- Client-reported lifecycle events (auto-bet start/cancel) for the audit trail ----
const ALLOWED_AUDIT_TYPES = ['AUTO_START', 'AUTO_CANCEL'];

router.post('/audit', authenticateToken, authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, detail } = req.body || {};
  if (!ALLOWED_AUDIT_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Unknown event type' });
  }
  const safe = typeof detail === 'object' && detail !== null ? detail : {};
  const message = await prisma.auditEvent.create({
    data: {
      userId: req.user!.userId,
      username: req.user!.username,
      type,
      detail: JSON.stringify(safe),
    },
  });
  res.json({ success: true, id: message.id });
}));

export default router;