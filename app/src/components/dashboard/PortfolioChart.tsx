"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePortfolioHistory } from "@/hooks/useData";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";

const periods = ["24h", "7d", "30d", "all"] as const;

export function PortfolioChart() {
  const [period, setPeriod] = useState<string>("7d");
  const { data: snapshots, isLoading } = usePortfolioHistory(period);

  const chartData = snapshots?.map((s) => ({
    time: new Date(s.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    }),
    value: parseFloat(s.totalValueMon),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Value</CardTitle>
          <div className="flex gap-1">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-1 text-[10px] rounded ${
                  period === p
                    ? "bg-torch-gold/10 text-torch-gold"
                    : "text-stone hover:text-ivory"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      {isLoading ? (
        <LoadingState />
      ) : !chartData?.length ? (
        <EmptyState message="No portfolio history yet" />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF8A3D" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF8A3D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: "#A7A397" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#A7A397" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#101116",
                  border: "1px solid #23242B",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#F2F0E8",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#F6C65B"
                fill="url(#valueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
