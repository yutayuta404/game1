import { prisma } from '../lib/prisma';
import { GameService } from './gameService';
import { RoundStatus, Selection, TransactionType } from '../types';

// House-run simulated players: seed activity/liquidity so real users always
// see a live game. Bets go through the REAL GameService.placeBet path, so
// pools, fees, vault, live-bets feed and settlement all stay consistent.

const BOT_BANKROLL = 500_000;
const MIN_BOTS_PER_ROUND = 1;
const MAX_BOTS_PER_ROUND = 4; // hard cap per round
const MIN_STAKE = 1000;
const MAX_STAKE = 2000; // inclusive
const UNDERDOG_BIAS = 0.6; // chance a bot backs the currently smaller side
const LATEST_BET_SECONDS = 45; // never schedule later than this into a 60s round
const LATEST_BOT_DELAY_MAX_S = 45; // max random delay after round start
const EDGE_GUARD_MS = 3000; // keep bets >=3s before round end

const BOT_USERNAMES = [
  'ko_sok88',
  'mm_gamer01',
  'aunglay_2k',
  'kyaw_golfer',
  'thura_messi10',
  'zaw_zaw7',
  'mg_pyi_soe',
  'lwin_lwin888',
  'su_myat_no3',
  'htet_naing22',
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Clean hundreds only — 1000, 1100 … 2000. Never odd digits. */
function randomStake() {
  return randInt(MIN_STAKE / 100, MAX_STAKE / 100) * 100;
}

export class BotService {
  private static ensured = false;
  private static scheduledRounds = new Set<string>();

  static get enabled() {
    return process.env.BOTS_ENABLED !== 'false';
  }

  /** Idempotently create the persistent bot roster (once per process). */
  static async ensureBots() {
    if (this.ensured) return;
    try {
      const existing = await prisma.user.findMany({
        where: { isBot: true },
        select: { username: true },
      });
      const have = new Set(existing.map((u) => u.username));
      const missing = BOT_USERNAMES.filter((n) => !have.has(n));
      if (missing.length > 0) {
        await prisma.user.createMany({
          data: missing.map((username) => ({
            username,
            balance: BOT_BANKROLL,
            withdrawableBalance: 0,
            bonusLocked: 0,
            isBot: true,
          })),
        });
        console.log(`[bots] created ${missing.length} bot accounts`);
      }
      this.ensured = true;
    } catch (err) {
      console.error('[bots] ensureBots failed:', err);
    }
  }

  /**
   * Called on every settler tick. Schedules fake bets for the active round
   * exactly once per process lifetime of that round.
   */
  static async tick() {
    if (!this.enabled) return;

    const now = Math.floor(Date.now() / 1000);
    const round = await prisma.round.findFirst({
      where: {
        status: RoundStatus.ACTIVE,
        startTimestamp: { gte: now - LATEST_BET_SECONDS },
        endTimestamp: { gt: now },
      },
      orderBy: { startTimestamp: 'desc' },
    });
    if (!round || this.scheduledRounds.has(round.id)) return;
    this.scheduledRounds.add(round.id);

    // After a mid-round restart some bots may already have bet — don't double up.
    const existingBotBet = await prisma.bet.findFirst({
      where: { roundId: round.id, user: { isBot: true } },
    });
    if (existingBotBet) return;

    await this.ensureBots();
    const bots = await prisma.user.findMany({ where: { isBot: true } });
    if (bots.length === 0) return;

    const count = randInt(MIN_BOTS_PER_ROUND, MAX_BOTS_PER_ROUND);
    const picked = [...bots].sort(() => Math.random() - 0.5).slice(0, count);
    const remainingMs = Math.max(0, (round.endTimestamp - now) * 1000);

    for (const bot of picked) {
      const delay = Math.min(randInt(5, LATEST_BOT_DELAY_MAX_S) * 1000, Math.max(0, remainingMs - EDGE_GUARD_MS));
      setTimeout(() => {
        void this.placeBotBet(bot.id).catch((err) =>
          console.error('[bots] bet failed:', err?.message || err)
        );
      }, delay);
    }

    // Keep the in-memory guard bounded.
    if (this.scheduledRounds.size > 500) {
      this.scheduledRounds = new Set([...this.scheduledRounds].slice(-100));
    }
  }

  /** Place one bot bet on the current active round (re-guarded at fire time). */
  private static async placeBotBet(botUserId: string) {
    if (!this.enabled) return;

    const now = Math.floor(Date.now() / 1000);
    const round = await prisma.round.findFirst({
      where: { status: RoundStatus.ACTIVE, endTimestamp: { gt: now } },
      orderBy: { startTimestamp: 'desc' },
    });
    if (!round) return;

    const bot = await prisma.user.findUnique({ where: { id: botUserId } });
    if (!bot || !bot.isBot) return;

    const stake = randomStake();

    // House liquidity: bots collectively bleed ~11%/round to fees — top them up.
    let balance = bot.balance;
    if (balance < stake + 5000) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: bot.id },
          data: { balance: { increment: BOT_BANKROLL } },
        }),
        prisma.ledgerTransaction.create({
          data: {
            userId: bot.id,
            amount: BOT_BANKROLL,
            type: TransactionType.TOPUP,
            referenceId: 'bot_refill',
          },
        }),
      ]);
      balance += BOT_BANKROLL;
    }

    // ~60% back the smaller side so multipliers stay near the natural ~1.78x.
    const underdog =
      round.totalMessi <= round.totalRonaldo ? Selection.MESSI : Selection.RONALDO;
    const selection =
      Math.random() < UNDERDOG_BIAS
        ? underdog
        : underdog === Selection.MESSI
          ? Selection.RONALDO
          : Selection.MESSI;

    await GameService.placeBet(bot.id, { selection, amount: stake });
  }
}
