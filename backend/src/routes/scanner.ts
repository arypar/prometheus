import { Router, Request, Response } from "express";
import { prisma } from "../config/database";

const router = Router();

// Get recently discovered tokens for the bot to evaluate
router.get("/new-tokens", async (req: Request, res: Response) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since as string)
      : new Date(Date.now() - 60 * 60 * 1000); // default: last hour

    const tokens = await prisma.token.findMany({
      where: {
        discoveredAt: { gte: since },
        score: null, // not yet evaluated
      },
      orderBy: { discoveredAt: "desc" },
      take: 50,
    });

    res.json(tokens);
  } catch (err) {
    console.error("New tokens error:", err);
    res.status(500).json({ error: "Failed to fetch new tokens" });
  }
});

// Get pre-computed evaluation for a token
router.get("/token/:address/evaluate", async (req: Request, res: Response) => {
  try {
    const token = await prisma.token.findUnique({
      where: { address: req.params.address as string },
    });

    if (!token) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    // Return token with its score
    res.json({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      score: token.score,
      marketCap: token.marketCap,
      volume24h: token.volume24h,
      holderCount: token.holderCount,
      marketType: token.marketType,
      discoveredAt: token.discoveredAt,
    });
  } catch (err) {
    console.error("Token evaluate error:", err);
    res.status(500).json({ error: "Failed to evaluate token" });
  }
});

export default router;
