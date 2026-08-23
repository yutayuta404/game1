# PROJECT_CONTEXT.md

## 1. Project Overview & Intent

**Messi vs Ronaldo / 0XDUEL** (formerly CLASHDROP) - Web2 mobile-first prediction pool game with 2D Matter.js physics animations. Live on Telegram via @zeroxduel_bot.

- **Core mechanic**: Users bet on Messi or Ronaldo in **60-second rounds** (server-timed)
- **UI**: Mobile-first dark theme (`#05070A`/`#0D1117`/`#161B22` cards, amber accents), bottom tab nav, player cutout buttons
- **Fee structure**: **10% house fee, 1% jackpot fee (1-in-2,076 chance per round), 89% winner pool**
- **Off-chain**: Non-custodial balance system with manual admin top-ups
- **Withdrawal model (FIXED)**: Split balances — `balance` vs `withdrawableBalance`. **Stakes NEVER create withdrawable**; only settlement WIN payouts, uncontested-round REFUNDs, and rejected-withdrawal refunds do. Top-ups stay locked until won.
- **Settlement**: **Server-authoritative.** Backend auto-settler settles expired rounds every 3s; UI syncs countdown/pools/results from `GET /round`, waits for verdict ("SETTLING"), then animates the ball toward the server-declared winner and shows the REAL ledger payout.
- **Jackpot**: Accumulates 1% of all bets; 1-in-2,076 per settle; paid to winners then reset
- **Auto-Bet**: Prepay up to 1,440 rounds (client-driven loop, one real bet per round; start/cancel reported to audit log)
- **Payments**: MMK deposit (Kpay/Wave/Ayapay → coin packages) + withdrawal forms; requests reviewed in **admin panel**
- **Admin panel**: `/admin.html` on the frontend — users, manual credit/debit, payment review, vault, **Live Activity audit feed**, per-user Inspect dossier
- **Telegram Mini App**: @zeroxduel_bot, menu button → app; passwordless login via **server-verified initData HMAC**; haptics; safe-area nav

---

## 2. Tech Stack & Environment

### Monorepo Structure
```
/game1
├── backend/          # Node.js/Express API
│   ├── src/
│   │   ├── routes/   # auth, game (+payment-requests), admin (+payment review)
│   │   ├── services/ # gameService.ts, paymentService.ts
│   │   ├── middleware/
│   │   ├── generated/prisma/  # ⚠️ Prisma 7 client output (see §7 Prisma note)
│   │   └── lib/      # prisma client (imports ../generated/prisma/client)
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── frontend/         # React/Vite SPA
│   ├── src/
│   │   ├── pages/    # GamePage.tsx (main app shell)
│   │   ├── components/  # incl. PaymentFormModal.tsx (top-up/withdraw forms)
│   │   ├── hooks/    # useAuth (useGame exists but unused by UI)
│   │   ├── services/
│   │   ├── utils/    # audio.ts (SFX synth) + telegram.ts (@twa-dev/sdk wrapper: init/haptics/auto-login)
│   │   └── types/    # index.ts (API types) + clash.ts (UI round/bet/chat types)
│   ├── public/       # messi-cutout.png, ronaldo-cutout.png (+ copies in public/images/)
│   └── package.json
├── clash-ball-drop.zip  # original AI Studio design source (folder was deleted after merge)
└── PROJECT_CONTEXT.md
```

### Backend
- **Runtime**: Node.js + `tsx` via nodemon
- **Framework**: Express 5
- **ORM**: Prisma 7.9.1 (new `prisma-client` generator) + PostgreSQL
- **Auth**: JWT (username-only login, auto-register, 100 starting balance)
- **Admin**: Secret header `x-admin-secret` for top-up endpoints

### Frontend
- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS 3.4 — dark theme moved to clash-drop palette in `index.css`
- **Animations**: Framer Motion (legacy comps) + Matter.js `BallDropCanvas` (custom canvas render loop, NOT Matter.Render) + canvas-confetti
- **Icons**: lucide-react
- **State**: `useAuth` (active). Round lifecycle is a LOCAL engine inside `GamePage.tsx`; bets persist via direct `api.placeBet()` calls (best-effort)

### Environment Variables

**backend/.env**
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/messi_ronaldo?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
ADMIN_SECRET="admin-secret-key-for-topup"
FRONTEND_URL="http://localhost:5173"
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:3001/api
VITE_ADMIN_SECRET=admin-secret-key-for-topup
```

---

## 3. Database Schema & Data Models

### Prisma Models (`backend/prisma/schema.prisma`)

```prisma
enum TransactionType { TOPUP, BET, WIN, REFUND, WITHDRAW }
enum PaymentType     { TOPUP, WITHDRAW }
enum PaymentStatus   { PENDING, APPROVED, REJECTED }
enum RoundStatus     { ACTIVE, SETTLED, CANCELLED }
enum WinnerSide      { MESSI, RONALDO }
enum Selection       { MESSI, RONALDO }

model User {
  id                  String   @id @default(uuid())
  username            String   @unique
  balance             Float    @default(100)   // total spendable
  withdrawableBalance Float    @default(0)     // unlocked by wagering (added this session)
  bonusLocked         Float    @default(0)     // signup-bonus portion of balance — NEVER withdrawable (2026-08-23)
  createdAt           DateTime @default(now())
  bets                Bet[]
  transactions        LedgerTransaction[]
}

model Round {
  id                String      @id @default(uuid())
  startTimestamp    Int         // Unix seconds
  endTimestamp      Int         // Unix seconds
  status            RoundStatus @default(ACTIVE)
  totalMessi        Float       @default(0)
  totalRonaldo      Float       @default(0)
  winner            WinnerSide?
  jackpotHit        Boolean     @default(false)
  jackpotWonAmount  Float       @default(0)
  createdAt         DateTime    @default(now())
  bets              Bet[]
}

model Bet {
  id        String     @id @default(uuid())
  roundId   String
  round     Round      @relation(fields: [roundId], references: [id])
  userId    String
  user      User       @relation(fields: [userId], references: [id])
  selection Selection
  amount    Float
  bonusFunded Float    @default(0)   // stake portion paid from locked signup bonus (2026-08-23)
  claimed   Boolean    @default(false)
  createdAt DateTime   @default(now())
  @@index([roundId])
  @@index([userId])
}

model LedgerTransaction {
  id          String           @id @default(uuid())
  userId      String
  user        User             @relation(fields: [userId], references: [id])
  amount      Float
  type        TransactionType
  referenceId String?
  createdAt   DateTime         @default(now())
  @@index([userId])
  @@index([referenceId])
}

model GlobalVault {
  id                   String @id @default("singleton")
  houseFeeBalance      Float  @default(0)
  jackpotVaultBalance  Float  @default(0)
}

model PaymentRequest {
  id            String        @id @default(uuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  type          PaymentType
  packageLabel  String?
  coins         Float
  platform      String        // Kpay | Wave | Ayapay
  txnRef        String?
  screenshot    String?       // base64 data URL receipt
  accountNumber String?
  status        PaymentStatus @default(PENDING)
  createdAt     DateTime      @default(now())
  reviewedAt    DateTime?
}
```
(User also has relation `payments PaymentRequest[]`)

After schema changes run:
```bash
cd backend && npx prisma db push && npx prisma generate
```

---

## 4. API Endpoints & Game Logic Flow

### Auth Routes (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/login` | Username-only login (browser fallback), auto-creates user with 100 balance, returns JWT. Audits LOGIN |
| POST   | `/telegram` | Body `{initData}` — verifies Telegram HMAC-SHA256 signature (`lib/telegram.ts`, 24h window, needs TELEGRAM_BOT_TOKEN). Audits LOGIN_TELEGRAM |
| GET    | `/me`    | Returns `{ id, username, balance, withdrawableBalance, createdAt }` |

### Game Routes (`/api/game`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/round` | Optional | Current round + `userBet` + `lastResult` (latest SETTLED round incl. `myPayout` from WIN ledger entries) |
| POST   | `/bet`   | Required | Deducts balance only (no unlock). 409 if round just ended. Audits BET w/ balance-after |
| POST   | `/settle`| Public | Manual settle (auto-settler normally handles this) |
| GET    | `/my-bets` | Required | User's bet history |
| GET    | `/transactions` | Required | User's ledger |
| GET    | `/vault` | Public | Global vault balances |
| GET    | `/chat` | Public | Last 50 real chat messages |
| POST   | `/chat` | Required | Send message (1-140 chars, 1.5s/user rate limit) |
| GET    | `/recent-bets` | Public | Last 20 bets across all users (Live Bets card) |
| GET    | `/history` | Public | Last 10 SETTLED rounds (history ribbon) |
| POST   | `/audit` | Required | Client lifecycle events; type allowlist: AUTO_START, AUTO_CANCEL |
| GET/POST | `/payment-requests` | Required | Submit/list TOPUP/WITHDRAW (WITHDRAW escrows instantly). Business errors → 400 with message |

### Admin Routes (`/api/admin`) - requires `x-admin-secret` header
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/topup` | Body `{username, amount, type: CREDIT\|DEBIT}` — adjusts balance (CREDIT stays locked) |
| GET    | `/users` | List users |
| GET    | `/users/:id` | **Inspect dossier**: user + last 100 bets/ledger/payments + audits + chat messages |
| GET    | `/audit?limit=` | Global audit feed (newest first, max 500) |
| GET    | `/rounds` | List rounds with bets |
| GET    | `/vault` | View vault |
| GET    | `/payment-requests` | All payment requests (with usernames) |
| POST   | `/payment-requests/:id/review` | Body `{approve:boolean}` — approve TOPUP credits balance (locked); reject WITHDRAW refunds escrow + ledger REFUND |

### Game Logic Flow (backend)

**Constants** (`gameService.ts`): `ROUND_DURATION=60`, `HOUSE_FEE_RATE=0.10`, `JACKPOT_FEE_RATE=0.01`, `NET_POOL_RATE=0.89`, `JACKPOT_ODDS=2076`

**Settler loop** (`index.ts`): every 3s calls `GameService.settleRound()` — settles one expired round per tick (SETTLED w/ random 50-50 winner + jackpot roll, or CANCELLED+refunds if uncontested), then auto-creates the next round. Audits ROUND_SETTLED / ROUND_CANCELLED + WIN/LOSS/REFUND per bet.

**Bet Placement** (`gameService.placeBet()`): validates active round, deducts balance only, creates Bet + ledger BET + fees to vault, audits BET.

**Settlement** (`gameService.settleRound()`): uncontested → CANCELLED full refunds; else 50/50 winner, jackpot roll, winners share 89% pool proportionally (credits balance AND withdrawable), audits everything.

**UI Round Engine** (`GamePage.tsx`) — server-authoritative:
- Polls `/round` every 1.4s (pools, deadline, own open-bet restore, lastResult)
- Local 500ms ticker counts down against server deadline; at 0 → phase `dropping`, waits for verdict
- While dropping: 1.2s rush-poll; when `lastResult.roundId` matches pending round → `forcedWinner` set
- `BallDropCanvas` spawns the ball only once verdict arrives (launch bias + gentle steering toward winning side); landing reports forced side
- Result modal shows REAL payout from `myPayout`; balances re-synced via `refreshAuth()`; failed bets revert all optimistic state and show a red toast
- Chat/bets/history poll on separate intervals (4s/5s/15s)

---

## 5. Key Frontend Components & Utilities

### Component Hierarchy
```
App.tsx → pages/GamePage.tsx
├── LoginScreen (inline, unauthenticated — username input → useAuth().login)
└── Mobile shell max-w-md
    ├── HeaderBar (round#, MM:SS pill, sound toggle, balance, Top Up)
    │   └── Countdown progress bar (emerald→amber→red, shrinks with timeLeft/30)
    ├── HistoryRibbon (last 10 rounds chips + win % ticker)
    ├── Tab views:
    │   ├── GAME TAB: JackpotPot → PoolBar → BallDropCanvas → BettingPad → LiveBetsCard
    │   ├── CHAT TAB: ChatTab (system/whale/user messages, quick phrases)
    │   └── PROFILE TAB: ProfileTab (avatar/name, Total vs Withdrawable vs Locked,
    │        session stats, House Rules card, Logout)
    ├── BottomTabBar (Game · Chat · Profile — Live Bets tab REMOVED)
    ├── TopUpModal (quick amounts + custom)
    └── RoundResultModal (winner cutout, settlement metrics, payout callout)
```

### Core Components
| File | Purpose |
|------|---------|
| `pages/GamePage.tsx` | Main app shell: local round engine, auth gate, balance/withdrawable sync, auto-bet orchestrator, simulated rival bets + chat feed |
| `components/BallDropCanvas.tsx` | Matter.js pegboard (gravity y:0.55 slow-drop). ONE unified rAF loop does Engine.update + all drawing (pegs/divider/labels/ball/particles). Static world built ONCE in useLayoutEffect `[]`; phase effect only spawns/removes ball. Landing detect y ≥ h-35 → confetti + onBallLanded |
| `components/BettingPad.tsx` | Amount input, presets, ½/2×/MAX, glass BET MESSI/RONALDO buttons (h-24, backdrop-blur-xl, cutouts w/ right-edge mask fade), bet CONFIRMATION modal, AUTO BET button + config modal (side picker, rounds ≤1440, cost summary) |
| `components/HeaderBar.tsx` | Sticky header + shrinking countdown bar under it |
| `components/JackpotPot.tsx` | Amber glowing ticker; polls `/api/game/vault` every 5s; shows live jackpot + "1 in 2,076" |
| `components/PoolBar.tsx` | Dual blue/red gradient pool split with multipliers ((total*0.96)/side) |
| `components/LiveBetsCard.tsx` | Inline recent-bets feed on game tab (own bets amber-highlighted) |
| `components/LiveBetsTab.tsx` | Full-page variant — UNUSED since nav tab removed |
| `components/ProfileTab.tsx` | Identity, Total/Withdrawable/Locked breakdown, session stats, fee rules (89/10/1, 1-in-2076), logout |
| `components/ChatTab.tsx` | Community feed + fixed input bar above nav |
| `components/RoundResultModal.tsx` | Winner cutout circle, multiplier, user settlement callout |
| `components/PaymentFormModal.tsx` | Deposit/withdraw forms (game-styled): coin packages (3000/5000/9000/20000 MMK → coins), Kpay/Wave/Ayapay picker with logo squares, txn-ID input, receipt screenshot upload (base64, max 2 MB), process explainer card, success screen. Withdraw validates amount <= withdrawable |
| `utils/telegram.ts` | Safe `@twa-dev/sdk` wrapper: `initTelegram()` (ready/expand/closing-confirm/theme), `getTelegramUsername()`, `isTelegram()`, `hapticLight/Success/Warning`. All calls no-op outside Telegram |
| `components/TopUpModal.tsx` | LEGACY — replaced by `PaymentFormModal` (no longer imported) |
| `utils/audio.ts` | SoundEngine singleton (WebAudio oscillators): click/chip/betPlaced/pegBounce/dropStart/win/tick; resumes suspended ctx via initCtx() |
| `types/clash.ts` | UI types: TabType('game'\|'bets'\|'chat'\|'profile'), TeamSide, BetItem, ChatMessage, RoundHistoryItem |
| `assets/messi-cutout.png` / `ronaldo-cutout.png` | Player portraits (1024² PNGs converted from zip JPGs — originals were corrupt, see Changelog) |

### State Hooks
| Hook | Responsibility |
|------|----------------|
| `useAuth` | JWT persistence (localStorage), login/logout, user profile incl. `withdrawableBalance`, `updateBalance()` |
| `useGame` | ⚠️ EXISTS BUT UNUSED BY UI (was removed from GamePage — its 1s polling clobbered local phase state). Kept for potential future API-driven rounds |

### API Service (`frontend/src/services/api.ts`)
- Singleton `ApiService`, token in localStorage, auto Bearer header
- `placeBet` typed return includes optional `newWithdrawable`

---

## 6. Current Status & How to Run

### Prerequisites
- PostgreSQL running locally (Homebrew: `brew services start postgresql@16`)
- Database `messi_ronaldo` created (`createdb messi_ronaldo`)
- Node.js 20+

### Startup Commands

**Terminal 1 - Backend**
```bash
cd /Users/makoto/Documents/game1/backend
npx prisma db push && npx prisma generate   # sync schema first time / after edits
npm run dev                                  # http://localhost:3001
```

**Terminal 2 - Frontend**
```bash
cd /Users/makoto/Documents/game1/frontend
npm run dev -- --force                       # http://localhost:5173 (--force clears Vite cache)
```

### Verification (verified working this session)
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

curl -s http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"   # balance + withdrawableBalance

curl -s -X POST http://localhost:3001/api/game/bet \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"selection":"MESSI","amount":10}'
# Expect e.g. { newBalance: 90, newWithdrawable: 10 }; vault house +$1.00, jackpot +$0.10

curl http://localhost:3001/api/game/vault
```
NOTE: `POST /bet` fails with "No active round available" if the latest backend round expired — insert one:
```sql
INSERT INTO "Round" ("id","startTimestamp","endTimestamp",status,"createdAt")
VALUES (gen_random_uuid(), extract(epoch from now())::int,
        extract(epoch from now())::int + 300, 'ACTIVE', now());
```

### Production Deployment (verified working 2026-08-23)

**Backend → Railway** (project `game1`, services: `backend` + `Postgres`)
- Public URL: `https://backend-production-5be2b.up.railway.app` (port 3001)
- Auto-deploys from GitHub `yutayuta404/game1` branch `main`
- **Start command**: `cd backend && npx prisma db push --accept-data-loss && node dist/index.js`
  — syncs the Prisma schema to the cloud DB on EVERY boot (Prisma 7 needs `cd backend` so it finds `prisma.config.ts`, which supplies DATABASE_URL from env; schema has no `url` line)
- ⚠️ Railway "Redeploy" REUSES the old deployment's config snapshot — start-command/pre-deploy changes only apply on a fresh deployment triggered by a git push (empty commit works)
- Env vars: ADMIN_SECRET, DATABASE_URL (→ Postgres), FRONTEND_URL (comma-separated multi-origin list), JWT_SECRET, NODE_ENV=production, PORT=3001, TELEGRAM_BOT_TOKEN

**Frontend → Vercel** (project `0xduel`) — https://0xduel.vercel.app
- Deployed via Vercel CLI from repo root (`vercel --prod`; root `.vercel/project.json` now links project `0xduel`). NOT git-linked.
- `vercel.json` at root: services.frontend → `frontend/`, vite
- API URL baked at build time via `frontend/.env.production` (`VITE_API_URL=https://backend-production-5be2b.up.railway.app/api`) — note `.env*` is gitignored, so this file exists only locally; CLI deploys include it. Old project `game1` (game1-tawny-gamma.vercel.app) still live but stale branding.
- Backend CORS verified for both vercel origins

**Admin Panel → https://0xduel.vercel.app/admin.html**
- Static page at `frontend/public/admin.html` (vanilla JS, no build step); secret gate stored in sessionStorage
- Features: vault stats, user list w/ balances, CREDIT/DEBIT manual fund adjustment, payment-request approve/reject with receipt previews
- Uses `x-admin-secret` header — CORS `allowedHeaders` updated in `backend/src/index.ts`
- ADMIN_SECRET was rotated 2026-08-23 (old value unknown to this session) — owner has the new value

**Telegram Mini App → @zeroxduel_bot**
- Bot name "0XDUEL", description set; Menu Button = web_app "PLAY 0XDUEL" → https://0xduel.vercel.app (configured via Bot API `setChatMenuButton`)
- **Verified server-side login**: `POST /api/auth/telegram {initData}` verifies Telegram HMAC-SHA256 signature (`backend/src/lib/telegram.ts`, secret = HMAC("WebAppData", botToken), 24h auth_date window) → finds/creates user by username or `tg_<id>` → returns JWT
- Frontend auto-login prefers `getInitData()` verified path; falls back to legacy username login only if initData absent
- Tampered-signature rejection verified via curl

### Real-data pass (2026-08-23)
- **Chat is real**: new `ChatMessage` Prisma model + `GET|POST /api/game/chat` (140-char limit, 1.5s/user rate limit); ChatTab polls every 4s, optimistic send, "N chatting" = distinct usernames
- **Live Bets card real**: `GET /api/game/recent-bets` (last 20 across users) polled every 5s; own bets flagged `isUser`
- **History ribbon real**: `GET /api/game/history` (last 10 SETTLED rounds, 15s poll) — empty until rounds settle server-side
- Removed ALL mocks: CHAT_SEED, RANDOM_USERS sim-bets/chatter/whale alerts, INITIAL_HISTORY, fake "142 online"
- Removed Demo Drop button + `handleManualTriggerDrop`; removed "Matter.js 2D Physics" badge from canvas
- NOTE: backend rounds still never settle automatically (`POST /settle` exists but uncalled) → history stays [] and expired rounds pile up until something calls settle
- **Ball logo**: header Flame → `BallMark` SVG (white disc, pentagon+seams knocked out via mask); assets: `public/logo-ball.svg`, `logo-ball.png` (1024), `logo-512.png`, `logo-192.png`, `apple-touch-icon.png`, favicon.svg now ball-on-gradient tile

### Anti-cheat audit + honest pools (2026-08-23)
- **Rounds now 60s** everywhere (backend `ROUND_DURATION=60`, frontend `ROUND_SECONDS`, resets, mm:ss format)
- **Pools start at 0 — no fake seeds**: removed local seed generation; PoolBar/BettingPad show `—` multipliers + "No bets yet — be the first" empty state until real bets land
- **AuditEvent model**: every action logged — BET (with balance-after), WIN/LOSS per settled round (payout amounts), REFUND (uncontested rounds), LOGIN / LOGIN_TELEGRAM, AUTO_START / AUTO_CANCEL (reported by client via `POST /api/game/audit`, type-allowlisted)
- **Admin panel**: new "Live Activity" card (auto-refresh 5s, all audit events) + per-user **Inspect** modal (`GET /api/admin/users/:id`) showing bets, full ledger, audit timeline, payments & chat history
- Ball logo disc enlarged r300→r372 (PNGs regenerated)

### Server-authoritative game loop (2026-08-23)
- **Backend auto-settler**: `setInterval(3s)` in `index.ts` settles expired rounds — payouts/losses/refunds now happen server-side automatically; history + audits populate
- **GET /round** now returns `lastResult` (latest SETTLED round: winner, pools, jackpot, and `myPayout` = user's real WIN ledger total for it)
- **UI engine rewritten to trust the server**: countdown syncs to server `endTimestamp`; at 0 the ball waits ("SETTLING") until the verdict arrives (poll 1.4s normally / 1.2s during drop), then drops steered toward the server winner (`forcedWinner` prop biases launch position + gentle velocity steering); result modal shows the REAL payout from the ledger; balances refresh from `/auth/me`
- **Multipliers now show the true 0.89 net-pool rate** everywhere (was fake 0.96)
- Payment request errors return proper **400** with message (was unhandled 500) — e.g. "Amount exceeds withdrawable balance"
- Verified end-to-end: contested round (20v20) settled → WIN audit for e2e_tester (+35.60 payout), LOSS for deploycheck, lastResult + history populated

### Current Configuration
- **Frontend port**: 5173 (dev server usually started with `--force`)
- **Round duration**: **60 seconds** (backend `ROUND_DURATION=60`; frontend syncs to server deadline, resets `setTimeLeft(60)`)
- **Fees**: 10% house / 1% jackpot / 89% pool (`gameService.ts:6-8`)
- **Jackpot odds**: 1-in-2076 (`gameService.ts:9`)
- **Build**: `npm run build` passes (tsc strict + verbatimModuleSyntax + noUnusedLocals)
- **Known quirks / watch-outs (post server-authoritative rework)**: browser username login is still unauthenticated (only Telegram path verifies identity) — gate before real payouts; AUTO_START/AUTO_CANCEL audit events are client-reported (money movements are server-side and cannot be faked); chat rate limit 1.5s/user; `useGame` hook dormant; old Vercel project `game1` (game1-tawny-gamma.vercel.app) still live with stale branding — safe to delete

---

## 7. Quick Reference for AI Agents

- **Primary context**: This file (`PROJECT_CONTEXT.md`)
- **Backend entry**: `backend/src/index.ts`
- **Game logic**: `backend/src/services/gameService.ts`
- **Frontend entry**: `frontend/src/main.tsx` → `App.tsx` → `pages/GamePage.tsx`
- **Types**: `frontend/src/types/index.ts` (API) + `frontend/src/types/clash.ts` (UI) + `backend/src/types/index.ts`
- **Database**: `backend/prisma/schema.prisma` → `npx prisma db push && npx prisma generate`
- **⚠️ PRISMA 7 NOTE**: Generator is new `prisma-client`, output goes to `src/generated/prisma`. Import client as `import { PrismaClient } from '../generated/prisma/client'` — do NOT import from `@prisma/client` (breaks with "Cannot find module '.prisma/client/default'"). Enums importable from `../generated/prisma/enums`.
- **Assets**: player cutouts live in `frontend/src/assets/*.png` (Vite-imported) with duplicates in `public/` and `public/images/`; pristine sources recoverable from `clash-ball-drop.zip` (root) — the extracted `.png`s in that zip are CORRUPT (UTF-8 mangled JPEGs); use the `.jpg` files instead
- **Telegram Mini App**: SDK script in `index.html` + `@twa-dev/sdk`; init in `App.tsx`; helpers in `src/utils/telegram.ts`; auto-login handled inside GamePage auth effect; browser fallback = all telegram helpers no-op
- **30-sec rounds**: Already applied in `gameService.ts`

---

## 8. Session Changelog (this session)

### Design merge & rebuild
- Merged AI Studio `clash-ball-drop` design into frontend: copied cutouts, rebuilt entire UI (HeaderBar, HistoryRibbon, PoolBar, BettingPad, BallDropCanvas, BottomTabBar, ChatTab, LiveBetsTab, TopUpModal, RoundResultModal, audio.ts, types/clash.ts), deleted the folder afterwards (zip retained)
- Added deps: lucide-react, canvas-confetti, motion, @types/canvas-confetti
- `App.tsx` now just renders `pages/GamePage.tsx`

### Auth flow fix
- Login screen wired to `useAuth().login()` (was dead `api.login('demo')`); username input bound; success → game dashboard swap

### Asset fixes
- Discovered both cutout PNGs were corrupt (binary JPEGs destroyed by UTF-8 replacement-char pass — undecodable)
- Recovered valid JPGs from `clash-ball-drop.zip`, verified visually, converted to real PNGs via `sips`, placed in `src/assets/` + `public/` + `public/images/`
- Switched to Vite asset imports (`import messiCutout from '../assets/messi-cutout.png'`) — hashed into build; added onError fallbacks; images blended via `scale-[1.7] origin-top object-cover object-top` + right-edge mask fade (`linear-gradient(to left, black 55%, transparent 98%)`)

### Canvas/physics fixes & tuning
- Root cause of blank canvas: two competing rAF loops (Matter.Render + custom overlay doing clearRect) — replaced with ONE unified render loop (Engine.update + manual drawing of background/zone glows/golden pegs/divider/MESSI-RONALDO labels/ball glow/particles/dispenser)
- Explicit container `h-[280px]`, forced canvas width from parentElement
- Static world built once (empty-deps layout effect); phase changes only spawn/remove ball body
- Slowed physics: gravity 1→0.55, launch vy 2→1, restitution 0.65→0.72, frictionAir 0.008

### Round engine fix
- Removed `useGame` from GamePage (its 1-second API polling overwrote phase/timeLeft/pools, killing dropping→finished transitions and Demo Drop)
- Local engine now authoritative; bets still persist via direct `api.placeBet()` (best-effort); also stopped 1s backend query spam

### Features added
- **Bet confirmation modal** before any placement (side/amount/multiplier/potential win; Confirm disabled if round flips)
- **TEAM BLUE/RED labels removed** from bet buttons
- **Live Bets**: inline `LiveBetsCard` on game tab; separate nav tab removed (bottom nav = Game · Chat · Profile)
- **Countdown progress bar** under header (green→amber→red, linear shrink; full-width pulse during drop)
- **Auto-Bet mode**: prepaid up to 1440 rounds (escrow deducted upfront), side picker + quick-round chips + cost preview, one auto bet per round (roundId-ref guarded), cancel refunds unplaced rounds only (current round committed), status chip shows remaining
- **Jackpot Pot ticker**: polls `/api/game/vault` every 5s, shows live vault + odds
- **Profile page** (4th tab): avatar/username, Total Balance vs Withdrawable vs Locked breakdown, session stats, House Rules card, logout
- **iOS 18-style glass buttons**: translucent gradients + backdrop-blur-xl + white/25 border + top sheen + inset ring (h-24)

### Economy changes
- Fees: house 1%→**10%**, jackpot 2%→**1%**, net pool 97%→**89%**
- Jackpot odds: 1-in-625 → **1-in-2076**
- **Withdrawable balance model**: schema field added (`User.withdrawableBalance`, db pushed); bets unlock funds (capped at balance); wins/refunds credit both balances; top-ups stay locked until played; `/auth/me` + `/bet` responses expose it; Profile UI splits Total / Withdrawable / Locked

### Infra fixes
- Prisma 7 generator output/import repaired (`@prisma/client` → `../generated/prisma/client` + enums path); schema `output` set to `../src/generated/prisma`
- Verified end-to-end via curl: $10 bet → balance 90 / withdrawable 10; vault house +$1.00, jackpot +$0.10
### Payment system — deposit & withdrawal forms
- New `PaymentRequest` model + `PaymentType`/`PaymentStatus` enums; `TransactionType` gained `WITHDRAW`; `User.payments` relation (db pushed, client regenerated)
- New `paymentService.ts`: `createRequest` (TOPUP → PENDING record; WITHDRAW → validates ≤ withdrawableBalance then escrow-deducts balance+withdrawable instantly with ledger WITHDRAW), `listMine`, `listAll`, `review` (approve TOPUP credits balance as locked funds; reject WITHDRAW refunds escrow + REFUND ledger entry)
- Routes: `POST|GET /api/game/payment-requests`, admin `GET /api/admin/payment-requests` and `POST /api/admin/payment-requests/:id/review {approve}`
- Frontend `PaymentFormModal.tsx` — modeled on user-provided payment-form screenshots, then restyled to game UI: back-arrow header "Payment Form", merchant Payment Info (Nyein Chan Latt · Pay No 09260096272), coin package select (3000/5000/9000/20000 MMK → coins; 20k has bonus coins), platform dropdown opening panel with KBZ/Wave/AYA logo squares (Kpay/Wave/Ayapay), Transaction No/ID input, receipt screenshot upload (base64 data URL, max 2 MB) + Choose Image button, collapsible Payment Process card with OK, blue→amber themed Submit; success screen ("Pending review") auto-closes after ~1.6s
- Withdraw form: amount ≤ withdrawable, platform, payout account number; coins held immediately on submit
- GamePage: old `TopUpModal` usage replaced by `paymentModal: null | 'topup' | 'withdraw'` state; `handleTopUp`/`adminTopUp` path removed; `refreshAuth()` on modal close re-syncs balances
- ProfileTab: **Withdraw** button beside Top Up (disabled when withdrawable = 0) + **Transaction History** card (TOPUP/WITHDRAW badges, ±coins, platform · txnRef/date, PENDING pulse / APPROVED / REJECTED chips); fetches `/payment-requests` on mount
- Verified end-to-end via curl: topup request → approve credits (+5,000); withdraw 5 coins → balance/withdrawable dropped (90→85) → reject refunded both back to 90/10

### Telegram Mini App integration
- `index.html`: `telegram-web-app.js` SDK script, `viewport-fit=cover`, theme-color #05070A, title CLASHDROP
- Installed `@twa-dev/sdk`
- New `utils/telegram.ts` — every call guarded/no-op outside Telegram: `initTelegram()` (ready, expand, enableClosingConfirmation, setHeaderColor/Background #05070A, disableVerticalSwipes), `isTelegram()`, `getTelegramUsername()` (username || first_name from initDataUnsafe.user), haptic wrappers `hapticLight/hapticSuccess/hapticWarning`
- `App.tsx` calls `initTelegram()` on mount
- GamePage: passwordless auto-login effect — when inside Telegram and unauthenticated, logs in with telegram username/first_name (one-shot ref guard); browser users unaffected
- Haptics wired: light impact on tab switches, preset chips, ½/2×/MAX, confirm-modal open; success on bet placed + round won; warning on lost round + confirm blocked by phase flip
- BottomTabBar bottom padding `calc(0.625rem + env(safe-area-inset-bottom))` for Telegram gesture bar
- Browser fallback verified: all helpers no-op when `window.Telegram` absent; login screen still shown normally

---

## 9. Session 2 Changelog (2026-08-23) — production launch + real-money integrity

### Railway backend fixed & deployed
- Root cause of all 500s: cloud DB never got schema updates (local used `db push`, deploys didn't)
- Start command now: `cd backend && npx prisma db push --accept-data-loss && node dist/index.js` (must `cd backend` — Prisma 7 needs `prisma.config.ts` for DATABASE_URL)
- ⚠️ Railway "Redeploy" reuses old config snapshot — config changes need a fresh git-push deployment
- CORS: multi-origin FRONTEND_URL (comma-split), explicit allowedHeaders `['Content-Type','Authorization','x-admin-secret']` — **Authorization was accidentally dropped once and broke all browser auth; never remove it**

### Telegram Mini App launched
- Bot @zeroxduel_bot (token on Railway as TELEGRAM_BOT_TOKEN); name "0XDUEL", menu button "PLAY 0XDUEL" → https://0xduel.vercel.app (set via Bot API)
- Server-verified login: POST /auth/telegram validates initData HMAC (`backend/src/lib/telegram.ts`); frontend auto-login prefers initData, username fallback only when absent

### Frontend redeployed as 0XDUEL on Vercel
- New Vercel project `0xduel` → https://0xduel.vercel.app (old project game1 still live, stale)
- Deploys via CLI from repo ROOT (`vercel --prod --yes`); root `.vercel/project.json` links 0xduel
- API URL baked via `frontend/.env.production` (gitignored — exists only locally; CLI deploys include it)
- Branding: header BallMark logo (SVG mask ball on gradient tile) + PNGs in `public/` (logo-ball/512/192/apple-touch-icon, favicon.svg); bet presets 100/1K/10K/100K default 100

### Admin panel (/admin.html)
- Secret-gated static page; sessionStorage persistence
- Users list w/ Inspect dossier (bets/ledger/audits/payments/chat per user), manual CREDIT/DEBIT, payment review w/ receipt previews, vault stats, Live Activity audit feed (5s auto-refresh)
- ADMIN_SECRET rotated this session (owner holds the value)

### Real data + anti-cheat audit
- Removed ALL mock/simulated data: chat seeds, bot chatter, fake rival bets, whale alerts, fake history, "142 online", Demo Drop button, "Matter.js 2D Physics" badge
- Chat is real: `ChatMessage` model + GET/POST /game/chat (140 chars, 1.5s rate limit)
- AuditEvent model logs BET (w/ balance-after), WIN, LOSS, REFUND, ROUND_SETTLED/CANCELLED, LOGIN(_TELEGRAM), AUTO_START/AUTO_CANCEL

### Economy integrity fixes
- Withdrawable only from payouts/refunds — stakes no longer unlock (hedge exploit removed)
- Rounds 60s everywhere
- Pools start at 0 with honest empty state; multipliers show true 0.89 rate
- Failed bets now revert optimistic state + red error toast (no more phantom balances)

### Server-authoritative loop
- Backend settler every 3s; UI syncs from /round (1.4s poll, 1.2s during drop)
- Ball waits for verdict ("SETTLING"), steers to server winner, modal shows real ledger payout
- Verified contested round end-to-end: WIN +35.60 credited, audits + history populated

## 10. Next Session — start here

### Signup bonus locking (2026-08-23)
- **$100 signup bonus can NEVER be withdrawn**: new users created with `balance:100, bonusLocked:100` (both auth routes). Invariant: `withdrawableBalance ≤ balance − bonusLocked`
- `Bet.bonusFunded` records how much of a stake came from the bonus. Bets spend NON-bonus funds first, bonus last (depositors never penalized)
- Settlement WIN: payout × (bonusFunded/amount) stays locked (`bonusLocked += lockedPayout`, withdrawable gets the rest)
- Uncontested REFUND: bonus-funded portion restored as locked; deposit-funded portion as withdrawable
- Verified end-to-end locally: fresh user 100/0/100 → uncontested refund keeps 0 withdrawable → pure-bonus WIN pays 178 fully locked (withdrawable stays 0); deposit-funded bet has bonusFunded=0
- i18n added same session: EN + Burmese (`frontend/src/i18n/`), language picker in ProfileTab, localStorage `oxduel_lang`, Noto Sans Myanmar font in index.html. Bet buttons (BET MESSI/BET RONALDO), numbers and 0XDUEL brand stay English

### House bots (2026-08-23)
- **Server-side simulated players** (`backend/src/services/botService.ts`, ticked every 3s from `index.ts`) — bets flow through the REAL `GameService.placeBet()` so pools/vault/fees/live-bets/settlement all stay consistent. Kill switch: `BOTS_ENABLED=false` env var
- 10 persistent bot users (`isBot: true`, roster in `BOT_USERNAMES`: ko_sok88, mm_gamer01, aunglay_2k…), created lazily with 500k balance; auto-refill +500k via TOPUP ledger `referenceId:'bot_refill'` when below stake+5k (bots bleed ~11%/round to fees)
- Per active round: 1–4 bots (hard cap 4), each bets once at random 5–45s after round start (never inside final 3s); stake = clean hundreds only: 100 × randInt(10..20) → 1000–2000; ~60% pick the smaller side (UNDERDOG_BIAS) to keep multipliers near ~1.78×
- Guards: one schedule per round per process (`scheduledRounds` Set), re-check round ACTIVE at fire time, skip if bot bet already exists for round (restart-safe), winner is still random 50/50 post-close so bots can never know outcomes
- Admin panel: purple BOT badge next to bot usernames in Users list, Live Activity feed, and Inspect modal (`isBot` field on User schema)
- Verified locally: bots bet every round (clean amounts, ≤4/round), settlements pay them normally (e.g. kyaw_golfer 1700 → WIN payout 4539)

### Jackpot removed → 1% claimable cashback (2026-08-23)
- **Jackpot system is OFF**: no more 1-in-2076 roll; `settleRound` pays winners from the plain 89% net pool (`jackpotHit=false, jackpotWonAmount=0` written for schema compat). Round/Bet jackpot DB fields intentionally KEPT — prod start command runs `db push --accept-data-loss`, so dropping columns would destroy data
- **1% of every stake now accrues to the bettor** as `User.cashbackBalance` (pending pot) instead of the global jackpot vault. House still nets 10% per bet
- **Claim flow**: `POST /api/game/cashback/claim` → atomic guarded tx zeroes the pot and credits claimed amount to BOTH `balance` and `withdrawableBalance` (real money, unlike locked signup bonus); ledger type `CASHBACK` (`referenceId:'cashback-claim'`) + audit `CASHBACK_CLAIM`. Double-claim safe (guarded update + P2025 → friendly 400)
- `/auth/me` now returns `cashbackBalance`; `/game/bet` response includes `newCashback`
- Frontend: `CashbackCard.tsx` replaced `JackpotPot` on game tab (emerald theme, polls /me every 5s, CLAIM button w/ haptics); ProfileTab shows pending cashback row + claim button in balance card, house rules now "Prize pool 89% / House fee 10% / Your cashback 1%"; i18n keys cashback* (EN+MY)
- ⚠️ Old jackpot vault money (~32.8k at removal time) sits frozen in `GlobalVault.jackpotVaultBalance` — visible in admin, sweep into house fees whenever owner decides
- Verified end-to-end: bet 50 → newCashback 0.5 → claim → balance/withdrawable +0.5, CASHBACK ledger row written, second claim rejected


**Verify health (30s):**
```bash
curl https://backend-production-5be2b.up.railway.app/api/health
curl -s https://0xduel.vercel.app/ | rg -o '<title>[^<]+'
# admin: https://0xduel.vercel.app/admin.html (secret = owner-held, set 2026-08-23)
```

**Deploy changes:** backend/frontend code → `git push origin main` (Railway auto-deploys). Frontend ALSO needs `vercel --prod --yes` from repo root (NOT git-linked).

**Known gaps / likely next tasks:**
1. Browser `/login` still trusts any username — restrict or verify before real payouts matter
2. Old Vercel project `game1` deletable; `useGame` hook dormant (candidate for deletion)
3. No jackpot win celebration path tested live yet (jackpotHit flow)
4. Auto-bet escrow is client-side only across rounds; consider server-side auto-bet sessions if users report abuse
5. If schema changes: rely on deploy-time `prisma db push` (already wired); local dev still `cd backend && npx prisma db push && npx prisma generate`
6. GEMINI_API_KEY on this machine is suspended (image-gen blocked); ip-as-logo skill installed at `.claude/skills/ip-as-logo/` if a working key appears
7. Test accounts on prod: timevault_team ($10,100 locked), e2e_tester, yuta, deploycheck — prune before marketing
