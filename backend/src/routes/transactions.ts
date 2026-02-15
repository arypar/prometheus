import { Router, Request, Response } from "express";
import { getTransactions } from "../services/transactionService";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const type = req.query.type as string;
    const result = await getTransactions(page, pageSize, type);
    res.json(result);
  } catch (err) {
    console.error("Transactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

export default router;
