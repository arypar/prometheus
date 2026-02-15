"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { shortenAddress, timeAgo, formatMON, formatNumber } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/constants";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { BotAction } from "@/types";

const ACTION_COLORS: Record<string, string> = {
  BUY: "border-l-torch-gold",
  SELL: "border-l-prometheus-red",
  EVALUATE: "border-l-ember",
  SCAN: "border-l-stone/40",
  SKIP: "border-l-stone/30",
  ERROR: "border-l-prometheus-red",
  THINK: "border-l-stone/20",
};

const ACTION_VARIANT: Record<string, "buy" | "sell" | "warning" | "error" | "default"> = {
  BUY: "buy",
  SELL: "sell",
  EVALUATE: "warning",
  ERROR: "error",
  SCAN: "default",
  SKIP: "default",
  THINK: "default",
};

const SENTIMENT_COLORS: Record<string, string> = {
  BULLISH: "bg-torch-gold/10 text-torch-gold",
  NEUTRAL: "bg-stone/10 text-stone",
  BEARISH: "bg-prometheus-red/10 text-prometheus-red",
  CAUTIOUS: "bg-ember/10 text-ember",
};

interface DecisionCardProps {
  action: BotAction;
  isExpanded: boolean;
  onToggle: () => void;
}

function ConfidenceBar({ value, large }: { value: number; large?: boolean }) {
  const color = value >= 70 ? "bg-torch-gold" : value >= 40 ? "bg-ember" : "bg-prometheus-red";
  return (
    <div className="flex items-center gap-2">
      <div className={`${large ? "w-32 h-2" : "w-16 h-1.5"} bg-ash rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className={`${large ? "text-sm" : "text-[10px]"} text-stone font-[var(--font-mono)]`}>{Math.round(value)}</span>
    </div>
  );
}

function FactorBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-stone w-20 shrink-0 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-1.5 bg-ash rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-ember/70" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-[10px] text-stone font-[var(--font-mono)] w-8 text-right">{value.toFixed(0)}</span>
      <span className="text-[9px] text-ash">x{weight}</span>
    </div>
  );
}

export function DecisionCard({ action, isExpanded, onToggle }: DecisionCardProps) {
  const [showRaw, setShowRaw] = useState(false);
  const borderColor = ACTION_COLORS[action.action] || "border-l-ash";

  const details = action.details as Record<string, any> | null;
  const factors = details?.factors as Record<string, number> | undefined;
  const weights: Record<string, number> = { age: 0.15, marketCap: 0.25, volume: 0.2, holderCount: 0.25, creatorHistory: 0.15 };

  return (
    <Card
      className={`p-0 overflow-hidden border-l-4 ${borderColor} cursor-pointer transition-all`}
      onClick={onToggle}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Badge variant={ACTION_VARIANT[action.action] || "default"}>
          {action.action}
        </Badge>
        <span className="text-sm text-ivory shrink-0">
          {action.token?.symbol || (action.tokenAddress ? shortenAddress(action.tokenAddress) : "")}
        </span>
        <span className="text-xs text-stone flex-1 min-w-0 truncate">
          {action.reasoning || ""}
        </span>
        {action.confidence != null && (
          <ConfidenceBar value={action.confidence} />
        )}
        <span className="text-[10px] text-stone whitespace-nowrap shrink-0">
          {timeAgo(action.timestamp)}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-ash/30 space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Reasoning */}
          {action.reasoning && (
            <div>
              <p className="text-[10px] text-stone uppercase tracking-wider mb-1">Reasoning</p>
              <p className="text-sm text-ivory leading-relaxed">{action.reasoning}</p>
            </div>
          )}

          {/* Sentiment + Confidence row */}
          <div className="flex flex-wrap gap-4">
            {action.sentiment && (
              <div>
                <p className="text-[10px] text-stone uppercase tracking-wider mb-1">Sentiment</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${SENTIMENT_COLORS[action.sentiment] || "bg-ash text-stone"}`}>
                  {action.sentiment}
                </span>
              </div>
            )}
            {action.confidence != null && (
              <div>
                <p className="text-[10px] text-stone uppercase tracking-wider mb-1">Confidence</p>
                <ConfidenceBar value={action.confidence} large />
              </div>
            )}
            {action.phase && (
              <div>
                <p className="text-[10px] text-stone uppercase tracking-wider mb-1">Phase</p>
                <span className="text-xs text-ivory font-[var(--font-mono)]">{action.phase}</span>
              </div>
            )}
          </div>

          {/* Evaluation breakdown */}
          {action.action === "EVALUATE" && details && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                {details.score != null && (
                  <span className={`text-2xl font-bold font-[var(--font-mono)] ${
                    details.score >= 70 ? "text-torch-gold" : details.score >= 40 ? "text-ember" : "text-prometheus-red"
                  }`}>
                    {typeof details.score === "number" ? details.score.toFixed(1) : details.score}
                  </span>
                )}
                {details.recommendation && (
                  <Badge variant={details.recommendation === "BUY" ? "buy" : details.recommendation === "SKIP" ? "default" : "warning"}>
                    {details.recommendation}
                  </Badge>
                )}
              </div>
              {factors && (
                <div className="space-y-1.5">
                  {Object.entries(factors).map(([key, value]) => (
                    <FactorBar key={key} label={key} value={value as number} weight={weights[key] || 0} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BUY/SELL transaction details */}
          {(action.action === "BUY" || action.action === "SELL") && details && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {details.tokenAmount && (
                <div>
                  <p className="text-[10px] text-stone uppercase tracking-wider">Token Amount</p>
                  <p className="text-sm text-ivory font-[var(--font-mono)]">{formatNumber(details.tokenAmount as string)}</p>
                </div>
              )}
              {details.monAmount && (
                <div>
                  <p className="text-[10px] text-stone uppercase tracking-wider">MON Amount</p>
                  <p className="text-sm text-ivory font-[var(--font-mono)]">{formatMON(details.monAmount as string)} MON</p>
                </div>
              )}
              {details.price && (
                <div>
                  <p className="text-[10px] text-stone uppercase tracking-wider">Price</p>
                  <p className="text-sm text-ivory font-[var(--font-mono)]">{formatMON(details.price as string)}</p>
                </div>
              )}
            </div>
          )}

          {/* Token info */}
          {action.token && (
            <div>
              <p className="text-[10px] text-stone uppercase tracking-wider mb-1">Token</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-stone">Name: </span>
                  <span className="text-ivory">{action.token.name} ({action.token.symbol})</span>
                </div>
                {action.token.marketCap && (
                  <div>
                    <span className="text-stone">MCap: </span>
                    <span className="text-ivory font-[var(--font-mono)]">{formatNumber(action.token.marketCap)}</span>
                  </div>
                )}
                {action.token.volume24h && (
                  <div>
                    <span className="text-stone">Vol: </span>
                    <span className="text-ivory font-[var(--font-mono)]">{formatNumber(action.token.volume24h)}</span>
                  </div>
                )}
                {action.token.holderCount != null && (
                  <div>
                    <span className="text-stone">Holders: </span>
                    <span className="text-ivory font-[var(--font-mono)]">{action.token.holderCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tx hash link */}
          {action.txHash && (
            <a
              href={`${EXPLORER_URL}/tx/${action.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-torch-gold hover:text-flame transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {shortenAddress(action.txHash, 8)}
            </a>
          )}

          {/* Timestamp + raw details */}
          <div className="flex items-center justify-between pt-2 border-t border-ash/20">
            <span className="text-[10px] text-stone">
              {new Date(action.timestamp).toLocaleString()}
            </span>
            {details && (
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="text-[10px] text-stone hover:text-ivory transition-colors"
              >
                {showRaw ? "Hide" : "Show"} raw data
              </button>
            )}
          </div>
          {showRaw && details && (
            <pre className="text-[10px] text-stone bg-obsidian rounded p-3 overflow-x-auto max-h-40">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}
