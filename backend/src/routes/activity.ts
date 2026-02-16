import { Router, Request, Response } from "express";
import { getActivityLog } from "../services/activityService";
import { getActivityStats } from "../services/activityStatsService";

const router = Router();

// SSE clients for live streaming
export const sseClients: Response[] = [];

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const actionType = req.query.action as string;
    const tokenAddress = req.query.token as string;
    const result = await getActivityLog(page, pageSize, actionType, tokenAddress);
    res.json(result);
  } catch (err) {
    console.error("Activity error:", err);
    res.status(500).json({ error: "Failed to fetch activity log" });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getActivityStats();
    res.json(stats);
  } catch (err) {
    console.error("Activity stats error:", err);
    res.status(500).json({ error: "Failed to fetch activity stats" });
  }
});

router.get("/live", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write("data: {\"type\":\"connected\"}\n\n");

  sseClients.push(res);

  req.on("close", () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

export default router;
