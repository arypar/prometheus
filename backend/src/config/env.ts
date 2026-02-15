import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  BOT_API_KEY: process.env.BOT_API_KEY || "",
  NAD_FUN_API_URL: process.env.NAD_FUN_API_URL || "https://bot-api-server.nad.fun",
  MONAD_RPC_URL: process.env.MONAD_RPC_URL || "https://rpc.monad.xyz",
  MOLTBOT_WALLET_ADDRESS: process.env.MOLTBOT_WALLET_ADDRESS || "",
  NODE_ENV: process.env.NODE_ENV || "development",
};
