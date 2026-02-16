import { publicClient, config } from "../config/chain";
import { curveAbi } from "../config/abis";
import { ensureToken } from "../services/tokenUpsert";
import { evaluateToken } from "./evaluator";
import { pulse } from "../utils/pulse";

let lastScannedBlock: bigint | null = null;

const SAFE_BLOCK_LAG = 20n;
// On first run, look back ~5 minutes (~300 blocks at ~1 block/sec)
const INITIAL_LOOKBACK = 300n;

export async function scanForNewTokens(): Promise<void> {
  try {
    const latestBlock = await publicClient.getBlockNumber();
    const safeBlock = latestBlock - SAFE_BLOCK_LAG;

    if (!lastScannedBlock) {
      lastScannedBlock = safeBlock - INITIAL_LOOKBACK;
    }

    const fromBlock = lastScannedBlock + 1n;
    const toBlock = safeBlock;

    if (fromBlock > toBlock) return;

    console.log(`[Scanner] Scanning blocks ${fromBlock} to ${toBlock} for new tokens...`);
    pulse("SCAN", `Scanning blocks ${fromBlock}–${toBlock}`, { fromBlock: Number(fromBlock), toBlock: Number(toBlock) });

    const CHUNK_SIZE = 500n;
    let newCount = 0;

    for (let from = fromBlock; from <= toBlock; from += CHUNK_SIZE) {
      const to = from + CHUNK_SIZE > toBlock ? toBlock : from + CHUNK_SIZE;

      const createEvents = await publicClient.getContractEvents({
        address: config.CURVE,
        abi: curveAbi,
        eventName: "CurveCreate",
        fromBlock: from,
        toBlock: to,
      });

      for (const event of createEvents) {
        const tokenAddress = event.args.token;
        if (!tokenAddress) continue;

        const inserted = await ensureToken(tokenAddress, {
          name: event.args.name,
          symbol: event.args.symbol,
          creator: event.args.creator,
        });

        if (inserted) {
          newCount++;
          evaluateToken(tokenAddress.toLowerCase()).catch((err) =>
            console.error(`[Scanner] Evaluation error for ${tokenAddress}:`, err)
          );
        }
      }
    }

    lastScannedBlock = toBlock;

    if (newCount > 0) {
      console.log(`[Scanner] Discovered ${newCount} new tokens`);
      pulse("DISCOVER", `Discovered ${newCount} new token${newCount > 1 ? "s" : ""}`, { count: newCount });
    }
  } catch (err: any) {
    if (err?.details?.includes?.("Unknown block") || err?.message?.includes?.("Unknown block")) {
      return;
    }
    console.error("[Scanner] Error scanning tokens:", err);
  }
}
