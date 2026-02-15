import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export function botAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (token !== env.BOT_API_KEY) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}
