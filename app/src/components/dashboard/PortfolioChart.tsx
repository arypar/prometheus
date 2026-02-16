"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { usePortfolioHistory, usePortfolioOverview } from "@/hooks/useData";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const periods = [
  { key: "24h", label: "1D" },
  { key: "7d", label: "1W" },
  { key: "30d", label: "1M" },
  { key: "all", label: "ALL" },
] as const;

function formatValue(v: number): string {
  if (v >= 1000) return v.toFixed(2);
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

function formatTimeLabel(ts: string, period: string): string {
  const d = new Date(ts);
  if (period === "24h") {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  if (period === "7d") {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHoverTime(ts: string, period: string): string {
  const d = new Date(ts);
  if (period === "24h") {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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

/* Invisible custom tooltip — we use it only for the onMouseMove callback */
function EmptyTooltip() {
  return null;
}

export function PortfolioChart() {
  const [period, setPeriod] = useState<string>("7d");
  const { data: snapshots, isLoading } = usePortfolioHistory(period);
  const { data: overview } = usePortfolioOverview();
  const [hoverData, setHoverData] = useState<{
    value: number;
    time: string;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    if (!snapshots?.length) return [];
    return snapshots.map((s) => ({
      time: s.timestamp,
      value: parseFloat(s.totalValueMon),
      label: formatTimeLabel(s.timestamp, period),
    }));
  }, [snapshots, period]);

  /* Compute P&L from first→last point (or first→hover) */
  const { displayValue, change, changePercent, isPositive, isNeutral } =
    useMemo(() => {
      if (!chartData.length) {
        const portfolioVal = overview
          ? parseFloat(overview.totalValueMon)
          : 0;
        return {
          displayValue: portfolioVal,
          change: 0,
          changePercent: 0,
          isPositive: true,
          isNeutral: true,
        };
      }

      const firstVal = chartData[0].value;
      const currentVal = hoverData ? hoverData.value : chartData[chartData.length - 1].value;
      const diff = currentVal - firstVal;
      const pct = firstVal !== 0 ? (diff / firstVal) * 100 : 0;

      return {
        displayValue: currentVal,
        change: diff,
        changePercent: pct,
        isPositive: diff >= 0,
        isNeutral: Math.abs(diff) < 0.0001,
      };
    }, [chartData, hoverData, overview]);

  /* Line color: Robinhood green/red */
  const lineColor = isNeutral
    ? "#A7A397"
    : isPositive
      ? "#00C805"
      : "#FF5000";

  const gradientId = `portfolio-gradient-${period}`;

  const handleMouseMove = useCallback(
    (nextState: { activeTooltipIndex?: number | undefined }) => {
      const idx = nextState?.activeTooltipIndex;
      if (idx != null && typeof idx === "number" && chartData[idx]) {
        const p = chartData[idx];
        setHoverData({ value: p.value, time: p.time });
      }
    },
    [chartData],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverData(null);
  }, []);

  return (
    <div className="bg-charcoal border border-ash/60 rounded-xl p-5 pb-3 transition-all duration-300 glow-card">
      {/* ── Header: big value + P&L ── */}
      <div className="mb-1">
        <p className="text-[10px] text-stone uppercase tracking-widest font-[var(--font-mono)] mb-1">
          Portfolio Value
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl md:text-4xl font-bold font-[var(--font-mono)] text-ivory tabular-nums tracking-tight">
            {formatValue(displayValue)}
            <span className="text-lg text-stone ml-1.5">MON</span>
          </span>
        </div>

        {/* P&L row */}
        <div className="flex items-center gap-1.5 mt-1">
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
            {formatValue(Math.abs(change))} MON ({isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
          {hoverData ? (
            <span className="text-[10px] text-stone/60 font-[var(--font-mono)] ml-1">
              {formatHoverTime(hoverData.time, period)}
            </span>
          ) : (
            <span className="text-[10px] text-stone/60 font-[var(--font-mono)] ml-1">
              {period === "24h"
                ? "Today"
                : period === "7d"
                  ? "Past week"
                  : period === "30d"
                    ? "Past month"
                    : "All time"}
            </span>
          )}
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
              margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={lineColor}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="100%"
                    stopColor={lineColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#6B6962" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                content={<EmptyTooltip />}
                cursor={{
                  stroke: lineColor,
                  strokeWidth: 1,
                  strokeDasharray: "4 3",
                  opacity: 0.5,
                }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: lineColor,
                  stroke: "#101116",
                  strokeWidth: 2,
                }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Period selector ── */}
      <div className="flex justify-center gap-1 mt-2 pt-2 border-t border-ash/30">
        {periods.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setPeriod(key);
              setHoverData(null);
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
