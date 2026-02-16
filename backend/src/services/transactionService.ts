import { supabase } from "../config/database";
import { PaginatedResponse } from "../types";

export async function getTransactions(
  page: number = 1,
  pageSize: number = 20,
  type?: string
): Promise<PaginatedResponse<any>> {
  let query = supabase
    .from("Transaction")
    .select("*, token:Token(name, symbol, imageUrl)", { count: "exact" })
    .order("timestamp", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (type && type !== "ALL") {
    query = query.eq("type", type);
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
