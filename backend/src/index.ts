import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import adminRoutes from './routes/admin';
import { prisma } from './lib/prisma';
import { GameService } from './services/gameService';
import { BotService } from './services/botService';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim()),
].filter((o): o is string => Boolean(o));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret']
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // One-shot janitor: cancel stray ACTIVE rounds left by restarts/races
    // (phantom deadlines break the client countdown).
    void GameService.cleanupStrayRounds();

    // Authoritative settlement loop: settle any expired round every 3s
    setInterval(async () => {
      try {
        await GameService.settleRound();
      } catch {
        /* nothing expired — expected most ticks */
      }
    }, 3000);

    // Bot ticker: schedule simulated player bets once per active round
    // (disable with BOTS_ENABLED=false)
    setInterval(async () => {
      try {
        await BotService.tick();
      } catch {
        /* non-fatal */
      }
    }, 3000);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});