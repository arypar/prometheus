"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useWinRate, useRoiByToken, useVolume } from "@/hooks/useData";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/LoadingState";
import { formatMON, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "#101116",
  border: "1px solid #23242B",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#F2F0E8",
};

export default function AnalyticsPage() {
  const { data: winRate, isLoading: wrLoading, error: wrError } = useWinRate();
  const { data: roi, isLoading: roiLoading } = useRoiByToken();
  const { data: volume, isLoading: volLoading } = useVolume();

  if (wrError) return <ErrorState />;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <h1 className="font-[var(--font-display)] text-2xl text-torch-gold">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Win Rate</CardTitle>
          </CardHeader>
          {wrLoading ? (
            <LoadingState />
          ) : !winRate || winRate.total === 0 ? (
            <EmptyState message="No completed trades yet" />
          ) : (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Wins", value: winRate.wins },
                          { name: "Losses", value: winRate.losses },
                        ]}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={65}
                        strokeWidth={0}
                      >
                        <Cell fill="#F6C65B" />
                        <Cell fill="#B21E2B" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-torch-gold font-[var(--font-mono)]">{winRate.winRate}%</p>
                <p className="text-[10px] text-stone">
                  {winRate.wins}W / {winRate.losses}L ({winRate.total} trades)
                </p>
              </div>
              <div className="space-y-1.5">
                {winRate.details.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1">
                    <span className="text-stone">{d.token.slice(0, 10)}...</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-[var(--font-mono)] ${d.result === "WIN" ? "text-torch-gold" : "text-prometheus-red"}`}>
                        {formatMON(d.pnl)} MON
                      </span>
                      <Badge variant={d.result === "WIN" ? "success" : "error"}>{d.result}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* ROI by Token */}
        <Card>
          <CardHeader>
            <CardTitle>ROI by Token</CardTitle>
          </CardHeader>
          {roiLoading ? (
            <LoadingState />
          ) : !roi?.length ? (
            <EmptyState message="No positions to analyze" />
          ) : (
            <>
              <div className="h-52 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roi.slice(0, 10)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#A7A397" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="symbol" tick={{ fontSize: 9, fill: "#A7A397" }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="roi" fill="#FF8A3D" radius={[0, 4, 4, 0]}>
                      {roi.slice(0, 10).map((entry, i) => (
                        <Cell key={i} fill={entry.roi >= 0 ? "#F6C65B" : "#B21E2B"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {roi.map((r) => (
                  <div key={r.tokenAddress} className="flex items-center justify-between text-xs py-1">
                    <span className="text-ivory">{r.symbol}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-stone font-[var(--font-mono)]">{formatMON(r.invested)} invested</span>
                      <Badge variant={r.roi >= 0 ? "success" : "error"}>
                        {formatPercent(r.roi)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Volume Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Volume</CardTitle>
          </CardHeader>
          {volLoading ? (
            <LoadingState />
          ) : !volume?.length ? (
            <EmptyState message="No volume data yet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volume}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#A7A397" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#A7A397" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="buys" stackId="vol" fill="#F6C65B" radius={[4, 4, 0, 0]} name="Buys" />
                  <Bar dataKey="sells" stackId="vol" fill="#B21E2B" radius={[4, 4, 0, 0]} name="Sells" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
