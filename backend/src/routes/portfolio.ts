import { Router, Request, Response } from "express";
import { getPortfolioOverview, getPortfolioHistory, getHoldings } from "../services/portfolioService";

const router = Router();

router.get("/overview", async (_req: Request, res: Response) => {
  try {
    const overview = await getPortfolioOverview();
    res.json(overview);
  } catch (err) {
    console.error("Portfolio overview error:", err);
    res.status(500).json({ error: "Failed to fetch portfolio overview" });
  }
});

router.get("/history", async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || "7d";
    const history = await getPortfolioHistory(period);
    res.json(history);
  } catch (err) {
    console.error("Portfolio history error:", err);
    res.status(500).json({ error: "Failed to fetch portfolio history" });
  }
});

router.get("/holdings", async (_req: Request, res: Response) => {
  try {
    const holdings = await getHoldings();
    res.json(holdings);
  } catch (err) {
    console.error("Holdings error:", err);
    res.status(500).json({ error: "Failed to fetch holdings" });
  }
});

export default router;
