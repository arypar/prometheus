"use client";

import { Radio } from "lucide-react";

const ACTION_TYPES = ["ALL", "SCAN", "EVALUATE", "BUY", "SELL", "SKIP", "THINK", "ERROR"];

interface DecisionFiltersProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  liveMode: boolean;
  onLiveModeToggle: () => void;
}

export function DecisionFilters({ filter, onFilterChange, liveMode, onLiveModeToggle }: DecisionFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {!liveMode && (
        <div className="flex flex-wrap gap-1">
          {ACTION_TYPES.map((a) => (
            <button
              key={a}
              onClick={() => onFilterChange(a)}
              className={`px-2.5 py-1 text-[10px] rounded-lg border ${
                filter === a
                  ? "border-torch-gold/30 bg-torch-gold/10 text-torch-gold"
                  : "border-ash text-stone hover:text-ivory"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      {liveMode && <div />}
      <button
        onClick={onLiveModeToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border shrink-0 ${
          liveMode
            ? "border-torch-gold/30 bg-torch-gold/10 text-torch-gold"
            : "border-ash text-stone hover:text-ivory"
        }`}
      >
        <Radio className="w-3 h-3" />
        {liveMode ? "LIVE" : "Live Mode"}
      </button>
    </div>
  );
}
