import { parseEther, formatEther } from "viem";
import { supabase } from "../config/database";
import { publicClient, config } from "../config/chain";
import { curveAbi, lensAbi } from "../config/abis";
import { getMarketData } from "../services/nadFunApi";
import { ensureToken } from "../services/tokenUpsert";
import { evaluateToken } from "./evaluator";
import { pulse } from "../utils/pulse";

let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastProcessedBlock: bigint | null = null;

const POLL_INTERVAL_MS = 10_000;
const SAFE_BLOCK_LAG = 20n;

export function startStreamListener(): void {
  try {
    console.log("[Stream] Starting block event poller on Monad...");

    pollInterval = setInterval(async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const safeBlock = latestBlock - SAFE_BLOCK_LAG;

        if (!lastProcessedBlock) {
          lastProcessedBlock = safeBlock - 1n;
        }

        if (safeBlock <= lastProcessedBlock) return;

        const fromBlock = lastProcessedBlock + 1n;
        const toBlock = safeBlock;

        // Fetch all event types in parallel
        const [createEvents, buyEvents, sellEvents, graduateEvents] = await Promise.all([
          publicClient.getContractEvents({
            address: config.CURVE,
            abi: curveAbi,
            eventName: "CurveCreate",
            fromBlock,
            toBlock,
          }).catch(() => []),
          publicClient.getContractEvents({
            address: config.CURVE,
            abi: curveAbi,
            eventName: "CurveBuy",
            fromBlock,
            toBlock,
          }).catch(() => []),
          publicClient.getContractEvents({
            address: config.CURVE,
            abi: curveAbi,
            eventName: "CurveSell",
            fromBlock,
            toBlock,
          }).catch(() => []),
          publicClient.getContractEvents({
            address: config.CURVE,
            abi: curveAbi,
            eventName: "CurveGraduate",
            fromBlock,
            toBlock,
          }).catch(() => []),
        ]);

        // Process CurveCreate events — new tokens
        for (const event of createEvents) {
          try {
            const tokenAddress = event.args.token;
            if (!tokenAddress) continue;

            const inserted = await ensureToken(tokenAddress, {
              name: event.args.name,
              symbol: event.args.symbol,
              creator: event.args.creator,
            });

            if (inserted) {
              evaluateToken(tokenAddress.toLowerCase()).catch(() => {});
            }
          } catch (err) {
            console.error("[Stream] Error processing CurveCreate:", err);
          }
        }

        // Collect unique token addresses from buy/sell events
        const tradedTokens = new Set<string>();
        for (const event of [...buyEvents, ...sellEvents]) {
          const addr = event.args.token?.toLowerCase();
          if (addr) tradedTokens.add(addr);
        }

        // Ensure each traded token exists in DB, then update its market data
        for (const tokenAddress of tradedTokens) {
          try {
            await ensureToken(tokenAddress);

            // Get MON price from LENS + market data from API
            let monPrice: string | null = null;
            try {
              const [, monOut] = await publicClient.readContract({
                address: config.LENS as `0x${string}`,
                abi: lensAbi,
                functionName: "getAmountOut",
                args: [tokenAddress as `0x${string}`, parseEther("1"), false],
              });
              monPrice = formatEther(monOut);
            } catch { /* LENS call failed */ }

            const marketRes = await getMarketData(tokenAddress);
            const updates: Record<string, unknown> = {};
            if (monPrice) updates.currentPrice = monPrice;
            if (marketRes?.market_info) {
              updates.marketCap = marketRes.market_info.market_cap || "0";
              updates.volume24h = marketRes.market_info.volume || "0";
              updates.holderCount = marketRes.market_info.holder_count || 0;
            }
            if (Object.keys(updates).length > 0) {
              await supabase.from("Token").update(updates).eq("address", tokenAddress);
            }
          } catch {
            // Skip individual failures
          }
        }

        // Process CurveGraduate events — mark tokens as DEX
        for (const event of graduateEvents) {
          try {
            const addr = event.args.token?.toLowerCase();
            if (!addr) continue;

            await ensureToken(addr);
            await supabase
              .from("Token")
              .update({ marketType: "DEX", isListing: true })
              .eq("address", addr);

            console.log(`[Stream] Token graduated to DEX: ${addr}`);
            pulse("GRADUATE", `Token graduated to DEX`, { address: addr });
          } catch {
            // Skip individual failures
          }
        }

        lastProcessedBlock = toBlock;

        const totalEvents = createEvents.length + buyEvents.length + sellEvents.length + graduateEvents.length;
        if (totalEvents > 0) {
          const msg =
            `Processed ${totalEvents} events (${createEvents.length} creates, ` +
            `${buyEvents.length} buys, ${sellEvents.length} sells, ` +
            `${graduateEvents.length} graduations) in blocks ${fromBlock}-${toBlock}`;
          console.log(`[Stream] ${msg}`);
          pulse("STREAM", msg, {
            creates: createEvents.length,
            buys: buyEvents.length,
            sells: sellEvents.length,
            graduations: graduateEvents.length,
            fromBlock: Number(fromBlock),
            toBlock: Number(toBlock),
          });
        }
      } catch (err: any) {
        if (err?.details?.includes?.("Unknown block") || err?.message?.includes?.("Unknown block")) {
          return;
        }
        console.error("[Stream] Poll error:", err?.message || err);
      }
    }, POLL_INTERVAL_MS);

    console.log("[Stream] Block event poller started (polling every 10s with 20-block lag)");
  } catch (err) {
    console.error("[Stream] Failed to start stream listener:", err);
  }
}

export function stopStreamListener(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  console.log("[Stream] Event poller stopped");
}
