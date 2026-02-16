import { Router, Request, Response } from "express";
import { supabase } from "../config/database";
import { evaluateToken } from "../scanner/evaluator";

const router = Router();

router.get("/new-tokens", async (req: Request, res: Response) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since as string).toISOString()
      : new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: tokens, error } = await supabase
      .from("Token")
      .select("*")
      .gte("discoveredAt", since)
      .order("discoveredAt", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(tokens);
  } catch (err) {
    console.error("New tokens error:", err);
    res.status(500).json({ error: "Failed to fetch new tokens" });
  }
});

router.get("/token/:address/evaluate", async (req: Request, res: Response) => {
  try {
    const address = req.params.address as string;

    // Re-evaluate the token with fresh data from nad.fun
    const evaluation = await evaluateToken(address.toLowerCase());

    if (!evaluation) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    // Fetch the updated token
    const { data: token, error } = await supabase
      .from("Token")
      .select("*")
      .eq("address", address.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!token) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

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
      evaluation,
    });
  } catch (err) {
    console.error("Token evaluate error:", err);
    res.status(500).json({ error: "Failed to evaluate token" });
  }
});

export default router;
