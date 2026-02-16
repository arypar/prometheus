import { Router, Request, Response } from "express";
import { sseClients } from "./activity";

export interface PulseMessage {
  id: string;
  category: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

const pulseBuffer: PulseMessage[] = [];
const MAX_BUFFER = 100;

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(pulseBuffer.slice(-50));
});

router.post("/", (req: Request, res: Response) => {
  const { category, message, meta } = req.body;
  if (!category || !message) {
    res.status(400).json({ error: "category and message required" });
    return;
  }

  const pulse: PulseMessage = {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    message,
    timestamp: new Date().toISOString(),
    meta,
  };

  pulseBuffer.push(pulse);
  if (pulseBuffer.length > MAX_BUFFER) {
    pulseBuffer.splice(0, pulseBuffer.length - MAX_BUFFER);
  }

  const event = { type: "PULSE", ...pulse };
  for (const client of sseClients) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  res.json({ ok: true });
});

export default router;
