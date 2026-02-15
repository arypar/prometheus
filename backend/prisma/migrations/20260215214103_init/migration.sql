-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('CURVE', 'DEX');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "BotActionType" AS ENUM ('SCAN', 'EVALUATE', 'BUY', 'SELL', 'SKIP', 'ERROR');

-- CreateTable
CREATE TABLE "Token" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "creatorAddress" TEXT,
    "currentPrice" TEXT NOT NULL DEFAULT '0',
    "marketCap" TEXT NOT NULL DEFAULT '0',
    "volume24h" TEXT NOT NULL DEFAULT '0',
    "holderCount" INTEGER NOT NULL DEFAULT 0,
    "marketType" "MarketType" NOT NULL DEFAULT 'CURVE',
    "isListing" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "avgBuyPrice" TEXT NOT NULL,
    "totalInvested" TEXT NOT NULL,
    "realizedPnl" TEXT NOT NULL DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "monAmount" TEXT NOT NULL,
    "tokenAmount" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "gasCost" TEXT NOT NULL DEFAULT '0',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "totalValueMon" TEXT NOT NULL,
    "unrealizedPnl" TEXT NOT NULL,
    "realizedPnl" TEXT NOT NULL,
    "totalGasSpent" TEXT NOT NULL,
    "holdingsCount" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "marketCap" TEXT NOT NULL,
    "volume" TEXT NOT NULL DEFAULT '0',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotAction" (
    "id" TEXT NOT NULL,
    "action" "BotActionType" NOT NULL,
    "tokenAddress" TEXT,
    "details" JSONB,
    "txHash" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Token_discoveredAt_idx" ON "Token"("discoveredAt");

-- CreateIndex
CREATE INDEX "Token_marketType_idx" ON "Token"("marketType");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_tokenAddress_key" ON "Holding"("tokenAddress");

-- CreateIndex
CREATE INDEX "Holding_tokenAddress_idx" ON "Holding"("tokenAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_tokenAddress_idx" ON "Transaction"("tokenAddress");

-- CreateIndex
CREATE INDEX "Transaction_timestamp_idx" ON "Transaction"("timestamp");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_timestamp_idx" ON "PortfolioSnapshot"("timestamp");

-- CreateIndex
CREATE INDEX "PriceSnapshot_tokenAddress_timestamp_idx" ON "PriceSnapshot"("tokenAddress", "timestamp");

-- CreateIndex
CREATE INDEX "BotAction_action_idx" ON "BotAction"("action");

-- CreateIndex
CREATE INDEX "BotAction_timestamp_idx" ON "BotAction"("timestamp");

-- CreateIndex
CREATE INDEX "BotAction_tokenAddress_idx" ON "BotAction"("tokenAddress");

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotAction" ADD CONSTRAINT "BotAction_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "Token"("address") ON DELETE SET NULL ON UPDATE CASCADE;
