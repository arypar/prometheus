import { Router, Request, Response } from "express";
import { botAuth } from "../middleware/auth";
import { logBotAction, recordTransaction } from "../services/botService";
import { BotActionPayload, BotTransactionPayload } from "../types";

const router = Router();

// All bot routes require auth
router.use(botAuth);

router.post("/action", async (req: Request, res: Response) => {
  try {
    const payload: BotActionPayload = req.body;
    if (!payload.action) {
      res.status(400).json({ error: "action is required" });
      return;
    }
    const action = await logBotAction(payload);
    res.status(201).json(action);
  } catch (err) {
    console.error("Bot action error:", err);
    res.status(500).json({ error: "Failed to log bot action" });
  }
});

router.post("/transaction", async (req: Request, res: Response) => {
  try {
    const payload: BotTransactionPayload = req.body;
    if (!payload.txHash || !payload.tokenAddress || !payload.type) {
      res.status(400).json({ error: "txHash, tokenAddress, and type are required" });
      return;
    }
    const transaction = await recordTransaction(payload);
    res.status(201).json(transaction);
  } catch (err) {
    console.error("Bot transaction error:", err);
    res.status(500).json({ error: "Failed to record transaction" });
  }
});

router.post("/thought", async (req: Request, res: Response) => {
  try {
    const { reasoning, sentiment, confidence, phase, tokenAddress } = req.body;
    if (!reasoning) {
      res.status(400).json({ error: "reasoning is required" });
      return;
    }
    const action = await logBotAction({
      action: "THINK",
      reasoning,
      sentiment: sentiment || undefined,
      confidence: confidence ?? undefined,
      phase: phase || undefined,
      tokenAddress: tokenAddress || undefined,
    });
    res.status(201).json(action);
  } catch (err) {
    console.error("Bot thought error:", err);
    res.status(500).json({ error: "Failed to log thought" });
  }
});

router.post("/heartbeat", async (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
