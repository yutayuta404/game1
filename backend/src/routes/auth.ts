import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { generateToken } from '../middleware/auth';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => 
    Promise.resolve(fn(req, res, next)).catch(next);

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const cleanUsername = username.trim().toLowerCase();

  let user = await prisma.user.findUnique({
    where: { username: cleanUsername }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username: cleanUsername,
        balance: 100
      }
    });
  }

  const token = generateToken(user.id, user.username);
  res.json({ user: { id: user.id, username: user.username, balance: user.balance, withdrawableBalance: user.withdrawableBalance }, token });
}));

router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const jwt = await import('jsonwebtoken');
  const decoded = jwt.default.verify(token, process.env.JWT_SECRET!) as { userId: string; username: string };

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, username: true, balance: true, withdrawableBalance: true, createdAt: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
}));

export default router;