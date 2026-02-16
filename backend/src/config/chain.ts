import { createPublicClient, createWalletClient, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "./env";

const NETWORK_CONFIG = {
  mainnet: {
    chainId: 143,
    rpcUrl: "https://monad-mainnet.drpc.org",
    apiUrl: "https://api.nadapp.net",
    CURVE: "0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE" as const,
    LENS: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea" as const,
    WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A" as const,
    BONDING_CURVE_ROUTER: "0x6F6B8F1a20703309951a5127c45B49b1CD981A22" as const,
    DEX_ROUTER: "0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137" as const,
  },
  testnet: {
    chainId: 10143,
    rpcUrl: "https://monad-testnet.drpc.org",
    apiUrl: "https://dev-api.nad.fun",
    CURVE: "0x1228b0dc9481C11D3071E7A924B794CfB038994e" as const,
    LENS: "0xB056d79CA5257589692699a46623F901a3BB76f1" as const,
    WMON: "0x5a4E0bFDeF88C9032CB4d24338C5EB3d3870BfDd" as const,
    BONDING_CURVE_ROUTER: "0x865054F0F6A288adaAc30261731361EA7E908003" as const,
    DEX_ROUTER: "0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2" as const,
  },
} as const;

export type NetworkName = keyof typeof NETWORK_CONFIG;

const network = (env.MONAD_NETWORK as NetworkName) || "mainnet";
export const config = NETWORK_CONFIG[network];

export const monadChain: Chain = {
  id: config.chainId,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [env.MONAD_RPC_URL || config.rpcUrl] } },
};

const rpcUrl = env.MONAD_RPC_URL || config.rpcUrl;

export const publicClient = createPublicClient({
  chain: monadChain,
  transport: http(rpcUrl),
});

export function getWalletClient() {
  if (!env.PROMETHEUS_PRIVATE_KEY) {
    throw new Error("PROMETHEUS_PRIVATE_KEY not set — cannot create wallet client");
  }
  const account = privateKeyToAccount(env.PROMETHEUS_PRIVATE_KEY as `0x${string}`);
  return createWalletClient({
    account,
    chain: monadChain,
    transport: http(rpcUrl),
  });
}

export const NAD_API_URL = env.NAD_FUN_API_URL || config.apiUrl;
