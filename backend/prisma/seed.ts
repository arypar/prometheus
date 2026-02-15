import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create tokens
  const tokens = [
    {
      address: "0x1111111111111111111111111111111111111111",
      name: "MonadDoge",
      symbol: "MDOGE",
      description: "The doge of Monad",
      currentPrice: "0.000042",
      marketCap: "42000",
      volume24h: "8500",
      holderCount: 156,
      marketType: "CURVE" as const,
      score: 72.5,
    },
    {
      address: "0x2222222222222222222222222222222222222222",
      name: "NadCat",
      symbol: "NCAT",
      description: "Meow on nad.fun",
      currentPrice: "0.000018",
      marketCap: "18000",
      volume24h: "3200",
      holderCount: 89,
      marketType: "CURVE" as const,
      score: 58.3,
    },
    {
      address: "0x3333333333333333333333333333333333333333",
      name: "Monad AI",
      symbol: "MAI",
      description: "AI meets Monad",
      currentPrice: "0.000095",
      marketCap: "95000",
      volume24h: "22000",
      holderCount: 342,
      marketType: "DEX" as const,
      score: 81.2,
    },
    {
      address: "0x4444444444444444444444444444444444444444",
      name: "PurpleChain",
      symbol: "PRPL",
      description: "Purple is the new green",
      currentPrice: "0.000007",
      marketCap: "7000",
      volume24h: "1100",
      holderCount: 45,
      marketType: "CURVE" as const,
      score: 35.1,
    },
    {
      address: "0x5555555555555555555555555555555555555555",
      name: "FastMon",
      symbol: "FMON",
      description: "Speed demon token",
      currentPrice: "0.000128",
      marketCap: "128000",
      volume24h: "45000",
      holderCount: 567,
      marketType: "DEX" as const,
      score: 88.7,
    },
  ];

  for (const t of tokens) {
    await prisma.token.upsert({
      where: { address: t.address },
      update: t,
      create: t,
    });
  }

  // Create holdings (bot owns some tokens)
  const holdings = [
    {
      tokenAddress: "0x1111111111111111111111111111111111111111",
      amount: "500000",
      avgBuyPrice: "0.000035",
      totalInvested: "17.5",
      realizedPnl: "0",
    },
    {
      tokenAddress: "0x3333333333333333333333333333333333333333",
      amount: "120000",
      avgBuyPrice: "0.000072",
      totalInvested: "8.64",
      realizedPnl: "2.15",
    },
    {
      tokenAddress: "0x5555555555555555555555555555555555555555",
      amount: "80000",
      avgBuyPrice: "0.000098",
      totalInvested: "7.84",
      realizedPnl: "0",
    },
  ];

  for (const h of holdings) {
    await prisma.holding.upsert({
      where: { tokenAddress: h.tokenAddress },
      update: h,
      create: h,
    });
  }

  // Create transactions
  const now = Date.now();
  const txs = [
    { txHash: "0xaaa1", tokenAddress: tokens[0].address, type: "BUY" as const, monAmount: "10.0", tokenAmount: "285714", price: "0.000035", gasCost: "0.002", timestamp: new Date(now - 86400000 * 3) },
    { txHash: "0xaaa2", tokenAddress: tokens[0].address, type: "BUY" as const, monAmount: "7.5", tokenAmount: "214286", price: "0.000035", gasCost: "0.002", timestamp: new Date(now - 86400000 * 2) },
    { txHash: "0xbbb1", tokenAddress: tokens[2].address, type: "BUY" as const, monAmount: "8.64", tokenAmount: "120000", price: "0.000072", gasCost: "0.003", timestamp: new Date(now - 86400000 * 5) },
    { txHash: "0xbbb2", tokenAddress: tokens[2].address, type: "SELL" as const, monAmount: "4.79", tokenAmount: "50000", price: "0.000096", gasCost: "0.002", timestamp: new Date(now - 86400000 * 1) },
    { txHash: "0xccc1", tokenAddress: tokens[4].address, type: "BUY" as const, monAmount: "7.84", tokenAmount: "80000", price: "0.000098", gasCost: "0.003", timestamp: new Date(now - 86400000 * 4) },
    { txHash: "0xddd1", tokenAddress: tokens[1].address, type: "BUY" as const, monAmount: "3.2", tokenAmount: "177778", price: "0.000018", gasCost: "0.002", timestamp: new Date(now - 86400000 * 6) },
    { txHash: "0xddd2", tokenAddress: tokens[1].address, type: "SELL" as const, monAmount: "2.8", tokenAmount: "177778", price: "0.000016", gasCost: "0.002", timestamp: new Date(now - 86400000 * 4) },
    { txHash: "0xeee1", tokenAddress: tokens[3].address, type: "BUY" as const, monAmount: "2.0", tokenAmount: "285714", price: "0.000007", gasCost: "0.001", timestamp: new Date(now - 86400000 * 7) },
    { txHash: "0xeee2", tokenAddress: tokens[3].address, type: "SELL" as const, monAmount: "1.5", tokenAmount: "285714", price: "0.0000053", gasCost: "0.001", timestamp: new Date(now - 86400000 * 5) },
  ];

  for (const tx of txs) {
    await prisma.transaction.upsert({
      where: { txHash: tx.txHash },
      update: tx,
      create: tx,
    });
  }

  // Create portfolio snapshots
  for (let i = 14; i >= 0; i--) {
    const baseValue = 30 + Math.random() * 15;
    await prisma.portfolioSnapshot.create({
      data: {
        totalValueMon: baseValue.toFixed(6),
        unrealizedPnl: (baseValue - 34).toFixed(6),
        realizedPnl: "1.75",
        totalGasSpent: "0.024",
        holdingsCount: 3,
        timestamp: new Date(now - 86400000 * i),
      },
    });
  }

  // Create price snapshots
  for (const token of [tokens[0], tokens[2], tokens[4]]) {
    for (let i = 20; i >= 0; i--) {
      const basePrice = parseFloat(token.currentPrice);
      const variance = basePrice * 0.3 * (Math.random() - 0.5);
      await prisma.priceSnapshot.create({
        data: {
          tokenAddress: token.address,
          price: (basePrice + variance).toFixed(8),
          marketCap: token.marketCap,
          volume: (parseFloat(token.volume24h) * (0.5 + Math.random())).toFixed(2),
          timestamp: new Date(now - 86400000 * i),
        },
      });
    }
  }

  // Create bot actions
  const actions = [
    { action: "SCAN" as const, details: { tokensFound: 5 }, timestamp: new Date(now - 3600000 * 8) },
    { action: "EVALUATE" as const, tokenAddress: tokens[0].address, details: { score: 72.5, recommendation: "BUY" }, timestamp: new Date(now - 3600000 * 7) },
    { action: "BUY" as const, tokenAddress: tokens[0].address, txHash: "0xaaa1", details: { amount: "10.0 MON" }, timestamp: new Date(now - 86400000 * 3) },
    { action: "SCAN" as const, details: { tokensFound: 3 }, timestamp: new Date(now - 3600000 * 6) },
    { action: "EVALUATE" as const, tokenAddress: tokens[1].address, details: { score: 58.3, recommendation: "WATCH" }, timestamp: new Date(now - 3600000 * 5) },
    { action: "BUY" as const, tokenAddress: tokens[2].address, txHash: "0xbbb1", details: { amount: "8.64 MON" }, timestamp: new Date(now - 86400000 * 5) },
    { action: "SKIP" as const, tokenAddress: tokens[3].address, details: { reason: "Score too low: 35.1" }, timestamp: new Date(now - 3600000 * 4) },
    { action: "SELL" as const, tokenAddress: tokens[2].address, txHash: "0xbbb2", details: { amount: "4.79 MON", profit: "1.19 MON" }, timestamp: new Date(now - 86400000) },
    { action: "ERROR" as const, details: { error: "RPC timeout on price fetch" }, timestamp: new Date(now - 3600000 * 2) },
    { action: "EVALUATE" as const, tokenAddress: tokens[4].address, details: { score: 88.7, recommendation: "BUY" }, timestamp: new Date(now - 3600000) },
    { action: "BUY" as const, tokenAddress: tokens[4].address, txHash: "0xccc1", details: { amount: "7.84 MON" }, timestamp: new Date(now - 86400000 * 4) },
  ];

  for (const a of actions) {
    await prisma.botAction.create({ data: a });
  }

  console.log("Seed complete!");
  console.log(`  - ${tokens.length} tokens`);
  console.log(`  - ${holdings.length} holdings`);
  console.log(`  - ${txs.length} transactions`);
  console.log(`  - 15 portfolio snapshots`);
  console.log(`  - ${actions.length} bot actions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
