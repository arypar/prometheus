import { encodeFunctionData, parseEther, formatEther, formatUnits } from "viem";
import { publicClient, getWalletClient, config, monadChain } from "../config/chain";
import { lensAbi, curveAbi, routerAbi, erc20Abi } from "../config/abis";

export interface TradeResult {
  success: boolean;
  txHash?: string;
  monAmount: string;
  tokenAmount: string;
  price: string;
  gasCost: string;
  error?: string;
}

async function preflightCheck(tokenAddress: `0x${string}`, tag: string): Promise<string | null> {
  try {
    const [graduated, locked] = await Promise.all([
      publicClient.readContract({
        address: config.CURVE as `0x${string}`,
        abi: curveAbi,
        functionName: "isGraduated",
        args: [tokenAddress],
      }),
      publicClient.readContract({
        address: config.CURVE as `0x${string}`,
        abi: curveAbi,
        functionName: "isLocked",
        args: [tokenAddress],
      }),
    ]);

    if (graduated) return "Token has graduated to DEX — bonding curve no longer active";
    if (locked) return "Bonding curve is locked (graduation in progress)";
    return null;
  } catch (err: any) {
    console.warn(`${tag} Preflight check failed (proceeding anyway):`, err?.message);
    return null;
  }
}

export async function executeBuy(
  tokenAddress: string,
  monAmount: string
): Promise<TradeResult> {
  const tag = `[Trade:BUY ${tokenAddress.slice(0, 8)}...]`;
  try {
    const walletClient = getWalletClient();
    const account = walletClient.account;
    const addr = tokenAddress as `0x${string}`;

    const blocked = await preflightCheck(addr, tag);
    if (blocked) {
      console.log(`${tag} Preflight blocked: ${blocked}`);
      return failure(blocked);
    }

    const monWei = parseEther(monAmount);

    console.log(`${tag} Getting quote for ${monAmount} MON...`);
    let router: `0x${string}`;
    let amountOut: bigint;

    try {
      [router, amountOut] = await publicClient.readContract({
        address: config.LENS as `0x${string}`,
        abi: lensAbi,
        functionName: "getAmountOut",
        args: [addr, monWei, true],
      });
    } catch (quoteErr: any) {
      const msg = quoteErr?.shortMessage || quoteErr?.message || String(quoteErr);
      if (msg.includes("INVALID_INPUTS") || msg.includes("revert")) {
        return failure(`Quote failed (amount may exceed curve capacity): ${msg}`);
      }
      throw quoteErr;
    }

    if (amountOut === 0n) {
      return failure("Quote returned 0 tokens — token may be graduated or locked");
    }

    const amountOutMin = (amountOut * 98n) / 100n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

    console.log(
      `${tag} Quote: ${formatUnits(amountOut, 18)} tokens (min: ${formatUnits(amountOutMin, 18)}), router: ${router}`
    );

    const callData = encodeFunctionData({
      abi: routerAbi,
      functionName: "buy",
      args: [
        {
          amountOutMin,
          token: addr,
          to: account.address,
          deadline,
        },
      ],
    });

    console.log(`${tag} Sending buy transaction...`);
    const hash = await walletClient.sendTransaction({
      account,
      to: router,
      data: callData,
      value: monWei,
      chain: monadChain,
    });

    console.log(`${tag} Waiting for receipt (tx: ${hash})...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice;
    const gasCostWei = gasUsed * gasPrice;

    const tokenAmountStr = formatUnits(amountOut, 18);
    const pricePerToken =
      amountOut > 0n
        ? (Number(monWei) / Number(amountOut)).toString()
        : "0";

    console.log(
      `${tag} SUCCESS — tx: ${hash}, tokens: ${tokenAmountStr}, gas: ${formatEther(gasCostWei)} MON`
    );

    return {
      success: true,
      txHash: hash,
      monAmount,
      tokenAmount: tokenAmountStr,
      price: pricePerToken,
      gasCost: formatEther(gasCostWei),
    };
  } catch (err: any) {
    const msg = err?.shortMessage || err?.message || String(err);
    console.error(`${tag} FAILED:`, msg);
    return failure(msg);
  }
}

export async function executeSell(
  tokenAddress: string
): Promise<TradeResult> {
  const tag = `[Trade:SELL ${tokenAddress.slice(0, 8)}...]`;
  try {
    const walletClient = getWalletClient();
    const account = walletClient.account;

    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    });

    if (balance === 0n) {
      return failure("No token balance to sell");
    }

    console.log(`${tag} Balance: ${formatUnits(balance, 18)} tokens`);

    const [router, amountOut] = await publicClient.readContract({
      address: config.LENS as `0x${string}`,
      abi: lensAbi,
      functionName: "getAmountOut",
      args: [tokenAddress as `0x${string}`, balance, false],
    });

    if (amountOut === 0n) {
      return failure("Quote returned 0 MON — token may be illiquid");
    }

    const amountOutMin = (amountOut * 98n) / 100n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

    console.log(
      `${tag} Quote: ${formatEther(amountOut)} MON (min: ${formatEther(amountOutMin)}), router: ${router}`
    );

    console.log(`${tag} Approving router ${router} for ${formatUnits(balance, 18)} tokens...`);
    const approveHash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [router, balance],
      account,
      chain: monadChain,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const callData = encodeFunctionData({
      abi: routerAbi,
      functionName: "sell",
      args: [
        {
          amountIn: balance,
          amountOutMin,
          token: tokenAddress as `0x${string}`,
          to: account.address,
          deadline,
        },
      ],
    });

    console.log(`${tag} Sending sell transaction...`);
    const hash = await walletClient.sendTransaction({
      account,
      to: router,
      data: callData,
      chain: monadChain,
    });

    console.log(`${tag} Waiting for receipt (tx: ${hash})...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice;
    const gasCostWei = gasUsed * gasPrice;

    const monAmountStr = formatEther(amountOut);
    const tokenAmountStr = formatUnits(balance, 18);
    const pricePerToken =
      balance > 0n
        ? (Number(amountOut) / Number(balance)).toString()
        : "0";

    console.log(
      `${tag} SUCCESS — tx: ${hash}, MON received: ${monAmountStr}, gas: ${formatEther(gasCostWei)} MON`
    );

    return {
      success: true,
      txHash: hash,
      monAmount: monAmountStr,
      tokenAmount: tokenAmountStr,
      price: pricePerToken,
      gasCost: formatEther(gasCostWei),
    };
  } catch (err: any) {
    const msg = err?.shortMessage || err?.message || String(err);
    console.error(`${tag} FAILED:`, msg);
    return failure(msg);
  }
}

function failure(error: string): TradeResult {
  return {
    success: false,
    monAmount: "0",
    tokenAmount: "0",
    price: "0",
    gasCost: "0",
    error,
  };
}
