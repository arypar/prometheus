import { supabase } from "../config/database";

export async function getAllTokens(filters?: {
  marketType?: string;
  held?: boolean;
  search?: string;
}) {
  let query = supabase
    .from("Token")
    .select("*, holding:Holding(*)")
    .order("discoveredAt", { ascending: false });

  if (filters?.marketType && filters.marketType !== "ALL") {
    query = query.eq("marketType", filters.marketType);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,symbol.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  let tokens = (data || []).map((t) => ({
    ...t,
    holding: t.holding && t.holding.length > 0 ? t.holding[0] : null,
  }));

  if (filters?.held) {
    tokens = tokens.filter((t) => t.holding !== null);
  }

  return tokens;
}

export async function getTokenDetail(address: string) {
  const { data: token, error: tErr } = await supabase
    .from("Token")
    .select("*")
    .eq("address", address)
    .single();

  if (tErr) throw tErr;
  if (!token) return null;

  const [holdingRes, txRes, priceRes] = await Promise.all([
    supabase.from("Holding").select("*").eq("tokenAddress", address).maybeSingle(),
    supabase
      .from("Transaction")
      .select("*")
      .eq("tokenAddress", address)
      .order("timestamp", { ascending: false })
      .limit(50),
    supabase
      .from("PriceSnapshot")
      .select("*")
      .eq("tokenAddress", address)
      .order("timestamp", { ascending: false })
      .limit(200),
  ]);

  return {
    ...token,
    holding: holdingRes.data || null,
    transactions: txRes.data || [],
    priceSnapshots: priceRes.data || [],
  };
}
