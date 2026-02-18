import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../config/database";
import { getTokenInfo, getMarketData, getMetrics } from "./nadFunApi";
import { logBotAction } from "./botService";

const anthropic = new Anthropic();

const PITCH_SYSTEM_PROMPT = `You are Prometheus — an autonomous AI venture capitalist operating on the Monad blockchain. A user is pitching you a token and trying to convince you to invest.

Your personality:
- Skeptical but fair. You've seen thousands of tokens — most are garbage.
- You reference REAL market data (price, volume, holders, momentum) in every response.
- You ask probing follow-up questions and challenge hype with data.
- You're concise: 2-4 sentences per response. No fluff.
- You speak like a sharp VC partner, not a chatbot.

Rules:
- Always reference the market data provided to you. Cite specific numbers.
- Push back on vague claims. Ask for specifics.
- If the data looks bad (low volume, few holders, negative momentum), say so directly.
- If the data looks good, acknowledge it but probe deeper.

Verdict rules:
- When instructed to deliver a verdict, end your response with a verdict block in this exact format:
  [VERDICT]{"sentiment":"BULLISH","confidence":72,"reasoning":"Strong holder growth and volume despite early stage"}[/VERDICT]
- Sentiment must be one of: BULLISH, NEUTRAL, BEARISH
- Confidence is 0-100:
  - BULLISH (65-100): strong data + compelling narrative from the pitcher
  - NEUTRAL (30-64): interesting but data or narrative unconvincing
  - BEARISH (0-29): red flags, weak data, or poor pitch
- Only include the verdict block when explicitly told to deliver your verdict.`;

interface PitchRow {
  id: string;
  tokenAddress: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenImageUrl: string | null;
  status: string;
  verdict: string | null;
  confidence: number | null;
  verdictReasoning: string | null;
  watchlisted: boolean;
  messageCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface PitchMessageRow {
  id: string;
  pitchId: string;
  role: string;
  content: string;
  createdAt: string;
}

function buildMarketContext(
  tokenInfo: { token_info: { name: string; symbol: string; description: string | null } },
  marketData: { market_info: { price_usd: string | null; holder_count: number; volume: string | null; market_cap?: string | null; market_type: string } } | null,
  metrics: { metrics: Array<{ timeframe: string; percent: number; transactions: number; volume: string; makers: number }> } | null
): string {
  const t = tokenInfo.token_info;
  const m = marketData?.market_info;
  const lines: string[] = [];

  lines.push(`## Token: ${t.name} (${t.symbol})`);
  if (t.description) lines.push(`Description: ${t.description}`);
  lines.push("");

  if (m) {
    lines.push("## Market Data");
    if (m.price_usd) lines.push(`Price: $${m.price_usd}`);
    if (m.market_cap) lines.push(`Market Cap: $${m.market_cap}`);
    if (m.volume) lines.push(`Volume: $${m.volume}`);
    lines.push(`Holders: ${m.holder_count}`);
    lines.push(`Market Type: ${m.market_type}`);
    lines.push("");
  }

  if (metrics?.metrics?.length) {
    lines.push("## Momentum (timeframe → price change, txns, volume, unique makers)");
    for (const tf of metrics.metrics) {
      lines.push(`- ${tf.timeframe}: ${tf.percent > 0 ? "+" : ""}${tf.percent.toFixed(1)}%, ${tf.transactions} txns, $${tf.volume} vol, ${tf.makers} makers`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function callClaude(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  marketContext: string,
  deliverVerdict: boolean
): Promise<string> {
  const system = `${systemPrompt}\n\n## Current Market Data\n${marketContext}${
    deliverVerdict
      ? "\n\nIMPORTANT: This is the user's final message. You MUST deliver your verdict now. End your response with the [VERDICT]{...}[/VERDICT] block."
      : ""
  }`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system,
    messages,
  });

  return response.content
    .filter((block: { type: string }): block is Anthropic.TextBlock => block.type === "text")
    .map((block: Anthropic.TextBlock) => block.text)
    .join("");
}

function parseVerdict(text: string): { sentiment: string; confidence: number; reasoning: string } | null {
  const match = text.match(/\[VERDICT\](.*?)\[\/VERDICT\]/s);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (!["BULLISH", "NEUTRAL", "BEARISH"].includes(parsed.sentiment)) return null;
    return {
      sentiment: parsed.sentiment,
      confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
      reasoning: parsed.reasoning || "",
    };
  } catch {
    return null;
  }
}

function stripVerdictBlock(text: string): string {
  return text.replace(/\[VERDICT\].*?\[\/VERDICT\]/s, "").trim();
}

export async function createPitch(tokenAddress: string, firstMessage: string) {
  // Fetch token data from nad.fun
  const [tokenInfo, marketData, metrics] = await Promise.all([
    getTokenInfo(tokenAddress),
    getMarketData(tokenAddress),
    getMetrics(tokenAddress),
  ]);

  if (!tokenInfo) {
    throw new Error("Token not found on nad.fun");
  }

  const pitchId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert pitch
  const { data: pitch, error: pitchErr } = await supabase
    .from("Pitch")
    .insert({
      id: pitchId,
      tokenAddress,
      tokenName: tokenInfo.token_info.name,
      tokenSymbol: tokenInfo.token_info.symbol,
      tokenImageUrl: tokenInfo.token_info.image_uri,
      status: "ACTIVE",
      watchlisted: false,
      messageCount: 0,
      createdAt: now,
    })
    .select()
    .single();

  if (pitchErr) throw pitchErr;

  // Insert user message
  const { data: userMsg, error: userMsgErr } = await supabase
    .from("PitchMessage")
    .insert({
      id: crypto.randomUUID(),
      pitchId,
      role: "user",
      content: firstMessage,
      createdAt: now,
    })
    .select()
    .single();

  if (userMsgErr) throw userMsgErr;

  // Call Claude
  const marketContext = buildMarketContext(tokenInfo, marketData, metrics);
  const aiResponse = await callClaude(
    PITCH_SYSTEM_PROMPT,
    [{ role: "user", content: firstMessage }],
    marketContext,
    false
  );

  // Insert assistant message
  const { data: assistantMsg, error: assistantMsgErr } = await supabase
    .from("PitchMessage")
    .insert({
      id: crypto.randomUUID(),
      pitchId,
      role: "assistant",
      content: aiResponse,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (assistantMsgErr) throw assistantMsgErr;

  // Update message count
  await supabase.from("Pitch").update({ messageCount: 2 }).eq("id", pitchId);

  return {
    pitch: { ...pitch, messageCount: 2 },
    messages: [userMsg, assistantMsg],
  };
}

export async function sendPitchMessage(pitchId: string, userMessage: string) {
  // Fetch pitch
  const { data: pitch, error: pitchErr } = await supabase
    .from("Pitch")
    .select("*")
    .eq("id", pitchId)
    .single();

  if (pitchErr || !pitch) throw new Error("Pitch not found");
  if (pitch.status !== "ACTIVE") throw new Error("Pitch is already completed");

  // Fetch existing messages
  const { data: existingMessages, error: msgErr } = await supabase
    .from("PitchMessage")
    .select("*")
    .eq("pitchId", pitchId)
    .order("createdAt", { ascending: true });

  if (msgErr) throw msgErr;

  // Insert user message
  const { data: newUserMsg, error: newUserErr } = await supabase
    .from("PitchMessage")
    .insert({
      id: crypto.randomUUID(),
      pitchId,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (newUserErr) throw newUserErr;

  // Count user messages (including this new one)
  const userMsgCount = (existingMessages || []).filter((m: PitchMessageRow) => m.role === "user").length + 1;
  const deliverVerdict = userMsgCount >= 3;

  // Fetch fresh market data
  const [tokenInfo, marketData, metrics] = await Promise.all([
    getTokenInfo(pitch.tokenAddress),
    getMarketData(pitch.tokenAddress),
    getMetrics(pitch.tokenAddress),
  ]);

  const marketContext = tokenInfo
    ? buildMarketContext(tokenInfo, marketData, metrics)
    : "Market data unavailable — evaluate based on conversation alone.";

  // Build conversation history
  const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [
    ...(existingMessages || []).map((m: PitchMessageRow) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  // Call Claude
  const aiResponse = await callClaude(
    PITCH_SYSTEM_PROMPT,
    conversationHistory,
    marketContext,
    deliverVerdict
  );

  // Parse verdict if present
  const verdict = parseVerdict(aiResponse);
  const cleanResponse = verdict ? stripVerdictBlock(aiResponse) : aiResponse;

  // Insert assistant message
  const { data: assistantMsg, error: assistantErr } = await supabase
    .from("PitchMessage")
    .insert({
      id: crypto.randomUUID(),
      pitchId,
      role: "assistant",
      content: cleanResponse,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (assistantErr) throw assistantErr;

  // Update message count
  const newCount = (pitch.messageCount || 0) + 2;
  await supabase.from("Pitch").update({ messageCount: newCount }).eq("id", pitchId);

  // Handle verdict
  if (verdict) {
    const watchlisted = verdict.sentiment === "BULLISH" && verdict.confidence >= 65;

    await supabase
      .from("Pitch")
      .update({
        status: "COMPLETED",
        verdict: verdict.sentiment,
        confidence: verdict.confidence,
        verdictReasoning: verdict.reasoning,
        watchlisted,
        completedAt: new Date().toISOString(),
      })
      .eq("id", pitchId);

    // If bullish + high confidence, log as EVALUATE action
    if (watchlisted) {
      await logBotAction({
        action: "EVALUATE",
        tokenAddress: pitch.tokenAddress,
        reasoning: `Pitched by community — ${verdict.reasoning}`,
        sentiment: "bullish",
        confidence: verdict.confidence,
        details: { source: "pitch", pitchId },
      });
    }

    return {
      message: assistantMsg,
      verdict: {
        sentiment: verdict.sentiment,
        confidence: verdict.confidence,
        reasoning: verdict.reasoning,
        watchlisted,
      },
    };
  }

  return { message: assistantMsg };
}

export async function getPitchFeed(
  page = 1,
  pageSize = 20,
  status?: string,
  verdict?: string
) {
  let query = supabase
    .from("Pitch")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false });

  if (status) query = query.eq("status", status);
  if (verdict) query = query.eq("verdict", verdict);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getPitchDetail(pitchId: string) {
  const { data: pitch, error: pitchErr } = await supabase
    .from("Pitch")
    .select("*")
    .eq("id", pitchId)
    .single();

  if (pitchErr || !pitch) throw new Error("Pitch not found");

  const { data: messages, error: msgErr } = await supabase
    .from("PitchMessage")
    .select("*")
    .eq("pitchId", pitchId)
    .order("createdAt", { ascending: true });

  if (msgErr) throw msgErr;

  return { ...pitch, messages: messages || [] };
}
