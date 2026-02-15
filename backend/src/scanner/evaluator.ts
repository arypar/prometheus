import { prisma } from "../config/database";
import { TokenEvaluation } from "../types";

export async function evaluateToken(address: string): Promise<TokenEvaluation | null> {
  try {
    const token = await prisma.token.findUnique({
      where: { address },
    });

    if (!token) return null;

    // Scoring factors (0-100 each)
    const age = calculateAgeFactor(token.discoveredAt);
    const marketCapScore = calculateMarketCapFactor(token.marketCap);
    const volumeScore = calculateVolumeFactor(token.volume24h);
    const holderScore = calculateHolderFactor(token.holderCount);
    const creatorScore = 50; // Placeholder: would check creator history

    // Weighted score
    const score =
      age * 0.15 +
      marketCapScore * 0.25 +
      volumeScore * 0.25 +
      holderScore * 0.2 +
      creatorScore * 0.15;

    // Update token with score
    await prisma.token.update({
      where: { address },
      data: { score },
    });

    const recommendation = score >= 70 ? "BUY" : score >= 40 ? "WATCH" : "SKIP";

    return {
      address,
      score,
      factors: {
        age,
        marketCap: marketCapScore,
        volume: volumeScore,
        holderCount: holderScore,
        creatorHistory: creatorScore,
      },
      recommendation,
    };
  } catch (err) {
    console.error(`[Evaluator] Error evaluating token ${address}:`, err);
    return null;
  }
}

function calculateAgeFactor(discoveredAt: Date): number {
  const ageMinutes = (Date.now() - discoveredAt.getTime()) / (1000 * 60);
  // Sweet spot: 5-30 minutes old
  if (ageMinutes < 2) return 30; // Too new, risky
  if (ageMinutes < 5) return 60;
  if (ageMinutes < 30) return 80;
  if (ageMinutes < 60) return 60;
  if (ageMinutes < 360) return 40;
  return 20; // Old token
}

function calculateMarketCapFactor(marketCap: string): number {
  const mc = parseFloat(marketCap);
  if (mc <= 0) return 10;
  if (mc < 1000) return 70; // Early, high potential
  if (mc < 10000) return 85;
  if (mc < 100000) return 60;
  if (mc < 1000000) return 40;
  return 20; // Too high cap for entry
}

function calculateVolumeFactor(volume: string): number {
  const vol = parseFloat(volume);
  if (vol <= 0) return 10;
  if (vol < 100) return 40;
  if (vol < 1000) return 70;
  if (vol < 10000) return 85;
  return 60; // Very high volume could mean peak
}

function calculateHolderFactor(holderCount: number): number {
  if (holderCount <= 1) return 15;
  if (holderCount < 5) return 30;
  if (holderCount < 20) return 60;
  if (holderCount < 100) return 80;
  if (holderCount < 500) return 70;
  return 50;
}
