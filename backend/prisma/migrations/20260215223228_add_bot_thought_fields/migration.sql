-- AlterEnum
ALTER TYPE "BotActionType" ADD VALUE 'THINK';

-- AlterTable
ALTER TABLE "BotAction" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "phase" TEXT,
ADD COLUMN     "reasoning" TEXT,
ADD COLUMN     "sentiment" TEXT;

-- CreateIndex
CREATE INDEX "BotAction_sentiment_idx" ON "BotAction"("sentiment");
