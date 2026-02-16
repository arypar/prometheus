import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
  BOT_API_KEY: process.env.BOT_API_KEY || "",
  NAD_FUN_API_URL: process.env.NAD_FUN_API_URL || "",
  NAD_FUN_API_KEY: process.env.NAD_FUN_API_KEY || "",
  MONAD_RPC_URL: process.env.MONAD_RPC_URL || "",
  MONAD_NETWORK: process.env.MONAD_NETWORK || "mainnet",
  MOLTBOT_WALLET_ADDRESS: process.env.MOLTBOT_WALLET_ADDRESS || "",
  NODE_ENV: process.env.NODE_ENV || "development",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  PROMETHEUS_PRIVATE_KEY: process.env.PROMETHEUS_PRIVATE_KEY || "",
};
