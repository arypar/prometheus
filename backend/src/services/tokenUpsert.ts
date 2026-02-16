import { supabase } from "../config/database";
import { getTokenInfo, getMarketData, isRateLimited } from "./nadFunApi";
import { sseClients } from "../routes/activity";
import { pulse } from "../utils/pulse";

/**
 * Ensures a token exists in the DB. If it doesn't, fetches info from
 * the nad.fun Agent API and inserts it. Returns true if the token
 * exists (or was just created), false on failure.
 */
export async function ensureToken(
  tokenAddress: string,
  hints?: { name?: string; symbol?: string; creator?: string }
): Promise<boolean> {
  const addr = tokenAddress.toLowerCase();

  const { data: existing } = await supabase
    .from("Token")
    .select("address, name")
    .eq("address", addr)
    .maybeSingle();

  if (existing) {
    if (existing.name === "Unknown" && !isRateLimited()) {
      backfillToken(addr).catch(() => {});
    }
    return true;
  }

  // If rate limited and we have no hints, skip insert entirely
  // — we'll pick this token up on the next pass
  if (isRateLimited() && !hints?.name) {
    return false;
  }

  const [tokenInfoRes, marketRes] = await Promise.all([
    getTokenInfo(tokenAddress),
    getMarketData(tokenAddress),
  ]);

  const tokenInfo = tokenInfoRes?.token_info;
  const marketInfo = marketRes?.market_info;

  const name = tokenInfo?.name || hints?.name || "Unknown";
  const symbol = tokenInfo?.symbol || hints?.symbol || "???";

  // Don't insert if we still have no useful data
  if (name === "Unknown" && !hints?.name) {
    return false;
  }

  const now = new Date().toISOString();

  const { error } = await supabase.from("Token").upsert(
    {
      address: addr,
      name,
      symbol,
      description: tokenInfo?.description || null,
      imageUrl: tokenInfo?.image_uri || null,
      creatorAddress: hints?.creator?.toLowerCase() || tokenInfo?.creator || null,
      currentPrice: marketInfo?.price_usd || "0",
      marketCap: marketInfo?.market_cap || "0",
      volume24h: marketInfo?.volume || "0",
      holderCount: marketInfo?.holder_count || 0,
      marketType: tokenInfo?.is_graduated ? "DEX" : "CURVE",
      isListing: false,
      discoveredAt: now,
      updatedAt: now,
    },
    { onConflict: "address" }
  );

  if (error) {
    console.error(`[TokenUpsert] Failed to insert ${addr}:`, error.message);
    return false;
  }

  console.log(`[TokenUpsert] Inserted ${name} (${symbol}) — ${addr}`);
  pulse("DISCOVER", `Indexed ${name} (${symbol})`, { address: addr, name, symbol });

  // Broadcast discovery to SSE clients
  const discoveryEvent = {
    type: "DISCOVERY",
    token: { name, symbol, address: addr },
    timestamp: now,
  };
  for (const client of sseClients) {
    client.write(`data: ${JSON.stringify(discoveryEvent)}\n\n`);
  }

  return true;
}

/**
 * Fills in name/symbol/metadata for tokens that were inserted
 * as "Unknown" due to rate limiting.
 */
async function backfillToken(addr: string): Promise<void> {
  const [tokenInfoRes, marketRes] = await Promise.all([
    getTokenInfo(addr),
    getMarketData(addr),
  ]);

  const tokenInfo = tokenInfoRes?.token_info;
  const marketInfo = marketRes?.market_info;

  if (!tokenInfo?.name) return;

  const updates: Record<string, unknown> = {
    name: tokenInfo.name,
    symbol: tokenInfo.symbol,
    updatedAt: new Date().toISOString(),
  };

  if (tokenInfo.description) updates.description = tokenInfo.description;
  if (tokenInfo.image_uri) updates.imageUrl = tokenInfo.image_uri;
  if (tokenInfo.creator) updates.creatorAddress = tokenInfo.creator;
  if (tokenInfo.is_graduated) updates.marketType = "DEX";
  if (marketInfo?.price_usd) updates.currentPrice = marketInfo.price_usd;
  if (marketInfo?.market_cap) updates.marketCap = marketInfo.market_cap;
  if (marketInfo?.volume) updates.volume24h = marketInfo.volume;
  if (marketInfo?.holder_count) updates.holderCount = marketInfo.holder_count;

  await supabase.from("Token").update(updates).eq("address", addr);
  console.log(`[TokenUpsert] Backfilled ${tokenInfo.name} (${tokenInfo.symbol}) — ${addr}`);
}
