import { prisma } from "../config/database";
import { env } from "../config/env";
import { evaluateToken } from "./evaluator";

interface NadFunToken {
  tokenAddress: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  creatorAddress?: string;
  marketCap?: string;
  curveType?: string;
}

export async function scanForNewTokens(): Promise<void> {
  try {
    console.log("[Scanner] Polling nad.fun for new tokens...");

    const response = await fetch(
      `${env.NAD_FUN_API_URL}/order/creation_time?limit=20&offset=0`
    );

    if (!response.ok) {
      console.error(`[Scanner] nad.fun API returned ${response.status}`);
      return;
    }

    const data = await response.json();
    const tokens: NadFunToken[] = Array.isArray(data) ? data : data.data || [];

    let newCount = 0;

    for (const t of tokens) {
      if (!t.tokenAddress) continue;

      const existing = await prisma.token.findUnique({
        where: { address: t.tokenAddress },
      });

      if (!existing) {
        await prisma.token.create({
          data: {
            address: t.tokenAddress,
            name: t.name || "Unknown",
            symbol: t.symbol || "???",
            description: t.description || null,
            imageUrl: t.imageUrl || null,
            creatorAddress: t.creatorAddress || null,
            marketCap: t.marketCap || "0",
            marketType: "CURVE",
          },
        });
        newCount++;

        // Evaluate the token
        await evaluateToken(t.tokenAddress);
      }
    }

    if (newCount > 0) {
      console.log(`[Scanner] Discovered ${newCount} new tokens`);
    }
  } catch (err) {
    console.error("[Scanner] Error scanning tokens:", err);
  }
}
