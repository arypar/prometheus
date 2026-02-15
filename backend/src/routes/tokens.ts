import { Router, Request, Response } from "express";
import { getAllTokens, getTokenDetail } from "../services/tokenService";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const marketType = req.query.marketType as string | undefined;
    const held = req.query.held === "true";
    const search = req.query.search as string | undefined;
    const tokens = await getAllTokens({ marketType, held, search });
    res.json(tokens);
  } catch (err) {
    console.error("Tokens error:", err);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

router.get("/:address", async (req: Request, res: Response) => {
  try {
    const token = await getTokenDetail(req.params.address as string);
    if (!token) {
      res.status(404).json({ error: "Token not found" });
      return;
    }
    res.json(token);
  } catch (err) {
    console.error("Token detail error:", err);
    res.status(500).json({ error: "Failed to fetch token detail" });
  }
});

export default router;
