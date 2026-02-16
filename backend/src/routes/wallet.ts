import { Router, Request, Response } from "express";
import { env } from "../config/env";
import { getWalletBalance, getTransactionCount } from "../services/chainService";

const router = Router();

/* ── Cache wallet data for 60s (2 RPC calls are expensive) ── */
let walletCache: { data: unknown; expiresAt: number } | null = null;
const WALLET_TTL = 60_000;

router.get("/", async (_req: Request, res: Response) => {
  try {
    const address = env.MOLTBOT_WALLET_ADDRESS;
    if (!address) {
      res.status(400).json({ error: "Wallet address not configured" });
      return;
    }

    if (walletCache && Date.now() < walletCache.expiresAt) {
      res.json(walletCache.data);
      return;
    }

    const [balance, txCount] = await Promise.all([
      getWalletBalance(address),
      getTransactionCount(address),
    ]);

    const result = { address, balance, txCount };
    walletCache = { data: result, expiresAt: Date.now() + WALLET_TTL };

    res.json(result);
  } catch (err) {
    console.error("Wallet endpoint error:", err);
    res.status(500).json({ error: "Failed to fetch wallet data" });
  }
});

export default router;
