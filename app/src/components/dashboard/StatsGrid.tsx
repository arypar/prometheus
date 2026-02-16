"use client";

import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatPercent } from "@/lib/utils";
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
      rawValue: parseFloat(data.totalValueMon),
      suffix: " MON",
      decimals: 2,
      icon: Wallet,
      color: "text-torch-gold",
    },
    {
      label: "Total P&L",
      rawValue: parseFloat(data.totalPnl),
      suffix: " MON",
      decimals: 2,
      icon: parseFloat(data.totalPnl) >= 0 ? TrendingUp : TrendingDown,
      color: parseFloat(data.totalPnl) >= 0 ? "text-torch-gold" : "text-prometheus-red",
    },
    {
      label: "Win Rate",
      rawValue: data.winRate,
      suffix: "%",
      decimals: 0,
      icon: Target,
      color: data.winRate >= 50 ? "text-torch-gold" : "text-ember",
    },
    {
      label: "Gas Spent",
      rawValue: parseFloat(data.totalGasSpent),
      suffix: " MON",
      decimals: 4,
      icon: Fuel,
      color: "text-ember",
    },
    {
      label: "Positions",
      rawValue: data.activePositions,
      suffix: "",
      decimals: 0,
      icon: BarChart2,
      color: "text-flame",
    },
    {
      label: "24h Change",
      rawValue: parseFloat(data.change24h),
      suffix: "%",
      decimals: 1,
      icon: parseFloat(data.change24h) >= 0 ? TrendingUp : TrendingDown,
      color: parseFloat(data.change24h) >= 0 ? "text-torch-gold" : "text-prometheus-red",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => (
        <Card key={stat.label} variant="pulse" className={`p-3 stagger-${i + 1}`}>
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            <span className="text-[10px] text-stone uppercase tracking-wider">
              {stat.label}
            </span>
          </div>
          <div className={`text-sm font-bold font-[var(--font-mono)] glow-text ${stat.color}`}>
            <AnimatedNumber
              value={stat.rawValue}
              decimals={stat.decimals}
              suffix={stat.suffix}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
