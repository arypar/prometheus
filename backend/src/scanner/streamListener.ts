import { prisma } from "../config/database";
import { evaluateToken } from "./evaluator";

// WebSocket stream listener for real-time nad.fun events
// Uses @nadfun/sdk when available, falls back to polling

interface CurveEvent {
  type: "Create" | "Buy" | "Sell";
  tokenAddress: string;
  trader?: string;
  amount?: string;
  price?: string;
}

let ws: WebSocket | null = null;

export function startStreamListener(): void {
  try {
    // Note: @nadfun/sdk WebSocket integration
    // In production, connect to nad.fun's WebSocket stream for real-time events
    // For now, this is a placeholder that logs the intent
    console.log("[Stream] WebSocket stream listener initialized (placeholder)");
    console.log("[Stream] Will connect to nad.fun curve stream when SDK is configured");
  } catch (err) {
    console.error("[Stream] Failed to start stream listener:", err);
  }
}

export async function handleCurveEvent(event: CurveEvent): Promise<void> {
  try {
    if (event.type === "Create") {
      // New token created on curve
      const existing = await prisma.token.findUnique({
        where: { address: event.tokenAddress },
      });

      if (!existing) {
        await prisma.token.create({
          data: {
            address: event.tokenAddress,
            name: "Pending",
            symbol: "???",
            marketType: "CURVE",
          },
        });
        await evaluateToken(event.tokenAddress);
      }
    } else if (event.type === "Buy" || event.type === "Sell") {
      // Update price data for tracked tokens
      if (event.price) {
        await prisma.token.updateMany({
          where: { address: event.tokenAddress },
          data: { currentPrice: event.price },
        });
      }
    }
  } catch (err) {
    console.error("[Stream] Error handling curve event:", err);
  }
}

export function stopStreamListener(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
}
