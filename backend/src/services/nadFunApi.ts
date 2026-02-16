import { NAD_API_URL } from "../config/chain";
import { env } from "../config/env";

const headers: Record<string, string> = {};
if (env.NAD_FUN_API_KEY) {
  headers["X-API-Key"] = env.NAD_FUN_API_KEY;
}

let rateLimitedUntil = 0;

export function isRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    if (isRateLimited()) return null;

    const url = `${NAD_API_URL}${path}`;
    const res = await fetch(url, { headers });

    if (res.status === 429) {
      rateLimitedUntil = Date.now() + 60_000;
      console.warn(`[NadFunAPI] Rate limited — pausing API calls for 60s`);
      return null;
    }

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface NadTokenInfo {
  name: string;
  symbol: string;
  image_uri: string | null;
  description: string | null;
  is_graduated: boolean;
  creator: string | null;
  token_uri: string | null;
}

export interface NadMarketInfo {
  market_type: string;
  price_usd: string | null;
  holder_count: number;
  volume: string | null;
  ath_price: string | null;
  market_cap?: string | null;
}

export interface NadSwapInfo {
  event_type: string;
  native_amount: string;
  token_amount: string;
  transaction_hash: string;
}

export async function getTokenInfo(
  tokenAddress: string
): Promise<{ token_info: NadTokenInfo } | null> {
  return apiFetch(`/agent/token/${tokenAddress}`);
}

export async function getMarketData(
  tokenAddress: string
): Promise<{ market_info: NadMarketInfo } | null> {
  return apiFetch(`/agent/market/${tokenAddress}`);
}

export async function getMetrics(
  tokenAddress: string,
  timeframes: string = "1,5,60,1D"
): Promise<{
  metrics: Array<{
    timeframe: string;
    percent: number;
    transactions: number;
    volume: string;
    makers: number;
  }>;
} | null> {
  return apiFetch(`/agent/metrics/${tokenAddress}?timeframes=${timeframes}`);
}

export async function getSwapHistory(
  tokenAddress: string,
  limit: number = 20
): Promise<{ swaps: Array<{ swap_info: NadSwapInfo }>; total_count: number } | null> {
  return apiFetch(`/agent/swap-history/${tokenAddress}?limit=${limit}`);
}
