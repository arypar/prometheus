"use client";

import { useState, useCallback } from "react";
import { useActivity } from "@/hooks/useData";
import { useSSE } from "@/hooks/useSSE";
import { ErrorState, EmptyState } from "@/components/ui/LoadingState";
import { DecisionCard } from "@/components/decisions/DecisionCard";
import { DecisionStats } from "@/components/decisions/DecisionStats";
import { DecisionFilters } from "@/components/decisions/DecisionFilters";
import type { BotAction } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DecisionsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("ALL");
  const [liveMode, setLiveMode] = useState(false);
  const [liveActions, setLiveActions] = useState<BotAction[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, error } = useActivity(page, filter === "ALL" ? undefined : filter);

  const onSSEMessage = useCallback((data: unknown) => {
    if (!liveMode) return;
    const event = data as Record<string, unknown>;
    if (event.type === "PULSE" || event.type === "connected") return;
    const action = event as unknown as BotAction;
    if (action.id && action.action) {
      setLiveActions((prev) => [action, ...prev].slice(0, 100));
    }
  }, [liveMode]);
  useSSE(onSSEMessage);

  if (error) return <ErrorState />;

  const displayActions = liveMode ? liveActions : data?.data || [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <h1 className="font-[var(--font-display)] text-2xl text-torch-gold">Decisions</h1>

      <DecisionStats />

      <DecisionFilters
        filter={filter}
        onFilterChange={(f) => { setFilter(f); setPage(1); }}
        liveMode={liveMode}
        onLiveModeToggle={() => setLiveMode(!liveMode)}
      />

      {/* Live streaming indicator */}
      {liveMode && (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-torch-gold pulse-glow" />
          <span className="text-[10px] text-torch-gold">STREAMING</span>
        </div>
      )}

      {/* Decision cards */}
      {isLoading && !liveMode ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-charcoal border border-ash rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !displayActions.length ? (
        <EmptyState message={liveMode ? "Waiting for live actions..." : "No actions found"} />
      ) : (
        <div className="space-y-2">
          {displayActions.map((action) => (
            <DecisionCard
              key={action.id}
              action={action}
              isExpanded={expandedId === action.id}
              onToggle={() => setExpandedId(expandedId === action.id ? null : action.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination (non-live) */}
      {!liveMode && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-ash">
          <span className="text-[10px] text-stone">
            Page {data.page} of {data.totalPages} ({data.total} actions)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-ash text-stone hover:text-ivory disabled:opacity-30"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="p-1.5 rounded border border-ash text-stone hover:text-ivory disabled:opacity-30"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
