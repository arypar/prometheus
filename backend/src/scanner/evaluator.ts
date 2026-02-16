import { parseEther, formatEther } from "viem";
import { supabase } from "../config/database";
import { publicClient, config } from "../config/chain";
import { lensAbi } from "../config/abis";
import { getMarketData, getMetrics } from "../services/nadFunApi";
import { TokenEvaluation } from "../types";
import { pulse } from "../utils/pulse";

export async function evaluateToken(address: string): Promise<TokenEvaluation | null> {
  try {
    const { data: token, error } = await supabase
      .from("Token")
      .select("*")
      .eq("address", address)
      .maybeSingle();

    if (error) throw error;
    if (!token) return null;

    // Fetch fresh market data from nad.fun Agent API
    const [marketRes, metricsRes] = await Promise.all([
      getMarketData(address),
      getMetrics(address, "1,5,60"),
    ]);

    const marketInfo = marketRes?.market_info;
    const metrics = metricsRes?.metrics;

    // Get MON-denominated price from LENS (consistent with trade prices)
    let monPrice: string | null = null;
    try {
      const [, monOut] = await publicClient.readContract({
        address: config.LENS as `0x${string}`,
        abi: lensAbi,
        functionName: "getAmountOut",
        args: [address as `0x${string}`, parseEther("1"), false],
      });
      monPrice = formatEther(monOut);
    } catch {
      // LENS call failed — use existing price
    }

    // Update token with fresh data if available
    const updates: Record<string, unknown> = {};
    if (monPrice) updates.currentPrice = monPrice;
    if (marketInfo) {
      updates.marketCap = marketInfo.market_cap || token.marketCap || "0";
      updates.volume24h = marketInfo.volume || token.volume24h || "0";
      updates.holderCount = marketInfo.holder_count ?? token.holderCount ?? 0;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("Token").update(updates).eq("address", address);
    }

    const marketCap = parseFloat(marketInfo?.market_cap || token.marketCap || "0");
    const volume = parseFloat(marketInfo?.volume || token.volume24h || "0");
    const holderCount = marketInfo?.holder_count ?? token.holderCount ?? 0;

    // Calculate 1h momentum from metrics if available
    const hourMetric = metrics?.find((m) => m.timeframe === "60");
    const momentumPercent = hourMetric?.percent || 0;
    const recentTxCount = hourMetric?.transactions || 0;

    const age = calculateAgeFactor(new Date(token.discoveredAt));
    const marketCapScore = calculateMarketCapFactor(marketCap);
    const volumeScore = calculateVolumeFactor(volume);
    const holderScore = calculateHolderFactor(holderCount);
    const momentumScore = calculateMomentumFactor(momentumPercent, recentTxCount);

    const score =
      age * 0.15 +
      marketCapScore * 0.2 +
      volumeScore * 0.2 +
      holderScore * 0.2 +
      momentumScore * 0.25;

    await supabase
      .from("Token")
      .update({ score })
      .eq("address", address);

    const recommendation = score >= 70 ? "BUY" : score >= 40 ? "WATCH" : "SKIP";

    pulse("EVALUATE", `Scored ${token.symbol || "token"} → ${Math.round(score)}/100 (${recommendation})`, {
      address,
      symbol: token.symbol,
      score: Math.round(score),
      recommendation,
    });

    return {
      address,
      score,
      factors: {
        age,
        marketCap: marketCapScore,
        volume: volumeScore,
        holderCount: holderScore,
        creatorHistory: momentumScore,
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
  if (ageMinutes < 2) return 30;
  if (ageMinutes < 5) return 60;
  if (ageMinutes < 30) return 80;
  if (ageMinutes < 60) return 60;
  if (ageMinutes < 360) return 40;
  return 20;
}

function calculateMarketCapFactor(marketCap: number): number {
  if (marketCap <= 0) return 10;
  if (marketCap < 1000) return 70;
  if (marketCap < 10000) return 85;
  if (marketCap < 100000) return 60;
  if (marketCap < 1000000) return 40;
  return 20;
}

function calculateVolumeFactor(volume: number): number {
  if (volume <= 0) return 10;
  if (volume < 100) return 40;
  if (volume < 1000) return 70;
  if (volume < 10000) return 85;
  return 60;
}

function calculateHolderFactor(holderCount: number): number {
  if (holderCount <= 1) return 15;
  if (holderCount < 5) return 30;
  if (holderCount < 20) return 60;
  if (holderCount < 100) return 80;
  if (holderCount < 500) return 70;
  return 50;
}

function calculateMomentumFactor(percentChange: number, txCount: number): number {
  let score = 50;
  if (percentChange > 20) score += 25;
  else if (percentChange > 5) score += 15;
  else if (percentChange > 0) score += 5;
  else if (percentChange < -20) score -= 25;
  else if (percentChange < -5) score -= 15;

  if (txCount > 50) score += 15;
  else if (txCount > 20) score += 10;
  else if (txCount > 5) score += 5;

  return Math.max(0, Math.min(100, score));
}
