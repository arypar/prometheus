"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useActivity } from "@/hooks/useData";
import { useSSE } from "@/hooks/useSSE";
import type { BotAction } from "@/types";

const MAX_LINES = 30;

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function actionTag(action: string): { label: string; color: string; bg: string } {
  switch (action) {
    case "BUY":
      return { label: "BUY", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" };
    case "SELL":
      return { label: "SELL", color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/30" };
    case "THINK":
      return { label: "THINK", color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/30" };
    case "EVALUATE":
      return { label: "EVAL", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" };
    case "SCAN":
      return { label: "SCAN", color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/30" };
    case "ERROR":
      return { label: "ERR", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" };
    case "SKIP":
      return { label: "SKIP", color: "text-stone", bg: "bg-stone/10 border-stone/30" };
    default:
      return { label: action.slice(0, 4), color: "text-stone", bg: "bg-stone/10 border-stone/30" };
  }
}

function formatMessage(action: BotAction): string {
  const symbol = action.token?.symbol;
  const reasoning = action.reasoning;

  switch (action.action) {
    case "BUY": {
      const mon = action.details?.monAmount as string | undefined;
      return `${symbol || "???"} — ${mon ? mon + " MON" : ""}${reasoning ? " · " + reasoning : ""}`;
    }
    case "SELL": {
      const mon = action.details?.monAmount as string | undefined;
      const monStr = mon ? parseFloat(mon).toFixed(2) + " MON" : "";
      return `${symbol || "???"} — ${monStr}${reasoning ? " · " + reasoning : ""}`;
    }
    case "THINK":
      return reasoning || "Processing...";
    case "EVALUATE":
      return `${symbol ? symbol + " " : ""}${action.confidence != null ? `[${Math.round(action.confidence)}/100]` : ""} ${reasoning || ""}`.trim();
    case "ERROR":
      return reasoning || "Error encountered";
    default:
      return reasoning || action.action;
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
      setLines(seedData.data.slice(0, MAX_LINES));
    }
  }, [seedData]);

  const onSSEMessage = useCallback((data: unknown) => {
    const event = data as Record<string, unknown>;
    if (event.type === "PULSE" || event.type === "connected") return;
    const action = event as unknown as BotAction;
    if (action.id && action.action) {
      setLines((prev) => [action, ...prev].slice(0, MAX_LINES));
    }
  }, []);
  useSSE(onSSEMessage);

  const actionsPerHour = useMemo(() => {
    const oneHourAgo = Date.now() - 3600000;
    return lines.filter((l) => new Date(l.timestamp).getTime() >= oneHourAgo).length;
  }, [lines]);

  return (
    <div className="relative bg-obsidian border border-ash/50 rounded-xl overflow-hidden terminal-glow flex flex-col h-[340px]">
      {/* Watermark */}
      <img
        src="/prometheus.png"
        alt=""
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-auto opacity-[0.03] select-none pointer-events-none"
        style={{ filter: "invert(1) sepia(1) saturate(0.3) hue-rotate(10deg)" }}
        draggable={false}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 border-b border-ash/50 bg-charcoal/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-prometheus-red/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-ember/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-torch-gold/60" />
          </div>
          <span className="text-[10px] text-stone uppercase tracking-widest font-[var(--font-mono)]">
            Neural Log
          </span>
        </div>
        <div className="flex items-center gap-3">
          {actionsPerHour > 0 && (
            <span className="text-[9px] text-stone/60 font-[var(--font-mono)]">
              {actionsPerHour}/hr
            </span>
          )}
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-torch-gold heartbeat" />
            <span className="text-[9px] text-torch-gold font-[var(--font-mono)] font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      {/* Body — newest first, fixed height, scrollable */}
      <div ref={scrollRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto px-2 py-1.5 font-[var(--font-mono)] text-[11px]">
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="terminal-blink text-torch-gold text-sm">_</span>
              <p className="text-[10px] text-stone/30 mt-1">Awaiting neural link...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-[2px]">
            {lines.map((action) => {
              const tag = actionTag(action.action);
              const msg = formatMessage(action);
              const isTrade = action.action === "BUY" || action.action === "SELL";

              return (
                <div
                  key={action.id}
                  className={`flex items-center gap-1.5 py-[3px] px-1.5 rounded group transition-colors ${
                    isTrade ? "bg-ash/10" : "hover:bg-ash/5"
                  }`}
                >
                  {/* Time */}
                  <span className="text-[9px] text-stone/50 shrink-0 w-[52px] tabular-nums">
                    {formatTime(action.timestamp)}
                  </span>

                  {/* Action tag */}
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-[1px] rounded border shrink-0 ${tag.bg} ${tag.color}`}>
                    {tag.label}
                  </span>

                  {/* Message */}
                  <span className={`truncate flex-1 min-w-0 ${isTrade ? tag.color + " font-semibold" : "text-ivory/70"}`}>
                    {msg}
                  </span>

                  {/* Confidence pip */}
                  {action.confidence != null && action.action !== "EVALUATE" && (
                    <span className="text-[8px] text-stone/40 shrink-0">{Math.round(action.confidence)}%</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
