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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BotActionPayload {
  action: "SCAN" | "EVALUATE" | "BUY" | "SELL" | "SKIP" | "ERROR" | "THINK";
  tokenAddress?: string;
  details?: Record<string, unknown>;
  txHash?: string;
  reasoning?: string;
  sentiment?: string;
  confidence?: number;
  phase?: string;
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

export interface BotTransactionPayload {
  txHash: string;
  tokenAddress: string;
  type: "BUY" | "SELL";
  monAmount: string;
  tokenAmount: string;
  price: string;
  gasCost?: string;
}

export interface TokenEvaluation {
  address: string;
  score: number;
  factors: {
    age: number;
    marketCap: number;
    volume: number;
    holderCount: number;
    creatorHistory: number;
  };
  recommendation: "BUY" | "WATCH" | "SKIP";
}
