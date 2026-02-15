"use client";

import { Card } from "@/components/ui/Card";
import { useActivityStats, useHoldings } from "@/hooks/useData";
import { Eye, Brain, Zap, Activity, LogOut } from "lucide-react";

const STAGES = [
  { key: "SCAN", label: "Scan", icon: Eye, actionKey: "SCAN" },
  { key: "EVALUATE", label: "Evaluate", icon: Brain, actionKey: "EVALUATE" },
  { key: "DECIDE", label: "Decide", icon: Zap, actionKey: "BUY" },
  { key: "MONITOR", label: "Monitor", icon: Activity, actionKey: null },
  { key: "EXIT", label: "Exit", icon: LogOut, actionKey: "SELL" },
] as const;

export function InvestmentCycle() {
  const { data: stats } = useActivityStats();
  const { data: holdings } = useHoldings();

  const currentPhase = stats?.currentPhase || "SCAN";
  const actionCounts = stats?.actionCounts || {};

  function getStageCount(stage: typeof STAGES[number]): number {
    if (stage.key === "MONITOR") return holdings?.length || 0;
    if (stage.key === "DECIDE") return (actionCounts.BUY || 0) + (actionCounts.SKIP || 0);
    if (stage.actionKey) return actionCounts[stage.actionKey] || 0;
    return 0;
  }

  return (
    <Card className="p-6">
      <h3 className="text-xs text-stone uppercase tracking-wider mb-6 text-center">Investment Cycle</h3>
      <div className="flex items-center justify-between gap-1 md:gap-2">
        {STAGES.map((stage, i) => {
          const isActive = currentPhase === stage.key;
          const Icon = stage.icon;
          const count = getStageCount(stage);

          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              {/* Stage node */}
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center border transition-all ${
                    isActive
                      ? "border-torch-gold/50 bg-torch-gold/10 stage-pulse"
                      : "border-ash bg-charcoal"
                  }`}
                >
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? "text-torch-gold" : "text-stone"}`} />
                </div>
                <span className={`text-[9px] md:text-[10px] uppercase tracking-wider ${isActive ? "text-torch-gold" : "text-stone"}`}>
                  {stage.label}
                </span>
                <span className={`text-[10px] font-[var(--font-mono)] ${isActive ? "text-ivory" : "text-stone/60"}`}>
                  {count}
                </span>
              </div>

              {/* Connector */}
              {i < STAGES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 md:mx-2 rounded-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-ash" />
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-torch-gold/60 to-transparent pipeline-flow" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
