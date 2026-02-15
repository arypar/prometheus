import { Router, Request, Response } from "express";
import { getWinRate, getRoiByToken, getVolumeData } from "../services/analyticsService";

const router = Router();

router.get("/win-rate", async (_req: Request, res: Response) => {
  try {
    const data = await getWinRate();
    res.json(data);
  } catch (err) {
    console.error("Win rate error:", err);
    res.status(500).json({ error: "Failed to fetch win rate" });
  }
});

router.get("/roi-by-token", async (_req: Request, res: Response) => {
  try {
    const data = await getRoiByToken();
    res.json(data);
  } catch (err) {
    console.error("ROI by token error:", err);
    res.status(500).json({ error: "Failed to fetch ROI data" });
  }
});

router.get("/volume", async (_req: Request, res: Response) => {
  try {
    const data = await getVolumeData();
    res.json(data);
  } catch (err) {
    console.error("Volume error:", err);
    res.status(500).json({ error: "Failed to fetch volume data" });
  }
});

export default router;
