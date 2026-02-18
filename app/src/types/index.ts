export interface PortfolioOverview {
  totalValueMon: string;
  totalInvested: string;
  unrealizedPnl: string;
  realizedPnl: string;
  totalPnl: string;
  winRate: number;
  totalGasSpent: string;
  activePositions: number;
  walletBalance: string;
  change24h: string;
}

export interface PortfolioSnapshot {
  id: string;
  totalValueMon: string;
  unrealizedPnl: string;
  realizedPnl: string;
  totalGasSpent: string;
  holdingsCount: number;
  timestamp: string;
}

export interface HoldingWithToken {
  id: string;
  tokenAddress: string;
  amount: string;
  avgBuyPrice: string;
  totalInvested: string;
  realizedPnl: string;
  token: {
    name: string;
    symbol: string;
    currentPrice: string;
    imageUrl: string | null;
  };
  currentValue: string;
  unrealizedPnl: string;
  roiPercent: number;
}

export interface Transaction {
  id: string;
  txHash: string;
  tokenAddress: string;
  type: "BUY" | "SELL";
  monAmount: string;
  tokenAmount: string;
  price: string;
  gasCost: string;
  timestamp: string;
  token?: {
    name: string;
    symbol: string;
    imageUrl: string | null;
  };
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  description: string | null;
  imageUrl: string | null;
  creatorAddress: string | null;
  currentPrice: string;
  marketCap: string;
  volume24h: string;
  holderCount: number;
  marketType: "CURVE" | "DEX";
  isListing: boolean;
  score: number | null;
  discoveredAt: string;
  holding: { id: string; amount: string } | null;
}

export interface TokenDetail extends Omit<Token, "holding"> {
  holding: {
    id: string;
    amount: string;
    avgBuyPrice: string;
    totalInvested: string;
    realizedPnl: string;
  } | null;
  transactions: Transaction[];
  priceSnapshots: PriceSnapshot[];
}

export interface PriceSnapshot {
  id: string;
  tokenAddress: string;
  price: string;
  marketCap: string;
  volume: string;
  timestamp: string;
}

export interface BotAction {
  id: string;
  action: "SCAN" | "EVALUATE" | "BUY" | "SELL" | "SKIP" | "ERROR" | "THINK";
  tokenAddress: string | null;
  details: Record<string, unknown> | null;
  txHash: string | null;
  reasoning: string | null;
  sentiment: string | null;
  confidence: number | null;
  phase: string | null;
  timestamp: string;
  token?: {
    name: string;
    symbol: string;
    currentPrice?: string;
    marketCap?: string;
    volume24h?: string;
    holderCount?: number;
    score?: number | null;
  } | null;
}

export interface ActivityStats {
  totalActions: number;
  actionCounts: Record<string, number>;
  todayBuys: number;
  todayEvaluations: number;
  avgConfidence: number | null;
  currentSentiment: string | null;
  currentPhase: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WinRateData {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  details: { token: string; pnl: number; result: "WIN" | "LOSS" }[];
}

export interface RoiByToken {
  tokenAddress: string;
  symbol: string;
  name: string;
  invested: string;
  currentValue: string;
  pnl: string;
  roi: number;
}

export interface VolumeData {
  date: string;
  buys: string;
  sells: string;
  total: string;
}

export interface WalletInfo {
  address: string;
  balance: string;
  txCount: number;
}

export interface LiveValue {
  value: string;
  timestamp: string;
}

export interface PulseMessage {
  id: string;
  category: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface Pitch {
  id: string;
  tokenAddress: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenImageUrl: string | null;
  status: "ACTIVE" | "COMPLETED";
  verdict: "BULLISH" | "BEARISH" | "NEUTRAL" | null;
  confidence: number | null;
  verdictReasoning: string | null;
  watchlisted: boolean;
  messageCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface PitchMessage {
  id: string;
  pitchId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface PitchWithMessages extends Pitch {
  messages: PitchMessage[];
}
