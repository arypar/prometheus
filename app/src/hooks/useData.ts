"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type {
  PortfolioOverview,
  PortfolioSnapshot,
  HoldingWithToken,
  LiveValue,
  Transaction,
  Token,
  TokenDetail,
  BotAction,
  PaginatedResponse,
  WinRateData,
  RoiByToken,
  VolumeData,
  ActivityStats,
  WalletInfo,
  Pitch,
  PitchWithMessages,
} from "@/types";

/*
 * Tiered refresh strategies to avoid request spam.
 *
 * FAST   (30s)  — data that updates frequently and is cheap to fetch
 * NORMAL (60s)  — standard dashboard data
 * SLOW   (120s) — expensive endpoints (RPC calls, heavy aggregations)
 *
 * dedupingInterval prevents the same key from being fetched more than
 * once within the window, even if multiple components mount simultaneously.
 *
 * revalidateOnFocus is disabled — the refresh interval is sufficient.
 */

const FAST = {
  refreshInterval: 30_000,
  revalidateOnFocus: false,
  dedupingInterval: 10_000,
};

const NORMAL = {
  refreshInterval: 60_000,
  revalidateOnFocus: false,
  dedupingInterval: 15_000,
};

const SLOW = {
  refreshInterval: 120_000,
  revalidateOnFocus: false,
  dedupingInterval: 30_000,
};

export function usePortfolioOverview() {
  return useSWR<PortfolioOverview>("portfolio-overview", () => api.getPortfolioOverview(), SLOW);
}

export function usePortfolioHistory(period = "7d") {
  return useSWR<PortfolioSnapshot[]>(`portfolio-history-${period}`, () => api.getPortfolioHistory(period), NORMAL);
}

export function usePortfolioLive() {
  return useSWR<LiveValue>("portfolio-live", () => api.getPortfolioLive(), {
    refreshInterval: 5_000,
    revalidateOnFocus: false,
    dedupingInterval: 3_000,
  });
}

export function useHoldings() {
  return useSWR<HoldingWithToken[]>("holdings", () => api.getHoldings(), NORMAL);
}

export function useTransactions(page = 1, type = "ALL") {
  return useSWR<PaginatedResponse<Transaction>>(`transactions-${page}-${type}`, () => api.getTransactions(page, type), NORMAL);
}

export function useTokens(params?: { marketType?: string; held?: boolean; search?: string }) {
  const key = `tokens-${JSON.stringify(params || {})}`;
  return useSWR<Token[]>(key, () => api.getTokens(params), NORMAL);
}

export function useTokenDetail(address: string) {
  return useSWR<TokenDetail>(`token-${address}`, () => api.getTokenDetail(address), NORMAL);
}

export function useWinRate() {
  return useSWR<WinRateData>("win-rate", () => api.getWinRate(), NORMAL);
}

export function useRoiByToken() {
  return useSWR<RoiByToken[]>("roi-by-token", () => api.getRoiByToken(), NORMAL);
}

export function useVolume() {
  return useSWR<VolumeData[]>("volume", () => api.getVolume(), NORMAL);
}

export function useActivity(page = 1, action?: string) {
  return useSWR<PaginatedResponse<BotAction>>(`activity-${page}-${action}`, () => api.getActivity(page, action), FAST);
}

export function useActivityStats() {
  return useSWR<ActivityStats>("activity-stats", () => api.getActivityStats(), NORMAL);
}

export function useWalletInfo() {
  return useSWR<WalletInfo>("wallet-info", () => api.getWalletInfo(), SLOW);
}

export function usePitchFeed(page = 1, status?: string, verdict?: string) {
  const key = `pitch-feed-${page}-${status}-${verdict}`;
  return useSWR<PaginatedResponse<Pitch>>(key, () => api.getPitchFeed(page, status, verdict), NORMAL);
}

export function usePitchDetail(id: string | null) {
  return useSWR<PitchWithMessages>(
    id ? `pitch-${id}` : null,
    () => (id ? api.getPitchDetail(id) : null!),
    { revalidateOnFocus: false }
  );
}
