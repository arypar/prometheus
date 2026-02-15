"use client";

import { Card } from "@/components/ui/Card";
import { formatMON, formatPercent } from "@/lib/utils";
import type { PortfolioOverview } from "@/types";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Fuel,
  Target,
  BarChart2,
} from "lucide-react";

interface StatsGridProps {
  data: PortfolioOverview;
}

export function StatsGrid({ data }: StatsGridProps) {
  const stats = [
    {
      label: "Portfolio Value",
      value: `${formatMON(data.totalValueMon)} MON`,
      icon: Wallet,
      color: "text-torch-gold",
    },
    {
      label: "Total P&L",
      value: `${formatMON(data.totalPnl)} MON`,
      icon: parseFloat(data.totalPnl) >= 0 ? TrendingUp : TrendingDown,
      color: parseFloat(data.totalPnl) >= 0 ? "text-torch-gold" : "text-prometheus-red",
    },
    {
      label: "Win Rate",
      value: `${data.winRate}%`,
      icon: Target,
      color: data.winRate >= 50 ? "text-torch-gold" : "text-ember",
    },
    {
      label: "Gas Spent",
      value: `${formatMON(data.totalGasSpent)} MON`,
      icon: Fuel,
      color: "text-ember",
    },
    {
      label: "Active Positions",
      value: data.activePositions.toString(),
      icon: BarChart2,
      color: "text-flame",
    },
    {
      label: "24h Change",
      value: formatPercent(parseFloat(data.change24h)),
      icon: parseFloat(data.change24h) >= 0 ? TrendingUp : TrendingDown,
      color: parseFloat(data.change24h) >= 0 ? "text-torch-gold" : "text-prometheus-red",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            <span className="text-[10px] text-stone uppercase tracking-wider">
              {stat.label}
            </span>
          </div>
          <div className={`text-sm font-bold font-[var(--font-mono)] ${stat.color}`}>{stat.value}</div>
        </Card>
      ))}
    </div>
  );
}
