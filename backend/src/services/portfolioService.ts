import { prisma } from "../config/database";
import { PortfolioOverview, HoldingWithToken } from "../types";

export async function getPortfolioOverview(): Promise<PortfolioOverview> {
  const holdings = await prisma.holding.findMany({
    include: { token: true },
  });

  let totalValueMon = 0;
  let totalInvested = 0;
  let unrealizedPnl = 0;
  let realizedPnl = 0;

  for (const h of holdings) {
    const currentValue = parseFloat(h.amount) * parseFloat(h.token.currentPrice);
    totalValueMon += currentValue;
    totalInvested += parseFloat(h.totalInvested);
    unrealizedPnl += currentValue - parseFloat(h.totalInvested);
    realizedPnl += parseFloat(h.realizedPnl);
  }

  const transactions = await prisma.transaction.findMany();
  const totalGasSpent = transactions.reduce((sum, tx) => sum + parseFloat(tx.gasCost), 0);

  // Win rate: tokens sold at profit / total tokens sold
  const sellTxs = transactions.filter((tx) => tx.type === "SELL");
  const tokenSellMap = new Map<string, number>();
  for (const tx of sellTxs) {
    const current = tokenSellMap.get(tx.tokenAddress) || 0;
    tokenSellMap.set(tx.tokenAddress, current + parseFloat(tx.monAmount));
  }

  const buyTxMap = new Map<string, number>();
  for (const tx of transactions.filter((t) => t.type === "BUY")) {
    const current = buyTxMap.get(tx.tokenAddress) || 0;
    buyTxMap.set(tx.tokenAddress, current + parseFloat(tx.monAmount));
  }

  let wins = 0;
  let losses = 0;
  for (const [addr, sellTotal] of tokenSellMap) {
    const buyTotal = buyTxMap.get(addr) || 0;
    if (sellTotal > buyTotal) wins++;
    else losses++;
  }

  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  // 24h change
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastSnapshot = await prisma.portfolioSnapshot.findFirst({
    where: { timestamp: { lte: yesterday } },
    orderBy: { timestamp: "desc" },
  });
  const previousValue = lastSnapshot ? parseFloat(lastSnapshot.totalValueMon) : totalInvested;
  const change24h = previousValue > 0 ? ((totalValueMon - previousValue) / previousValue) * 100 : 0;

  return {
    totalValueMon: totalValueMon.toFixed(6),
    totalInvested: totalInvested.toFixed(6),
    unrealizedPnl: unrealizedPnl.toFixed(6),
    realizedPnl: realizedPnl.toFixed(6),
    totalPnl: (unrealizedPnl + realizedPnl).toFixed(6),
    winRate: Math.round(winRate * 100) / 100,
    totalGasSpent: totalGasSpent.toFixed(6),
    activePositions: holdings.length,
    walletBalance: "0",
    change24h: change24h.toFixed(2),
  };
}

export async function getPortfolioHistory(period: string) {
  const now = new Date();
  let since: Date;

  switch (period) {
    case "24h":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      since = new Date(0);
  }

  return prisma.portfolioSnapshot.findMany({
    where: { timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
  });
}

export async function getHoldings(): Promise<HoldingWithToken[]> {
  const holdings = await prisma.holding.findMany({
    include: { token: true },
  });

  return holdings.map((h) => {
    const currentValue = parseFloat(h.amount) * parseFloat(h.token.currentPrice);
    const invested = parseFloat(h.totalInvested);
    const unrealizedPnl = currentValue - invested;
    const roiPercent = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;

    return {
      id: h.id,
      tokenAddress: h.tokenAddress,
      amount: h.amount,
      avgBuyPrice: h.avgBuyPrice,
      totalInvested: h.totalInvested,
      realizedPnl: h.realizedPnl,
      token: {
        name: h.token.name,
        symbol: h.token.symbol,
        currentPrice: h.token.currentPrice,
        imageUrl: h.token.imageUrl,
      },
      currentValue: currentValue.toFixed(6),
      unrealizedPnl: unrealizedPnl.toFixed(6),
      roiPercent: Math.round(roiPercent * 100) / 100,
    };
  });
}
