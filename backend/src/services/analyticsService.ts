import { prisma } from "../config/database";

export async function getWinRate() {
  const holdings = await prisma.holding.findMany({
    include: { token: true },
  });

  const transactions = await prisma.transaction.findMany();

  // Group sells by token
  const tokenPnl = new Map<string, { symbol: string; buyTotal: number; sellTotal: number }>();

  for (const tx of transactions) {
    if (!tokenPnl.has(tx.tokenAddress)) {
      tokenPnl.set(tx.tokenAddress, { symbol: tx.tokenAddress, buyTotal: 0, sellTotal: 0 });
    }
    const entry = tokenPnl.get(tx.tokenAddress)!;
    if (tx.type === "BUY") entry.buyTotal += parseFloat(tx.monAmount);
    else entry.sellTotal += parseFloat(tx.monAmount);
  }

  let wins = 0;
  let losses = 0;
  const details: { token: string; pnl: number; result: "WIN" | "LOSS" }[] = [];

  for (const [addr, data] of tokenPnl) {
    if (data.sellTotal === 0) continue;
    const pnl = data.sellTotal - data.buyTotal;
    if (pnl > 0) {
      wins++;
      details.push({ token: addr, pnl, result: "WIN" });
    } else {
      losses++;
      details.push({ token: addr, pnl, result: "LOSS" });
    }
  }

  return {
    wins,
    losses,
    total: wins + losses,
    winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 10000) / 100 : 0,
    details: details.sort((a, b) => b.pnl - a.pnl),
  };
}

export async function getRoiByToken() {
  const holdings = await prisma.holding.findMany({
    include: { token: true },
  });

  return holdings
    .map((h) => {
      const currentValue = parseFloat(h.amount) * parseFloat(h.token.currentPrice);
      const invested = parseFloat(h.totalInvested);
      const unrealizedPnl = currentValue - invested;
      const roi = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;

      return {
        tokenAddress: h.tokenAddress,
        symbol: h.token.symbol,
        name: h.token.name,
        invested: invested.toFixed(6),
        currentValue: currentValue.toFixed(6),
        pnl: unrealizedPnl.toFixed(6),
        roi: Math.round(roi * 100) / 100,
      };
    })
    .sort((a, b) => b.roi - a.roi);
}

export async function getVolumeData() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { timestamp: "asc" },
  });

  const dailyVolume = new Map<string, { buys: number; sells: number; total: number }>();

  for (const tx of transactions) {
    const day = tx.timestamp.toISOString().split("T")[0];
    if (!dailyVolume.has(day)) {
      dailyVolume.set(day, { buys: 0, sells: 0, total: 0 });
    }
    const entry = dailyVolume.get(day)!;
    const amount = parseFloat(tx.monAmount);
    if (tx.type === "BUY") entry.buys += amount;
    else entry.sells += amount;
    entry.total += amount;
  }

  return Array.from(dailyVolume.entries()).map(([date, data]) => ({
    date,
    buys: data.buys.toFixed(6),
    sells: data.sells.toFixed(6),
    total: data.total.toFixed(6),
  }));
}
