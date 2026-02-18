-- Prometheus: Supabase table schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- NOTE: These tables use camelCase column names to match the application code.

-- Tokens table
CREATE TABLE IF NOT EXISTS "Token" (
  address TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  "imageUrl" TEXT,
  "creatorAddress" TEXT,
  "currentPrice" TEXT NOT NULL DEFAULT '0',
  "marketCap" TEXT NOT NULL DEFAULT '0',
  "volume24h" TEXT NOT NULL DEFAULT '0',
  "holderCount" INTEGER NOT NULL DEFAULT 0,
  "marketType" TEXT NOT NULL DEFAULT 'CURVE',
  "isListing" BOOLEAN NOT NULL DEFAULT FALSE,
  score DOUBLE PRECISION,
  "discoveredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_Token_discoveredAt" ON "Token" ("discoveredAt");
CREATE INDEX IF NOT EXISTS "idx_Token_marketType" ON "Token" ("marketType");

-- Holdings table
CREATE TABLE IF NOT EXISTS "Holding" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tokenAddress" TEXT NOT NULL UNIQUE REFERENCES "Token"(address),
  amount TEXT NOT NULL,
  "avgBuyPrice" TEXT NOT NULL,
  "totalInvested" TEXT NOT NULL,
  "realizedPnl" TEXT NOT NULL DEFAULT '0',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_Holding_tokenAddress" ON "Holding" ("tokenAddress");

-- Transactions table
CREATE TABLE IF NOT EXISTS "Transaction" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "txHash" TEXT NOT NULL UNIQUE,
  "tokenAddress" TEXT NOT NULL REFERENCES "Token"(address),
  type TEXT NOT NULL,
  "monAmount" TEXT NOT NULL,
  "tokenAmount" TEXT NOT NULL,
  price TEXT NOT NULL,
  "gasCost" TEXT NOT NULL DEFAULT '0',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_Transaction_tokenAddress" ON "Transaction" ("tokenAddress");
CREATE INDEX IF NOT EXISTS "idx_Transaction_timestamp" ON "Transaction" (timestamp);
CREATE INDEX IF NOT EXISTS "idx_Transaction_type" ON "Transaction" (type);

-- Portfolio snapshots table
CREATE TABLE IF NOT EXISTS "PortfolioSnapshot" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "totalValueMon" TEXT NOT NULL,
  "unrealizedPnl" TEXT NOT NULL,
  "realizedPnl" TEXT NOT NULL,
  "totalGasSpent" TEXT NOT NULL,
  "holdingsCount" INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_PortfolioSnapshot_timestamp" ON "PortfolioSnapshot" (timestamp);

-- Price snapshots table
CREATE TABLE IF NOT EXISTS "PriceSnapshot" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tokenAddress" TEXT NOT NULL REFERENCES "Token"(address),
  price TEXT NOT NULL,
  "marketCap" TEXT NOT NULL,
  volume TEXT NOT NULL DEFAULT '0',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_PriceSnapshot_token_timestamp" ON "PriceSnapshot" ("tokenAddress", timestamp);

-- Bot actions table
CREATE TABLE IF NOT EXISTS "BotAction" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action TEXT NOT NULL,
  "tokenAddress" TEXT REFERENCES "Token"(address),
  details JSONB,
  "txHash" TEXT,
  reasoning TEXT,
  sentiment TEXT,
  confidence DOUBLE PRECISION,
  phase TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_BotAction_action" ON "BotAction" (action);
CREATE INDEX IF NOT EXISTS "idx_BotAction_timestamp" ON "BotAction" (timestamp);
CREATE INDEX IF NOT EXISTS "idx_BotAction_tokenAddress" ON "BotAction" ("tokenAddress");
CREATE INDEX IF NOT EXISTS "idx_BotAction_sentiment" ON "BotAction" (sentiment);

-- Pitch table (user pitches a token; chat with AI for verdict)
CREATE TABLE IF NOT EXISTS "Pitch" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tokenAddress" TEXT NOT NULL,
  "tokenName" TEXT,
  "tokenSymbol" TEXT,
  "tokenImageUrl" TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  verdict TEXT,
  confidence DOUBLE PRECISION,
  "verdictReasoning" TEXT,
  watchlisted BOOLEAN NOT NULL DEFAULT FALSE,
  "messageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_Pitch_createdAt" ON "Pitch" ("createdAt");
CREATE INDEX IF NOT EXISTS "idx_Pitch_status" ON "Pitch" (status);
CREATE INDEX IF NOT EXISTS "idx_Pitch_verdict" ON "Pitch" (verdict);

-- PitchMessage table (chat messages within a pitch)
CREATE TABLE IF NOT EXISTS "PitchMessage" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pitchId" TEXT NOT NULL REFERENCES "Pitch"(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_PitchMessage_pitchId" ON "PitchMessage" ("pitchId");
CREATE INDEX IF NOT EXISTS "idx_PitchMessage_createdAt" ON "PitchMessage" ("createdAt");

-- Auto-update updatedAt trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Token_updatedAt"
  BEFORE UPDATE ON "Token"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "Holding_updatedAt"
  BEFORE UPDATE ON "Holding"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS with permissive policies
ALTER TABLE "Token" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Holding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortfolioSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BotAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pitch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PitchMessage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON "Token" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON "Holding" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON "Transaction" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON "PortfolioSnapshot" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON "PriceSnapshot" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON "BotAction" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON "Pitch" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON "PitchMessage" FOR ALL USING (true) WITH CHECK (true);
