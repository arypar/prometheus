"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type {
  PortfolioOverview,
  PortfolioSnapshot,
  HoldingWithToken,
  Transaction,
  Token,
  TokenDetail,
  BotAction,
  PaginatedResponse,
  WinRateData,
  RoiByToken,
  VolumeData,
  ActivityStats,
} from "@/types";

const SWR_CONFIG = {
  refreshInterval: 30000,
  revalidateOnFocus: true,
};

export function usePortfolioOverview() {
  return useSWR<PortfolioOverview>("portfolio-overview", () => api.getPortfolioOverview(), SWR_CONFIG);
}

export function usePortfolioHistory(period = "7d") {
  return useSWR<PortfolioSnapshot[]>(`portfolio-history-${period}`, () => api.getPortfolioHistory(period), SWR_CONFIG);
}

export function useHoldings() {
  return useSWR<HoldingWithToken[]>("holdings", () => api.getHoldings(), SWR_CONFIG);
}

export function useTransactions(page = 1, type = "ALL") {
  return useSWR<PaginatedResponse<Transaction>>(`transactions-${page}-${type}`, () => api.getTransactions(page, type), SWR_CONFIG);
}

export function useTokens(params?: { marketType?: string; held?: boolean; search?: string }) {
  const key = `tokens-${JSON.stringify(params || {})}`;
  return useSWR<Token[]>(key, () => api.getTokens(params), SWR_CONFIG);
}

export function useTokenDetail(address: string) {
  return useSWR<TokenDetail>(`token-${address}`, () => api.getTokenDetail(address), SWR_CONFIG);
}

export function useWinRate() {
  return useSWR<WinRateData>("win-rate", () => api.getWinRate(), SWR_CONFIG);
}

export function useRoiByToken() {
  return useSWR<RoiByToken[]>("roi-by-token", () => api.getRoiByToken(), SWR_CONFIG);
}

export function useVolume() {
  return useSWR<VolumeData[]>("volume", () => api.getVolume(), SWR_CONFIG);
}

export function useActivity(page = 1, action?: string) {
  return useSWR<PaginatedResponse<BotAction>>(`activity-${page}-${action}`, () => api.getActivity(page, action), SWR_CONFIG);
}

export function useActivityStats() {
  return useSWR<ActivityStats>("activity-stats", () => api.getActivityStats(), SWR_CONFIG);
}
