# PROJECT_CONTEXT.md

## 1. Project Overview & Intent

**Messi vs Ronaldo / CLASHDROP** - Web2 mobile-first prediction pool game with 2D Matter.js physics animations.

- **Core mechanic**: Users bet on Messi or Ronaldo in 30-second rounds (configurable, was 5 min)
- **UI**: Rebuilt around an AI Studio "clash-ball-drop" mobile design — dark theme (`#05070A`/`#0D1117`/`#161B22` cards, amber accents), bottom tab nav, player cutout buttons
- **Fee structure**: **10% house fee, 1% jackpot fee (1-in-2,076 chance per round), 89% winner pool**
- **Off-chain**: Non-custodial balance system with manual admin top-ups
- **Withdrawal model**: Split balances — `balance` (spendable) vs `withdrawableBalance`. Funds are LOCKED until wagered: every $1 bet unlocks $1 for withdrawal (capped at balance). Wins/refunds credit both.
- **Settlement**: Local demo engine settles each round automatically in the UI (ball lands → result modal → next round). Backend `POST /settle` remains permissionless but is not called by the current UI flow.
- **Jackpot**: Accumulates 1% of all bets; 1 in 2,076 chance per settle; full vault paid to winners, then reset
- **Auto-Bet**: Prepay up to 1,440 rounds
- **Payments**: In-app deposit (MMK via Kpay/Wave/Ayapay → coin packages) and withdrawal forms styled like the game UI; every request recorded as a `PaymentRequest` shown in each user's Profile history (PENDING/APPROVED/REJECTED)
- **Telegram Mini App**: Runs inside Telegram (`@twa-dev/sdk`) — passwordless auto-login from `initDataUnsafe.user`, haptics on tabs/bets/wins, safe-area-aware nav; plain-browser fallback fully functional on one side; auto-fires one bet per betting round; cancellable anytime but current round stays committed

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
| POST   | `/login` | Username-only login, auto-creates user with 100 balance, returns JWT |
| GET    | `/me`    | Returns `{ id, username, balance, withdrawableBalance, createdAt }` |

### Game Routes (`/api/game`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/round` | Optional | Current round state + user's bet (if authed) |
| POST   | `/bet`   | Required | Deducts balance, **unlocks withdrawable** (min(w+amt, newBal)), fees split 10%/1%. Returns `{ success, bet, newBalance, newWithdrawable }` |
| POST   | `/settle`| Public | Settle expired round (permissionless) — not called by current UI |
| GET    | `/my-bets` | Required | User's bet history |
| GET    | `/transactions` | Required | User's ledger |
| GET    | `/vault` | Public | Global vault balances |
| POST   | `/payment-requests` | Required | Submit TOPUP (package/platform/txnRef/screenshot) or WITHDRAW (escrow-deducted immediately; ledger WITHDRAW) |
| GET    | `/payment-requests` | Required | Own payment history (max 50, newest first) |

### Admin Routes (`/api/admin`) - requires `x-admin-secret` header
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/topup` | Credit/debit user balance (CREDIT = locked funds, does NOT touch withdrawable) |
| GET    | `/users` | List users |
| GET    | `/rounds` | List rounds with bets |
| GET    | `/vault` | View vault |
| GET    | `/payment-requests` | All payment requests (with usernames) |
| POST   | `/payment-requests/:id/review` | Body `{approve:boolean}` — approve TOPUP credits balance (locked); reject WITHDRAW refunds escrow + ledger REFUND |

### Game Logic Flow (backend)

**Constants** (`gameService.ts:6-9`): `HOUSE_FEE_RATE=0.10`, `JACKPOT_FEE_RATE=0.01`, `NET_POOL_RATE=0.89`, `JACKPOT_ODDS=2076`

**Bet Placement** (`gameService.placeBet()`)
1. Validate active round not expired
2. Check user balance ≥ bet amount
3. Transaction:
   - `newBalance = user.balance - amount`
   - `newWithdrawable = min(user.withdrawableBalance + amount, newBalance)` ← play-to-unlock
   - Create Bet record
   - Increment round.totalMessi or totalRonaldo
   - Create LedgerTransaction (type: BET)
   - Update GlobalVault: **+10% houseFee, +1% jackpotFee**

**Settlement** (`gameService.settleRound()`)
1. Find ACTIVE round where `endTimestamp <= now`
2. If uncontested (one pool = 0) → CANCELLED, full refunds (restore balance AND withdrawable)
3. Else: 50/50 random winner, 1/**2076** jackpot roll
4. Net pool = **89%** of total bets + jackpot amount (if hit)
5. Distribute proportionally to winning side bets — payouts increment BOTH balance and withdrawableBalance
6. Update round: status=SETTLED, winner, jackpotHit, jackpotWonAmount
7. Reset jackpot vault if hit
8. Create next round automatically

### Frontend Round Engine (`GamePage.tsx`) — authoritative for UI
Local state machine independent of backend polling (useGame polling was REMOVED — it stomped phase state):
- `betting` (30s countdown w/ header progress bar) → timer hits 0 OR "Demo Drop" clicked → `dropping`
- `BallDropCanvas` spawns golden ball at top of pegboard → bounces through pegs → lands left(MESSI)/right(RONALDO)
- `onBallLanded` → confetti + win sound → `finished` + RoundResultModal (local payout math uses 0.96 multiplier — see Known Quirks)
- After ~4.5s modal closes → fresh `betting` round, pools reseeded, roundId+1
- Auto-bet effect fires one escrowed bet per new betting round (guarded by `autoPlacedRoundRef` roundId check)

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

### Current Configuration
- **Frontend port**: 5173 (dev server usually started with `--force`)
- **Round duration**: 30 seconds (backend `ROUND_DURATION`; frontend resets `setTimeLeft(30)`)
- **Fees**: 10% house / 1% jackpot / 89% pool (`gameService.ts:6-8`)
- **Jackpot odds**: 1-in-2076 (`gameService.ts:9`)
- **Build**: `npm run build` passes (tsc strict + verbatimModuleSyntax + noUnusedLocals)
- **Known quirks**: UI display multipliers use hardcoded 0.96 (4% edge) — slightly understates the real 89%-pool backend payouts; backend settle endpoint not wired into UI loop; `useGame` hook dormant

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
