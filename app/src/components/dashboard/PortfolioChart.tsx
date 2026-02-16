"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from "recharts";
import {
  usePortfolioHistory,
  usePortfolioOverview,
  usePortfolioLive,
} from "@/hooks/useData";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

/* ── Period definitions ── */
const periods = [
  { key: "24h", label: "1D" },
  { key: "7d", label: "1W" },
  { key: "30d", label: "1M" },
  { key: "all", label: "ALL" },
] as const;

/* ── Bucket sizes per period (ms) ── */
const BUCKET_MS: Record<string, number> = {
  "24h": 15 * 60_000, // 15 min → ~96 pts
  "7d": 60 * 60_000, // 1 hr  → ~168 pts
  "30d": 4 * 60 * 60_000, // 4 hr  → ~180 pts
  all: 12 * 60 * 60_000, // 12 hr
};

/* ── Helpers ── */

function formatMon(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

function formatTimeLabel(ts: string, period: string): string {
  const d = new Date(ts);
  if (period === "24h") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (period === "7d") {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHoverTime(ts: string, period: string): string {
  const d = new Date(ts);
  if (period === "24h") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Bucket snapshots into time windows, keeping the last value per bucket. */
function downsample(
  snapshots: { timestamp: string; totalValueMon: string }[],
  period: string,
): { time: string; value: number; label: string }[] {
  if (!snapshots.length) return [];

  const ms = BUCKET_MS[period] ?? 60 * 60_000;
  const buckets = new Map<number, { timestamp: string; totalValueMon: string }>();

  for (const s of snapshots) {
    const t = new Date(s.timestamp).getTime();
    const key = Math.floor(t / ms);
    buckets.set(key, s);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([, s]) => ({
      time: s.timestamp,
      value: parseFloat(s.totalValueMon),
      label: formatTimeLabel(s.timestamp, period),
    }));
}

/** Invisible tooltip — we use recharts tooltip only for the crosshair cursor. */
function EmptyTooltip() {
  return null;
}

/* ── Main Component ── */

export function PortfolioChart() {
  const [period, setPeriod] = useState<string>("24h");
  const { data: snapshots, isLoading } = usePortfolioHistory(period);
  const { data: overview } = usePortfolioOverview();
  const { data: liveValue } = usePortfolioLive();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  /* Keep a rolling buffer of live values received during this session */
  const liveBuffer = useRef<{ time: string; value: number }[]>([]);
  const lastLiveTs = useRef<string>("");

  useEffect(() => {
    if (!liveValue || liveValue.timestamp === lastLiveTs.current) return;
    lastLiveTs.current = liveValue.timestamp;
    liveBuffer.current.push({
      time: liveValue.timestamp,
      value: parseFloat(liveValue.value),
    });
    // Cap the buffer to avoid unbounded growth
    if (liveBuffer.current.length > 720) {
      liveBuffer.current = liveBuffer.current.slice(-720);
    }
  }, [liveValue]);

  /* Merge historical snapshots with live buffer */
  const chartData = useMemo(() => {
    const historicalPts = downsample(snapshots || [], period);

    // Only append live points for the 24h view (most granular)
    if (period !== "24h" || !liveBuffer.current.length) return historicalPts;

    // Find the cutoff — only append live points newer than the last historical
    const lastHistTs = historicalPts.length
      ? new Date(historicalPts[historicalPts.length - 1].time).getTime()
      : 0;

    const livePts = liveBuffer.current
      .filter((p) => new Date(p.time).getTime() > lastHistTs)
      .map((p) => ({
        time: p.time,
        value: p.value,
        label: formatTimeLabel(p.time, period),
      }));

    return [...historicalPts, ...livePts];
  }, [snapshots, period, liveValue]); // liveValue dep triggers re-merge

  /* Current live value for the header (not from chart data) */
  const currentLiveValue = liveValue ? parseFloat(liveValue.value) : null;

  /* P&L computation */
  const { displayValue, change, changePercent, isPositive, isNeutral, hoverTime } =
    useMemo(() => {
      const fallbackVal = currentLiveValue
        ?? (overview ? parseFloat(overview.totalValueMon) + parseFloat(overview.walletBalance) : 0);

      if (!chartData.length) {
        return {
          displayValue: fallbackVal,
          change: 0,
          changePercent: 0,
          isPositive: true,
          isNeutral: true,
          hoverTime: null as string | null,
        };
      }

      const firstVal = chartData[0].value;
      const isHovering = hoverIdx !== null && chartData[hoverIdx];
      const currentVal = isHovering ? chartData[hoverIdx].value : (currentLiveValue ?? chartData[chartData.length - 1].value);
      const diff = currentVal - firstVal;
      const pct = firstVal !== 0 ? (diff / firstVal) * 100 : 0;

      return {
        displayValue: currentVal,
        change: diff,
        changePercent: pct,
        isPositive: diff >= 0,
        isNeutral: Math.abs(pct) < 0.01,
        hoverTime: isHovering ? chartData[hoverIdx].time : null,
      };
    }, [chartData, hoverIdx, currentLiveValue, overview]);

  /* Line color */
  const lineColor = isNeutral ? "#A7A397" : isPositive ? "#00C805" : "#FF5000";
  const gradientId = `pf-grad-${period}`;

  /* Y-axis domain with padding */
  const yDomain = useMemo((): [number, number] | undefined => {
    if (!chartData.length) return undefined;
    let min = Infinity;
    let max = -Infinity;
    for (const d of chartData) {
      if (d.value < min) min = d.value;
      if (d.value > max) max = d.value;
    }
    const range = max - min;
    const mean = (max + min) / 2;
    const relRange = mean > 0 ? range / mean : 0;

    // Flat data → wide padding to keep line centred
    if (relRange < 0.03) {
      const pad = Math.max(mean * 0.08, 0.001);
      return [Math.max(0, min - pad), max + pad];
    }
    const pad = range * 0.15;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData]);

  /* Hover handlers */
  const handleMouseMove = useCallback(
    (nextState: Record<string, unknown>) => {
      const idx = nextState?.activeTooltipIndex;
      if (idx != null && typeof idx === "number") {
        setHoverIdx(idx);
      }
    },
    [],
  );

  const handleMouseLeave = useCallback(() => setHoverIdx(null), []);

  /* Active dot (the circle shown on hover) */
  const activeDotProps = hoverIdx !== null && chartData[hoverIdx]
    ? { cx: undefined, cy: undefined, r: 5, fill: lineColor, stroke: "#101116", strokeWidth: 2.5 }
    : undefined;

  return (
    <div className="bg-charcoal border border-ash/60 rounded-xl p-5 pb-3 transition-all duration-300 glow-card">
      {/* ── Header ── */}
      <div className="mb-1 select-none">
        <p className="text-[10px] text-stone uppercase tracking-widest font-[var(--font-mono)] mb-1">
          Total Value
        </p>

        <span className="text-[2rem] md:text-[2.5rem] leading-none font-bold font-[var(--font-mono)] text-ivory tabular-nums tracking-tight">
          {formatMon(displayValue)}
          <span className="text-base text-stone ml-1.5 font-medium">MON</span>
        </span>

        {/* P&L pill */}
        <div className="flex items-center gap-1.5 mt-1.5 h-5">
          {isNeutral ? (
            <Minus className="w-3.5 h-3.5 text-stone" />
          ) : isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: lineColor }} />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" style={{ color: lineColor }} />
          )}
          <span
            className="text-sm font-semibold font-[var(--font-mono)] tabular-nums"
            style={{ color: lineColor }}
          >
            {isPositive ? "+" : ""}
            {formatMon(Math.abs(change))} ({isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
          <span className="text-[10px] text-stone/50 font-[var(--font-mono)] ml-1">
            {hoverTime
              ? formatHoverTime(hoverTime, period)
              : period === "24h"
                ? "Today"
                : period === "7d"
                  ? "Past week"
                  : period === "30d"
                    ? "Past month"
                    : "All time"}
          </span>
        </div>
      </div>

      {/* ── Chart ── */}
      {isLoading ? (
        <div className="h-[280px] flex items-center justify-center">
          <LoadingState />
        </div>
      ) : !chartData.length ? (
        <div className="h-[280px] flex items-center justify-center">
          <EmptyState message="No portfolio history yet" />
        </div>
      ) : (
        <div
          ref={chartRef}
          className="h-[280px] mt-2 -mx-2 cursor-crosshair"
          onMouseLeave={handleMouseLeave}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              margin={{ top: 4, right: 2, bottom: 0, left: 2 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.12} />
                  <stop offset="80%" stopColor={lineColor} stopOpacity={0.02} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6B6962" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={50}
                dy={4}
              />
              <YAxis hide domain={yDomain ?? ["dataMin", "dataMax"]} />

              <Tooltip
                content={<EmptyTooltip />}
                cursor={{
                  stroke: lineColor,
                  strokeWidth: 1,
                  opacity: 0.35,
                }}
                isAnimationActive={false}
              />

              <Area
                type="linear"
                dataKey="value"
                stroke={lineColor}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                dot={false}
                activeDot={activeDotProps ?? { r: 0 }}
                isAnimationActive={false}
              />

              {/* Live dot at the end of the line */}
              {hoverIdx === null && chartData.length > 0 && (
                <ReferenceDot
                  x={chartData[chartData.length - 1].label}
                  y={chartData[chartData.length - 1].value}
                  r={4}
                  fill={lineColor}
                  stroke={lineColor}
                  strokeWidth={6}
                  strokeOpacity={0.3}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Period selector ── */}
      <div className="flex justify-center gap-1 mt-2 pt-2 border-t border-ash/20">
        {periods.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setPeriod(key);
              setHoverIdx(null);
            }}
            className={`
              px-4 py-1.5 text-[11px] font-semibold rounded-full transition-all duration-200
              font-[var(--font-mono)] tracking-wide
              ${
                period === key
                  ? "text-ivory"
                  : "text-stone/60 hover:text-stone hover:bg-ash/10"
              }
            `}
            style={
              period === key
                ? { backgroundColor: `${lineColor}20`, color: lineColor }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
