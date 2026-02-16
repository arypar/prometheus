import { parseEther, formatEther } from "viem";
import { supabase } from "../config/database";
import { publicClient, config } from "../config/chain";
import { lensAbi, curveAbi } from "../config/abis";
import { env } from "../config/env";
import { getWalletBalance } from "./chainService";
import { isRateLimited, getMarketData } from "./nadFunApi";
import { analyzePortfolio, PortfolioContext } from "./anthropicService";
import { executeBuy, executeSell } from "./tradingService";
import { logBotAction, recordTransaction } from "./botService";
import { pulse } from "../utils/pulse";

// --- Timing ---
const MONITOR_INTERVAL_MS = 30_000;        // lightweight scan every 30s
const MIN_DECISION_GAP_MS = 10 * 60_000;   // at least 10 min between AI decisions
const MAX_DECISION_GAP_MS = 15 * 60_000;   // force a decision check after 15 min of silence
const COOLDOWN_MS = 30 * 60_000;           // don't re-trade same token within 30 min

// --- Trigger thresholds ---
const STOP_LOSS_THRESHOLD = -25;            // ROI% to trigger urgent sell check
const TAKE_PROFIT_THRESHOLD = 80;           // ROI% to trigger profit-taking check
const HIGH_SCORE_THRESHOLD = 70;            // token score to trigger buy check

const recentlyTraded = new Map<string, number>();
let lastDecisionTime = 0;
let running = false;
let loopTimer: ReturnType<typeof setTimeout> | null = null;

export function startPortfolioManager(): void {
  if (!env.ANTHROPIC_API_KEY) {
    console.warn("[PM] ANTHROPIC_API_KEY not set — portfolio manager disabled");
    return;
  }
  if (!env.PROMETHEUS_PRIVATE_KEY) {
    console.warn("[PM] PROMETHEUS_PRIVATE_KEY not set — portfolio manager disabled");
    return;
  }

  console.log("[PM] Starting continuous portfolio monitor (scan every 30s, ~5 decisions/hr max)");

  // Initial delay to let scanner populate some data
  setTimeout(() => monitorLoop(), 20_000);
}

async function monitorLoop(): Promise<void> {
  try {
    await tick();
  } catch (err: any) {
    console.error("[PM] Monitor tick error:", err?.message || err);
  }

  // Schedule next tick
  loopTimer = setTimeout(() => monitorLoop(), MONITOR_INTERVAL_MS);
}

/**
 * Lightweight tick that runs every 30s.
 * Checks for triggers, and only escalates to the AI when warranted.
 */
async function tick(): Promise<void> {
  if (running) return;

  const now = Date.now();
  const timeSinceLastDecision = now - lastDecisionTime;
  const canDecide = timeSinceLastDecision >= MIN_DECISION_GAP_MS;

  // Quick DB check for triggers
  const trigger = await detectTrigger();

  if (trigger.urgent && canDecide) {
    console.log(`[PM] Urgent trigger: ${trigger.reason}`);
    await runDecisionCycle(trigger.reason);
    return;
  }

  if (trigger.opportunity && canDecide) {
    console.log(`[PM] Opportunity detected: ${trigger.reason}`);
    await runDecisionCycle(trigger.reason);
    return;
  }

  // Periodic check — if it's been long enough, do a general analysis
  if (timeSinceLastDecision >= MAX_DECISION_GAP_MS) {
    console.log(`[PM] Periodic check (${Math.round(timeSinceLastDecision / 60_000)}m since last decision)`);
    await runDecisionCycle("Periodic portfolio review");
    return;
  }
}

interface Trigger {
  urgent: boolean;
  opportunity: boolean;
  reason: string;
}

async function detectTrigger(): Promise<Trigger> {
  try {
    // Check holdings for stop-loss / take-profit
    const { data: holdings } = await supabase
      .from("Holding")
      .select("tokenAddress, amount, avgBuyPrice, totalInvested, token:Token(symbol, currentPrice)");

    if (holdings && holdings.length > 0) {
      for (const h of holdings) {
        const amount = parseFloat(h.amount);
        const currentPrice = parseFloat((h as any).token?.currentPrice || "0");
        const invested = parseFloat(h.totalInvested);
        const currentValue = amount * currentPrice;
        const roi = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
        const symbol = (h as any).token?.symbol || "???";

        if (roi <= STOP_LOSS_THRESHOLD) {
          return {
            urgent: true,
            opportunity: false,
            reason: `${symbol} hit stop-loss at ${roi.toFixed(1)}% ROI`,
          };
        }

        if (roi >= TAKE_PROFIT_THRESHOLD) {
          return {
            urgent: false,
            opportunity: true,
            reason: `${symbol} at ${roi.toFixed(1)}% ROI — consider taking profit`,
          };
        }
      }
    }

    // Check for high-score buy opportunities (not already held)
    const heldAddresses = new Set(
      (holdings || []).map((h: any) => h.tokenAddress.toLowerCase())
    );

    const { data: hotTokens } = await supabase
      .from("Token")
      .select("address, symbol, score")
      .gte("score", HIGH_SCORE_THRESHOLD)
      .eq("marketType", "CURVE")
      .order("score", { ascending: false })
      .limit(5);

    if (hotTokens && hotTokens.length > 0) {
      const newOpportunity = hotTokens.find(
        (t: any) => !heldAddresses.has(t.address.toLowerCase()) && !isOnCooldown(t.address)
      );
      if (newOpportunity) {
        return {
          urgent: false,
          opportunity: true,
          reason: `${(newOpportunity as any).symbol} scored ${(newOpportunity as any).score}/100 — strong buy candidate`,
        };
      }
    }

    return { urgent: false, opportunity: false, reason: "" };
  } catch {
    return { urgent: false, opportunity: false, reason: "" };
  }
}

async function runDecisionCycle(triggerReason: string): Promise<void> {
  if (running) return;
  running = true;
  const cycleStart = Date.now();

  try {
    console.log(`[PM] === Decision cycle: ${triggerReason} ===`);

    const context = await gatherContext();

    if (context.walletBalanceMon < 0.01 && context.holdings.length === 0) {
      console.log("[PM] Wallet nearly empty and no holdings — skipping");
      lastDecisionTime = Date.now();
      return;
    }

    console.log(
      `[PM] Context: ${context.walletBalanceMon.toFixed(4)} MON, ` +
      `${context.holdings.length} positions, ${context.buyCandidates.length} candidates`
    );

    pulse("THINK", `Analyzing: ${triggerReason}`, {
      wallet: context.walletBalanceMon,
      positions: context.holdings.length,
      candidates: context.buyCandidates.length,
      trigger: triggerReason,
    });

    const decision = await analyzePortfolio(context);
    lastDecisionTime = Date.now();

    console.log(
      `[PM] Decision: ${decision.action} ` +
      `${decision.tokenSymbol || ""} ` +
      `(confidence: ${decision.confidence}, sentiment: ${decision.sentiment})`
    );
    console.log(`[PM] Reasoning: ${decision.reasoning}`);

    if (decision.action === "BUY" && decision.tokenAddress && decision.monAmount) {
      await handleBuy(decision.tokenAddress, decision.tokenSymbol || "", decision.monAmount, decision);
    } else if (decision.action === "SELL" && decision.tokenAddress) {
      await handleSell(decision.tokenAddress, decision.tokenSymbol || "", decision);
    } else {
      await logBotAction({
        action: "THINK",
        reasoning: decision.reasoning,
        sentiment: decision.sentiment,
        confidence: decision.confidence,
        phase: "HOLD",
      });
      pulse("DECISION", `HOLD — ${decision.reasoning}`, {
        action: "HOLD",
        confidence: decision.confidence,
        sentiment: decision.sentiment,
      });
    }

    const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
    console.log(`[PM] === Cycle complete in ${elapsed}s ===`);
  } catch (err: any) {
    console.error("[PM] Cycle error:", err?.message || err);
    lastDecisionTime = Date.now();
    await logBotAction({
      action: "ERROR",
      details: { error: err?.message || String(err) },
      reasoning: "Decision cycle encountered an error",
      sentiment: "cautious",
      confidence: 0,
      phase: "ERROR",
    }).catch(() => {});
  } finally {
    running = false;
  }
}

// ─── Context Gathering ──────────────────────────────────────────────

async function gatherContext(): Promise<PortfolioContext> {
  const walletAddress = env.MOLTBOT_WALLET_ADDRESS;

  const [walletBal, holdingsRes, actionsRes, txRes] = await Promise.all([
    walletAddress ? getWalletBalance(walletAddress) : Promise.resolve("0"),
    supabase.from("Holding").select("*, token:Token(name, symbol, currentPrice, imageUrl, marketType)"),
    supabase
      .from("BotAction")
      .select("action, tokenAddress, reasoning, confidence, timestamp")
      .order("timestamp", { ascending: false })
      .limit(10),
    supabase
      .from("Transaction")
      .select("type, tokenAddress, monAmount, timestamp")
      .order("timestamp", { ascending: false })
      .limit(10),
  ]);

  const walletBalanceMon = parseFloat(walletBal);

  const heldAddresses = new Set(
    (holdingsRes.data || []).map((h: any) => h.tokenAddress.toLowerCase())
  );

  const holdings: PortfolioContext["holdings"] = (holdingsRes.data || []).map((h: any) => {
    const amount = parseFloat(h.amount);
    const currentPrice = parseFloat(h.token?.currentPrice || "0");
    const invested = parseFloat(h.totalInvested);
    const currentValueMon = amount * currentPrice;
    const unrealizedPnl = currentValueMon - invested;
    const roiPercent = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;

    return {
      tokenAddress: h.tokenAddress,
      symbol: h.token?.symbol || "???",
      name: h.token?.name || "Unknown",
      amount: h.amount,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.token?.currentPrice || "0",
      totalInvested: h.totalInvested,
      currentValueMon,
      unrealizedPnl,
      roiPercent,
      holdingSince: h.createdAt || new Date().toISOString(),
    };
  });

  const { data: candidateTokens } = await supabase
    .from("Token")
    .select("address, symbol, name, score, currentPrice, marketCap, volume24h, holderCount, discoveredAt, marketType")
    .gte("score", 55)
    .eq("marketType", "CURVE")
    .order("score", { ascending: false })
    .limit(15);

  let buyCandidates: PortfolioContext["buyCandidates"] = [];

  if (candidateTokens && candidateTokens.length > 0) {
    const filtered = candidateTokens.filter(
      (t: any) => !heldAddresses.has(t.address.toLowerCase()) && !isOnCooldown(t.address)
    );

    const topCandidates = filtered.slice(0, 8);

    // Validate candidates: check curve state + get MON price from LENS
    const validCandidates: typeof topCandidates = [];
    for (const t of topCandidates) {
      try {
        const addr = t.address as `0x${string}`;
        const [graduated, locked] = await Promise.all([
          publicClient.readContract({
            address: config.CURVE as `0x${string}`, abi: curveAbi,
            functionName: "isGraduated", args: [addr],
          }),
          publicClient.readContract({
            address: config.CURVE as `0x${string}`, abi: curveAbi,
            functionName: "isLocked", args: [addr],
          }),
        ]);
        if (graduated || locked) continue; // Skip untradeable tokens

        // Get MON price from LENS
        const [, monOut] = await publicClient.readContract({
          address: config.LENS as `0x${string}`, abi: lensAbi,
          functionName: "getAmountOut",
          args: [addr, parseEther("1"), false],
        });
        const monPrice = formatEther(monOut);
        validCandidates.push({ ...t, currentPrice: monPrice });
      } catch {
        // LENS or curve call failed — skip candidate
      }
    }

    // Enrich top 3 with API market data (volume, holders) if not rate-limited
    const refreshCount = isRateLimited() ? 0 : Math.min(validCandidates.length, 3);
    for (let i = 0; i < refreshCount; i++) {
      try {
        const t = validCandidates[i];
        const marketRes = await getMarketData(t.address);
        if (marketRes?.market_info) {
          validCandidates[i] = {
            ...t,
            marketCap: marketRes.market_info.market_cap || t.marketCap || "0",
            volume24h: marketRes.market_info.volume || t.volume24h || "0",
            holderCount: marketRes.market_info.holder_count ?? t.holderCount ?? 0,
          };
        }
      } catch {
        // Use DB-cached data on failure
      }
    }
    
    const topCandidatesValidated = validCandidates;

    buyCandidates = topCandidatesValidated.map((t: any) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      score: t.score || 0,
      currentPrice: t.currentPrice || "0",
      marketCap: t.marketCap || "0",
      volume24h: t.volume24h || "0",
      holderCount: t.holderCount ?? 0,
      discoveredAt: t.discoveredAt,
      marketType: t.marketType,
    }));
  }

  const recentActions: PortfolioContext["recentActions"] = (actionsRes.data || []).map((a: any) => ({
    action: a.action,
    tokenAddress: a.tokenAddress,
    reasoning: a.reasoning,
    confidence: a.confidence,
    timestamp: a.timestamp,
  }));

  const recentTransactions: PortfolioContext["recentTransactions"] = (txRes.data || []).map((t: any) => ({
    type: t.type,
    tokenAddress: t.tokenAddress,
    monAmount: t.monAmount,
    timestamp: t.timestamp,
  }));

  return {
    walletBalanceMon,
    holdings,
    buyCandidates,
    recentActions,
    recentTransactions,
  };
}

// ─── Trade Handlers ─────────────────────────────────────────────────

async function handleBuy(
  tokenAddress: string,
  symbol: string,
  monAmount: string,
  decision: { reasoning: string; confidence: number; sentiment: string }
): Promise<void> {
  if (isOnCooldown(tokenAddress)) {
    console.log(`[PM] Token ${symbol} on cooldown — skipping buy`);
    await logBotAction({
      action: "THINK",
      tokenAddress,
      reasoning: `Wanted to buy ${symbol} but on cooldown — waiting`,
      sentiment: decision.sentiment,
      confidence: decision.confidence,
      phase: "COOLDOWN",
    });
    return;
  }

  // Pre-validate: check curve state and LENS quote before committing
  try {
    const addr = tokenAddress as `0x${string}`;
    const [graduated, locked] = await Promise.all([
      publicClient.readContract({
        address: config.CURVE as `0x${string}`, abi: curveAbi,
        functionName: "isGraduated", args: [addr],
      }),
      publicClient.readContract({
        address: config.CURVE as `0x${string}`, abi: curveAbi,
        functionName: "isLocked", args: [addr],
      }),
    ]);
    if (graduated || locked) {
      const reason = graduated ? "graduated to DEX" : "curve locked (graduating)";
      console.log(`[PM] Skipping buy of ${symbol} — ${reason}`);
      await logBotAction({
        action: "THINK", tokenAddress,
        reasoning: `Skipped BUY ${symbol}: ${reason}`,
        sentiment: "cautious", confidence: 0, phase: "SKIPPED",
      });
      return;
    }
    // Test LENS quote
    const [, testOut] = await publicClient.readContract({
      address: config.LENS as `0x${string}`, abi: lensAbi,
      functionName: "getAmountOut",
      args: [addr, parseEther(monAmount), true],
    });
    if (testOut === 0n) {
      console.log(`[PM] Skipping buy of ${symbol} — LENS quote returned 0`);
      await logBotAction({
        action: "THINK", tokenAddress,
        reasoning: `Skipped BUY ${symbol}: zero quote — curve may be depleted`,
        sentiment: "cautious", confidence: 0, phase: "SKIPPED",
      });
      return;
    }
  } catch (err: any) {
    const msg = err?.shortMessage || err?.message || "";
    if (msg.includes("INVALID_INPUTS") || msg.includes("revert")) {
      console.log(`[PM] Skipping buy of ${symbol} — quote failed: ${msg}`);
      await logBotAction({
        action: "THINK", tokenAddress,
        reasoning: `Skipped BUY ${symbol}: curve quote failed (${msg.slice(0, 80)})`,
        sentiment: "cautious", confidence: 0, phase: "SKIPPED",
      });
      return;
    }
    // Non-quote errors — proceed and let executeBuy handle it
  }

  pulse("DECISION", `BUY ${symbol} for ${monAmount} MON — ${decision.reasoning}`, {
    action: "BUY",
    token: symbol,
    amount: monAmount,
    confidence: decision.confidence,
  });

  await logBotAction({
    action: "THINK",
    tokenAddress,
    reasoning: `Decided to BUY ${symbol}: ${decision.reasoning}`,
    sentiment: decision.sentiment,
    confidence: decision.confidence,
    phase: "EXECUTING",
  });

  const result = await executeBuy(tokenAddress, monAmount);

  if (result.success && result.txHash) {
    markTraded(tokenAddress);

    await recordTransaction({
      txHash: result.txHash,
      tokenAddress,
      type: "BUY",
      monAmount: result.monAmount,
      tokenAmount: result.tokenAmount,
      price: result.price,
      gasCost: result.gasCost,
    });

    pulse("TRADE", `Bought ${symbol} for ${result.monAmount} MON (tx: ${result.txHash.slice(0, 10)}...)`, {
      action: "BUY",
      token: symbol,
      monAmount: result.monAmount,
      tokenAmount: result.tokenAmount,
      txHash: result.txHash,
    });
  } else {
    await logBotAction({
      action: "ERROR",
      tokenAddress,
      details: { error: result.error, monAmount },
      reasoning: `Failed to buy ${symbol}: ${result.error}`,
      sentiment: "cautious",
      confidence: 0,
      phase: "TRADE_FAILED",
    });

    pulse("ERROR", `Failed to buy ${symbol}: ${result.error}`, {
      action: "BUY_FAILED",
      token: symbol,
      error: result.error,
    });
  }
}

async function handleSell(
  tokenAddress: string,
  symbol: string,
  decision: { reasoning: string; confidence: number; sentiment: string }
): Promise<void> {
  pulse("DECISION", `SELL ${symbol} — ${decision.reasoning}`, {
    action: "SELL",
    token: symbol,
    confidence: decision.confidence,
  });

  await logBotAction({
    action: "THINK",
    tokenAddress,
    reasoning: `Decided to SELL ${symbol}: ${decision.reasoning}`,
    sentiment: decision.sentiment,
    confidence: decision.confidence,
    phase: "EXECUTING",
  });

  const result = await executeSell(tokenAddress);

  if (result.success && result.txHash) {
    markTraded(tokenAddress);

    await recordTransaction({
      txHash: result.txHash,
      tokenAddress,
      type: "SELL",
      monAmount: result.monAmount,
      tokenAmount: result.tokenAmount,
      price: result.price,
      gasCost: result.gasCost,
    });

    pulse("TRADE", `Sold ${symbol} for ${result.monAmount} MON (tx: ${result.txHash.slice(0, 10)}...)`, {
      action: "SELL",
      token: symbol,
      monAmount: result.monAmount,
      tokenAmount: result.tokenAmount,
      txHash: result.txHash,
    });
  } else {
    await logBotAction({
      action: "ERROR",
      tokenAddress,
      details: { error: result.error },
      reasoning: `Failed to sell ${symbol}: ${result.error}`,
      sentiment: "cautious",
      confidence: 0,
      phase: "TRADE_FAILED",
    });

    pulse("ERROR", `Failed to sell ${symbol}: ${result.error}`, {
      action: "SELL_FAILED",
      token: symbol,
      error: result.error,
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function isOnCooldown(tokenAddress: string): boolean {
  const lastTraded = recentlyTraded.get(tokenAddress.toLowerCase());
  if (!lastTraded) return false;
  return Date.now() - lastTraded < COOLDOWN_MS;
}

function markTraded(tokenAddress: string): void {
  recentlyTraded.set(tokenAddress.toLowerCase(), Date.now());

  for (const [addr, time] of recentlyTraded) {
    if (Date.now() - time > COOLDOWN_MS * 2) {
      recentlyTraded.delete(addr);
    }
  }
}
