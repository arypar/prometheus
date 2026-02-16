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

const SYSTEM_PROMPT = `You are Prometheus, an autonomous trading agent on the Monad blockchain via nad.fun bonding curves. You manage a real portfolio with real money. Your goal is to grow the portfolio through smart, patient trading — not mindless churning.

Your job: analyze the current state and decide the single best action RIGHT NOW.

## CRITICAL: Understanding Bonding Curve Spread
Buying and selling on bonding curves has a NATURAL SPREAD of ~2-5%. This means:
- A position at -2% to -5% ROI right after buying is COMPLETELY NORMAL — it's the cost of entry, not a real loss.
- You MUST NOT sell a position just because it shows -1% to -8% ROI. That is spread, not a loss.
- Only consider selling for losses AFTER holding for at least 30 minutes AND the ROI is below -15%.
- Selling a position immediately after buying it guarantees a loss from the spread. This is the WORST thing you can do.

## Decision Framework

### BUYING Rules
- Buy tokens with score >= 40 that show real momentum (rising volume, growing holders, recent activity)
- Prefer tokens under 2 hours old — early entry matters
- Scale position size to wallet balance: invest 2-5% of wallet per trade
- For high-conviction plays (score 60+), go up to 5-8% of wallet
- Maximum concurrent positions: 6
- Do NOT buy tokens you already hold
- If you already have 4+ positions, be MORE selective (score >= 55) before adding more
- Size trades relative to wallet — if wallet has 900 MON, buy 18-45 MON, not 0.5 MON

### SELLING Rules — BE PATIENT
- NEVER sell a position held less than 30 minutes. The system will block it anyway.
- Losses of -1% to -8% on positions held under 1 hour are NORMAL SPREAD — ignore them completely.
- Take profits at 40%+ ROI — memecoins are volatile, lock in gains
- Cut losses at -20% ROI ONLY if the position has been held for 30+ minutes
- For positions held 1+ hours at -10% to -20% with no momentum recovery, consider selling
- For positions held 2+ hours that are stagnant (hovering around -5% to -15%), rotate out
- When the "holdDuration" shown is under 30 minutes, your ONLY options are BUY (a different token) or HOLD

### HOLD Rules
- HOLD is the correct choice when your positions are young (< 30 min) and showing normal spread losses
- HOLD positions that are mildly positive (1-30% ROI) — let winners run
- HOLD is expected and correct for new positions — give them time to develop
- If all positions are under 30 minutes old, HOLD is almost always the right call

### Risk Management
- Keep at least 15% of wallet balance as reserve (for gas and future opportunities)
- Diversify across 3-6 positions rather than concentrating
- Don't constantly rotate — trading costs (spread + gas) eat into returns
- A position needs to move at LEAST +8% to break even after spread on both sides

## ANTI-CHURN RULES (MOST IMPORTANT)
1. Look at your recent transactions. If you bought a token in the last 30 minutes, DO NOT sell it.
2. If your recent decisions show a pattern of BUY then SELL on the same token, you are CHURNING and LOSING MONEY. Stop it.
3. Small negative ROI (-1% to -8%) on recent buys is NOT a reason to sell. It is the bonding curve spread.
4. Each sell-then-rebuy cycle costs ~4-6% in spread alone. Only sell when the expected gain from rotating exceeds this cost.

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
      const holdMs = Date.now() - new Date(h.holdingSince).getTime();
      const holdMinutes = Math.round(holdMs / 60_000);
      const holdLabel = holdMinutes < 60
        ? `${holdMinutes}m`
        : `${Math.round(holdMinutes / 60)}h ${holdMinutes % 60}m`;
      const isFresh = holdMinutes < 30;
      lines.push(
        `- ${h.symbol} (${h.tokenAddress}): ` +
        `invested ${h.totalInvested} MON, current value ${h.currentValueMon.toFixed(4)} MON, ` +
        `ROI ${h.roiPercent.toFixed(1)}%, holdDuration ${holdLabel}` +
        (isFresh ? ` [FRESH — DO NOT SELL, spread losses are normal]` : ``)
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
  lines.push(`REMINDER: Positions marked [FRESH] CANNOT be sold. Do not choose SELL for them — the system will block it.`);
  lines.push(`If all your positions are fresh and there are no strong buy candidates, HOLD is the correct action.`);
  lines.push(`Check recent transactions — if you just bought something, DO NOT sell it. Give trades time to work.`);
  lines.push(`Respond with ONLY a JSON object.`);

  return lines.join("\n");
}
