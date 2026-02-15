import { prisma } from "../config/database";
import { env } from "../config/env";

export async function updateHeldTokenPrices(): Promise<void> {
  try {
    const holdings = await prisma.holding.findMany({
      select: { tokenAddress: true },
    });

    if (holdings.length === 0) return;

    for (const h of holdings) {
      try {
        const response = await fetch(
          `${env.NAD_FUN_API_URL}/token/${h.tokenAddress}`
        );
        if (response.ok) {
          const data = await response.json();
          await prisma.token.update({
            where: { address: h.tokenAddress },
            data: {
              currentPrice: data.price?.toString() || "0",
              marketCap: data.marketCap?.toString() || "0",
              volume24h: data.volume24h?.toString() || "0",
              holderCount: data.holderCount || 0,
            },
          });

          // Save price snapshot
          await prisma.priceSnapshot.create({
            data: {
              tokenAddress: h.tokenAddress,
              price: data.price?.toString() || "0",
              marketCap: data.marketCap?.toString() || "0",
              volume: data.volume24h?.toString() || "0",
            },
          });
        }
      } catch {
        // Individual token fetch failure shouldn't stop others
      }
    }

    console.log(`[Jobs] Updated prices for ${holdings.length} held tokens`);
  } catch (err) {
    console.error("[Jobs] Error updating prices:", err);
  }
}

export async function takePortfolioSnapshot(): Promise<void> {
  try {
    const holdings = await prisma.holding.findMany({
      include: { token: true },
    });

    let totalValueMon = 0;
    let unrealizedPnl = 0;
    let realizedPnl = 0;

    for (const h of holdings) {
      const currentValue = parseFloat(h.amount) * parseFloat(h.token.currentPrice);
      totalValueMon += currentValue;
      unrealizedPnl += currentValue - parseFloat(h.totalInvested);
      realizedPnl += parseFloat(h.realizedPnl);
    }

    const transactions = await prisma.transaction.findMany();
    const totalGasSpent = transactions.reduce((sum, tx) => sum + parseFloat(tx.gasCost), 0);

    await prisma.portfolioSnapshot.create({
      data: {
        totalValueMon: totalValueMon.toFixed(6),
        unrealizedPnl: unrealizedPnl.toFixed(6),
        realizedPnl: realizedPnl.toFixed(6),
        totalGasSpent: totalGasSpent.toFixed(6),
        holdingsCount: holdings.length,
      },
    });

    console.log(`[Jobs] Portfolio snapshot taken: ${totalValueMon.toFixed(4)} MON`);
  } catch (err) {
    console.error("[Jobs] Error taking portfolio snapshot:", err);
  }
}
