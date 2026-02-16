import { publicClient } from "../config/chain";
import { formatEther } from "viem";

export async function getWalletBalance(address: string): Promise<string> {
  try {
    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return "0.000000";
    }

    const wei = await publicClient.getBalance({
      address: address as `0x${string}`,
    });

    return parseFloat(formatEther(wei)).toFixed(6);
  } catch (err) {
    console.error("[Chain] Failed to fetch balance:", err);
    return "0.000000";
  }
}

export async function getTransactionCount(address: string): Promise<number> {
  try {
    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return 0;
    }

    return await publicClient.getTransactionCount({
      address: address as `0x${string}`,
    });
  } catch (err) {
    console.error("[Chain] Failed to fetch tx count:", err);
    return 0;
  }
}
