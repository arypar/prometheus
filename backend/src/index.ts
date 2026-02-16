import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import portfolioRoutes from "./routes/portfolio";
import transactionRoutes from "./routes/transactions";
import tokenRoutes from "./routes/tokens";
import analyticsRoutes from "./routes/analytics";
import botRoutes from "./routes/bot";
import activityRoutes from "./routes/activity";
import scannerRoutes from "./routes/scanner";
import walletRoutes from "./routes/wallet";
import pulseRoutes from "./routes/pulse";

const app = express();

// Middleware
const corsOrigin = env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Dashboard-facing routes
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/activity", activityRoutes);

// Wallet / on-chain data
app.use("/api/wallet", walletRoutes);

// Worker pulse feed
app.use("/api/pulse", pulseRoutes);

// Bot-facing routes
app.use("/api/bot", botRoutes);

// Scanner routes
app.use("/api/scanner", scannerRoutes);

// Error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[API] Prometheus API server running on port ${env.PORT}`);
});
