"use client";

import { Card } from "@/components/ui/Card";
import { useActivityStats } from "@/hooks/useData";

const SENTIMENT_COLORS: Record<string, string> = {
  BULLISH: "text-torch-gold",
  NEUTRAL: "text-stone",
  BEARISH: "text-prometheus-red",
  CAUTIOUS: "text-ember",
};

export function DecisionStats() {
  const { data: stats } = useActivityStats();

  const statItems = [
    {
      label: "Total Decisions",
      value: stats?.totalActions?.toString() || "0",
      color: "text-ivory",
    },
    {
      label: "Buys Today",
      value: stats?.todayBuys?.toString() || "0",
      color: "text-torch-gold",
    },
    {
      label: "Current Sentiment",
      value: stats?.currentSentiment || "NEUTRAL",
      color: SENTIMENT_COLORS[stats?.currentSentiment || "NEUTRAL"] || "text-stone",
    },
    {
      label: "Avg Confidence",
      value: stats?.avgConfidence != null ? `${Math.round(stats.avgConfidence)}%` : "—",
      color: "text-ember",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statItems.map((s) => (
        <Card key={s.label} className="p-3 text-center">
          <p className={`text-lg font-bold font-[var(--font-mono)] ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-stone uppercase tracking-wider mt-0.5">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}
