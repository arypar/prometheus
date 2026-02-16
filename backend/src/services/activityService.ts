import { supabase } from "../config/database";
import { PaginatedResponse } from "../types";

export async function getActivityLog(
  page: number = 1,
  pageSize: number = 50,
  actionType?: string,
  tokenAddress?: string
): Promise<PaginatedResponse<any>> {
  let query = supabase
    .from("BotAction")
    .select(
      "*, token:Token(name, symbol, currentPrice, marketCap, volume24h, holderCount, score)",
      { count: "exact" }
    )
    .order("timestamp", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (actionType && actionType !== "ALL") {
    query = query.eq("action", actionType);
  }

  if (tokenAddress) {
    query = query.eq("tokenAddress", tokenAddress);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count || 0;

  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
