import { Router, Request, Response } from "express";
import {
  createPitch,
  sendPitchMessage,
  getPitchFeed,
  getPitchDetail,
} from "../services/pitchService";

const router = Router();

// Create a new pitch
router.post("/", async (req: Request, res: Response) => {
  try {
    const { tokenAddress, message } = req.body;

    if (!tokenAddress || typeof tokenAddress !== "string") {
      res.status(400).json({ error: "tokenAddress is required" });
      return;
    }
    if (!message || typeof message !== "string" || message.length < 1 || message.length > 1000) {
      res.status(400).json({ error: "message is required (1-1000 characters)" });
      return;
    }

    const result = await createPitch(tokenAddress.trim(), message.trim());
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create pitch";
    console.error("Create pitch error:", err);
    res.status(message === "Token not found on nad.fun" ? 404 : 500).json({ error: message });
  }
});

// Send a message in an existing pitch
router.post("/:id/message", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.length < 1 || message.length > 1000) {
      res.status(400).json({ error: "message is required (1-1000 characters)" });
      return;
    }

    const result = await sendPitchMessage(id, message.trim());
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    console.error("Pitch message error:", err);
    const status = message === "Pitch not found" ? 404 : message === "Pitch is already completed" ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// Get pitch feed (paginated)
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string | undefined;
    const verdict = req.query.verdict as string | undefined;

    const result = await getPitchFeed(page, pageSize, status, verdict);
    res.json(result);
  } catch (err) {
    console.error("Pitch feed error:", err);
    res.status(500).json({ error: "Failed to fetch pitch feed" });
  }
});

// Get single pitch with messages
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await getPitchDetail(req.params.id as string);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch pitch";
    console.error("Pitch detail error:", err);
    res.status(message === "Pitch not found" ? 404 : 500).json({ error: message });
  }
});

export default router;
