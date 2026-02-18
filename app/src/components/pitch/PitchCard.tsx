"use client";

import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";
import type { Pitch } from "@/types";
import { MessageSquare } from "lucide-react";

interface PitchCardProps {
  pitch: Pitch;
  isSelected?: boolean;
  onClick: () => void;
}

export function PitchCard({ pitch, isSelected, onClick }: PitchCardProps) {
  const verdictVariant =
    pitch.verdict === "BULLISH" ? "buy" : pitch.verdict === "BEARISH" ? "sell" : "default";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? "bg-ash/20 border-torch-gold/30"
          : "bg-charcoal/50 border-ash/40 hover:border-ash/80"
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        {pitch.tokenImageUrl ? (
          <img
            src={pitch.tokenImageUrl}
            alt={pitch.tokenSymbol || ""}
            className="w-7 h-7 rounded-full ring-1 ring-ash/50"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-ash/30 ring-1 ring-ash/50 flex items-center justify-center text-[9px] font-bold text-stone">
            {(pitch.tokenSymbol || "?").slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ivory truncate">
            {pitch.tokenName || pitch.tokenSymbol || "Unknown"}
          </p>
          <p className="text-[9px] text-stone font-[var(--font-mono)] truncate">
            {pitch.tokenSymbol || pitch.tokenAddress.slice(0, 10) + "..."}
          </p>
        </div>
        {pitch.status === "COMPLETED" && pitch.verdict ? (
          <Badge variant={verdictVariant}>{pitch.verdict}</Badge>
        ) : (
          <Badge variant="gold">ACTIVE</Badge>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[9px] text-stone">
          <MessageSquare className="w-3 h-3" />
          <span>{pitch.messageCount}</span>
        </div>

        {pitch.confidence != null && pitch.status === "COMPLETED" && (
          <div className="flex items-center gap-1.5">
            <div className="w-14 h-1 rounded-full bg-ash/40 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pitch.verdict === "BULLISH"
                    ? "bg-torch-gold"
                    : pitch.verdict === "BEARISH"
                    ? "bg-prometheus-red"
                    : "bg-stone"
                }`}
                style={{ width: `${pitch.confidence}%` }}
              />
            </div>
            <span className="text-[9px] text-stone font-[var(--font-mono)]">
              {pitch.confidence}%
            </span>
          </div>
        )}

        <span className="text-[9px] text-stone/60">{timeAgo(pitch.createdAt)}</span>
      </div>
    </button>
  );
}
