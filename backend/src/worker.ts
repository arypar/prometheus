import { env } from "./config/env";
import { startScheduledJobs } from "./jobs";
import { startStreamListener } from "./scanner/streamListener";
import { startPortfolioManager } from "./services/portfolioManager";

console.log(`[Worker] Prometheus worker starting...`);
console.log(`[Worker] RPC: ${env.MONAD_RPC_URL}`);
console.log(`[Worker] Network: ${env.MONAD_NETWORK}`);
console.log(`[Worker] Wallet: ${env.MOLTBOT_WALLET_ADDRESS || "(not set)"}`);

startScheduledJobs();
startStreamListener();
startPortfolioManager();

console.log(`[Worker] All background services running`);

// Keep the process alive
process.on("SIGINT", () => {
  console.log("[Worker] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[Worker] Shutting down...");
  process.exit(0);
});
