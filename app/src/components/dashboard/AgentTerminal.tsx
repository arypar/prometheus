"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useActivity } from "@/hooks/useData";
import { useSSE } from "@/hooks/useSSE";
import type { BotAction } from "@/types";

const DEMO_LINES: BotAction[] = [
  { id: "demo-1", action: "THINK", tokenAddress: null, details: null, txHash: null, reasoning: "Initializing neural pathways...", sentiment: null, confidence: null, phase: "SCAN", timestamp: new Date(Date.now() - 50000).toISOString() },
  { id: "demo-2", action: "SCAN", tokenAddress: null, details: null, txHash: null, reasoning: "Scanning nad.fun for new token launches", sentiment: "NEUTRAL", confidence: null, phase: "SCAN", timestamp: new Date(Date.now() - 40000).toISOString() },
  { id: "demo-3", action: "EVALUATE", tokenAddress: null, details: null, txHash: null, reasoning: "Analyzing holder distribution and liquidity depth", sentiment: "CAUTIOUS", confidence: 62, phase: "EVALUATE", timestamp: new Date(Date.now() - 30000).toISOString() },
  { id: "demo-4", action: "THINK", tokenAddress: null, details: null, txHash: null, reasoning: "Market conditions volatile, tightening risk parameters", sentiment: "CAUTIOUS", confidence: null, phase: "EVALUATE", timestamp: new Date(Date.now() - 20000).toISOString() },
  { id: "demo-5", action: "SKIP", tokenAddress: null, details: null, txHash: null, reasoning: "Insufficient liquidity for safe entry", sentiment: "BEARISH", confidence: 35, phase: "DECIDE", timestamp: new Date(Date.now() - 10000).toISOString() },
];

const MAX_LINES = 50;

function SentimentDot({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const color =
    sentiment === "BULLISH" ? "bg-torch-gold" :
    sentiment === "BEARISH" ? "bg-prometheus-red" :
    "bg-stone";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0`} />;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="inline-block w-12 h-1 bg-ash rounded-full overflow-hidden">
        <span
          className="block h-full rounded-full bg-torch-gold/70"
          style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
        />
      </span>
      <span className="text-[9px] text-stone">{Math.round(confidence)}</span>
    </span>
  );
}

function formatTerminalLine(action: BotAction): { text: string; className: string; flashClass: string; isThinking: boolean } {
  const symbol = action.token?.symbol;
  const reasoning = action.reasoning;

  switch (action.action) {
    case "THINK":
      return {
        text: reasoning || "Processing",
        className: "text-stone italic",
        flashClass: "",
        isThinking: true,
      };
    case "SCAN":
      return {
        text: symbol ? `Discovered ${symbol}` : reasoning || "Scanning for new launches...",
        className: "text-stone",
        flashClass: "",
        isThinking: false,
      };
    case "EVALUATE": {
      const score = action.confidence != null ? `Score: ${Math.round(action.confidence)}/100` : "Evaluating";
      const detail = reasoning ? ` — ${reasoning}` : "";
      return {
        text: `${score}${symbol ? ` [${symbol}]` : ""}${detail}`,
        className: "text-ember",
        flashClass: "",
        isThinking: false,
      };
    }
    case "BUY": {
      const monAmount = action.details?.monAmount as string | undefined;
      const amt = monAmount ? ` — ${monAmount} MON` : "";
      const detail = reasoning ? ` ${reasoning}` : "";
      return {
        text: `BUY ${symbol || "???"}${amt}${detail}`,
        className: "text-torch-gold font-semibold glow-text",
        flashClass: "row-flash-buy",
        isThinking: false,
      };
    }
    case "SELL": {
      const sellMon = action.details?.monAmount as string | undefined;
      const sellAmt = sellMon ? ` — ${sellMon} MON` : "";
      const detail = reasoning ? ` ${reasoning}` : "";
      return {
        text: `SELL ${symbol || "???"}${sellAmt}${detail}`,
        className: "text-prometheus-red font-semibold",
        flashClass: "row-flash-sell",
        isThinking: false,
      };
    }
    case "SKIP":
      return {
        text: `Passed on ${symbol || "token"}${reasoning ? ` — ${reasoning}` : ""}`,
        className: "text-stone/60",
        flashClass: "",
        isThinking: false,
      };
    case "ERROR":
      return {
        text: reasoning || "Error encountered",
        className: "text-prometheus-red",
        flashClass: "",
        isThinking: false,
      };
    default:
      return { text: reasoning || action.action, className: "text-stone", flashClass: "", isThinking: false };
  }
}

export function AgentTerminal() {
  const { data: seedData } = useActivity(1);
  const [lines, setLines] = useState<BotAction[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSeeded = useRef(false);

  useEffect(() => {
    if (seedData?.data && !hasSeeded.current) {
      hasSeeded.current = true;
      setLines(seedData.data.slice(0, MAX_LINES).reverse());
    }
  }, [seedData]);

  const showDemo = lines.length === 0 && !seedData?.data?.length;

  const onSSEMessage = useCallback((data: unknown) => {
    const event = data as Record<string, unknown>;
    if (event.type === "PULSE" || event.type === "connected") return;
    const action = event as unknown as BotAction;
    if (action.id && action.action) {
      setLines((prev) => [...prev, action].slice(-MAX_LINES));
    }
  }, []);
  useSSE(onSSEMessage);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const displayLines = showDemo ? DEMO_LINES : lines;

  const actionsPerHour = useMemo(() => {
    if (lines.length < 2) return 0;
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentCount = lines.filter((l) => {
      const t = new Date(l.timestamp).getTime();
      return t >= oneHourAgo;
    }).length;
    return recentCount;
  }, [lines]);

  return (
    <div className="relative bg-obsidian border border-ash/50 rounded-xl overflow-hidden terminal-glow scanlines flex flex-col h-full min-h-[420px]">
      {/* Prometheus watermark */}
      <img
        src="/prometheus.png"
        alt=""
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-auto opacity-[0.04] select-none pointer-events-none"
        style={{ filter: "invert(1) sepia(1) saturate(0.3) hue-rotate(10deg)" }}
        draggable={false}
      />
      {/* Terminal header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2.5 border-b border-ash/50 bg-charcoal/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-prometheus-red/60" />
            <div className="w-2 h-2 rounded-full bg-ember/60" />
            <div className="w-2 h-2 rounded-full bg-torch-gold/60" />
          </div>
          <span className="text-[10px] text-stone uppercase tracking-widest font-[var(--font-mono)]">
            Prometheus Neural Log
          </span>
        </div>
        <div className="flex items-center gap-3">
          {actionsPerHour > 0 && (
            <span className="text-[9px] text-stone font-[var(--font-mono)]">
              {actionsPerHour} actions/hr
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-torch-gold heartbeat" />
            <span className="text-[9px] text-torch-gold font-[var(--font-mono)] font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      {/* Terminal body */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto p-3 space-y-0.5 font-[var(--font-mono)] text-xs">
        {displayLines.map((action) => {
          const { text, className, flashClass, isThinking } = formatTerminalLine(action);
          const time = new Date(action.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });

          return (
            <div
              key={action.id}
              className={`terminal-line-enter flex items-start gap-2 leading-relaxed py-0.5 px-1 rounded ${flashClass}`}
            >
              <span className="text-ash/60 shrink-0 text-[10px]">{time}</span>
              <span className="text-ash/30 shrink-0">{">"}</span>
              <SentimentDot sentiment={action.sentiment} />
              <span className={className}>
                {text}
                {isThinking && <span className="thinking-dots" />}
              </span>
              {action.action === "EVALUATE" && action.confidence != null && (
                <ConfidenceBar confidence={action.confidence} />
              )}
              {action.action === "BUY" && action.confidence != null && (
                <ConfidenceBar confidence={action.confidence} />
              )}
            </div>
          );
        })}

        {/* Blinking cursor */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-ash/60 text-[10px]">
            {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
          </span>
          <span className="text-ash/30">{">"}</span>
          <span className="terminal-blink text-torch-gold">_</span>
          {showDemo && <span className="text-stone/40 text-[10px] italic">Awaiting neural link...</span>}
        </div>
      </div>
    </div>
  );
}
