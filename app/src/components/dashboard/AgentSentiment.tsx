"use client";

import { Card } from "@/components/ui/Card";
import { useActivityStats } from "@/hooks/useData";

const SENTIMENT_LABELS: Record<string, { label: string; color: string; angle: number }> = {
  BEARISH: { label: "Bearish", color: "text-prometheus-red", angle: -60 },
  CAUTIOUS: { label: "Cautious", color: "text-ember", angle: -30 },
  NEUTRAL: { label: "Neutral", color: "text-stone", angle: 0 },
  BULLISH: { label: "Bullish", color: "text-torch-gold", angle: 45 },
};

function SentimentGauge({ sentiment, confidence }: { sentiment: string; confidence: number | null }) {
  const info = SENTIMENT_LABELS[sentiment] || SENTIMENT_LABELS.NEUTRAL;
  const needleAngle = info.angle;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-48 h-28">
        {/* Gauge arc background */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--color-ash)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Colored arc segments */}
        <path
          d="M 20 100 A 80 80 0 0 1 60 38"
          fill="none"
          stroke="var(--color-prometheus-red)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M 60 38 A 80 80 0 0 1 100 20"
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M 100 20 A 80 80 0 0 1 140 38"
          fill="none"
          stroke="var(--color-stone)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M 140 38 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--color-torch-gold)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Needle */}
        <g transform={`rotate(${needleAngle}, 100, 100)`}>
          <line
            x1="100" y1="100" x2="100" y2="30"
            stroke="var(--color-ivory)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="4" fill="var(--color-ivory)" />
        </g>
      </svg>
      <p className={`text-sm font-[var(--font-heading)] ${info.color} mt-1`}>
        Prometheus is <span className="font-bold">{info.label}</span>
      </p>
      {confidence != null && (
        <p className="text-[10px] text-stone mt-0.5">
          {Math.round(confidence)}% confidence
        </p>
      )}
    </div>
  );
}

export function AgentSentiment() {
  const { data: stats } = useActivityStats();

  const sentiment = stats?.currentSentiment || "NEUTRAL";
  const confidence = stats?.avgConfidence ?? null;

  const actionCounts = stats?.actionCounts || {};
  const miniBreakdown = [
    { label: "Buys", count: actionCounts.BUY || 0, color: "text-torch-gold" },
    { label: "Sells", count: actionCounts.SELL || 0, color: "text-prometheus-red" },
    { label: "Skips", count: actionCounts.SKIP || 0, color: "text-stone" },
    { label: "Evals", count: actionCounts.EVALUATE || 0, color: "text-ember" },
  ];

  return (
    <Card className="p-6 flex flex-col items-center">
      <h3 className="text-xs text-stone uppercase tracking-wider mb-4">Agent Sentiment</h3>
      <SentimentGauge sentiment={sentiment} confidence={confidence} />
      <div className="grid grid-cols-4 gap-3 mt-4 w-full">
        {miniBreakdown.map((item) => (
          <div key={item.label} className="text-center">
            <p className={`text-sm font-bold font-[var(--font-mono)] ${item.color}`}>{item.count}</p>
            <p className="text-[9px] text-stone uppercase">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
