-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'BET', 'WIN', 'REFUND');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('ACTIVE', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WinnerSide" AS ENUM ('MESSI', 'RONALDO');

-- CreateEnum
CREATE TYPE "Selection" AS ENUM ('MESSI', 'RONALDO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "startTimestamp" INTEGER NOT NULL,
    "endTimestamp" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalMessi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRonaldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winner" "WinnerSide",
    "jackpotHit" BOOLEAN NOT NULL DEFAULT false,
    "jackpotWonAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selection" "Selection" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalVault" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "houseFeeBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jackpotVaultBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "GlobalVault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "LedgerTransaction_userId_idx" ON "LedgerTransaction"("userId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_referenceId_idx" ON "LedgerTransaction"("referenceId");

-- CreateIndex
CREATE INDEX "Bet_roundId_idx" ON "Bet"("roundId");

-- CreateIndex
CREATE INDEX "Bet_userId_idx" ON "Bet"("userId");

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
