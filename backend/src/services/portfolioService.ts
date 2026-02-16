import { supabase } from "../config/database";
import { env } from "../config/env";
import { getWalletBalance } from "./chainService";
import { PortfolioOverview, HoldingWithToken } from "../types";

/* ── Simple TTL cache ────────────────────────────────── */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const OVERVIEW_TTL = 30_000; // 30 seconds
const LIVE_TTL = 3_000; // 3 seconds — aggressive cache for high-frequency polling

export interface LiveValue {
  value: string;
  timestamp: string;
}

export async function getPortfolioLiveValue(): Promise<LiveValue> {
  const cached = getCached<LiveValue>("portfolio-live");
  if (cached) return cached;

  const [holdingsResult, walletBalance] = await Promise.all([
    supabase.from("Holding").select("amount, token:Token(currentPrice)"),
    env.MOLTBOT_WALLET_ADDRESS
      ? getWalletBalance(env.MOLTBOT_WALLET_ADDRESS)
      : Promise.resolve("0"),
  ]);

  let totalValueMon = parseFloat(walletBalance);
  for (const h of holdingsResult.data || []) {
    const price = (h as Record<string, unknown>).token
      ? parseFloat(((h as Record<string, unknown>).token as { currentPrice?: string })?.currentPrice || "0")
      : 0;
    totalValueMon += parseFloat(h.amount) * price;
  }

  const result: LiveValue = {
    value: totalValueMon.toFixed(6),
    timestamp: new Date().toISOString(),
  };

  setCache("portfolio-live", result, LIVE_TTL);
  return result;
}

export async function getPortfolioOverview(): Promise<PortfolioOverview> {
  const cached = getCached<PortfolioOverview>("portfolio-overview");
  if (cached) return cached;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel instead of sequentially
  const [holdingsResult, transactionsResult, snapshotsResult, walletBalance] =
    await Promise.all([
      supabase.from("Holding").select("*, token:Token(*)"),
      supabase.from("Transaction").select("*"),
      supabase
        .from("PortfolioSnapshot")
        .select("totalValueMon")
        .lte("timestamp", yesterday)
        .order("timestamp", { ascending: false })
        .limit(1),
      env.MOLTBOT_WALLET_ADDRESS
        ? getWalletBalance(env.MOLTBOT_WALLET_ADDRESS)
        : Promise.resolve("0"),
    ]);

  if (holdingsResult.error) throw holdingsResult.error;

  const holdings = holdingsResult.data || [];
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

  const txs = transactionsResult.data || [];
  const totalGasSpent = txs.reduce((sum, tx) => sum + parseFloat(tx.gasCost), 0);

  const sellTxs = txs.filter((tx) => tx.type === "SELL");
  const tokenSellMap = new Map<string, number>();
  for (const tx of sellTxs) {
    const current = tokenSellMap.get(tx.tokenAddress) || 0;
    tokenSellMap.set(tx.tokenAddress, current + parseFloat(tx.monAmount));
  }

  const buyTxMap = new Map<string, number>();
  for (const tx of txs.filter((t) => t.type === "BUY")) {
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

  const previousValue = snapshotsResult.data?.[0]
    ? parseFloat(snapshotsResult.data[0].totalValueMon)
    : totalInvested;
  const change24h = previousValue > 0 ? ((totalValueMon - previousValue) / previousValue) * 100 : 0;

  const result: PortfolioOverview = {
    totalValueMon: totalValueMon.toFixed(6),
    totalInvested: totalInvested.toFixed(6),
    unrealizedPnl: unrealizedPnl.toFixed(6),
    realizedPnl: realizedPnl.toFixed(6),
    totalPnl: (unrealizedPnl + realizedPnl).toFixed(6),
    winRate: Math.round(winRate * 100) / 100,
    totalGasSpent: totalGasSpent.toFixed(6),
    activePositions: holdings.length,
    walletBalance,
    change24h: change24h.toFixed(2),
  };

  setCache("portfolio-overview", result, OVERVIEW_TTL);
  return result;
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

  const { data, error } = await supabase
    .from("PortfolioSnapshot")
    .select("*")
    .gte("timestamp", since.toISOString())
    .order("timestamp", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getHoldings(): Promise<HoldingWithToken[]> {
  const { data: holdings, error } = await supabase
    .from("Holding")
    .select("*, token:Token(name, symbol, currentPrice, imageUrl)");

  if (error) throw error;

  return (holdings || []).map((h) => {
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
