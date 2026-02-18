import { API_BASE } from "./constants";
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
  PulseMessage,
  Pitch,
  PitchMessage,
  PitchWithMessages,
} from "@/types";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postAPI<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Portfolio
  getPortfolioOverview: () => fetchAPI<PortfolioOverview>("/portfolio/overview"),
  getPortfolioHistory: (period = "7d") =>
    fetchAPI<PortfolioSnapshot[]>(`/portfolio/history?period=${period}`),
  getPortfolioLive: () => fetchAPI<LiveValue>("/portfolio/live"),
  getHoldings: () => fetchAPI<HoldingWithToken[]>("/portfolio/holdings"),

  // Transactions
  getTransactions: (page = 1, type = "ALL") =>
    fetchAPI<PaginatedResponse<Transaction>>(`/transactions?page=${page}&type=${type}`),

  // Tokens
  getTokens: (params?: { marketType?: string; held?: boolean; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.marketType) searchParams.set("marketType", params.marketType);
    if (params?.held) searchParams.set("held", "true");
    if (params?.search) searchParams.set("search", params.search);
    return fetchAPI<Token[]>(`/tokens?${searchParams}`);
  },
  getTokenDetail: (address: string) => fetchAPI<TokenDetail>(`/tokens/${address}`),

  // Analytics
  getWinRate: () => fetchAPI<WinRateData>("/analytics/win-rate"),
  getRoiByToken: () => fetchAPI<RoiByToken[]>("/analytics/roi-by-token"),
  getVolume: () => fetchAPI<VolumeData[]>("/analytics/volume"),

  // Activity
  getActivity: (page = 1, action?: string) => {
    const params = new URLSearchParams({ page: page.toString() });
    if (action && action !== "ALL") params.set("action", action);
    return fetchAPI<PaginatedResponse<BotAction>>(`/activity?${params}`);
  },
  getActivityStats: () => fetchAPI<ActivityStats>("/activity/stats"),

  // Wallet / on-chain
  getWalletInfo: () => fetchAPI<WalletInfo>("/wallet"),

  // Pulse feed
  getPulse: () => fetchAPI<PulseMessage[]>("/pulse"),

  // Pitch
  createPitch: (tokenAddress: string, message: string) =>
    postAPI<{ pitch: Pitch; messages: PitchMessage[] }>("/pitch", { tokenAddress, message }),
  sendPitchMessage: (pitchId: string, message: string) =>
    postAPI<{ message: PitchMessage; verdict?: { sentiment: string; confidence: number; reasoning: string; watchlisted: boolean } }>(
      `/pitch/${pitchId}/message`,
      { message }
    ),
  getPitchFeed: (page = 1, status?: string, verdict?: string) => {
    const params = new URLSearchParams({ page: page.toString() });
    if (status) params.set("status", status);
    if (verdict) params.set("verdict", verdict);
    return fetchAPI<PaginatedResponse<Pitch>>(`/pitch?${params}`);
  },
  getPitchDetail: (id: string) => fetchAPI<PitchWithMessages>(`/pitch/${id}`),
};
