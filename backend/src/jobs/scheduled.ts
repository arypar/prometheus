import crypto from "crypto";
import { parseEther, formatEther } from "viem";
import { supabase } from "../config/database";
import { publicClient, config } from "../config/chain";
import { lensAbi } from "../config/abis";
import { getMarketData, isRateLimited } from "../services/nadFunApi";
import { pulse } from "../utils/pulse";

/**
 * Get the MON price per token by querying LENS for a sell quote.
 * Returns how much MON 1 token is worth at current curve/DEX state.
 */
async function getMonPrice(tokenAddress: string): Promise<string | null> {
  try {
    const oneToken = parseEther("1");
    const [, monOut] = await publicClient.readContract({
      address: config.LENS as `0x${string}`,
      abi: lensAbi,
      functionName: "getAmountOut",
      args: [tokenAddress as `0x${string}`, oneToken, false],
    });
    return formatEther(monOut);
  } catch {
    return null;
  }
}

export async function updateTokenPrices(): Promise<void> {
  try {
    const { data: holdings } = await supabase
      .from("Holding")
      .select("tokenAddress");

    const heldAddresses = new Set((holdings || []).map((h) => h.tokenAddress));

    // For held tokens: get MON price from LENS (on-chain, no rate limit)
    // This is the authoritative price for ROI calculations
    for (const address of heldAddresses) {
      try {
        const monPrice = await getMonPrice(address);
        if (monPrice) {
          await supabase
            .from("Token")
            .update({ currentPrice: monPrice })
            .eq("address", address);
        }
      } catch {
        // Skip individual failures
      }
    }

    // For non-held tokens: use nad.fun API for market data + scoring
    if (isRateLimited()) {
      if (heldAddresses.size > 0) {
        console.log(`[Jobs] Updated MON prices for ${heldAddresses.size} held tokens (API rate-limited, skipping discovered)`);
      }
      return;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTokens } = await supabase
      .from("Token")
      .select("address")
      .gte("discoveredAt", since)
      .order("discoveredAt", { ascending: false })
      .limit(20);

    const discoveredAddresses = (recentTokens || [])
      .map((t) => t.address)
      .filter((a) => !heldAddresses.has(a));

    let apiUpdated = 0;

    for (const address of discoveredAddresses) {
      if (isRateLimited()) break;

      try {
        const marketRes = await getMarketData(address);
        if (!marketRes?.market_info) continue;

        const market = marketRes.market_info;

        // For non-held tokens, try LENS first for MON price, fall back to API
        const monPrice = await getMonPrice(address);

        await supabase
          .from("Token")
          .update({
            currentPrice: monPrice || market.price_usd || "0",
            marketCap: market.market_cap || "0",
            volume24h: market.volume || "0",
            holderCount: market.holder_count || 0,
          })
          .eq("address", address);

        await supabase.from("PriceSnapshot").insert({
          id: crypto.randomUUID(),
          tokenAddress: address,
          price: monPrice || market.price_usd || "0",
          marketCap: market.market_cap || "0",
          volume: market.volume || "0",
          timestamp: new Date().toISOString(),
        });

        apiUpdated++;
      } catch {
        // Individual failures don't stop batch
      }
    }

    const totalUpdated = heldAddresses.size + apiUpdated;
    if (totalUpdated > 0) {
      const msg = `Updated prices for ${totalUpdated} tokens (${heldAddresses.size} held via LENS, ${apiUpdated} discovered via API)`;
      console.log(`[Jobs] ${msg}`);
      pulse("PRICE", msg, { total: totalUpdated, held: heldAddresses.size, discovered: apiUpdated });
    }
  } catch (err) {
    console.error("[Jobs] Error updating prices:", err);
  }
}

export async function takePortfolioSnapshot(): Promise<void> {
  try {
    const { data: holdings } = await supabase
      .from("Holding")
      .select("*, token:Token(currentPrice)");

    let totalValueMon = 0;
    let unrealizedPnl = 0;
    let realizedPnl = 0;

    for (const h of holdings || []) {
      const price = parseFloat(h.token?.currentPrice || "0");
      const currentValue = parseFloat(h.amount) * price;
      totalValueMon += currentValue;
      unrealizedPnl += currentValue - parseFloat(h.totalInvested);
      realizedPnl += parseFloat(h.realizedPnl);
    }

    const { getWalletBalance } = await import("../services/chainService");
    const { env } = await import("../config/env");
    const walletBalance = env.MOLTBOT_WALLET_ADDRESS
      ? parseFloat(await getWalletBalance(env.MOLTBOT_WALLET_ADDRESS))
      : 0;

    const snapshotValue = totalValueMon + walletBalance;

    const { data: transactions } = await supabase
      .from("Transaction")
      .select("gasCost");

    const totalGasSpent = (transactions || []).reduce(
      (sum, tx) => sum + parseFloat(tx.gasCost || "0"),
      0
    );

    await supabase.from("PortfolioSnapshot").insert({
      id: crypto.randomUUID(),
      totalValueMon: snapshotValue.toFixed(6),
      unrealizedPnl: unrealizedPnl.toFixed(6),
      realizedPnl: realizedPnl.toFixed(6),
      totalGasSpent: totalGasSpent.toFixed(6),
      holdingsCount: (holdings || []).length,
      timestamp: new Date().toISOString(),
    });

    const snapMsg = `Portfolio snapshot: ${snapshotValue.toFixed(4)} MON (wallet: ${walletBalance.toFixed(4)}, holdings: ${totalValueMon.toFixed(4)})`;
    console.log(`[Jobs] ${snapMsg}`);
    pulse("SNAPSHOT", snapMsg, { total: snapshotValue, wallet: walletBalance, holdings: totalValueMon });
  } catch (err) {
    console.error("[Jobs] Error taking portfolio snapshot:", err);
  }
}
