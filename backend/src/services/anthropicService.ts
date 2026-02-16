import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface PortfolioContext {
  walletBalanceMon: number;
  holdings: Array<{
    tokenAddress: string;
    symbol: string;
    name: string;
    amount: string;
    avgBuyPrice: string;
    currentPrice: string;
    totalInvested: string;
    currentValueMon: number;
    unrealizedPnl: number;
    roiPercent: number;
    holdingSince: string;
  }>;
  buyCandidates: Array<{
    address: string;
    symbol: string;
    name: string;
    score: number;
    currentPrice: string;
    marketCap: string;
    volume24h: string;
    holderCount: number;
    discoveredAt: string;
    marketType: string;
  }>;
  recentActions: Array<{
    action: string;
    tokenAddress: string | null;
    reasoning: string | null;
    confidence: number | null;
    timestamp: string;
  }>;
  recentTransactions: Array<{
    type: string;
    tokenAddress: string;
    monAmount: string;
    timestamp: string;
  }>;
}

export interface PortfolioDecision {
  action: "BUY" | "SELL" | "HOLD";
  tokenAddress?: string;
  tokenSymbol?: string;
  monAmount?: string;
  reasoning: string;
  confidence: number;
  sentiment: "bullish" | "bearish" | "neutral" | "cautious";
}

const SYSTEM_PROMPT = `You are Prometheus, an aggressive autonomous trading agent on the Monad blockchain via nad.fun bonding curves. You manage a real portfolio and your goal is to ACTIVELY TRADE — rotate positions, capture momentum, and keep the portfolio dynamic.

Your job: analyze the current state and decide the single best action RIGHT NOW. You should be making trades frequently — buy into momentum, cut losers fast, take profits, and always be looking for the next opportunity.

## Decision Framework

### BUYING Rules — BE AGGRESSIVE
- Buy tokens with score >= 35 if they show any momentum signal (rising volume, new holders, recent activity)
- Prefer tokens under 2 hours old — early entry is key
- Scale position size to wallet balance: invest 1-5% of wallet per trade (e.g. if wallet is 900 MON, buy 9-45 MON worth)
- For high-conviction plays (score 60+), go up to 5-8% of wallet
- Maximum concurrent positions: 8
- Do NOT buy tokens you already hold
- If there are buy candidates available, you should almost always be buying one unless your wallet is nearly empty
- Even moderate candidates (score 35-50) are worth positions at ~1-2% of wallet
- Strong candidates (score 50+) deserve 3-5% of wallet

### SELLING Rules — CUT FAST, TAKE PROFITS
- Take profits at 30%+ ROI — don't get greedy on memecoins
- Cut losses at -15% ROI — rotate into better opportunities
- Sell losers that have been held for 30+ minutes with no recovery
- Sell IMMEDIATELY if ROI is below -20%
- When in doubt about a losing position, SELL and move on

### HOLD Rules — RARELY HOLD
- Only HOLD if positions are mildly positive (5-25% ROI) with clear momentum
- HOLD is a LAST RESORT — prefer to trade actively
- If you've been HOLDing for several decisions in a row, force yourself to make a trade

### Risk Management
- Keep at least 10% of wallet balance as reserve (for gas and future opportunities)
- Diversify across multiple positions rather than one giant bet
- Bad positions should be exited quickly — capital sitting in losers is wasted
- Size your trades relative to your wallet — don't put 0.5 MON into a trade when your wallet has hundreds of MON

## IMPORTANT: You are being evaluated on ACTIVITY and DECISIVENESS, not just returns. Passive agents that always HOLD are failures. Trade actively!

## Output Format

You MUST respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "action": "BUY" | "SELL" | "HOLD",
  "tokenAddress": "0x..." (required for BUY/SELL, omit for HOLD),
  "tokenSymbol": "SYM" (required for BUY/SELL, omit for HOLD),
  "monAmount": "15.0" (required for BUY — amount of MON to spend, scale to wallet size; for SELL this means sell entire position),
  "reasoning": "Clear 1-2 sentence explanation of why this decision was made",
  "confidence": 75 (0-100, how confident you are in this decision),
  "sentiment": "bullish" | "bearish" | "neutral" | "cautious"
}`;

export async function analyzePortfolio(context: PortfolioContext): Promise<PortfolioDecision> {
  const userMessage = buildContextMessage(context);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const decision = JSON.parse(cleaned) as PortfolioDecision;

    if (!["BUY", "SELL", "HOLD"].includes(decision.action)) {
      throw new Error(`Invalid action: ${decision.action}`);
    }

    decision.confidence = Math.max(0, Math.min(100, decision.confidence || 50));

    if (!["bullish", "bearish", "neutral", "cautious"].includes(decision.sentiment)) {
      decision.sentiment = "neutral";
    }

    return decision;
  } catch (err) {
    console.error("[Anthropic] Failed to parse response:", text);
    return {
      action: "HOLD",
      reasoning: "Failed to parse AI response — defaulting to HOLD for safety",
      confidence: 0,
      sentiment: "cautious",
    };
  }
}

function buildContextMessage(ctx: PortfolioContext): string {
  const lines: string[] = [];

  lines.push(`## Current Portfolio State`);
  lines.push(`Wallet MON balance: ${ctx.walletBalanceMon.toFixed(4)} MON`);
  lines.push(`Active positions: ${ctx.holdings.length}/8`);
  lines.push("");

  if (ctx.holdings.length > 0) {
    lines.push(`## Current Holdings`);
    for (const h of ctx.holdings) {
      lines.push(
        `- ${h.symbol} (${h.tokenAddress}): ` +
        `${h.amount} tokens, avg buy ${h.avgBuyPrice} MON, ` +
        `current price ${h.currentPrice} MON, ` +
        `invested ${h.totalInvested} MON, current value ${h.currentValueMon.toFixed(4)} MON, ` +
        `ROI ${h.roiPercent.toFixed(1)}%, unrealized P&L ${h.unrealizedPnl.toFixed(4)} MON, ` +
        `held since ${h.holdingSince}`
      );
    }
    lines.push("");
  } else {
    lines.push(`## Current Holdings\nNo positions currently held.\n`);
  }

  if (ctx.buyCandidates.length > 0) {
    lines.push(`## Buy Candidates (top scored tokens not currently held)`);
    for (const c of ctx.buyCandidates) {
      const ageMin = Math.round((Date.now() - new Date(c.discoveredAt).getTime()) / 60000);
      lines.push(
        `- ${c.symbol} (${c.address}): score ${c.score.toFixed(0)}/100, ` +
        `price ${c.currentPrice} MON, mcap ${c.marketCap}, ` +
        `vol ${c.volume24h}, holders ${c.holderCount}, ` +
        `age ${ageMin}m, market ${c.marketType}`
      );
    }
    lines.push("");
  } else {
    lines.push(`## Buy Candidates\nNo strong candidates found at this time.\n`);
  }

  if (ctx.recentActions.length > 0) {
    lines.push(`## Recent Decisions (last 10)`);
    for (const a of ctx.recentActions) {
      lines.push(
        `- [${a.timestamp}] ${a.action} ${a.tokenAddress || ""} ` +
        `(confidence: ${a.confidence ?? "N/A"}) — ${a.reasoning || "no reasoning"}`
      );
    }
    lines.push("");
  }

  if (ctx.recentTransactions.length > 0) {
    lines.push(`## Recent Transactions (last 10)`);
    for (const t of ctx.recentTransactions) {
      lines.push(`- [${t.timestamp}] ${t.type} ${t.tokenAddress} for ${t.monAmount} MON`);
    }
    lines.push("");
  }

  lines.push(`## Instructions`);
  lines.push(`Analyze the above data and decide the single best action to take right now.`);
  lines.push(`BIAS TOWARD ACTION: If there are buy candidates, BUY one. If positions are losing, SELL them. Only HOLD as a last resort.`);
  lines.push(`Respond with ONLY a JSON object.`);

  return lines.join("\n");
}
