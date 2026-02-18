"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PitchCard } from "./PitchCard";
import { usePitchFeed } from "@/hooks/useData";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PitchFeedProps {
  selectedPitchId: string | null;
  onSelectPitch: (id: string) => void;
}

const FILTER_OPTIONS = [
  { label: "All", value: undefined },
  { label: "Bullish", value: "BULLISH" },
  { label: "Bearish", value: "BEARISH" },
  { label: "Neutral", value: "NEUTRAL" },
] as const;

export function PitchFeed({ selectedPitchId, onSelectPitch }: PitchFeedProps) {
  const [page, setPage] = useState(1);
  const [verdictFilter, setVerdictFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = usePitchFeed(page, undefined, verdictFilter);

  return (
    <Card className="flex flex-col h-full p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ash/50 bg-charcoal/80 shrink-0">
        <h3 className="text-[10px] text-stone uppercase tracking-widest font-[var(--font-mono)] mb-2">
          Pitch Feed
        </h3>
        <div className="flex gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                setVerdictFilter(opt.value);
                setPage(1);
              }}
              className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                verdictFilter === opt.value
                  ? "border-torch-gold/40 bg-torch-gold/10 text-torch-gold"
                  : "border-ash/40 text-stone hover:text-ivory"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-32 text-stone/40 text-xs font-[var(--font-mono)]">
            Loading pitches...
          </div>
        ) : !data?.data?.length ? (
          <div className="flex items-center justify-center h-32 text-stone/40 text-xs font-[var(--font-mono)]">
            No pitches yet. Be the first!
          </div>
        ) : (
          data.data.map((pitch) => (
            <PitchCard
              key={pitch.id}
              pitch={pitch}
              isSelected={pitch.id === selectedPitchId}
              onClick={() => onSelectPitch(pitch.id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="px-4 py-2 border-t border-ash/30 bg-charcoal/40 flex items-center justify-between shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-stone hover:text-ivory disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[9px] text-stone font-[var(--font-mono)]">
            {page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="text-stone hover:text-ivory disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </Card>
  );
}
