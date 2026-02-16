"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, Eye, Zap, TrendingUp, Camera, Award, Brain, Radio } from "lucide-react";
import { useSSE } from "@/hooks/useSSE";
import { api } from "@/lib/api";
import type { PulseMessage } from "@/types";

const CATEGORY_CONFIG: Record<string, { icon: typeof Activity; color: string; glow: string; label: string }> = {
  SCAN:     { icon: Eye,        color: "text-cyan-400",     glow: "bg-cyan-400",     label: "SCAN" },
  STREAM:   { icon: Activity,   color: "text-emerald-400",  glow: "bg-emerald-400",  label: "STREAM" },
  DISCOVER: { icon: Zap,        color: "text-torch-gold",   glow: "bg-torch-gold",   label: "DISCOVER" },
  PRICE:    { icon: TrendingUp, color: "text-violet-400",   glow: "bg-violet-400",   label: "PRICE" },
  SNAPSHOT: { icon: Camera,     color: "text-sky-400",      glow: "bg-sky-400",      label: "SNAPSHOT" },
  GRADUATE: { icon: Award,      color: "text-amber-400",    glow: "bg-amber-400",    label: "GRADUATE" },
  EVALUATE: { icon: Brain,      color: "text-orange-400",   glow: "bg-orange-400",   label: "EVALUATE" },
};

const DEFAULT_CONFIG = { icon: Radio, color: "text-stone", glow: "bg-stone", label: "SYS" };

const MAX_LINES = 30;

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function NeuralCortex() {
  const [lines, setLines] = useState<PulseMessage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSeedRef = useRef(false);

  // Seed with recent pulse history (newest first)
  useEffect(() => {
    if (hasSeedRef.current) return;
    hasSeedRef.current = true;
    api.getPulse().then((data) => {
      if (data?.length) {
        setLines(data.slice(-MAX_LINES).reverse());
        setTotalCount(data.length);
      }
    }).catch(() => {});
  }, []);

  // Subscribe to live pulse events via shared SSE (prepend newest)
  const onSSEMessage = useCallback((data: unknown) => {
    const msg = data as { type?: string } & PulseMessage;
    if (msg.type !== "PULSE" || !msg.id) return;
    setLines((prev) => [msg, ...prev].slice(0, MAX_LINES));
    setTotalCount((c) => c + 1);
  }, []);
  const { connected } = useSSE(onSSEMessage);

  // Update relative timestamps every 10s
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative bg-obsidian border border-ash/40 rounded-xl overflow-hidden flex flex-col h-[200px]">
      {/* Top gradient bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-torch-gold/40 to-transparent cortex-shimmer" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-ash/30 bg-charcoal/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-3 h-3 text-torch-gold" />
          <span className="text-[9px] text-stone uppercase tracking-[0.2em] font-[var(--font-mono)]">
            Neural Cortex
          </span>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <span className="text-[8px] text-stone/50 font-[var(--font-mono)]">
              {totalCount}
            </span>
          )}
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 heartbeat" : "bg-stone/40"}`} />
            <span className={`text-[8px] font-[var(--font-mono)] font-semibold ${connected ? "text-emerald-400" : "text-stone/40"}`}>
              {connected ? "SYNCED" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Pulse feed — fixed height, newest first */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-2 py-1 font-[var(--font-mono)] text-[10px]">
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[9px] text-stone/30">Awaiting neural signals...</p>
          </div>
        ) : (
          <div className="space-y-[1px]">
            {lines.map((pulse) => {
              const cfg = CATEGORY_CONFIG[pulse.category] || DEFAULT_CONFIG;
              const Icon = cfg.icon;
              return (
                <div
                  key={pulse.id}
                  className="flex items-center gap-1.5 py-[2px] px-1 rounded hover:bg-ash/5 transition-colors"
                >
                  {/* Time */}
                  <span className="text-[8px] text-stone/40 shrink-0 w-[52px] tabular-nums">
                    {formatTime(pulse.timestamp)}
                  </span>

                  {/* Category icon */}
                  <Icon className={`w-2.5 h-2.5 shrink-0 ${cfg.color} opacity-60`} />

                  {/* Category label */}
                  <span className={`text-[7px] uppercase tracking-wider w-[40px] shrink-0 ${cfg.color} opacity-50`}>
                    {cfg.label}
                  </span>

                  {/* Message */}
                  <span className="text-ivory/60 truncate flex-1 min-w-0">{pulse.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category legend */}
      <div className="flex items-center gap-2.5 px-3 py-1 border-t border-ash/20 bg-charcoal/30 shrink-0">
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-0.5 shrink-0">
            <span className={`w-1 h-1 rounded-full ${cfg.glow} opacity-40`} />
            <span className="text-[6px] text-stone/30 uppercase tracking-wider">{cfg.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
