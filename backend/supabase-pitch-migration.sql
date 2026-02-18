-- Run this ONCE in Supabase SQL Editor to add Pitch chat tables.
-- Copy everything below into Supabase Dashboard → SQL Editor → New query → Run.

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

-- RLS (required for Supabase)
ALTER TABLE "Pitch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PitchMessage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON "Pitch" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON "PitchMessage" FOR ALL USING (true) WITH CHECK (true);
