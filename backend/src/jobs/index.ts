import cron from "node-cron";
import { scanForNewTokens } from "../scanner/tokenScanner";
import { updateTokenPrices, takePortfolioSnapshot } from "./scheduled";

export function startScheduledJobs(): void {
  // Token scan: every 30 seconds (backup to WebSocket)
  cron.schedule("*/30 * * * * *", () => {
    scanForNewTokens();
  });

  // Price updates: every 2 minutes (update all tracked token prices)
  cron.schedule("*/2 * * * *", () => {
    updateTokenPrices();
  });

  // Portfolio snapshot: every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    takePortfolioSnapshot();
  });

  console.log("[Jobs] Scheduled jobs started");
}
